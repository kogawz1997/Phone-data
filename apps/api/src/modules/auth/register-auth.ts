import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerAuthRoutes(app: FastifyInstance) {
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

app.post("/auth/login", async (request, reply) => {
  if (!rateLimit(request, reply, "login", 10, 60_000)) return;
  const parsed = loginSchema.safeParse(cleanEmptyStrings(request.body));
  if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", parsed.error.message);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return fail(reply, 401, "INVALID_LOGIN", "Email or password is incorrect");

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return fail(reply, 401, "INVALID_LOGIN", "Email or password is incorrect");

  const sessionUser = {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = signSession(sessionUser, JWT_SECRET);
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "LOGIN", targetType: "User", targetId: user.id });
  return ok({ token, user: sessionUser });
});


app.get("/auth/me", { preHandler: requireAuth }, async (request) => ok((request as AuthedRequest).user));


app.get("/auth/permissions", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  return ok({ role: user.role, permissions: getPermissionsForRole(user.role) });
});

}
