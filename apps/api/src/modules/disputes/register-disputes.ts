import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerDisputesRoutes(app: FastifyInstance) {
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

app.get("/disputes", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  return ok(await prisma.disputeCase.findMany({ where: { organizationId: user.organizationId }, include: { customer: true, contract: true, paymentRequest: true }, orderBy: { createdAt: "desc" }, take: 200 }));
});


app.post("/disputes", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { customerId?: string; contractId?: string; paymentRequestId?: string; title?: string; category?: string; description?: string; evidenceUrls?: unknown };
  if (!body.customerId || !body.title) return fail(reply, 400, "BAD_REQUEST", "customerId and title are required");
  const customer = await prisma.customer.findFirst({ where: { id: body.customerId, organizationId: user.organizationId } });
  if (!customer) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  const dispute = await prisma.disputeCase.create({ data: { organizationId: user.organizationId, customerId: body.customerId, contractId: body.contractId, paymentRequestId: body.paymentRequestId, title: body.title, category: body.category ?? "PAYMENT", description: body.description, evidenceUrls: (body.evidenceUrls ?? []) as Prisma.InputJsonValue } });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_DISPUTE", targetType: "DisputeCase", targetId: dispute.id });
  return ok(dispute);
});


app.patch("/disputes/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const existing = await prisma.disputeCase.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Dispute not found");
  const body = cleanEmptyStrings(request.body) as { status?: any; resolution?: string; description?: string };
  return ok(await prisma.disputeCase.update({ where: { id }, data: { status: body.status, resolution: body.resolution, description: body.description } }));
});

}
