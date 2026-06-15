import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../core/app-context";
import { audit, cleanEmptyStrings, fail, makeSlug, ok, prisma, requireAuth, ensureDefaultIntegrations } from "../../core/app-context";
import { maskConfigJson, mergeConfigKeepingExistingSecrets, unprotectConfigJson } from "../../core/secure-config";

type PortalSettings = {
  slug?: string;
  brandColor?: string;
  welcomeText?: string;
  contactLine?: string;
  supportPhone?: string;
  releasePolicy?: string;
};

function parsePortalSettings(configJson: unknown): PortalSettings {
  const config = unprotectConfigJson(configJson) as Record<string, unknown>;
  const raw = config.portalSettings;
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as PortalSettings;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export async function registerSettingsRoutes(app: FastifyInstance) {
  app.get("/store/portal-settings", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    await ensureDefaultIntegrations(user.organizationId);
    const [org, connector] = await Promise.all([
      prisma.organization.findUnique({ where: { id: user.organizationId } }),
      prisma.integrationConnector.findFirst({ where: { organizationId: user.organizationId, provider: "WEBHOOK" as any } }),
    ]);
    const stored = parsePortalSettings(connector?.configJson);
    return ok({
      ...stored,
      slug: stored.slug || org?.slug || "",
      supportPhone: stored.supportPhone || org?.phone || "",
      storeName: org?.name,
      connectorId: connector?.id,
    });
  });

  app.put("/store/portal-settings", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const body = cleanEmptyStrings(request.body) as PortalSettings;
    await ensureDefaultIntegrations(user.organizationId);

    let slug = body.slug ? makeSlug(body.slug) : undefined;
    if (slug) {
      const conflict = await prisma.organization.findFirst({ where: { slug, id: { not: user.organizationId } } });
      if (conflict) return fail(reply, 409, "SLUG_EXISTS", "This store slug is already used");
      await prisma.organization.update({ where: { id: user.organizationId }, data: { slug, lastActiveAt: new Date() } });
    }

    const connector = await prisma.integrationConnector.findFirst({ where: { organizationId: user.organizationId, provider: "WEBHOOK" as any } });
    if (!connector) return fail(reply, 404, "NOT_FOUND", "WEBHOOK integration connector not found");

    const portalSettings = { ...body, slug };
    const configJson = mergeConfigKeepingExistingSecrets(connector.configJson, { portalSettings: JSON.stringify(portalSettings) });
    const updated = await prisma.integrationConnector.update({ where: { id: connector.id }, data: { configJson, lastCheckedAt: new Date() } });
    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_PORTAL_SETTINGS", targetType: "IntegrationConnector", targetId: connector.id, metadata: { slug, keys: Object.keys(body) } });
    return ok({ connector: { ...updated, configJson: maskConfigJson(updated.configJson) }, settings: portalSettings });
  });
}
