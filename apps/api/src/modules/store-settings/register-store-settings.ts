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
    const config = (connector?.configJson ?? {}) as Record<string, string>;
    return ok({
      slug: config.slug ?? org?.slug ?? "",
      brandColor: config.brandColor ?? "#38bdf8",
      welcomeText: config.welcomeText ?? "ตรวจสอบยอด ชำระงวด และดูสัญญาได้จากหน้านี้",
      contactLine: config.contactLine ?? "",
      supportPhone: config.supportPhone ?? org?.phone ?? "",
      releasePolicy: config.releasePolicy ?? "เมื่อชำระครบ ร้านจะตรวจสอบยอดและดำเนินการตามขั้นตอน",
    });
  });

  app.put("/store/portal-settings", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const body = cleanEmptyStrings(request.body) as {
      slug?: string;
      brandColor?: string;
      welcomeText?: string;
      contactLine?: string;
      supportPhone?: string;
      releasePolicy?: string;
    };

    const slug = body.slug ? makeSlug(body.slug) : undefined;
    if (slug && slug.length < 3) return fail(reply, 400, "BAD_REQUEST", "slug must be at least 3 characters");

    if (slug) {
      const duplicate = await prisma.organization.findFirst({ where: { slug, id: { not: user.organizationId } } });
      if (duplicate) return fail(reply, 409, "SLUG_TAKEN", "This portal slug is already used");
      await prisma.organization.update({ where: { id: user.organizationId }, data: { slug } });
    }

    const configJson = {
      slug,
      brandColor: body.brandColor ?? "#38bdf8",
      welcomeText: body.welcomeText,
      contactLine: body.contactLine,
      supportPhone: body.supportPhone,
      releasePolicy: body.releasePolicy,
    };

    const connector = await prisma.integrationConnector.upsert({
      where: { organizationId_provider: { organizationId: user.organizationId, provider: "WEBHOOK" } },
      create: {
        organizationId: user.organizationId,
        provider: "WEBHOOK",
        category: "AUTOMATION",
        displayName: "Customer Portal Settings",
        status: "ACTIVE",
        configJson,
        lastCheckedAt: new Date(),
      },
      update: {
        displayName: "Customer Portal Settings",
        status: "ACTIVE",
        configJson,
        lastCheckedAt: new Date(),
        lastError: null,
      },
    });

    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_PORTAL_SETTINGS", targetType: "IntegrationConnector", targetId: connector.id });
    return ok({ ...configJson, slug: slug ?? body.slug ?? "" });
  });

  app.post("/jobs/overdue-check", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    const contracts = await prisma.contract.findMany({
      where: { organizationId: user.organizationId, status: { in: ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RECOVERY", "RESTRICTED"] } },
      include: { customer: true },
    });

    const created = [];
    for (const contract of contracts) {
      const exists = await prisma.collectionTask.findFirst({ where: { organizationId: user.organizationId, contractId: contract.id, status: { in: ["OPEN", "IN_PROGRESS"] } } });
      if (exists) continue;
      created.push(await prisma.collectionTask.create({
        data: {
          organizationId: user.organizationId,
          customerId: contract.customerId,
          contractId: contract.id,
          title: `ติดตามสัญญาค้าง ${contract.contractNo}`,
          dueAt: new Date(),
          priority: "HIGH",
          channel: "PHONE",
          note: "สร้างจากปุ่ม Overdue Check บน Dashboard",
        },
      }));
    }

    return ok({ createdCount: created.length, created });
  });
}
