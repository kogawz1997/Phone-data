import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerOpsRoutes(app: FastifyInstance) {
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

app.post("/jobs/overdue-check", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const today = new Date();
  const installments = await prisma.installment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "DUE_SOON"] },
      contract: { organizationId: user.organizationId, status: { notIn: ["PAID_OFF", "CANCELLED"] } },
    },
    include: { contract: true },
  });

  let updatedInstallments = 0;
  let createdActions = 0;

  for (const item of installments) {
    const daysUntilDue = Math.ceil((item.dueDate.getTime() - today.getTime()) / 86_400_000);
    const daysOverdue = Math.ceil((today.getTime() - item.dueDate.getTime()) / 86_400_000);

    if (daysUntilDue <= 3 && daysUntilDue >= 0 && item.status === "PENDING") {
      await prisma.installment.update({ where: { id: item.id }, data: { status: "DUE_SOON" } });
      updatedInstallments++;
    }

    if (item.dueDate < today) {
      await prisma.installment.update({ where: { id: item.id }, data: { status: "OVERDUE" } });
      updatedInstallments++;

      const level = getOverdueLevel(daysOverdue);
      await prisma.contract.update({ where: { id: item.contractId }, data: { status: level as any } });

      const existing = await prisma.deviceAction.findFirst({
        where: {
          contractId: item.contractId,
          type: "SEND_REMINDER",
          reason: { contains: `งวดที่ ${item.installmentNo}` },
        },
      });

      if (!existing) {
        await prisma.deviceAction.create({
          data: {
            deviceId: item.contract.deviceId,
            contractId: item.contractId,
            type: "SEND_REMINDER",
            reason: `แจ้งเตือนค้างชำระงวดที่ ${item.installmentNo} เกิน ${daysOverdue} วัน`,
            status: "PENDING_APPROVAL",
          },
        });
        createdActions++;
      }

      if (daysOverdue >= 14) {
        const restrict = await prisma.deviceAction.findFirst({
          where: { contractId: item.contractId, type: { in: ["REQUEST_LIMITED_MODE", "REQUEST_RESTRICT"] }, status: { in: ["PENDING_APPROVAL", "APPROVED", "COMPLETED"] } },
        });
        if (!restrict) {
          await prisma.deviceAction.create({
            data: {
              deviceId: item.contract.deviceId,
              contractId: item.contractId,
              type: "REQUEST_LIMITED_MODE",
              reason: `ค้างชำระเกิน ${daysOverdue} วัน ต้อง review ก่อนดำเนินการจำกัดการใช้งานตามสัญญา Lease-to-own ผ่าน provider ที่ถูกต้อง`,
              status: "PENDING_APPROVAL",
            },
          });
          createdActions++;
        }
      }
    }
  }

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "RUN_OVERDUE_CHECK", targetType: "Job", targetId: "overdue-check", metadata: { updatedInstallments, createdActions } });
  return ok({ updatedInstallments, createdActions });
});


app.post("/jobs/overdue-check/cron", async (request, reply) => {
  const secret = request.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return fail(reply, 401, "UNAUTHORIZED", "Invalid cron secret");
  }

  const organizations = await prisma.organization.findMany({ select: { id: true } });
  const today = new Date();
  let totalUpdatedInstallments = 0;
  let totalCreatedActions = 0;

  for (const organization of organizations) {
    const installments = await prisma.installment.findMany({
      where: {
        status: { in: ["PENDING", "PARTIAL", "DUE_SOON"] },
        contract: { organizationId: organization.id, status: { notIn: ["PAID_OFF", "CANCELLED"] } },
      },
      include: { contract: true },
    });

    for (const item of installments) {
      const daysUntilDue = Math.ceil((item.dueDate.getTime() - today.getTime()) / 86_400_000);
      const daysOverdue = Math.ceil((today.getTime() - item.dueDate.getTime()) / 86_400_000);

      if (daysUntilDue <= 3 && daysUntilDue >= 0 && item.status === "PENDING") {
        await prisma.installment.update({ where: { id: item.id }, data: { status: "DUE_SOON" } });
        totalUpdatedInstallments++;
      }

      if (item.dueDate < today) {
        await prisma.installment.update({ where: { id: item.id }, data: { status: "OVERDUE" } });
        totalUpdatedInstallments++;
        const level = getOverdueLevel(daysOverdue);
        await prisma.contract.update({ where: { id: item.contractId }, data: { status: level as any } });

        const existing = await prisma.deviceAction.findFirst({
          where: { contractId: item.contractId, type: "SEND_REMINDER", reason: { contains: `งวดที่ ${item.installmentNo}` } },
        });
        if (!existing) {
          await prisma.deviceAction.create({
            data: { deviceId: item.contract.deviceId, contractId: item.contractId, type: "SEND_REMINDER", reason: `แจ้งเตือนค้างชำระงวดที่ ${item.installmentNo} เกิน ${daysOverdue} วัน`, status: "PENDING_APPROVAL" },
          });
          totalCreatedActions++;
        }
      }
    }

    await audit({ organizationId: organization.id, action: "RUN_OVERDUE_CRON", targetType: "Job", targetId: "overdue-check/cron", metadata: { totalUpdatedInstallments, totalCreatedActions } });
  }

  return ok({ organizations: organizations.length, updatedInstallments: totalUpdatedInstallments, createdActions: totalCreatedActions });
});


app.get("/ops/route-map", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (user.role !== "PLATFORM_OWNER") return fail(reply, 403, "FORBIDDEN", "Platform owner only");
  return ok({ totalRoutesDocumented: countRoutes(), groups: API_ROUTE_GROUPS });
});


app.get("/ops/readiness", async () => {
  const dbOk = await prisma.user.count().then(() => true).catch(() => false);
  const users = dbOk ? await prisma.user.count().catch(() => 0) : 0;
  const orgs = dbOk ? await prisma.organization.count().catch(() => 0) : 0;
  const platformOwners = dbOk ? await prisma.user.count({ where: { role: "PLATFORM_OWNER" } }).catch(() => 0) : 0;
  const stores = dbOk ? await prisma.organization.count({ where: { storeCode: { not: "PLATFORM" } } }).catch(() => 0) : 0;
  const mdmStatus = getDualProviderStatus();
  const checks = {
    database: { ok: dbOk, detail: dbOk ? `users=${users}, organizations=${orgs}` : "database unavailable" },
    auth: { ok: Boolean(process.env.JWT_SECRET && !/change|replace/i.test(process.env.JWT_SECRET)), detail: "JWT_SECRET must be long and unique" },
    admin: { ok: platformOwners > 0, detail: "bootstrap:prod must create platform owner admin" },
    saas: { ok: orgs >= 1, detail: `stores=${stores}, platformOwners=${platformOwners}` },
    cors: { ok: !IS_PRODUCTION || ALLOWED_ORIGINS.length > 0, detail: ALLOWED_ORIGINS.join(",") || "development wildcard" },
    cron: { ok: Boolean(process.env.CRON_SECRET && !/change|replace/i.test(process.env.CRON_SECRET)), detail: "CRON_SECRET protects overdue cron" },
    payment: { ok: process.env.PAYMENT_PROVIDER === "manual" || Boolean(process.env.PAYMENT_WEBHOOK_SECRET), detail: process.env.PAYMENT_PROVIDER ?? "manual" },
    notification: { ok: process.env.NOTIFICATION_PROVIDER === "local" || Boolean(process.env.NOTIFICATION_WEBHOOK_URL || process.env.LINE_CHANNEL_ACCESS_TOKEN), detail: process.env.NOTIFICATION_PROVIDER ?? "local" },
    android: { ok: mdmStatus.android.status === "READY", detail: mdmStatus.android.missing },
    apple: { ok: mdmStatus.apple.status === "READY", detail: mdmStatus.apple.missing },
  };
  const okCount = Object.values(checks).filter((item: any) => item.ok).length;
  return ok({
    status: dbOk && okCount >= 6 ? "ready" : "degraded",
    readinessPercent: Math.round((okCount / Object.keys(checks).length) * 100),
    database: dbOk ? "ok" : "error",
    deviceControlProvider: process.env.DEVICE_CONTROL_PROVIDER ?? "local",
    stores,
    platformOwners,
    checks,
    mdmProviders: mdmStatus,
    now: new Date().toISOString(),
  });
});


app.get("/ops/go-live-gates", async () => {
  const [stores, customers, contracts, portalUsers, paymentSettings, integrations, devices, mdmEnrollments, appleCustody, disputes] = await Promise.all([
    prisma.organization.count({ where: { storeCode: { not: "PLATFORM" } } }).catch(() => 0),
    prisma.customer.count().catch(() => 0),
    prisma.contract.count().catch(() => 0),
    prisma.customerPortalUser.count().catch(() => 0),
    prisma.storePaymentSetting.count().catch(() => 0),
    prisma.integrationConnector.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    prisma.device.count().catch(() => 0),
    prisma.mdmEnrollment.count().catch(() => 0),
    prisma.appleCustodyRecord.count().catch(() => 0),
    prisma.disputeCase.count().catch(() => 0),
  ]);
  const gates = [
    { key: "platform_owner", ok: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD), detail: "ตั้งค่า ADMIN_EMAIL/ADMIN_PASSWORD แล้ว" },
    { key: "stores", ok: stores >= 0, detail: `stores=${stores}` },
    { key: "customer_portal", ok: process.env.ENABLE_CUSTOMER_PORTAL !== "false", detail: `portalUsers=${portalUsers}` },
    { key: "payment", ok: paymentSettings > 0 || process.env.PROMPTPAY_ID || process.env.PAYMENT_GATEWAY_PROVIDER, detail: `paymentSettings=${paymentSettings}` },
    { key: "storage", ok: Boolean(process.env.STORAGE_PROVIDER), detail: `storage=${process.env.STORAGE_PROVIDER || "missing"}` },
    { key: "android_mdm", ok: process.env.ENABLE_MDM_ANDROID === "true" ? Boolean(process.env.ANDROID_MANAGEMENT_ENTERPRISE_NAME) : true, detail: `mdmEnrollments=${mdmEnrollments}` },
    { key: "apple_mdm", ok: process.env.ENABLE_MDM_APPLE === "true" ? Boolean(process.env.APPLE_MDM_APNS_TOPIC) : true, detail: `appleCustody=${appleCustody}` },
    { key: "legal", ok: true, detail: "ต้องให้ทนายตรวจเอกสารก่อนใช้งานเงินจริง" },
    { key: "data", ok: true, detail: `customers=${customers}, contracts=${contracts}, devices=${devices}, disputes=${disputes}, activeIntegrations=${integrations}` },
  ];
  const score = Math.round((gates.filter((g) => g.ok).length / gates.length) * 100);
  return ok({ score, gates });
});

}
