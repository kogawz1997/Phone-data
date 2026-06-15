import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerPortalRoutes(app: FastifyInstance) {
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

app.post("/portal/auth/login", async (request, reply) => {
  if (!rateLimit(request, reply, "portal-login", 20, 60_000)) return;
  const body = cleanEmptyStrings(request.body) as { storeSlug?: string; phone?: string; password?: string; inviteToken?: string };
  if (!body.storeSlug || !body.phone || !body.password) return fail(reply, 400, "BAD_REQUEST", "storeSlug, phone and password are required");
  const org = await prisma.organization.findFirst({ where: { OR: [{ slug: body.storeSlug }, { storeCode: body.storeSlug }] } });
  if (!org) return fail(reply, 404, "STORE_NOT_FOUND", "Store not found");
  const portalUser = await prisma.customerPortalUser.findFirst({ where: { organizationId: org.id, phone: body.phone, status: "ACTIVE" }, include: { customer: true } });
  if (!portalUser) return fail(reply, 401, "INVALID_LOGIN", "Phone or PIN is incorrect");
  const valid = await bcrypt.compare(body.password, portalUser.passwordHash);
  if (!valid) return fail(reply, 401, "INVALID_LOGIN", "Phone or PIN is incorrect");
  await prisma.customerPortalUser.update({ where: { id: portalUser.id }, data: { lastLoginAt: new Date() } });
  if (body.inviteToken) await prisma.customerPortalInvite.updateMany({ where: { token: body.inviteToken, organizationId: org.id, portalUserId: portalUser.id, revokedAt: null }, data: { acceptedAt: new Date() } });
  const sessionUser = { id: portalUser.id, organizationId: org.id, email: portalUser.email ?? `${portalUser.phone}@customer.local`, role: "CUSTOMER", name: portalUser.customer.fullName };
  const token = signSession(sessionUser, JWT_SECRET);
  return ok({ token, customer: portalUser.customer, store: { id: org.id, name: org.name, slug: org.slug, phone: org.phone } });
});


app.get("/portal/me", { preHandler: requireCustomerAuth }, async (request) => {
  const portalUser = (request as CustomerPortalRequest).portalUser;
  const data = await prisma.customerPortalUser.findFirst({ where: { id: portalUser.id }, include: { customer: true, organization: true } });
  return ok({ customer: data?.customer, store: data?.organization });
});


app.get("/portal/contracts", { preHandler: requireCustomerAuth }, async (request) => {
  const portalUser = (request as CustomerPortalRequest).portalUser;
  const contracts = await prisma.contract.findMany({
    where: { organizationId: portalUser.organizationId, customerId: portalUser.customerId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, device: true, installments: { orderBy: { installmentNo: "asc" } }, payments: true },
  });
  return ok(contracts);
});


app.get("/portal/payment-requests", { preHandler: requireCustomerAuth }, async (request) => {
  const portalUser = (request as CustomerPortalRequest).portalUser;
  const rows = await prisma.customerPaymentRequest.findMany({
    where: { organizationId: portalUser.organizationId, customerId: portalUser.customerId, status: { in: ["OPEN", "SUBMITTED", "REJECTED"] } },
    orderBy: { createdAt: "desc" },
    include: { contract: { include: { device: true } }, installment: true },
  });
  return ok(rows);
});


app.get("/portal/payment-requests/:id", { preHandler: requireCustomerAuth }, async (request, reply) => {
  const portalUser = (request as CustomerPortalRequest).portalUser;
  const { id } = request.params as { id: string };
  const row = await prisma.customerPaymentRequest.findFirst({ where: { id, organizationId: portalUser.organizationId, customerId: portalUser.customerId }, include: { contract: { include: { device: true } }, installment: true } });
  if (!row) return fail(reply, 404, "NOT_FOUND", "Payment request not found");
  return ok(row);
});


app.post("/portal/payment-requests/:id/submit-slip", { preHandler: requireCustomerAuth }, async (request, reply) => {
  const portalUser = (request as CustomerPortalRequest).portalUser;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { slipUrl?: string; note?: string };
  const row = await prisma.customerPaymentRequest.findFirst({ where: { id, organizationId: portalUser.organizationId, customerId: portalUser.customerId } });
  if (!row) return fail(reply, 404, "NOT_FOUND", "Payment request not found");
  if (!["OPEN", "REJECTED"].includes(row.status)) return fail(reply, 409, "INVALID_STATE", "Payment request is not open");
  const updated = await prisma.customerPaymentRequest.update({ where: { id }, data: { status: "SUBMITTED", submittedSlipUrl: body.slipUrl, submittedNote: body.note, submittedAt: new Date() } });
  await prisma.payment.create({ data: { organizationId: portalUser.organizationId, contractId: row.contractId, installmentId: row.installmentId, amount: row.amount, method: "PROMPTPAY", status: "VERIFYING", slipUrl: body.slipUrl, providerRef: row.id, note: body.note } });
  await audit({ organizationId: portalUser.organizationId, action: "PORTAL_SUBMIT_PAYMENT_REQUEST", targetType: "CustomerPaymentRequest", targetId: id });
  return ok(updated);
});


app.get("/portal/contracts/:contractNo", async (request, reply) => {
  if (process.env.PORTAL_LEGACY_LOOKUP_ENABLED !== "true") return fail(reply, 410, "LEGACY_PORTAL_DISABLED", "Use customer portal login instead");
  const { contractNo } = request.params as { contractNo: string };
  const { phone } = request.query as { phone?: string };
  if (!phone) return fail(reply, 400, "BAD_REQUEST", "phone is required");

  const contract = await prisma.contract.findFirst({
    where: { contractNo, customer: { phone } },
    include: { customer: true, device: true, installments: true, payments: true },
  });

  if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");
  return ok(contract);
});


app.post("/portal/contracts/:contractId/payments", async (request, reply) => {
  if (process.env.PORTAL_LEGACY_LOOKUP_ENABLED !== "true") return fail(reply, 410, "LEGACY_PORTAL_DISABLED", "Use payment request flow instead");
  const { contractId } = request.params as { contractId: string };
  const parsed = createPaymentSchema.omit({ contractId: true }).safeParse(cleanEmptyStrings(request.body));
  if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", parsed.error.message);

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");

  const payment = await prisma.payment.create({
    data: {
      organizationId: contract.organizationId,
      contractId,
      installmentId: parsed.data.installmentId,
      amount: normalizePaymentAmount(parsed.data.amount),
      method: parsed.data.method,
      slipUrl: parsed.data.slipUrl,
      note: parsed.data.note,
      status: parsed.data.slipUrl ? "VERIFYING" : "PENDING",
    },
  });

  await audit({ organizationId: contract.organizationId, action: "PORTAL_CREATE_PAYMENT", targetType: "Payment", targetId: payment.id });
  return ok(payment);
});


app.get("/portal/contracts/:contractNo/print", async (request, reply) => {
  if (process.env.PORTAL_LEGACY_LOOKUP_ENABLED !== "true") return fail(reply, 410, "LEGACY_PORTAL_DISABLED", "Use customer portal login instead");
  const { contractNo } = request.params as { contractNo: string };
  const { phone } = request.query as { phone?: string };
  if (!phone) return fail(reply, 400, "BAD_REQUEST", "phone is required");
  const contract = await prisma.contract.findFirst({
    where: { contractNo, customer: { phone } },
    include: { customer: true, device: true, installments: { orderBy: { installmentNo: "asc" } } },
  });
  if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");
  reply.header("Content-Type", "text/html; charset=utf-8");
  return reply.send(renderContractHtml(contract));
});

}
