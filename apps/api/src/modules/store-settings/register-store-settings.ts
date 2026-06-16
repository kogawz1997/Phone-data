import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerStoreSettingsRoutes(app: FastifyInstance) {
  const { prisma, ok, fail, cleanEmptyStrings, audit, requireAuth, makeSlug } = ctx as any;

  app.get("/store/portal-settings", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    const [org, connector] = await Promise.all([
      prisma.organization.findUnique({ where: { id: user.organizationId } }),
      prisma.integrationConnector.findUnique({ where: { organizationId_provider: { organizationId: user.organizationId, provider: "WEBHOOK" } } }),
    ]);
    const config = (connector?.configJson ?? {}) as Record<string, unknown>;
    return ok({
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
    });
  });

  app.put("/store/portal-settings", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const body = cleanEmptyStrings(request.body) as Record<string, unknown> & {
      slug?: string;
      brandColor?: string;
      welcomeText?: string;
      contactLine?: string;
      supportPhone?: string;
      releasePolicy?: string;
    };

    const slug = body.slug ? makeSlug(String(body.slug)) : undefined;
    if (slug && slug.length < 3) return fail(reply, 400, "BAD_REQUEST", "slug must be at least 3 characters");

    if (slug) {
      const duplicate = await prisma.organization.findFirst({ where: { slug, id: { not: user.organizationId } } });
      if (duplicate) return fail(reply, 409, "SLUG_TAKEN", "This portal slug is already used");
      await prisma.organization.update({ where: { id: user.organizationId }, data: { slug } });
    }

    const existing = await prisma.integrationConnector.findUnique({ where: { organizationId_provider: { organizationId: user.organizationId, provider: "WEBHOOK" } } });
    const previousConfig = (existing?.configJson ?? {}) as Record<string, unknown>;
    const allowedKeys = [
      "slug", "brandColor", "welcomeText", "contactLine", "supportPhone", "releasePolicy",
      "website", "logoDataUrl", "businessHours", "openDays", "systemProfileName", "systemTheme", "systemAccent",
      "invoiceFooter", "qrPaymentEnabled", "notifyLine", "notifySms", "notifyEmail", "twoFactorEnabled", "loginAlerts", "sessionControl", "rolePreset",
    ];
    const configJson: Record<string, unknown> = { ...previousConfig };
    for (const key of allowedKeys) {
      if (body[key] !== undefined) configJson[key] = body[key];
    }
    configJson.slug = slug ?? body.slug ?? previousConfig.slug ?? "";
    configJson.brandColor = body.brandColor ?? previousConfig.brandColor ?? "#38bdf8";

    const connector = await prisma.integrationConnector.upsert({
      where: { organizationId_provider: { organizationId: user.organizationId, provider: "WEBHOOK" } },
      create: {
        organizationId: user.organizationId,
        provider: "WEBHOOK",
        category: "AUTOMATION",
        displayName: "Customer Portal & Store Profile Settings",
        status: "ACTIVE",
        configJson,
        lastCheckedAt: new Date(),
      },
      update: {
        displayName: "Customer Portal & Store Profile Settings",
        status: "ACTIVE",
        configJson,
        lastCheckedAt: new Date(),
        lastError: null,
      },
    });

    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_STORE_PROFILE_SETTINGS", targetType: "IntegrationConnector", targetId: connector.id });
    return ok(configJson);
  });
}
