import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerCustomersRoutes(app: FastifyInstance) {
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

app.get("/customers", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { contracts: true },
  });
  return ok(customers);
});


app.post("/customers", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const parsed = createCustomerSchema.safeParse(cleanEmptyStrings(request.body));
  if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", parsed.error.message);

  const customer = await prisma.customer.create({
    data: {
      organizationId: user.organizationId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      address: parsed.data.address,
      riskScore: parsed.data.riskScore,
    },
  });

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_CUSTOMER", targetType: "Customer", targetId: customer.id });
  return ok(customer);
});


app.get("/customers/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { contracts: { include: { device: true, installments: true } }, contactLogs: true, consents: true },
  });
  if (!customer) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  return ok(customer);
});


app.patch("/customers/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const parsed = createCustomerSchema.partial().safeParse(cleanEmptyStrings(request.body));
  if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", parsed.error.message);

  const existing = await prisma.customer.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  const customer = await prisma.customer.update({ where: { id }, data: parsed.data });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_CUSTOMER", targetType: "Customer", targetId: id });
  return ok(customer);
});


app.get("/customer-users", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const users = await prisma.customerPortalUser.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: { include: { contracts: { include: { device: true, installments: true } } } }, invites: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return ok(users);
});


app.post("/customers/:id/portal-user", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { email?: string; phone?: string; password?: string; expiresInDays?: number; sendInvite?: boolean };
  const customer = await prisma.customer.findFirst({ where: { id, organizationId: user.organizationId }, include: { organization: true } });
  if (!customer) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  const rawPassword = body.password || generateCustomerPin();
  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const phone = body.phone || customer.phone;
  const existing = await prisma.customerPortalUser.findFirst({ where: { organizationId: user.organizationId, customerId: customer.id, phone } });
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = addDays(new Date(), Number(body.expiresInDays ?? 14));
  const result = await prisma.$transaction(async (tx) => {
    const portalUser = existing
      ? await tx.customerPortalUser.update({ where: { id: existing.id }, data: { email: body.email ?? existing.email, phone, passwordHash, status: "ACTIVE" } })
      : await tx.customerPortalUser.create({ data: { organizationId: user.organizationId, customerId: customer.id, email: body.email, phone, passwordHash, status: "ACTIVE" } });
    const shareUrl = makeCustomerPortalShareUrl({ storeSlug: customer.organization.slug, inviteToken: token });
    const invite = await tx.customerPortalInvite.create({ data: { organizationId: user.organizationId, customerId: customer.id, portalUserId: portalUser.id, token, expiresAt, shareUrl } });
    return { portalUser, invite, shareUrl };
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_CUSTOMER_PORTAL_USER", targetType: "Customer", targetId: customer.id });
  return ok({ ...result, temporaryPassword: rawPassword, message: "ส่งลิงก์และรหัสนี้ให้ลูกค้า ลูกค้าจะเห็นเฉพาะข้อมูลของร้านนี้เท่านั้น" });
});


app.patch("/customer-users/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { status?: string; email?: string; phone?: string };
  const existing = await prisma.customerPortalUser.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Customer portal user not found");
  const updated = await prisma.customerPortalUser.update({ where: { id }, data: { status: body.status as any, email: body.email, phone: body.phone } });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_CUSTOMER_PORTAL_USER", targetType: "CustomerPortalUser", targetId: id });
  return ok(updated);
});


app.post("/customer-users/:id/reset-pin", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const existing = await prisma.customerPortalUser.findFirst({ where: { id, organizationId: user.organizationId }, include: { customer: { include: { organization: true } } } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Customer portal user not found");
  const rawPassword = generateCustomerPin();
  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const token = crypto.randomBytes(24).toString("hex");
  const shareUrl = makeCustomerPortalShareUrl({ storeSlug: existing.customer.organization.slug, inviteToken: token });
  await prisma.$transaction(async (tx) => {
    await tx.customerPortalUser.update({ where: { id }, data: { passwordHash, status: "ACTIVE" } });
    await tx.customerPortalInvite.create({ data: { organizationId: user.organizationId, customerId: existing.customerId, portalUserId: id, token, expiresAt: addDays(new Date(), 14), shareUrl } });
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "RESET_CUSTOMER_PORTAL_PIN", targetType: "CustomerPortalUser", targetId: id });
  return ok({ temporaryPassword: rawPassword, shareUrl });
});


app.get("/customers/:id/contact-logs", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const customer = await prisma.customer.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!customer) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  const logs = await prisma.contactLog.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" } });
  return ok(logs);
});


app.post("/customers/:id/contact-logs", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { channel?: any; message?: string };
  const customer = await prisma.customer.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!customer) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  if (!body.message || body.message.length < 2) return fail(reply, 400, "BAD_REQUEST", "message is required");
  const log = await prisma.contactLog.create({
    data: { customerId: id, channel: body.channel ?? "OTHER", message: body.message, createdBy: user.id },
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_CONTACT_LOG", targetType: "Customer", targetId: id });
  return ok(log);
});


app.get("/risk/customers", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const rows = await prisma.customerRiskAssessment.findMany({ where: { organizationId: user.organizationId }, include: { customer: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return ok(rows);
});


app.post("/customers/:id/risk-recalculate", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const result = await calculateCustomerRisk(id, user.organizationId);
  if (!result) return fail(reply, 404, "NOT_FOUND", "Customer not found");
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "RECALCULATE_CUSTOMER_RISK", targetType: "Customer", targetId: id, metadata: { score: result.score, grade: result.grade } });
  return ok(result);
});

}
