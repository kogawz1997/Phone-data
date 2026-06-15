import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerTemplatesRoutes(app: FastifyInstance) {
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

app.get("/templates", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  await ensureDefaultOperationalTemplates(user.organizationId);
  const [documents, notifications] = await Promise.all([
    prisma.templateCenterItem.findMany({ where: { OR: [{ organizationId: user.organizationId }, { organizationId: null }] }, orderBy: [{ type: "asc" }, { updatedAt: "desc" }] }),
    prisma.notificationTemplate.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ key: "asc" }, { channel: "asc" }] }),
  ]);
  return ok({ documents, notifications });
});


app.post("/templates/documents", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { type?: any; title?: string; version?: string; body?: string };
  if (!body.type || !body.title || !body.body) return fail(reply, 400, "BAD_REQUEST", "type, title, body are required");
  return ok(await prisma.templateCenterItem.create({ data: { organizationId: user.organizationId, type: body.type, title: body.title, version: body.version ?? "1.0", body: body.body } }));
});


app.post("/templates/notifications", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { key?: string; channel?: any; title?: string; body?: string };
  if (!body.key || !body.title || !body.body) return fail(reply, 400, "BAD_REQUEST", "key, title, body are required");
  return ok(await prisma.notificationTemplate.upsert({ where: { organizationId_key_channel: { organizationId: user.organizationId, key: body.key, channel: body.channel ?? "LINE" } }, create: { organizationId: user.organizationId, key: body.key, channel: body.channel ?? "LINE", title: body.title, body: body.body }, update: { title: body.title, body: body.body } }));
});


app.get("/consent/snapshots", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  return ok(await prisma.consentDocumentSnapshot.findMany({ where: { organizationId: user.organizationId }, include: { customer: true, contract: true }, orderBy: { createdAt: "desc" }, take: 200 }));
});


app.post("/consent/snapshots", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { customerId?: string; contractId?: string; type?: any; version?: string; title?: string; body?: string; accepted?: boolean };
  if (!body.customerId || !body.type || !body.title || !body.body) return fail(reply, 400, "BAD_REQUEST", "customerId, type, title, body are required");
  const customer = await prisma.customer.findFirst({ where: { id: body.customerId, organizationId: user.organizationId } });
  if (!customer) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  return ok(await prisma.consentDocumentSnapshot.create({ data: { organizationId: user.organizationId, customerId: body.customerId, contractId: body.contractId, type: body.type, version: body.version ?? "1.0", title: body.title, body: body.body, acceptedAt: body.accepted ? new Date() : undefined, ipAddress: getClientIp(request), userAgent: String(request.headers["user-agent"] ?? "") } }));
});

}
