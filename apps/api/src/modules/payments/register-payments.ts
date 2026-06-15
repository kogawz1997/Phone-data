import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerPaymentsRoutes(app: FastifyInstance) {
  const {
    crypto,
    fs,
    path,
    bcrypt,
    QRCode,
    prisma,
    signSession,
    verifySession,
    createContractSchema,
    createCustomerSchema,
    createDeviceSchema,
    createPaymentSchema,
    loginSchema,
    calculateInstallments,
    generateContractNo,
    getOverdueLevel,
    createPromptPayEmvPayload,
    normalizePaymentAmount,
    assertSafeDeviceAction,
    buildUnsignedMdmMobileConfig,
    createAndroidProvider,
    createAppleProvider,
    createDeviceControlAdapter,
    getDualProviderStatus,
    sendNotification,
    getPermissionsForRole,
    API_ROUTE_GROUPS,
    countRoutes,
    deviceAdapter,
    JWT_SECRET,
    PORT,
    IS_PRODUCTION,
    ALLOWED_ORIGINS,
    rateLimit,
    constantTimeEquals,
    requireSharedSecret,
    envStatus,
    safeUploadName,
    saveBase64Upload,
    maybeSignMobileConfig,
    buildAppleCommandPlist,
    providerTypeForPlatform,
    providerNameFromEnv,
    buildDeviceContext,
    ok,
    cleanEmptyStrings,
    fail,
    getUserFromRequest,
    requireAuth,
    requireCustomerAuth,
    audit,
    isPlatformOwner,
    ensurePlatformOwner,
    makeSlug,
    planMonthlyFee,
    planDeviceLimit,
    addDays,
    customerPortalBaseUrl,
    makeCustomerPortalShareUrl,
    generateCustomerPin,
    buildPaymentQr,
    createDefaultOnboarding,
    integrationCatalog,
    ensureDefaultIntegrations,
    ensureDefaultOperationalTemplates,
    riskGradeFromScore,
    calculateCustomerRisk,
    buildStoreHealth,
    createInvoiceNo,
    csvEscape,
    toCsv,
    htmlEscape,
    formatThaiDate,
    formatBaht,
    renderContractHtml,
    recalculateContractStatus
  } = ctx as any;

app.get("/payments", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const payments = await prisma.payment.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { contract: { include: { customer: true } }, installment: true },
  });
  return ok(payments);
});


app.post("/payments", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const parsed = createPaymentSchema.safeParse(cleanEmptyStrings(request.body));
  if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", parsed.error.message);

  const contract = await prisma.contract.findFirst({ where: { id: parsed.data.contractId, organizationId: user.organizationId } });
  if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");

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
  const { id } = request.params as { id: string };
  const payment = await prisma.payment.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { installment: true, contract: true },
  });
  if (!payment) return fail(reply, 404, "NOT_FOUND", "Payment not found");
  if (payment.status === "CONFIRMED") return fail(reply, 409, "ALREADY_CONFIRMED", "Payment already confirmed");

  const amount = Number(payment.amount);

  const updated = await prisma.$transaction(async (tx) => {
    const confirmed = await tx.payment.update({ where: { id }, data: { status: "CONFIRMED", paidAt: new Date() } });

    if (payment.installmentId && payment.installment) {
      const newPaidAmount = Number(payment.installment.paidAmount) + amount;
      const fullyPaid = newPaidAmount >= Number(payment.installment.amount);
      await tx.installment.update({
        where: { id: payment.installmentId },
        data: {
          paidAmount: newPaidAmount,
          status: fullyPaid ? "PAID" : "PARTIAL",
          paidAt: fullyPaid ? new Date() : null,
        },
      });
    }

    return confirmed;
  });

  await recalculateContractStatus(payment.contractId);
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CONFIRM_PAYMENT", targetType: "Payment", targetId: payment.id });
  return ok(updated);
});


app.post("/payments/:id/reject", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const payment = await prisma.payment.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!payment) return fail(reply, 404, "NOT_FOUND", "Payment not found");
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
  if (!["paid", "confirmed", "success", "CONFIRMED"].includes(String(body.status ?? "").toLowerCase())) {
    await audit({ organizationId: payment.organizationId, action: "PAYMENT_WEBHOOK_IGNORED", targetType: "Payment", targetId: payment.id, metadata: body as Prisma.InputJsonObject });
    return ok({ ignored: true });
  }

  const amount = normalizePaymentAmount(body.amount ?? Number(payment.amount));
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: "CONFIRMED", paidAt: body.paidAt ? new Date(body.paidAt) : new Date(), providerRef: body.providerRef ?? payment.providerRef } });
    if (payment.installmentId && payment.installment) {
      const newPaidAmount = Number(payment.installment.paidAmount) + amount;
      await tx.installment.update({
        where: { id: payment.installmentId },
        data: { paidAmount: newPaidAmount, status: newPaidAmount >= Number(payment.installment.amount) ? "PAID" : "PARTIAL", paidAt: newPaidAmount >= Number(payment.installment.amount) ? new Date() : payment.installment.paidAt },
      });
    }
  });
  await recalculateContractStatus(payment.contractId);
  await audit({ organizationId: payment.organizationId, action: "PAYMENT_WEBHOOK_CONFIRMED", targetType: "Payment", targetId: payment.id, metadata: body as Prisma.InputJsonObject });
  return ok({ confirmed: true, paymentId: payment.id });
});


app.get("/store/payment-settings", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const settings = await prisma.storePaymentSetting.findMany({ where: { organizationId: user.organizationId }, orderBy: { updatedAt: "desc" } });
  return ok(settings);
});


app.put("/store/payment-settings", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { provider?: string; displayName?: string; promptPayId?: string; bankName?: string; accountNo?: string; accountName?: string; instructions?: string; isActive?: boolean };
  const provider = ["PROMPTPAY_MANUAL", "BANK_TRANSFER", "PAYMENT_GATEWAY"].includes(String(body.provider || "")) ? String(body.provider) : "PROMPTPAY_MANUAL";
  const existing = await prisma.storePaymentSetting.findFirst({ where: { organizationId: user.organizationId, provider: provider as any }, orderBy: { updatedAt: "desc" } });
  const setting = existing
    ? await prisma.storePaymentSetting.update({ where: { id: existing.id }, data: { displayName: body.displayName || existing.displayName, promptPayId: body.promptPayId, bankName: body.bankName, accountNo: body.accountNo, accountName: body.accountName, instructions: body.instructions, isActive: body.isActive ?? true } })
    : await prisma.storePaymentSetting.create({ data: { organizationId: user.organizationId, provider: provider as any, displayName: body.displayName || "PromptPay / Bank Transfer", promptPayId: body.promptPayId, bankName: body.bankName, accountNo: body.accountNo, accountName: body.accountName, instructions: body.instructions, isActive: body.isActive ?? true } });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPSERT_PAYMENT_SETTING", targetType: "StorePaymentSetting", targetId: setting.id });
  return ok(setting);
});

// Customer portal users are tenant-scoped. Store A cannot manage or see Store B customers.


app.get("/payment-requests", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const rows = await prisma.customerPaymentRequest.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, contract: { include: { device: true } }, installment: true },
  });
  return ok(rows);
});


app.post("/installments/:id/payment-request", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
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
  const { id } = request.params as { id: string };
  const requestRow = await prisma.customerPaymentRequest.findFirst({ where: { id, organizationId: user.organizationId }, include: { installment: true } });
  if (!requestRow) return fail(reply, 404, "NOT_FOUND", "Payment request not found");
  if (["CONFIRMED", "CANCELLED"].includes(requestRow.status)) return fail(reply, 409, "INVALID_STATE", "Payment request already closed");
  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({ data: { organizationId: user.organizationId, contractId: requestRow.contractId, installmentId: requestRow.installmentId, amount: requestRow.amount, method: "PROMPTPAY", status: "CONFIRMED", slipUrl: requestRow.submittedSlipUrl, note: requestRow.submittedNote, providerRef: requestRow.id, paidAt: new Date() } });
    const newPaidAmount = Number(requestRow.installment.paidAmount) + Number(requestRow.amount);
    const fullyPaid = newPaidAmount >= Number(requestRow.installment.amount);
    await tx.installment.update({ where: { id: requestRow.installmentId }, data: { paidAmount: newPaidAmount, status: fullyPaid ? "PAID" : "PARTIAL", paidAt: fullyPaid ? new Date() : null } });
    await tx.customerPaymentRequest.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
    await tx.storeLedgerEntry.create({ data: { organizationId: user.organizationId, paymentRequestId: id, type: "CUSTOMER_PAYMENT", amount: requestRow.amount, reference: createdPayment.id, note: "Customer payment confirmed" } });
    return createdPayment;
  });
  await recalculateContractStatus(requestRow.contractId);
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CONFIRM_CUSTOMER_PAYMENT_REQUEST", targetType: "CustomerPaymentRequest", targetId: id });
  return ok(payment);
});


app.post("/payment-requests/:id/reject", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const existing = await prisma.customerPaymentRequest.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Payment request not found");
  const updated = await prisma.customerPaymentRequest.update({ where: { id }, data: { status: "REJECTED", rejectedAt: new Date() } });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "REJECT_CUSTOMER_PAYMENT_REQUEST", targetType: "CustomerPaymentRequest", targetId: id });
  return ok(updated);
});

}
