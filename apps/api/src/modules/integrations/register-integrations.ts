import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

type IntegrationStatus = "SETUP_REQUIRED" | "CONNECTING" | "ACTIVE" | "DEGRADED" | "FAILED" | "DISABLED";

type ProviderTestResult = {
  status: IntegrationStatus;
  missing: string[];
  required: string[];
  checks: Array<{ key: string; ok: boolean; message: string }>;
  setupNext: string[];
  docs: string[];
};

function present(key: string) {
  return Boolean(process.env[key] && String(process.env[key]).trim());
}

function envCheck(keys: string[]) {
  return keys.map((key) => ({ key, ok: present(key), message: present(key) ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า" }));
}

function asStatus(missing: string[], hardError = false): IntegrationStatus {
  if (hardError) return "FAILED";
  if (missing.length === 0) return "ACTIVE";
  return "DEGRADED";
}

function setupPlanFor(provider: string) {
  const plans: Record<string, string[]> = {
    ANDROID_MANAGEMENT: [
      "สร้าง Google Cloud Project และเปิด Android Management API",
      "สร้าง Service Account JSON แล้ววาง path ใน ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON",
      "เปิด Android Enterprise signup จากหน้า Platform/MDM แล้วบันทึก enterprise name",
      "ทดสอบสร้าง enrollment token และสแกน QR กับเครื่อง Android factory reset",
    ],
    APPLE_BUSINESS_MANAGER: [
      "สมัคร Apple Business Manager และ verify องค์กร",
      "เพิ่ม MDM server และดาวน์โหลด ADE server token",
      "สร้าง APNs MDM Push Certificate และ profile signing certificate",
      "ทดสอบ mobileconfig, check-in, connect และ APNs push กับเครื่อง supervised/ADE จริง",
    ],
    ICLOUD_CUSTODY_TRACKING: [
      "เปิด ENABLE_ICLOUD_CUSTODY=true",
      "ให้ร้านบันทึก Apple ID alias, Find My/Activation Lock status และหลักฐานก่อนส่งมอบ",
      "จ่ายครบต้องขึ้น release queue และบังคับแนบหลักฐานว่าปลดแล้ว",
    ],
    PROMPTPAY_MANUAL: [
      "กรอก PROMPTPAY_ID หรือให้แต่ละร้านตั้งค่า PromptPay ในหน้า Payment Settings",
      "สร้าง payment request ต่อค่างวดและให้ลูกค้าแนบสลิป",
      "ร้าน confirm/reject ผ่านหน้า Payment Requests",
    ],
    PAYMENT_GATEWAY: [
      "เลือก PAYMENT_GATEWAY_PROVIDER",
      "สมัคร merchant กับ provider แล้วกรอก key/secret ตามเอกสาร provider",
      "ตั้ง webhook URL ไปที่ /payments/webhook และใส่ PAYMENT_GATEWAY_WEBHOOK_SECRET",
      "ทดสอบ webhook ด้วยรายการเงิน 1 บาทก่อนเปิดจริง",
    ],
    SLIP_VERIFICATION: [
      "เลือก SLIP_VERIFICATION_PROVIDER=manual|webhook|bank_api",
      "ถ้าใช้ webhook ให้ตั้ง SLIP_VERIFICATION_WEBHOOK_URL และ secret",
      "ทดสอบสลิปจริง/สลิปซ้ำ/ยอดไม่ตรง ก่อนเปิด auto confirm",
    ],
    LINE_MESSAGING: [
      "สร้าง LINE Official Account และเปิด Messaging API",
      "ใส่ LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET",
      "เชื่อม LINE user id ของลูกค้าใน portal หรือผ่าน rich menu/LIFF ภายหลัง",
    ],
    SMS_GATEWAY: [
      "เลือก SMS_PROVIDER",
      "กรอก SMS_PROVIDER_KEY หรือ SMS_WEBHOOK_URL",
      "ทดสอบข้อความ OTP/แจ้งเตือนงวดกับเบอร์ภายในก่อนเปิดร้าน",
    ],
    EMAIL_SMTP: [
      "ตั้ง SMTP_URL และ EMAIL_FROM",
      "ทดสอบ reset password/invoice/receipt email",
    ],
    STORAGE_S3_R2: [
      "เลือก STORAGE_PROVIDER=local|s3|r2|supabase",
      "สำหรับ production แนะนำ r2/s3 และตั้ง bucket เป็น private",
      "ทดสอบอัปโหลดสลิป รูปเครื่อง เอกสาร และ signed URL",
    ],
    WEBHOOK: [
      "กรอก NOTIFICATION_WEBHOOK_URL และ secret",
      "ทดสอบ event payment_confirmed, overdue_created, device_release_requested",
    ],
  };
  return plans[provider] ?? ["ตรวจ docs/EXTERNAL_INTEGRATION_WIZARD_TH.md แล้วกรอก env ที่เกี่ยวข้อง"];
}

function docsFor(provider: string) {
  const item = (ctx.integrationCatalog as any[]).find((x) => x.provider === provider);
  return item?.docs ?? ["docs/EXTERNAL_INTEGRATION_WIZARD_TH.md"];
}

function testProvider(provider: string): ProviderTestResult {
  let required: string[] = [];
  let extraChecks: Array<{ key: string; ok: boolean; message: string }> = [];
  let hardError = false;

  if (provider === "ANDROID_MANAGEMENT") {
    const status = ctx.createAndroidProvider().getSetupStatus();
    required = ["ANDROID_MANAGEMENT_PROJECT_ID", "ANDROID_MANAGEMENT_ENTERPRISE_NAME", "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON", "ANDROID_MANAGEMENT_CALLBACK_URL"];
    extraChecks = [{ key: "android_provider", ok: status.missing.length === 0, message: status.missing.length ? `ยังขาด ${status.missing.join(", ")}` : "Android provider setup looks ready" }];
  } else if (provider === "APPLE_BUSINESS_MANAGER") {
    const status = ctx.createAppleProvider().getSetupStatus();
    required = ["APPLE_MDM_BASE_URL", "APPLE_MDM_APNS_CERT_PATH", "APPLE_MDM_APNS_KEY_PATH", "APPLE_MDM_APNS_TOPIC", "APPLE_ABM_SERVER_TOKEN_PATH", "APPLE_MDM_PROFILE_SIGNING_CERT_PATH", "APPLE_MDM_PROFILE_SIGNING_KEY_PATH"];
    extraChecks = [{ key: "apple_provider", ok: status.missing.length === 0, message: status.missing.length ? `ยังขาด ${status.missing.join(", ")}` : "Apple MDM setup looks ready" }];
  } else if (provider === "ICLOUD_CUSTODY_TRACKING") {
    required = ["ENABLE_ICLOUD_CUSTODY"];
    extraChecks = [{ key: "mode", ok: process.env.ENABLE_ICLOUD_CUSTODY !== "false", message: "เป็น workflow tracking/evidence ไม่เก็บรหัส iCloud" }];
  } else if (provider === "PROMPTPAY_MANUAL") {
    required = ["PROMPTPAY_ID"];
    const v = ctx.validatePromptPayId(process.env.PROMPTPAY_ID || process.env.DEFAULT_PROMPTPAY_ID || "");
    extraChecks = [{ key: "promptpay_format", ok: v.ok, message: v.message }];
  } else if (provider === "PAYMENT_GATEWAY") {
    const status = ctx.getPaymentGatewaySetupStatus();
    required = status.required;
    extraChecks = [{ key: "payment_gateway", ok: status.missing.length === 0, message: status.missing.length ? `ยังขาด ${status.missing.join(", ")}` : "พร้อมรับ webhook ระดับ configuration" }];
  } else if (provider === "SLIP_VERIFICATION") {
    const status = ctx.getSlipVerificationSetupStatus();
    required = status.required;
    extraChecks = [{ key: "slip_verification", ok: status.missing.length === 0, message: status.missing.length ? `ยังขาด ${status.missing.join(", ")}` : "พร้อมตรวจสลิปตาม provider mode" }];
  } else if (provider === "LINE_MESSAGING") {
    required = ["LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_SECRET"];
  } else if (provider === "SMS_GATEWAY") {
    required = process.env.SMS_PROVIDER === "webhook" ? ["SMS_WEBHOOK_URL"] : ["SMS_PROVIDER"];
  } else if (provider === "EMAIL_SMTP") {
    required = ["SMTP_URL", "EMAIL_FROM"];
  } else if (provider === "STORAGE_S3_R2") {
    const status = ctx.getStorageSetupStatus();
    required = status.required;
    extraChecks = [{ key: "storage_provider", ok: status.missing.length === 0, message: status.missing.length ? `ยังขาด ${status.missing.join(", ")}` : `Storage provider ${status.provider} ready` }];
  } else if (provider === "WEBHOOK") {
    required = ["NOTIFICATION_WEBHOOK_URL", "NOTIFICATION_WEBHOOK_SECRET"];
  }

  const checks = [...envCheck(required), ...extraChecks];
  const missing = checks.filter((x) => !x.ok).map((x) => x.key);
  return { status: asStatus(missing, hardError), missing, required, checks, setupNext: setupPlanFor(provider), docs: docsFor(provider) };
}

export async function registerIntegrationsRoutes(app: FastifyInstance) {
  const { prisma, ok, cleanEmptyStrings, fail, requireAuth, audit, ensureDefaultIntegrations, integrationCatalog, ensurePlatformOwner } = ctx as any;

  app.get("/integrations/catalog", { preHandler: requireAuth }, async () => ok(integrationCatalog));

  app.get("/integrations/readiness", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    await ensureDefaultIntegrations(user.organizationId);
    const connectors = await prisma.integrationConnector.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ category: "asc" }, { provider: "asc" }] });
    const results = connectors.map((c: any) => ({ connector: c, test: testProvider(String(c.provider)) }));
    const active = results.filter((x: any) => x.test.status === "ACTIVE").length;
    const score = Math.round((active / Math.max(results.length, 1)) * 100);
    return ok({ score, active, total: results.length, results });
  });

  app.get("/integrations", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    await ensureDefaultIntegrations(user.organizationId);
    return ok(await prisma.integrationConnector.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ category: "asc" }, { provider: "asc" }] }));
  });

  app.get("/integrations/:id/setup-plan", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const { id } = request.params as { id: string };
    const connector = await prisma.integrationConnector.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!connector) return fail(reply, 404, "NOT_FOUND", "Integration connector not found");
    return ok({ connector, plan: setupPlanFor(String(connector.provider)), docs: docsFor(String(connector.provider)), test: testProvider(String(connector.provider)) });
  });

  app.patch("/integrations/:id", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const { id } = request.params as { id: string };
    const body = cleanEmptyStrings(request.body) as { status?: any; configJson?: any; displayName?: string; lastError?: string };
    const existing = await prisma.integrationConnector.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!existing) return fail(reply, 404, "NOT_FOUND", "Integration not found");
    const connector = await prisma.integrationConnector.update({ where: { id }, data: { status: body.status, configJson: body.configJson, displayName: body.displayName, lastError: body.lastError, lastCheckedAt: new Date() } });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_INTEGRATION", targetType: "IntegrationConnector", targetId: id, metadata: { provider: connector.provider, status: connector.status } });
    return ok(connector);
  });

  app.post("/integrations/:id/test", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const { id } = request.params as { id: string };
    const connector = await prisma.integrationConnector.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!connector) return fail(reply, 404, "NOT_FOUND", "Integration connector not found");
    const result = testProvider(String(connector.provider));
    const updated = await prisma.integrationConnector.update({ where: { id }, data: { status: result.status as any, lastCheckedAt: new Date(), lastError: result.missing.length ? `Missing/check failed: ${result.missing.join(", ")}` : null, configJson: { ...((connector.configJson as object) || {}), lastTest: result } } });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "TEST_INTEGRATION", targetType: "IntegrationConnector", targetId: id, metadata: { provider: connector.provider, status: result.status, missing: result.missing } });
    return ok({ connector: updated, ...result });
  });

  app.post("/integrations/test-all", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    await ensureDefaultIntegrations(user.organizationId);
    const connectors = await prisma.integrationConnector.findMany({ where: { organizationId: user.organizationId } });
    const results = [];
    for (const connector of connectors) {
      const result = testProvider(String(connector.provider));
      await prisma.integrationConnector.update({ where: { id: connector.id }, data: { status: result.status as any, lastCheckedAt: new Date(), lastError: result.missing.length ? `Missing/check failed: ${result.missing.join(", ")}` : null } });
      results.push({ connectorId: connector.id, provider: connector.provider, ...result });
    }
    return ok({ results });
  });

  app.get("/platform/integrations/readiness", { preHandler: requireAuth }, async (request, reply) => {
    await ensurePlatformOwner(request, reply);
    const stores = await prisma.organization.findMany({ include: { integrationConnectors: true }, orderBy: { createdAt: "desc" } });
    const rows = stores.map((store: any) => {
      const connectors = store.integrationConnectors || [];
      const active = connectors.filter((c: any) => c.status === "ACTIVE").length;
      const failed = connectors.filter((c: any) => c.status === "FAILED").length;
      const setupRequired = connectors.filter((c: any) => c.status === "SETUP_REQUIRED" || c.status === "DEGRADED").length;
      const score = Math.round((active / Math.max(connectors.length, 1)) * 100);
      return { store: { id: store.id, name: store.name, slug: store.slug, status: store.status }, score, active, failed, setupRequired, connectors };
    });
    return ok({ stores: rows, score: Math.round(rows.reduce((sum: number, r: any) => sum + r.score, 0) / Math.max(rows.length, 1)) });
  });
}
