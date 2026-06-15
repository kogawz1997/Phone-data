import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerCollectionRoutes(app: FastifyInstance) {
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

app.get("/collection/tasks", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const tasks = await prisma.collectionTask.findMany({ where: { organizationId: user.organizationId }, include: { customer: true, contract: true }, orderBy: [{ status: "asc" }, { dueAt: "asc" }], take: 300 });
  return ok(tasks);
});


app.post("/collection/tasks/generate-overdue", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const overdue = await prisma.contract.findMany({ where: { organizationId: user.organizationId, status: { in: ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RECOVERY", "RESTRICTED"] } }, include: { customer: true } });
  const created = [];
  for (const contract of overdue) {
    const exists = await prisma.collectionTask.findFirst({ where: { organizationId: user.organizationId, contractId: contract.id, status: { in: ["OPEN", "IN_PROGRESS"] } } });
    if (!exists) created.push(await prisma.collectionTask.create({ data: { organizationId: user.organizationId, customerId: contract.customerId, contractId: contract.id, title: `ติดตามสัญญาค้าง ${contract.contractNo}`, dueAt: new Date(), priority: "HIGH", channel: "PHONE", note: "สร้างจากระบบค้างงวดอัตโนมัติ" } }));
  }
  return ok({ createdCount: created.length, created });
});


app.post("/collection/tasks", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { customerId?: string; contractId?: string; title?: string; dueAt?: string; priority?: string; channel?: any; note?: string };
  if (!body.customerId || !body.title) return fail(reply, 400, "BAD_REQUEST", "customerId and title are required");
  const customer = await prisma.customer.findFirst({ where: { id: body.customerId, organizationId: user.organizationId } });
  if (!customer) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  const task = await prisma.collectionTask.create({ data: { organizationId: user.organizationId, customerId: body.customerId, contractId: body.contractId, title: body.title, dueAt: body.dueAt ? new Date(body.dueAt) : undefined, priority: body.priority ?? "NORMAL", channel: body.channel ?? "PHONE", note: body.note } });
  return ok(task);
});


app.patch("/collection/tasks/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const existing = await prisma.collectionTask.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Task not found");
  const body = cleanEmptyStrings(request.body) as { status?: any; note?: string; dueAt?: string; priority?: string };
  const task = await prisma.collectionTask.update({ where: { id }, data: { status: body.status, note: body.note, dueAt: body.dueAt ? new Date(body.dueAt) : undefined, priority: body.priority, completedAt: body.status === "DONE" ? new Date() : undefined } });
  return ok(task);
});

}
