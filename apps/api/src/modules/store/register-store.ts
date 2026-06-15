import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerStoreRoutes(app: FastifyInstance) {
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

app.post("/public/store-signup", async (request, reply) => {
  if (!rateLimit(request, reply, "store-signup", 6, 60_000)) return;
  const body = cleanEmptyStrings(request.body) as {
    storeName?: string; ownerName?: string; email?: string; password?: string; phone?: string; taxId?: string; address?: string; plan?: string;
  };
  if (!body.storeName || body.storeName.length < 2) return fail(reply, 400, "BAD_REQUEST", "storeName is required");
  if (!body.ownerName || body.ownerName.length < 2) return fail(reply, 400, "BAD_REQUEST", "ownerName is required");
  if (!body.email || !body.email.includes("@")) return fail(reply, 400, "BAD_REQUEST", "valid email is required");
  if (!body.password || body.password.length < 8) return fail(reply, 400, "BAD_REQUEST", "password must be at least 8 characters");

  const existingUser = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (existingUser) return fail(reply, 409, "EMAIL_EXISTS", "This email is already registered");

  const plan = ["STARTER", "STANDARD", "PRO", "ENTERPRISE"].includes(String(body.plan || "").toUpperCase()) ? String(body.plan).toUpperCase() : "STARTER";
  const monthlyFee = planMonthlyFee(plan);
  const now = new Date();
  const slugBase = makeSlug(body.storeName);
  const slug = `${slugBase}-${crypto.randomBytes(2).toString("hex")}`;
  const storeCode = `STORE-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const trialEndsAt = addDays(now, Number(process.env.STORE_TRIAL_DAYS ?? 14));

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: body.storeName!, slug, storeCode, ownerName: body.ownerName, email: body.email!.toLowerCase(), billingEmail: body.email!.toLowerCase(),
        phone: body.phone, taxId: body.taxId, address: body.address, status: "TRIAL", plan: plan as any, billingStatus: "TRIALING", monthlyFee, trialEndsAt, nextBillingAt: trialEndsAt, lastActiveAt: now,
      },
    });
    const passwordHash = await bcrypt.hash(body.password!, 12);
    const owner = await tx.user.create({
      data: { organizationId: org.id, email: body.email!.toLowerCase(), passwordHash, name: body.ownerName!, role: "OWNER" },
    });
    await tx.platformSubscription.create({
      data: { organizationId: org.id, plan: plan as any, status: "TRIALING", monthlyFee, deviceLimit: planDeviceLimit(plan), storeUserLimit: plan === "STARTER" ? 3 : plan === "STANDARD" ? 10 : 50, trialEndsAt, currentPeriodStart: now, currentPeriodEnd: trialEndsAt },
    });
    await tx.storePaymentSetting.create({ data: { organizationId: org.id, provider: "PROMPTPAY_MANUAL", displayName: "PromptPay / Bank Transfer", isActive: false, instructions: "ตั้งค่า PromptPay หรือบัญชีธนาคารก่อนสร้าง QR ให้ลูกค้า" } });
    await tx.auditLog.create({ data: { organizationId: org.id, actorId: owner.id, action: "STORE_SIGNUP", targetType: "Organization", targetId: org.id, metadata: { plan, storeCode } } });
    return { org, owner };
  });
  await createDefaultOnboarding(result.org.id);
  await ensureDefaultIntegrations(result.org.id);
  await ensureDefaultOperationalTemplates(result.org.id);
  return ok({ organization: result.org, loginEmail: result.owner.email, message: "สมัครร้านสำเร็จ เข้าระบบด้วยอีเมลและรหัสผ่านที่ตั้งไว้" });
});


app.get("/store/profile", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const [organization, subscription, integrations, onboarding, counts] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
    prisma.platformSubscription.findFirst({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.integrationConnector.findMany({ where: { organizationId: user.organizationId }, orderBy: [{ category: "asc" }, { provider: "asc" }] }),
    prisma.storeOnboardingStep.findMany({ where: { organizationId: user.organizationId }, orderBy: { sortOrder: "asc" } }),
    Promise.all([
      prisma.customer.count({ where: { organizationId: user.organizationId } }),
      prisma.device.count({ where: { organizationId: user.organizationId } }),
      prisma.contract.count({ where: { organizationId: user.organizationId } }),
      prisma.payment.count({ where: { organizationId: user.organizationId, status: "VERIFYING" } }),
    ]),
  ]);
  return ok({ organization, subscription, integrations, onboarding, counts: { customers: counts[0], devices: counts[1], contracts: counts[2], pendingPayments: counts[3] } });
});


app.patch("/store/profile", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { name?: string; ownerName?: string; phone?: string; taxId?: string; address?: string; billingEmail?: string };
  const org = await prisma.organization.update({
    where: { id: user.organizationId },
    data: { name: body.name, ownerName: body.ownerName, phone: body.phone, taxId: body.taxId, address: body.address, billingEmail: body.billingEmail, lastActiveAt: new Date() },
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPDATE_STORE_PROFILE", targetType: "Organization", targetId: user.organizationId });
  return ok(org);
});


app.get("/store/users", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  if (isPlatformOwner(user)) return ok(await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 500, include: { organization: true } }));
  return ok(await prisma.user.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" }, take: 100 }));
});


app.post("/store/users", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!["PLATFORM_OWNER", "OWNER", "ADMIN"].includes(user.role)) return fail(reply, 403, "FORBIDDEN", "Only owner/admin can create store users");
  const body = cleanEmptyStrings(request.body) as { organizationId?: string; email?: string; password?: string; name?: string; role?: any };
  const organizationId = isPlatformOwner(user) ? body.organizationId || user.organizationId : user.organizationId;
  if (!body.email || !body.password || !body.name) return fail(reply, 400, "BAD_REQUEST", "email, password and name are required");
  if (String(body.role || "STAFF") === "PLATFORM_OWNER" && !isPlatformOwner(user)) return fail(reply, 403, "FORBIDDEN", "Cannot create platform owner");
  const passwordHash = await bcrypt.hash(body.password, 10);
  const created = await prisma.user.create({ data: { organizationId, email: body.email.toLowerCase(), passwordHash, name: body.name, role: body.role ?? "STAFF" } });
  await audit({ organizationId, actorId: user.id, action: "CREATE_STORE_USER", targetType: "User", targetId: created.id, metadata: { role: created.role } });
  return ok({ id: created.id, email: created.email, name: created.name, role: created.role, organizationId: created.organizationId });
});


app.patch("/store/users/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const where = isPlatformOwner(user) ? { id } : { id, organizationId: user.organizationId };
  const existing = await prisma.user.findFirst({ where });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "User not found");
  if (!["PLATFORM_OWNER", "OWNER", "ADMIN"].includes(user.role)) return fail(reply, 403, "FORBIDDEN", "Only owner/admin can update store users");
  const body = cleanEmptyStrings(request.body) as { name?: string; role?: any; password?: string };
  const data: any = { name: body.name, role: body.role };
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);
  const updated = await prisma.user.update({ where: { id }, data });
  await audit({ organizationId: updated.organizationId, actorId: user.id, action: "UPDATE_STORE_USER", targetType: "User", targetId: id });
  return ok({ id: updated.id, email: updated.email, name: updated.name, role: updated.role, organizationId: updated.organizationId });
});


app.get("/store/onboarding", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  await createDefaultOnboarding(user.organizationId);
  const steps = await prisma.storeOnboardingStep.findMany({ where: { organizationId: user.organizationId }, orderBy: { sortOrder: "asc" } });
  return ok(steps);
});


app.patch("/store/onboarding/:stepKey", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { stepKey } = request.params as { stepKey: string };
  const body = cleanEmptyStrings(request.body) as { status?: any };
  const existing = await prisma.storeOnboardingStep.findUnique({ where: { organizationId_stepKey: { organizationId: user.organizationId, stepKey } } });
  if (!existing) return fail(reply, 404, "NOT_FOUND", "Onboarding step not found");
  const status = body.status ?? "DONE";
  const step = await prisma.storeOnboardingStep.update({ where: { id: existing.id }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
  return ok(step);
});


app.get("/store/subscription", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, include: { platformSubscriptions: { orderBy: { createdAt: "desc" }, take: 1 }, platformInvoices: { orderBy: { createdAt: "desc" }, take: 5 }, _count: { select: { devices: true, customers: true, contracts: true } } } });
  const limit = planDeviceLimit(org?.plan);
  return ok({ organization: org, usage: { devices: org?._count.devices ?? 0, customers: org?._count.customers ?? 0, contracts: org?._count.contracts ?? 0, deviceLimit: limit, deviceUsagePercent: org ? Math.round(((org._count.devices || 0) / limit) * 100) : 0 } });
});


app.get("/store/ledger", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const entries = await prisma.storeLedgerEntry.findMany({ where: { organizationId: user.organizationId }, include: { paymentRequest: { include: { customer: true, contract: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  return ok(entries);
});

}
