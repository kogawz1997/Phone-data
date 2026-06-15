import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerCoreRoutes(app: FastifyInstance) {
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

app.addContentTypeParser(["application/xml", "text/xml", "application/x-apple-aspen-mdm-checkin"], { parseAs: "string" }, (_request, body, done) => {
  done(null, body);
});


app.get("/health", async () => ok({ status: "ok", time: new Date().toISOString() }));


app.get("/uploads/:folder/:filename", async (request, reply) => {
  const { folder, filename } = request.params as { folder: string; filename: string };
  const uploadRoot = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
  const filePath = path.join(uploadRoot, safeUploadName(folder), safeUploadName(filename));
  if (!fs.existsSync(filePath)) return fail(reply, 404, "NOT_FOUND", "Upload not found");
  return reply.send(fs.createReadStream(filePath));
});


app.post("/uploads/base64", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { filename?: string; contentBase64?: string; folder?: string; targetType?: string; targetId?: string };
  if (!body.filename || !body.contentBase64) return fail(reply, 400, "BAD_REQUEST", "filename and contentBase64 are required");
  const saved = await saveBase64Upload({ filename: body.filename, contentBase64: body.contentBase64, folder: body.folder ?? "documents" });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPLOAD_FILE", targetType: body.targetType ?? "Upload", targetId: body.targetId ?? saved.url, metadata: { url: saved.url, size: saved.size, folder: body.folder } as Prisma.InputJsonObject });
  return ok(saved);
});

}
