import type { FastifyInstance, FastifyReply } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, SessionUser } from "../../core/app-context";
import {
  addDays,
  audit,
  buildPaymentQr,
  cleanEmptyStrings,
  createPaymentSchema,
  customerPortalBaseUrl,
  fail,
  getPermissionsForRole,
  normalizePaymentAmount,
  ok,
  prisma,
  recalculateContractStatus,
  requireAuth,
  requireSharedSecret,
} from "../../core/app-context";

type PermissionKey =
  | "payments:read"
  | "payments:create"
  | "payments:review"
  | "payments:manage"
  | "integrations:manage";

function hasAnyPermission(user: Pick<SessionUser, "role">, permissions: PermissionKey[]) {
  const owned = getPermissionsForRole(user.role);
  return permissions.some((permission) => owned.includes(permission) || owned.includes("platform:*") || owned.includes("store:*"));
}

function requireAnyPermission(user: Pick<SessionUser, "role">, reply: FastifyReply, permissions: PermissionKey[]) {
  if (hasAnyPermission(user, permissions)) return true;
  fail(reply, 403, "FORBIDDEN", `Permission required: ${permissions.join(" or ")}`);
  return false;
}

async function applyInstallmentPayment(tx: Prisma.TransactionClient, installmentId: string | null | undefined, amount: number) {
  if (!installmentId) return;
  const installment = await tx.installment.findUnique({ where: { id: installmentId } });
  if (!installment) return;

  const newPaidAmount = Number(installment.paidAmount) + amount;
  const fullyPaid = newPaidAmount >= Number(installment.amount);

  await tx.installment.update({
    where: { id: installmentId },
    data: {
      paidAmount: newPaidAmount,
      status: fullyPaid ? "PAID" : "PARTIAL",
      paidAt: fullyPaid ? new Date() : installment.paidAt,
    },
  });
}

export async function registerPaymentsRoutes(app: FastifyInstance) {
  app.get("/payments", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:read", "payments:manage", "payments:review"])) return;

    const payments = await prisma.payment.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: { contract: { include: { customer: true } }, installment: true },
    });
    return ok(payments);
  });

  app.post("/payments", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:create", "payments:manage"])) return;

    const parsed = createPaymentSchema.safeParse(cleanEmptyStrings(request.body));
    if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", parsed.error.message);

    const contract = await prisma.contract.findFirst({ where: { id: parsed.data.contractId, organizationId: user.organizationId } });
    if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");

    if (parsed.data.installmentId) {
      const installment = await prisma.installment.findFirst({ where: { id: parsed.data.installmentId, contractId: parsed.data.contractId } });
      if (!installment) return fail(reply, 404, "NOT_FOUND", "Installment not found for this contract");
    }

    const amount = normalizePaymentAmount(parsed.data.amount);
    const payment = await prisma.payment.create({
      data: {
        organizationId: user.organizationId,
        contractId: parsed.data.contractId,
        installmentId: parsed.data.installmentId,
        amount,
        method: parsed.data.method,
        slipUrl: parsed.data.slipUrl,
        note: parsed.data.note,
        status: parsed.data.slipUrl ? "VERIFYING" : "PENDING",
      },
    });

    await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_PAYMENT", targetType: "Payment", targetId: payment.id });
    return ok(payment);
  });

  app.post("/payments/:id/confirm", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:review", "payments:manage"])) return;

    const { id } = request.params as { id: string };
    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { installment: true, contract: true },
    });
    if (!payment) return fail(reply, 404, "NOT_FOUND", "Payment not found");

    const amount = Number(payment.amount);

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.payment.updateMany({
          where: { id, organizationId: user.organizationId, status: { not: "CONFIRMED" } },
          data: { status: "CONFIRMED", paidAt: new Date() },
        });

        if (changed.count !== 1) throw new Error("Payment already confirmed");
        await applyInstallmentPayment(tx, payment.installmentId, amount);

        return tx.payment.findUniqueOrThrow({ where: { id } });
      });

      await recalculateContractStatus(payment.contractId);
      await audit({ organizationId: user.organizationId, actorId: user.id, action: "CONFIRM_PAYMENT", targetType: "Payment", targetId: payment.id });
      return ok(updated);
    } catch (error) {
      return fail(reply, 409, "ALREADY_CONFIRMED", error instanceof Error ? error.message : "Payment already confirmed");
    }
  });

  app.post("/payments/:id/reject", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:review", "payments:manage"])) return;

    const { id } = request.params as { id: string };
    const payment = await prisma.payment.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!payment) return fail(reply, 404, "NOT_FOUND", "Payment not found");
    if (payment.status === "CONFIRMED") return fail(reply, 409, "INVALID_STATE", "Confirmed payments cannot be rejected");

    const updated = await prisma.payment.update({ where: { id }, data: { status: "REJECTED" } });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "REJECT_PAYMENT", targetType: "Payment", targetId: payment.id });
    return ok(updated);
  });

  app.post("/payments/webhook", async (request, reply) => {
    if (!requireSharedSecret(request, reply, "PAYMENT_WEBHOOK_SECRET")) return;

    const body = cleanEmptyStrings(request.body) as { paymentId?: string; providerRef?: string; status?: string; amount?: number; paidAt?: string };
    if (!body.paymentId && !body.providerRef) return fail(reply, 400, "BAD_REQUEST", "paymentId or providerRef is required");

    const payment = await prisma.payment.findFirst({
      where: body.paymentId ? { id: body.paymentId } : { providerRef: body.providerRef },
      include: { contract: true, installment: true },
    });
    if (!payment) return fail(reply, 404, "NOT_FOUND", "Payment not found for webhook");

    if (!["paid", "confirmed", "success"].includes(String(body.status ?? "").toLowerCase())) {
      await audit({ organizationId: payment.organizationId, action: "PAYMENT_WEBHOOK_IGNORED", targetType: "Payment", targetId: payment.id, metadata: body as Prisma.InputJsonObject });
      return ok({ ignored: true });
    }

    const amount = normalizePaymentAmount(body.amount ?? Number(payment.amount));
    let changedCount = 0;

    await prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "CONFIRMED" } },
        data: {
          status: "CONFIRMED",
          paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
          providerRef: body.providerRef ?? payment.providerRef,
        },
      });

      changedCount = changed.count;
      if (changed.count !== 1) return;
      await applyInstallmentPayment(tx, payment.installmentId, amount);
    });

    if (changedCount === 0) return ok({ confirmed: true, idempotent: true, paymentId: payment.id });

    await recalculateContractStatus(payment.contractId);
    await audit({ organizationId: payment.organizationId, action: "PAYMENT_WEBHOOK_CONFIRMED", targetType: "Payment", targetId: payment.id, metadata: body as Prisma.InputJsonObject });
    return ok({ confirmed: true, paymentId: payment.id });
  });

  app.get("/store/payment-settings", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:read", "payments:manage", "integrations:manage"])) return;

    const settings = await prisma.storePaymentSetting.findMany({ where: { organizationId: user.organizationId }, orderBy: { updatedAt: "desc" } });
    return ok(settings);
  });

  app.put("/store/payment-settings", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:manage", "integrations:manage"])) return;

    const body = cleanEmptyStrings(request.body) as { provider?: string; displayName?: string; promptPayId?: string; bankName?: string; accountNo?: string; accountName?: string; instructions?: string; isActive?: boolean };
    const provider = ["PROMPTPAY_MANUAL", "BANK_TRANSFER", "PAYMENT_GATEWAY"].includes(String(body.provider || "")) ? String(body.provider) : "PROMPTPAY_MANUAL";
    const existing = await prisma.storePaymentSetting.findFirst({ where: { organizationId: user.organizationId, provider: provider as any }, orderBy: { updatedAt: "desc" } });
    const setting = existing
      ? await prisma.storePaymentSetting.update({ where: { id: existing.id }, data: { displayName: body.displayName || existing.displayName, promptPayId: body.promptPayId, bankName: body.bankName, accountNo: body.accountNo, accountName: body.accountName, instructions: body.instructions, isActive: body.isActive ?? true } })
      : await prisma.storePaymentSetting.create({ data: { organizationId: user.organizationId, provider: provider as any, displayName: body.displayName || "PromptPay / Bank Transfer", promptPayId: body.promptPayId, bankName: body.bankName, accountNo: body.accountNo, accountName: body.accountName, instructions: body.instructions, isActive: body.isActive ?? true } });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPSERT_PAYMENT_SETTING", targetType: "StorePaymentSetting", targetId: setting.id });
    return ok(setting);
  });

  app.get("/payment-requests", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:read", "payments:manage", "payments:review"])) return;

    const rows = await prisma.customerPaymentRequest.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: { customer: true, contract: { include: { device: true } }, installment: true },
    });
    return ok(rows);
  });

  app.post("/installments/:id/payment-request", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:create", "payments:manage"])) return;

    const { id } = request.params as { id: string };
    const body = cleanEmptyStrings(request.body) as { amount?: number; expiresInDays?: number };
    const installment = await prisma.installment.findFirst({
      where: { id, contract: { organizationId: user.organizationId } },
      include: { contract: { include: { customer: true, organization: true } } },
    });
    if (!installment) return fail(reply, 404, "NOT_FOUND", "Installment not found");

    const remaining = Math.max(0, Number(installment.amount) - Number(installment.paidAmount));
    const amount = normalizePaymentAmount(body.amount ?? remaining);
    if (amount <= 0) return fail(reply, 400, "BAD_REQUEST", "Installment already paid");
    if (amount > remaining) return fail(reply, 400, "BAD_REQUEST", "Payment request amount cannot exceed remaining installment balance");

    const created = await prisma.customerPaymentRequest.create({
      data: {
        organizationId: user.organizationId,
        customerId: installment.contract.customerId,
        contractId: installment.contractId,
        installmentId: installment.id,
        amount,
        status: "OPEN",
        expiresAt: addDays(new Date(), Number(body.expiresInDays ?? 7)),
      },
    });

    const qr = await buildPaymentQr({ organizationId: user.organizationId, paymentRequestId: created.id, amount });
    const paymentUrl = `${customerPortalBaseUrl()}/?store=${encodeURIComponent(installment.contract.organization.slug ?? "")}&pay=${encodeURIComponent(created.id)}`;
    const updated = await prisma.customerPaymentRequest.update({ where: { id: created.id }, data: { qrPayload: qr.qrPayload, qrImageDataUrl: qr.qrImageDataUrl, paymentUrl } });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_PAYMENT_REQUEST", targetType: "CustomerPaymentRequest", targetId: updated.id, metadata: { installmentId: id, amount } });
    return ok(updated);
  });

  app.post("/payment-requests/:id/confirm", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:review", "payments:manage"])) return;

    const { id } = request.params as { id: string };
    const requestRow = await prisma.customerPaymentRequest.findFirst({ where: { id, organizationId: user.organizationId }, include: { installment: true } });
    if (!requestRow) return fail(reply, 404, "NOT_FOUND", "Payment request not found");

    try {
      const payment = await prisma.$transaction(async (tx) => {
        const changed = await tx.customerPaymentRequest.updateMany({
          where: { id, organizationId: user.organizationId, status: { in: ["OPEN", "SUBMITTED"] } },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        });
        if (changed.count !== 1) throw new Error("Payment request already closed");

        const createdPayment = await tx.payment.create({
          data: {
            organizationId: user.organizationId,
            contractId: requestRow.contractId,
            installmentId: requestRow.installmentId,
            amount: requestRow.amount,
            method: "PROMPTPAY",
            status: "CONFIRMED",
            slipUrl: requestRow.submittedSlipUrl,
            note: requestRow.submittedNote,
            providerRef: requestRow.id,
            paidAt: new Date(),
          },
        });

        await applyInstallmentPayment(tx, requestRow.installmentId, Number(requestRow.amount));
        await tx.storeLedgerEntry.create({ data: { organizationId: user.organizationId, paymentRequestId: id, type: "CUSTOMER_PAYMENT", amount: requestRow.amount, reference: createdPayment.id, note: "Customer payment confirmed" } });
        return createdPayment;
      });

      await recalculateContractStatus(requestRow.contractId);
      await audit({ organizationId: user.organizationId, actorId: user.id, action: "CONFIRM_CUSTOMER_PAYMENT_REQUEST", targetType: "CustomerPaymentRequest", targetId: id });
      return ok(payment);
    } catch (error) {
      return fail(reply, 409, "INVALID_STATE", error instanceof Error ? error.message : "Payment request already closed");
    }
  });

  app.post("/payment-requests/:id/reject", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    if (!requireAnyPermission(user, reply, ["payments:review", "payments:manage"])) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.customerPaymentRequest.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!existing) return fail(reply, 404, "NOT_FOUND", "Payment request not found");
    if (["CONFIRMED", "CANCELLED"].includes(existing.status)) return fail(reply, 409, "INVALID_STATE", "Payment request already closed");

    const updated = await prisma.customerPaymentRequest.update({ where: { id }, data: { status: "REJECTED", rejectedAt: new Date() } });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "REJECT_CUSTOMER_PAYMENT_REQUEST", targetType: "CustomerPaymentRequest", targetId: id });
    return ok(updated);
  });
}
