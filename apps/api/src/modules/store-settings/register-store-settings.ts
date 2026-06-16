import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

function validateLogoDataUrl(value: string) {
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value)) throw new Error("Only PNG, JPG or WEBP logo images are allowed");
  if (value.length > 1_600_000) throw new Error("Logo is too large. Please use an image below about 1MB");
  return value;
}

const profileSettingKeys = [
  "slug", "brandColor", "welcomeText", "contactLine", "supportPhone", "releasePolicy",
  "website", "logoDataUrl", "businessHours", "openDays", "systemProfileName", "systemTheme", "systemAccent",
  "invoiceFooter", "qrPaymentEnabled", "notifyLine", "notifySms", "notifyEmail",
  "twoFactorEnabled", "loginAlerts", "sessionControl", "rolePreset",
  "contractFooter", "termsTemplate", "privacyNote", "documentVersion", "autoGenerateReceipt", "requireSlipBeforeReview",
  "profileVisibility", "portalSeoTitle", "portalSeoDescription", "supportPolicy", "dataRetentionDays",
] as const;

export async function registerStoreSettingsRoutes(app: FastifyInstance) {
  const { prisma, ok, fail, cleanEmptyStrings, audit, requireAuth, makeSlug } = ctx as any;

  async function getStoreConfig(organizationId: string) {
    const [org, connector] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.integrationConnector.findUnique({ where: { organizationId_provider: { organizationId, provider: "WEBHOOK" } } }),
    ]);
    return { org, connector, config: (connector?.configJson ?? {}) as Record<string, unknown> };
  }

  function buildDefaults(config: Record<string, unknown>, org: any) {
    return {
      ...config,
      slug: String(config.slug ?? org?.slug ?? ""),
      brandColor: String(config.brandColor ?? "#38bdf8"),
      welcomeText: String(config.welcomeText ?? "ตรวจสอบยอด ชำระงวด และดูสัญญาได้จากหน้านี้"),
      contactLine: String(config.contactLine ?? ""),
      supportPhone: String(config.supportPhone ?? org?.phone ?? ""),
      releasePolicy: String(config.releasePolicy ?? "เมื่อชำระครบ ร้านจะตรวจสอบยอดและดำเนินการตามขั้นตอน"),
      website: String(config.website ?? ""),
      logoDataUrl: String(config.logoDataUrl ?? ""),
      businessHours: String(config.businessHours ?? "10:00 - 20:00"),
      openDays: String(config.openDays ?? "จันทร์,อังคาร,พุธ,พฤหัส,ศุกร์,เสาร์"),
      systemProfileName: String(config.systemProfileName ?? org?.name ?? ""),
      systemTheme: String(config.systemTheme ?? "dark"),
      systemAccent: String(config.systemAccent ?? "cyan-violet"),
      invoiceFooter: String(config.invoiceFooter ?? "ขอบคุณที่ใช้บริการ"),
      qrPaymentEnabled: String(config.qrPaymentEnabled ?? "true"),
      notifyLine: String(config.notifyLine ?? "true"),
      notifySms: String(config.notifySms ?? "false"),
      notifyEmail: String(config.notifyEmail ?? "true"),
      twoFactorEnabled: String(config.twoFactorEnabled ?? "false"),
      loginAlerts: String(config.loginAlerts ?? "true"),
      sessionControl: String(config.sessionControl ?? "true"),
      rolePreset: String(config.rolePreset ?? "owner-admin-staff"),
      contractFooter: String(config.contractFooter ?? "ผู้เช่ารับทราบเงื่อนไขการชำระเงิน การติดตามงวด และการปลดเครื่องเมื่อชำระครบ"),
      termsTemplate: String(config.termsTemplate ?? "สัญญานี้ใช้สำหรับการเช่าซื้อ/ผ่อนชำระอุปกรณ์ตามรายละเอียดที่ร้านกำหนด"),
      privacyNote: String(config.privacyNote ?? "ร้านใช้ข้อมูลลูกค้าเพื่อจัดการสัญญา การชำระเงิน การแจ้งเตือน และการบริการหลังการขาย"),
      documentVersion: String(config.documentVersion ?? "1.0"),
      autoGenerateReceipt: String(config.autoGenerateReceipt ?? "true"),
      requireSlipBeforeReview: String(config.requireSlipBeforeReview ?? "true"),
      profileVisibility: String(config.profileVisibility ?? "private"),
      portalSeoTitle: String(config.portalSeoTitle ?? org?.name ?? "Customer Portal"),
      portalSeoDescription: String(config.portalSeoDescription ?? "ตรวจสอบยอด ชำระงวด และดูข้อมูลสัญญา"),
      supportPolicy: String(config.supportPolicy ?? "ติดต่อร้านผ่าน LINE หรือเบอร์โทรในเวลาทำการ"),
      dataRetentionDays: String(config.dataRetentionDays ?? "365"),
    };
  }

  async function upsertConfig(organizationId: string, configJson: Record<string, unknown>) {
    return prisma.integrationConnector.upsert({
      where: { organizationId_provider: { organizationId, provider: "WEBHOOK" } },
      create: { organizationId, provider: "WEBHOOK", category: "AUTOMATION", displayName: "Customer Portal & Store Profile Settings", status: "ACTIVE", configJson, lastCheckedAt: new Date() },
      update: { displayName: "Customer Portal & Store Profile Settings", status: "ACTIVE", configJson, lastCheckedAt: new Date(), lastError: null },
    });
  }

  app.get("/store/portal-settings", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    const { org, config } = await getStoreConfig(user.organizationId);
    return ok(buildDefaults(config, org));
  });

  app.put("/store/portal-settings", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const body = cleanEmptyStrings(request.body) as Record<string, unknown> & { slug?: string; brandColor?: string };
    const { config } = await getStoreConfig(user.organizationId);

    const slug = body.slug ? makeSlug(String(body.slug)) : undefined;
    if (slug && slug.length < 3) return fail(reply, 400, "BAD_REQUEST", "slug must be at least 3 characters");
    if (slug) {
      const duplicate = await prisma.organization.findFirst({ where: { slug, id: { not: user.organizationId } } });
      if (duplicate) return fail(reply, 409, "SLUG_TAKEN", "This portal slug is already used");
      await prisma.organization.update({ where: { id: user.organizationId }, data: { slug } });
    }

    const configJson: Record<string, unknown> = { ...config };
    for (const key of profileSettingKeys) if (body[key] !== undefined) configJson[key] = body[key];
    if (typeof configJson.logoDataUrl === "string" && configJson.logoDataUrl.startsWith("data:image/")) {
      try { configJson.logoDataUrl = validateLogoDataUrl(configJson.logoDataUrl); }
      catch (error) { return fail(reply, 400, "BAD_IMAGE", error instanceof Error ? error.message : "Invalid logo image"); }
    }
    configJson.slug = slug ?? body.slug ?? config.slug ?? "";
    configJson.brandColor = body.brandColor ?? config.brandColor ?? "#38bdf8";

    const connector = await upsertConfig(user.organizationId, configJson);
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_STORE_PROFILE_SETTINGS", targetType: "IntegrationConnector", targetId: connector.id });
    return ok(configJson);
  });

  app.post("/store/profile-logo", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const body = cleanEmptyStrings(request.body) as { logoDataUrl?: string };
    if (!body.logoDataUrl) return fail(reply, 400, "BAD_REQUEST", "logoDataUrl is required");
    let logoDataUrl = "";
    try { logoDataUrl = validateLogoDataUrl(body.logoDataUrl); }
    catch (error) { return fail(reply, 400, "BAD_IMAGE", error instanceof Error ? error.message : "Invalid logo image"); }
    const { config } = await getStoreConfig(user.organizationId);
    const connector = await upsertConfig(user.organizationId, { ...config, logoDataUrl });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_STORE_LOGO", targetType: "IntegrationConnector", targetId: connector.id });
    return ok({ logoDataUrl });
  });
}
