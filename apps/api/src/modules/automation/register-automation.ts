import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerAutomationRoutes(app: FastifyInstance) {
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

app.get("/automation/rules", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  await ensureDefaultOperationalTemplates(user.organizationId);
  return ok(await prisma.automationRule.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }));
});


app.post("/automation/rules", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { name?: string; trigger?: any; action?: any; configJson?: unknown; status?: any };
  if (!body.name || !body.trigger || !body.action) return fail(reply, 400, "BAD_REQUEST", "name, trigger, action are required");
  return ok(await prisma.automationRule.create({ data: { organizationId: user.organizationId, name: body.name, trigger: body.trigger, action: body.action, configJson: (body.configJson ?? {}) as Prisma.InputJsonValue, status: body.status ?? "ACTIVE" } }));
});


app.patch("/automation/rules/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const existing = await prisma.automationRule.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Rule not found");
  const body = cleanEmptyStrings(request.body) as { status?: any; configJson?: unknown; name?: string };
  return ok(await prisma.automationRule.update({ where: { id }, data: { status: body.status, configJson: body.configJson as Prisma.InputJsonValue, name: body.name } }));
});

}
