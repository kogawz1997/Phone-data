import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerStoreSettingsRoutes(app: FastifyInstance) {
  const { prisma, ok, fail, cleanEmptyStrings, audit, requireAuth, makeSlug } = ctx as any;

  app.get("/store/payment-settings", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    const rows = await prisma.storePaymentSetting.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });

    if (rows.length > 0) return ok(rows);

    const created = await prisma.storePaymentSetting.create({
      data: {
        organizationId: user.organizationId,
        provider: "PROMPTPAY_MANUAL",
        displayName: "PromptPay / Bank Transfer",
        instructions: "กรอก PromptPay หรือบัญชีธนาคารสำหรับรับเงินจากลูกค้า",
        isActive: true,
      },
    });
    return ok([created]);
  });

  app.put("/store/payment-settings", { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as AuthedRequest).user;
    const body = cleanEmptyStrings(request.body) as {
      id?: string;
      provider?: string;
      displayName?: string;
      promptPayId?: string;
      bankName?: string;
      accountNo?: string;
      accountName?: string;
      instructions?: string;
      isActive?: boolean;
    };

    const provider = ["PROMPTPAY_MANUAL", "BANK_TRANSFER", "PAYMENT_GATEWAY"].includes(String(body.provider || ""))
      ? String(body.provider)
      : "PROMPTPAY_MANUAL";

    if (!body.displayName) return fail(reply, 400, "BAD_REQUEST", "displayName is required");

    if (body.isActive !== false) {
      await prisma.storePaymentSetting.updateMany({ where: { organizationId: user.organizationId }, data: { isActive: false } });
    }

    const existing = body.id
      ? await prisma.storePaymentSetting.findFirst({ where: { id: body.id, organizationId: user.organizationId } })
      : await prisma.storePaymentSetting.findFirst({ where: { organizationId: user.organizationId, provider: provider as any } });

    const data = {
      provider: provider as any,
      displayName: body.displayName,
      promptPayId: body.promptPayId,
      bankName: body.bankName,
      accountNo: body.accountNo,
      accountName: body.accountName,
      instructions: body.instructions,
      isActive: body.isActive !== false,
    };

    const saved = existing
      ? await prisma.storePaymentSetting.update({ where: { id: existing.id }, data })
      : await prisma.storePaymentSetting.create({ data: { organizationId: user.organizationId, ...data } });

    await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_PAYMENT_SETTINGS", targetType: "StorePaymentSetting", targetId: saved.id, metadata: { provider } });
    return ok(saved);
  });

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
}
