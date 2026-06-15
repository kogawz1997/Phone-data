import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerAppleCustodyRoutes(app: FastifyInstance) {
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

app.get("/apple-custody", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const records = await prisma.appleCustodyRecord.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { updatedAt: "desc" },
    include: { device: { include: { contract: { include: { customer: true, installments: true } } } }, contract: { include: { customer: true } } },
  });
  return ok(records);
});


app.post("/devices/:id/apple-custody", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { appleIdAlias?: string; findMyStatus?: any; activationStatus?: any; evidenceUrls?: string[]; notes?: string };
  const device = await prisma.device.findFirst({ where: { id, organizationId: user.organizationId }, include: { contract: true } });
  if (!device) return fail(reply, 404, "NOT_FOUND", "Device not found");
  if (!["IOS", "IPADOS", "MACOS"].includes(String(device.platform))) return fail(reply, 400, "NOT_APPLE_DEVICE", "iCloud custody is only for Apple devices");

  const record = await prisma.$transaction(async (tx) => {
    await tx.device.update({ where: { id }, data: { controlMode: "ICLOUD_CUSTODY", controlStatus: "ENROLLED" } });
    return tx.appleCustodyRecord.upsert({
      where: { deviceId: id },
      create: {
        organizationId: user.organizationId,
        deviceId: id,
        contractId: device.contract?.id,
        appleIdAlias: body.appleIdAlias,
        findMyStatus: body.findMyStatus ?? "UNKNOWN",
        activationStatus: body.activationStatus ?? "UNKNOWN",
        evidenceUrls: body.evidenceUrls ?? [],
        lastCheckedAt: new Date(),
        checkedByUserId: user.id,
        notes: body.notes,
      },
      update: {
        contractId: device.contract?.id,
        appleIdAlias: body.appleIdAlias,
        findMyStatus: body.findMyStatus ?? "UNKNOWN",
        activationStatus: body.activationStatus ?? "UNKNOWN",
        evidenceUrls: body.evidenceUrls ?? [],
        lastCheckedAt: new Date(),
        checkedByUserId: user.id,
        notes: body.notes,
        status: "ACTIVE",
      },
      include: { device: true, contract: true },
    });
  });

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPSERT_APPLE_CUSTODY", targetType: "Device", targetId: id, metadata: { appleIdAlias: body.appleIdAlias, findMyStatus: body.findMyStatus, activationStatus: body.activationStatus } as Prisma.InputJsonObject });
  return ok(record);
});


app.patch("/apple-custody/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { appleIdAlias?: string; findMyStatus?: any; activationStatus?: any; status?: any; evidenceUrls?: string[]; notes?: string };
  const existing = await prisma.appleCustodyRecord.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Apple custody record not found");
  const updated = await prisma.appleCustodyRecord.update({
    where: { id },
    data: {
      appleIdAlias: body.appleIdAlias,
      findMyStatus: body.findMyStatus,
      activationStatus: body.activationStatus,
      status: body.status,
      evidenceUrls: body.evidenceUrls,
      notes: body.notes,
      lastCheckedAt: new Date(),
      checkedByUserId: user.id,
    },
    include: { device: { include: { contract: { include: { customer: true } } } }, contract: true },
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_APPLE_CUSTODY", targetType: "AppleCustodyRecord", targetId: id, metadata: body as Prisma.InputJsonObject });
  return ok(updated);
});


app.post("/apple-custody/:id/mark-release-due", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const record = await prisma.appleCustodyRecord.findFirst({ where: { id, organizationId: user.organizationId }, include: { device: true, contract: true } });
  if (!record) return fail(reply, 404, "NOT_FOUND", "Apple custody record not found");
  const updated = await prisma.appleCustodyRecord.update({ where: { id }, data: { status: "RELEASE_DUE", releaseDueAt: new Date() }, include: { device: true, contract: true } });
  if (record.contractId) {
    await prisma.deviceAction.create({ data: { deviceId: record.deviceId, contractId: record.contractId, type: "REQUEST_RELEASE", reason: "เครื่องใช้ iCloud ร้าน: ลูกค้าจ่ายครบ/ต้องปลด iCloud ร้านและอัปโหลดหลักฐานการปลด", status: "PENDING_APPROVAL" } }).catch(() => null);
  }
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "APPLE_CUSTODY_RELEASE_DUE", targetType: "AppleCustodyRecord", targetId: id });
  return ok(updated);
});


app.post("/apple-custody/:id/mark-released", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { releaseEvidenceUrls?: string[]; notes?: string };
  const record = await prisma.appleCustodyRecord.findFirst({ where: { id, organizationId: user.organizationId }, include: { device: true, contract: true } });
  if (!record) return fail(reply, 404, "NOT_FOUND", "Apple custody record not found");
  const updated = await prisma.$transaction(async (tx) => {
    await tx.device.update({ where: { id: record.deviceId }, data: { controlStatus: "RELEASED", deviceStatus: record.contract?.status === "PAID_OFF" ? "RELEASED" : record.device.deviceStatus } });
    if (record.contractId) {
      await tx.contract.update({ where: { id: record.contractId }, data: { releaseCompletedAt: new Date(), legalTitleStatus: "TRANSFER_PENDING" } });
    }
    return tx.appleCustodyRecord.update({
      where: { id },
      data: { status: "RELEASED", findMyStatus: "OFF", activationStatus: "OFF", releasedAt: new Date(), releaseCheckedBy: user.id, releaseEvidenceUrls: body.releaseEvidenceUrls ?? [], notes: body.notes ?? record.notes },
      include: { device: { include: { contract: { include: { customer: true } } } }, contract: true },
    });
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "APPLE_CUSTODY_RELEASED", targetType: "AppleCustodyRecord", targetId: id, metadata: body as Prisma.InputJsonObject });
  return ok(updated);
});

}
