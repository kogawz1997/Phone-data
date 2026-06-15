import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerDevicesRoutes(app: FastifyInstance) {
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

app.get("/devices", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const devices = await prisma.device.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { contract: { include: { customer: true } }, appleCustodyRecord: true },
  });
  return ok(devices);
});


app.post("/devices", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const parsed = createDeviceSchema.safeParse(cleanEmptyStrings(request.body));
  if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", parsed.error.message);

  const { icloudAppleIdAlias, icloudFindMyStatus, icloudActivationStatus, ...deviceInput } = parsed.data;

  const created = await prisma.$transaction(async (tx) => {
    const device = await tx.device.create({
      data: {
        organizationId: user.organizationId,
        ...deviceInput,
        controlStatus: deviceInput.controlMode === "ICLOUD_CUSTODY" ? "ENROLLED" : "NOT_ENROLLED",
      },
    });

    if (deviceInput.controlMode === "ICLOUD_CUSTODY") {
      await tx.appleCustodyRecord.create({
        data: {
          organizationId: user.organizationId,
          deviceId: device.id,
          appleIdAlias: icloudAppleIdAlias,
          findMyStatus: (icloudFindMyStatus as any) ?? "UNKNOWN",
          activationStatus: (icloudActivationStatus as any) ?? "UNKNOWN",
          lastCheckedAt: new Date(),
          checkedByUserId: user.id,
          notes: "นำเครื่องที่ใช้ iCloud ร้านอยู่แล้วเข้าระบบการเงินร้านแบบ Legacy iCloud Custody",
        },
      });
    }

    return device;
  });

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_DEVICE", targetType: "Device", targetId: created.id, metadata: { controlMode: created.controlMode } as Prisma.InputJsonObject });
  return ok(created);
});


app.get("/devices/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const device = await prisma.device.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { contract: { include: { customer: true, installments: true } }, actions: true, events: true, appleCustodyRecord: true },
  });
  if (!device) return fail(reply, 404, "NOT_FOUND", "Device not found");
  return ok(device);
});

}
