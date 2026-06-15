import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerPlatformRoutes(app: FastifyInstance) {
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

app.get("/platform/summary", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const [stores, activeStores, trialStores, suspendedStores, users, devices, contracts, pendingPayments, overdueContracts, paidInvoices, openInvoices] = await Promise.all([
    prisma.organization.count({ where: { id: { not: user.organizationId } } }),
    prisma.organization.count({ where: { id: { not: user.organizationId }, status: "ACTIVE" } }),
    prisma.organization.count({ where: { id: { not: user.organizationId }, status: "TRIAL" } }),
    prisma.organization.count({ where: { id: { not: user.organizationId }, status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: { not: "PLATFORM_OWNER" } } }),
    prisma.device.count(),
    prisma.contract.count(),
    prisma.payment.count({ where: { status: "VERIFYING" } }),
    prisma.contract.count({ where: { status: { in: ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RESTRICTED", "RECOVERY"] } } }),
    prisma.platformInvoice.findMany({ where: { status: "PAID" } }),
    prisma.platformInvoice.count({ where: { status: { in: ["DRAFT", "ISSUED", "OVERDUE"] } } }),
  ]);
  const paidInvoiceRevenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const activeOrTrial = await prisma.organization.findMany({ where: { id: { not: user.organizationId }, status: { in: ["ACTIVE", "TRIAL"] } } });
  const monthlyRecurringRevenue = activeOrTrial.reduce((sum, org) => sum + Number(org.monthlyFee), 0);
  return ok({ stores, activeStores, trialStores, suspendedStores, users, devices, contracts, pendingPayments, overdueContracts, openInvoices, paidInvoiceRevenue, monthlyRecurringRevenue });
});


app.get("/platform/stores", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const stores = await prisma.organization.findMany({
    where: { id: { not: user.organizationId } },
    orderBy: { createdAt: "desc" },
    include: {
      users: true,
      platformSubscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      platformInvoices: { orderBy: { createdAt: "desc" }, take: 3 },
      integrationConnectors: true,
      _count: { select: { customers: true, devices: true, contracts: true } },
    },
  });
  return ok(stores);
});


app.patch("/platform/stores/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { status?: any; plan?: any; billingStatus?: any; monthlyFee?: number; platformNotes?: string; nextBillingAt?: string };
  const store = await prisma.organization.update({
    where: { id },
    data: {
      status: body.status, plan: body.plan, billingStatus: body.billingStatus, monthlyFee: body.monthlyFee, platformNotes: body.platformNotes, nextBillingAt: body.nextBillingAt ? new Date(body.nextBillingAt) : undefined, suspendedAt: body.status === "SUSPENDED" ? new Date() : undefined,
    },
  });
  if (body.plan || body.monthlyFee || body.billingStatus) {
    await prisma.platformSubscription.create({ data: { organizationId: id, plan: (body.plan ?? store.plan) as any, status: (body.billingStatus ?? store.billingStatus) as any, monthlyFee: body.monthlyFee ?? Number(store.monthlyFee), deviceLimit: planDeviceLimit(body.plan ?? store.plan) } });
  }
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "PLATFORM_UPDATE_STORE", targetType: "Organization", targetId: id, metadata: body as Prisma.InputJsonObject });
  return ok(store);
});


app.post("/platform/stores/:id/invoices", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { amount?: number; periodLabel?: string; dueDate?: string; status?: any; note?: string };
  const store = await prisma.organization.findUnique({ where: { id } });
  if (!store) return fail(reply, 404, "NOT_FOUND", "Store not found");
  const invoice = await prisma.platformInvoice.create({
    data: { organizationId: id, invoiceNo: createInvoiceNo(), periodLabel: body.periodLabel || new Date().toISOString().slice(0, 7), amount: body.amount ?? Number(store.monthlyFee), dueDate: body.dueDate ? new Date(body.dueDate) : addDays(new Date(), 7), status: body.status ?? "ISSUED", note: body.note },
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "PLATFORM_CREATE_INVOICE", targetType: "PlatformInvoice", targetId: invoice.id, metadata: { storeId: id } });
  return ok(invoice);
});


app.get("/platform/invoices", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const invoices = await prisma.platformInvoice.findMany({ orderBy: { createdAt: "desc" }, include: { organization: true }, take: 200 });
  return ok(invoices);
});


app.patch("/platform/invoices/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { status?: any; paymentRef?: string; note?: string };
  const invoice = await prisma.platformInvoice.update({ where: { id }, data: { status: body.status, paymentRef: body.paymentRef, note: body.note, paidAt: body.status === "PAID" ? new Date() : undefined } });
  if (body.status === "PAID") {
    await prisma.organization.update({ where: { id: invoice.organizationId }, data: { billingStatus: "CURRENT", status: "ACTIVE", lastBillingAt: new Date(), nextBillingAt: addDays(new Date(), 30) } });
  }
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "PLATFORM_UPDATE_INVOICE", targetType: "PlatformInvoice", targetId: id, metadata: body as Prisma.InputJsonObject });
  return ok(invoice);
});


app.get("/platform/reports/stores.csv", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const stores = await prisma.organization.findMany({ where: { id: { not: user.organizationId } }, include: { _count: { select: { customers: true, devices: true, contracts: true } } } });
  const rows = stores.map((s) => ({ storeCode: s.storeCode, name: s.name, ownerName: s.ownerName, email: s.email, phone: s.phone, status: s.status, plan: s.plan, billingStatus: s.billingStatus, monthlyFee: Number(s.monthlyFee), customers: s._count.customers, devices: s._count.devices, contracts: s._count.contracts, nextBillingAt: s.nextBillingAt?.toISOString() ?? "" }));
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", "attachment; filename=stores.csv");
  return reply.send(toCsv(rows));
});


app.get("/platform/apple-custody-risk", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const records = await prisma.appleCustodyRecord.findMany({
    orderBy: { updatedAt: "desc" },
    include: { organization: true, device: { include: { contract: { include: { customer: true } } } }, contract: true },
    take: 500,
  });
  const stores = new Map<string, { organizationId: string; storeName: string; total: number; releaseDue: number; released: number; missingEvidence: number; disputed: number }>();
  for (const r of records) {
    const item = stores.get(r.organizationId) ?? { organizationId: r.organizationId, storeName: r.organization.name, total: 0, releaseDue: 0, released: 0, missingEvidence: 0, disputed: 0 };
    item.total += 1;
    if (r.status === "RELEASE_DUE") item.releaseDue += 1;
    if (r.status === "RELEASED") item.released += 1;
    if (!r.evidenceUrls || (Array.isArray(r.evidenceUrls) && r.evidenceUrls.length === 0)) item.missingEvidence += 1;
    if (r.status === "DISPUTED") item.disputed += 1;
    stores.set(r.organizationId, item);
  }
  return ok({ stores: Array.from(stores.values()), records });
});


app.get("/platform/mdm/summary", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const [devices, enrollments, commands, failedCommands, appleCustodyDue, byStore] = await Promise.all([
    prisma.device.count(),
    prisma.mdmEnrollment.count(),
    prisma.mdmCommand.count(),
    prisma.mdmCommand.count({ where: { status: { in: ["FAILED", "ERROR"] } } }),
    prisma.appleCustodyRecord.count({ where: { status: "RELEASE_DUE" } }),
    prisma.organization.findMany({ where: { storeCode: { not: "PLATFORM" } }, select: { id: true, name: true, slug: true, _count: { select: { devices: true, mdmEnrollments: true, appleCustodyRecords: true } } }, take: 200 }),
  ]);
  return ok({ totals: { devices, enrollments, commands, failedCommands, appleCustodyDue }, byStore, providerStatus: getDualProviderStatus() });
});


app.get("/platform/mdm/devices", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const devices = await prisma.device.findMany({
    orderBy: { updatedAt: "desc" },
    include: { organization: true, contract: { include: { customer: true } }, appleCustodyRecord: true },
    take: 1000,
  });
  return ok(devices);
});


app.get("/platform/mdm/commands", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const commands = await prisma.mdmCommand.findMany({
    orderBy: { createdAt: "desc" },
    include: { device: { include: { organization: true } } },
    take: 1000,
  });
  return ok(commands);
});


app.get("/platform/settlements", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const settlements = await prisma.platformSettlement.findMany({ include: { organization: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return ok(settlements);
});


app.post("/platform/settlements/generate", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const body = cleanEmptyStrings(request.body) as { organizationId?: string; periodLabel?: string; platformFeePercent?: number };
  if (!body.organizationId) return fail(reply, 400, "BAD_REQUEST", "organizationId is required");
  const periodLabel = body.periodLabel || new Date().toISOString().slice(0, 7);
  const payments = await prisma.storeLedgerEntry.findMany({ where: { organizationId: body.organizationId, type: "CUSTOMER_PAYMENT" } });
  const grossAmount = payments.reduce((sum, item) => sum + Number(item.amount), 0);
  const feeAmount = Math.round(grossAmount * Number(body.platformFeePercent ?? 0) / 100);
  const settlement = await prisma.platformSettlement.create({ data: { organizationId: body.organizationId, periodLabel, grossAmount, feeAmount, netAmount: grossAmount - feeAmount, status: "PENDING" } });
  await audit({ actorId: user.id, action: "GENERATE_SETTLEMENT", targetType: "PlatformSettlement", targetId: settlement.id, metadata: { grossAmount, feeAmount } });
  return ok(settlement);
});


app.patch("/platform/settlements/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { status?: any; note?: string };
  const row = await prisma.platformSettlement.update({ where: { id }, data: { status: body.status, note: body.note, paidAt: body.status === "PAID" ? new Date() : undefined } });
  await audit({ actorId: user.id, action: "UPDATE_SETTLEMENT", targetType: "PlatformSettlement", targetId: id, metadata: { status: body.status } });
  return ok(row);
});


app.get("/platform/store-health", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  if (!ensurePlatformOwner(user, reply)) return;
  const stores = await prisma.organization.findMany({ where: { storeCode: { not: "PLATFORM" } }, take: 200 });
  const snapshots = [];
  for (const store of stores) snapshots.push(await buildStoreHealth(store.id));
  return ok(snapshots);
});

}
