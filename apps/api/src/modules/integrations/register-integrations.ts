import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";
import { encryptionStatus, maskConfigJson, mergeConfigKeepingExistingSecrets, unprotectConfigJson } from "../../core/secure-config";

type IntegrationStatus = "SETUP_REQUIRED" | "CONNECTING" | "ACTIVE" | "DEGRADED" | "FAILED" | "DISABLED";

type ProviderTestResult = {
  status: IntegrationStatus;
  missing: string[];
  required: string[];
  checks: Array<{ key: string; ok: boolean; message: string }>;
  setupNext: string[];
  docs: string[];
};

const providerRequiredConfig: Record<string, string[]> = {
  PROMPTPAY_MANUAL: ["promptPayId"],
  PAYMENT_GATEWAY: ["provider", "webhookSecret"],
  SLIP_VERIFICATION: ["provider"],
  LINE_MESSAGING: ["channelAccessToken", "channelSecret"],
  SMS_GATEWAY: ["provider"],
  EMAIL_SMTP: ["smtpUrl", "emailFrom"],
  STORAGE_S3_R2: ["provider"],
  WEBHOOK: ["webhookUrl", "webhookSecret"],
};

function present(key: string) {
  return Boolean(process.env[key] && String(process.env[key]).trim());
}

function envCheck(keys: string[]) {
  return keys.map((key) => ({ key, ok: present(key), message: present(key) ? "ตั้งค่าแล้วจาก ENV" : "ยังไม่ได้ตั้งค่าใน ENV" }));
}

function configCheck(config: Record<string, unknown>, keys: string[]) {
  return keys.map((key) => ({ key, ok: Boolean(config[key] && String(config[key]).trim()), message: config[key] ? "ตั้งค่าแล้วในหน้าร้าน" : "ยังไม่ได้กรอกในหน้าร้าน" }));
}

function asStatus(missing: string[], hardError = false): IntegrationStatus {
  if (hardError) return "FAILED";
  if (missing.length === 0) return "ACTIVE";
  return "DEGRADED";
}

function setupPlanFor(provider: string) {
  const plans: Record<string, string[]> = {
    ANDROID_MANAGEMENT: [
      "จัดการเฉพาะฝั่ง Platform/Owner เท่านั้น ไม่ให้ร้านกรอก key เอง",
      "สร้าง Google Cloud Project และเปิด Android Management API",
      "บันทึก Service Account / Enterprise / Callback URL ในหน้า Platform MDM",
      "ทดสอบ enrollment token กับเครื่อง Android factory reset",
    ],
    APPLE_BUSINESS_MANAGER: [
      "จัดการเฉพาะฝั่ง Platform/Owner เท่านั้น ไม่ให้ร้านกรอก key เอง",
      "สมัคร Apple Business Manager และ verify องค์กร",
      "เพิ่ม MDM server, ADE token, APNs certificate และ signing certificate",
      "ทดสอบ mobileconfig, check-in และ APNs push กับเครื่อง supervised/ADE จริง",
    ],
    ICLOUD_CUSTODY_TRACKING: [
      "ใช้เป็น workflow หลักฐาน ไม่เก็บรหัส iCloud",
      "ให้ร้านบันทึก Apple ID alias, Find My/Activation Lock status และหลักฐานก่อนส่งมอบ",
      "จ่ายครบต้องขึ้น release queue และบังคับแนบหลักฐานว่าปลดแล้ว",
    ],
    PROMPTPAY_MANUAL: [
      "กรอก PromptPay ID และชื่อบัญชีใน Store Settings",
      "สร้าง payment request ต่อค่างวดและให้ลูกค้าแนบสลิป",
      "ร้าน confirm/reject ผ่านหน้า Payment Requests",
    ],
    PAYMENT_GATEWAY: [
      "เลือก provider ใน Store Settings",
      "กรอก public key, secret key และ webhook secret ของร้าน",
      "ตั้ง webhook URL ไปที่ /payments/webhook และทดสอบรายการ 1 บาทก่อนเปิดจริง",
    ],
    SLIP_VERIFICATION: [
      "เลือก manual/webhook/bank_api/slip provider",
      "กรอก webhook URL หรือ API token ตาม provider",
      "ทดสอบสลิปจริง/สลิปซ้ำ/ยอดไม่ตรง ก่อนเปิด auto confirm",
    ],
    LINE_MESSAGING: [
      "สร้าง LINE Official Account และเปิด Messaging API",
      "กรอก Channel Access Token และ Channel Secret ใน Store Settings",
      "เชื่อม LINE user id ของลูกค้าใน portal หรือผ่าน rich menu/LIFF ภายหลัง",
    ],
    SMS_GATEWAY: [
      "เลือก SMS provider",
      "กรอก sender name, API key หรือ webhook URL",
      "ทดสอบข้อความ OTP/แจ้งเตือนงวดกับเบอร์ภายในก่อนเปิดร้าน",
    ],
    EMAIL_SMTP: [
      "กรอก SMTP URL, Email From และ Reply-To",
      "ทดสอบ reset password/invoice/receipt email",
    ],
    STORAGE_S3_R2: [
      "เลือก local/s3/r2/supabase",
      "สำหรับ production แนะนำ r2/s3 และตั้ง bucket เป็น private",
      "ทดสอบอัปโหลดสลิป รูปเครื่อง เอกสาร และ signed URL",
    ],
    WEBHOOK: [
      "กรอก Notification Webhook URL และ secret",
      "ทดสอบ event payment_confirmed, overdue_created, device_release_requested",
    ],
  };
  return plans[provider] ?? ["ตรวจ docs/EXTERNAL_INTEGRATION_WIZARD_TH.md แล้วกรอกค่าที่เกี่ยวข้อง"];
}

function docsFor(provider: string) {
  const item = (ctx.integrationCatalog as any[]).find((x) => x.provider === provider);
  return item?.docs ?? ["docs/EXTERNAL_INTEGRATION_WIZARD_TH.md"];
}

function testProvider(provider: string, rawConfig: unknown = {}): ProviderTestResult {
  const config = unprotectConfigJson(rawConfig) as Record<string, unknown>;
  let required: string[] = [];
  let checks: Array<{ key: string; ok: boolean; message: string }> = [];
  let extraChecks: Array<{ key: string; ok: boolean; message: string }> = [];
  let hardError = false;

  if (provider === "ANDROID_MANAGEMENT") {
    const status = ctx.createAndroidProvider().getSetupStatus();
    required = ["ANDROID_MANAGEMENT_PROJECT_ID", "ANDROID_MANAGEMENT_ENTERPRISE_NAME", "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON", "ANDROID_MANAGEMENT_CALLBACK_URL"];
    checks = envCheck(required);
    extraChecks = [{ key: "android_provider", ok: status.missing.length === 0, message: status.missing.length ? `ยังขาด ${status.missing.join(", ")}` : "Android provider setup looks ready" }];
  } else if (provider === "APPLE_BUSINESS_MANAGER") {
    const status = ctx.createAppleProvider().getSetupStatus();
    required = ["APPLE_MDM_BASE_URL", "APPLE_MDM_APNS_CERT_PATH", "APPLE_MDM_APNS_KEY_PATH", "APPLE_MDM_APNS_TOPIC", "APPLE_ABM_SERVER_TOKEN_PATH", "APPLE_MDM_PROFILE_SIGNING_CERT_PATH", "APPLE_MDM_PROFILE_SIGNING_KEY_PATH"];
    checks = envCheck(required);
    extraChecks = [{ key: "apple_provider", ok: status.missing.length === 0, message: status.missing.length ? `ยังขาด ${status.missing.join(", ")}` : "Apple MDM setup looks ready" }];
  } else if (provider === "ICLOUD_CUSTODY_TRACKING") {
    required = ["ENABLE_ICLOUD_CUSTODY"];
    checks = envCheck(required);
    extraChecks = [{ key: "mode", ok: process.env.ENABLE_ICLOUD_CUSTODY !== "false", message: "เป็น workflow tracking/evidence ไม่เก็บรหัส iCloud" }];
  } else {
    required = providerRequiredConfig[provider] ?? [];
    checks = configCheck(config, required);

    if (provider === "PROMPTPAY_MANUAL") {
      const promptPayId = String(config.promptPayId || process.env.PROMPTPAY_ID || process.env.DEFAULT_PROMPTPAY_ID || "");
      const v = ctx.validatePromptPayId(promptPayId);
      extraChecks = [{ key: "promptpay_format", ok: v.ok, message: v.message }];
    } else if (provider === "PAYMENT_GATEWAY") {
      extraChecks = [{ key: "payment_gateway", ok: Boolean(config.provider && (config.webhookSecret || config.secretKey)), message: config.provider ? "ตั้งค่า payment provider แล้ว" : "ยังไม่ได้เลือก payment provider" }];
    } else if (provider === "SLIP_VERIFICATION") {
      extraChecks = [{ key: "slip_verification", ok: Boolean(config.provider), message: config.provider ? "ตั้งค่า slip verification mode แล้ว" : "ยังไม่ได้เลือก slip verification provider" }];
    } else if (provider === "STORAGE_S3_R2") {
      extraChecks = [{ key: "storage_provider", ok: Boolean(config.provider), message: config.provider ? `Storage provider ${config.provider} configured` : "ยังไม่ได้เลือก storage provider" }];
    }
  }

  const allChecks = [...checks, ...extraChecks];
  const missing = allChecks.filter((x) => !x.ok).map((x) => x.key);
  return { status: asStatus(missing, hardError), missing, required, checks: allChecks, setupNext: setupPlanFor(provider), docs: docsFor(provider) };
}

function publicConnector(connector: any) {
  return { ...connector, configJson: maskConfigJson(connector.configJson) };
}

export async function registerIntegrationsRoutes(app: FastifyInstance) {
  const { prisma, ok, cleanEmptyStrings, fail, requireAuth, audit, ensureDefaultIntegrations, integrationCatalog, ensurePlatformOwner } = ctx as any;

  app.get("/integrations/catalog", { preHandler: requireAuth }, async () => ok(integrationCatalog));

  app.get("/integrations/security", { preHandler: requireAuth }, async () => ok({ encryption: encryptionStatus(), masking: true, note: "Integration secrets are encrypted before saving and masked in API responses." }));

  app.get("/integrations/readiness", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    await ensureDefaultIntegrations(user.organizationId);
    const connectors = await prisma.integrationConnector.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ category: "asc" }, { provider: "asc" }] });
    const results = connectors.map((c: any) => ({ connector: publicConnector(c), test: testProvider(String(c.provider), c.configJson) }));
    const active = results.filter((x: any) => x.test.status === "ACTIVE").length;
    const score = Math.round((active / Math.max(results.length, 1)) * 100);
    return ok({ score, active, total: results.length, results, security: { secretsMasked: true, encryption: encryptionStatus() } });
  });

  app.get("/integrations", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    await ensureDefaultIntegrations(user.organizationId);
    const connectors = await prisma.integrationConnector.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ category: "asc" }, { provider: "asc" }] });
    return ok(connectors.map(publicConnector));
  });

  app.get("/integrations/:id/setup-plan", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const { id } = request.params as { id: string };
    const connector = await prisma.integrationConnector.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!connector) return fail(reply, 404, "NOT_FOUND", "Integration connector not found");
    return ok({ connector: publicConnector(connector), plan: setupPlanFor(String(connector.provider)), docs: docsFor(String(connector.provider)), test: testProvider(String(connector.provider), connector.configJson) });
  });

  app.patch("/integrations/:id", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const { id } = request.params as { id: string };
    const body = cleanEmptyStrings(request.body) as { status?: any; configJson?: any; displayName?: string; lastError?: string };
    const existing = await prisma.integrationConnector.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!existing) return fail(reply, 404, "NOT_FOUND", "Integration not found");

    const protectedConfig = body.configJson === undefined ? existing.configJson : mergeConfigKeepingExistingSecrets(existing.configJson, body.configJson);
    const result = testProvider(String(existing.provider), protectedConfig);
    const connector = await prisma.integrationConnector.update({
      where: { id },
      data: {
        status: body.status ?? result.status,
        configJson: protectedConfig,
        displayName: body.displayName,
        lastError: body.lastError ?? (result.missing.length ? `Missing/check failed: ${result.missing.join(", ")}` : null),
        lastCheckedAt: new Date(),
      },
    });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_INTEGRATION", targetType: "IntegrationConnector", targetId: id, metadata: { provider: connector.provider, status: connector.status, changedKeys: Object.keys(body.configJson ?? {}) } });
    return ok({ ...publicConnector(connector), test: result });
  });

  app.post("/integrations/:id/test", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const { id } = request.params as { id: string };
    const connector = await prisma.integrationConnector.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!connector) return fail(reply, 404, "NOT_FOUND", "Integration connector not found");
    const result = testProvider(String(connector.provider), connector.configJson);
    const updated = await prisma.integrationConnector.update({ where: { id }, data: { status: result.status as any, lastCheckedAt: new Date(), lastError: result.missing.length ? `Missing/check failed: ${result.missing.join(", ")}` : null, configJson: { ...((connector.configJson as object) || {}), lastTest: result } } });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "TEST_INTEGRATION", targetType: "IntegrationConnector", targetId: id, metadata: { provider: connector.provider, status: result.status, missing: result.missing } });
    return ok({ connector: publicConnector(updated), ...result });
  });

  app.post("/integrations/test-all", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    await ensureDefaultIntegrations(user.organizationId);
    const connectors = await prisma.integrationConnector.findMany({ where: { organizationId: user.organizationId } });
    const results = [];
    for (const connector of connectors) {
      const result = testProvider(String(connector.provider), connector.configJson);
      await prisma.integrationConnector.update({ where: { id: connector.id }, data: { status: result.status as any, lastCheckedAt: new Date(), lastError: result.missing.length ? `Missing/check failed: ${result.missing.join(", ")}` : null } });
      results.push({ connectorId: connector.id, provider: connector.provider, ...result });
    }
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "TEST_ALL_INTEGRATIONS", targetType: "IntegrationConnector", targetId: user.organizationId, metadata: { count: results.length } });
    return ok({ results });
  });

  app.get("/platform/integrations/readiness", { preHandler: requireAuth }, async (request, reply) => {
    await ensurePlatformOwner((request as AuthedRequest).user, reply);
    const stores = await prisma.organization.findMany({ include: { integrationConnectors: true }, orderBy: { createdAt: "desc" } });
    const rows = stores.map((store: any) => {
      const connectors = store.integrationConnectors || [];
      const active = connectors.filter((c: any) => c.status === "ACTIVE").length;
      const failed = connectors.filter((c: any) => c.status === "FAILED").length;
      const setupRequired = connectors.filter((c: any) => c.status === "SETUP_REQUIRED" || c.status === "DEGRADED").length;
      const score = Math.round((active / Math.max(connectors.length, 1)) * 100);
      return { store: { id: store.id, name: store.name, slug: store.slug, status: store.status }, score, active, failed, setupRequired, connectors: connectors.map(publicConnector) };
    });
    return ok({ stores: rows, score: Math.round(rows.reduce((sum: number, r: any) => sum + r.score, 0) / Math.max(rows.length, 1)), security: { secretsMasked: true, encryption: encryptionStatus() } });
  });
}
