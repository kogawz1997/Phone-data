import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerReportsRoutes(app: FastifyInstance) {
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

app.get("/reports/summary", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const [customers, devices, leasedDevices, activeContracts, overdueContracts, paidOffContracts, pendingActions, transferPendingContracts, payments] = await Promise.all([
    prisma.customer.count({ where: { organizationId: user.organizationId } }),
    prisma.device.count({ where: { organizationId: user.organizationId } }),
    prisma.device.count({ where: { organizationId: user.organizationId, deviceStatus: "LEASE_ACTIVE" } }),
    prisma.contract.count({ where: { organizationId: user.organizationId, status: "ACTIVE" } }),
    prisma.contract.count({ where: { organizationId: user.organizationId, status: { in: ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RESTRICTED", "RECOVERY"] } } }),
    prisma.contract.count({ where: { organizationId: user.organizationId, status: "PAID_OFF" } }),
    prisma.deviceAction.count({ where: { device: { organizationId: user.organizationId }, status: "PENDING_APPROVAL" } }),
    prisma.contract.count({ where: { organizationId: user.organizationId, legalTitleStatus: "TRANSFER_PENDING" } }),
    prisma.payment.findMany({ where: { organizationId: user.organizationId, status: "CONFIRMED" } }),
  ]);

  const confirmedRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  return ok({ customers, devices, leasedDevices, activeContracts, overdueContracts, paidOffContracts, pendingActions, transferPendingContracts, confirmedRevenue });
});


app.get("/audit-logs", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true },
  });
  return ok(logs);
});



// Store payment setup: each tenant keeps its own payment destination.


app.get("/reports/contracts.csv", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const contracts = await prisma.contract.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, device: true, installments: true, payments: true },
  });
  const rows = contracts.map((contract) => ({
    contractNo: contract.contractNo,
    customer: contract.customer.fullName,
    phone: contract.customer.phone,
    device: `${contract.device.brand} ${contract.device.model}`,
    imei: contract.device.imei ?? "",
    status: contract.status,
    agreementType: contract.agreementType,
    legalTitleStatus: contract.legalTitleStatus,
    totalAmount: Number(contract.totalAmount),
    paidAmount: contract.payments.filter((p) => p.status === "CONFIRMED").reduce((sum, p) => sum + Number(p.amount), 0),
    installmentCount: contract.installmentCount,
    createdAt: contract.createdAt.toISOString(),
  }));
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", "attachment; filename=contracts.csv");
  return reply.send(toCsv(rows));
});


app.get("/reports/payments.csv", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const payments = await prisma.payment.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { contract: { include: { customer: true } }, installment: true },
  });
  const rows = payments.map((payment) => ({
    createdAt: payment.createdAt.toISOString(),
    contractNo: payment.contract.contractNo,
    customer: payment.contract.customer.fullName,
    installmentNo: payment.installment?.installmentNo ?? "",
    amount: Number(payment.amount),
    method: payment.method,
    status: payment.status,
    paidAt: payment.paidAt?.toISOString() ?? "",
    note: payment.note ?? "",
  }));
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", "attachment; filename=payments.csv");
  return reply.send(toCsv(rows));
});


app.get("/reports/overdue.csv", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const today = new Date();
  const installments = await prisma.installment.findMany({
    where: { status: { in: ["OVERDUE", "DUE_SOON", "PARTIAL", "PENDING"] }, contract: { organizationId: user.organizationId, status: { notIn: ["PAID_OFF", "CANCELLED"] } } },
    orderBy: { dueDate: "asc" },
    include: { contract: { include: { customer: true, device: true } } },
  });
  const rows = installments
    .filter((item) => item.dueDate <= today || item.status === "OVERDUE")
    .map((item) => ({
      contractNo: item.contract.contractNo,
      customer: item.contract.customer.fullName,
      phone: item.contract.customer.phone,
      installmentNo: item.installmentNo,
      dueDate: item.dueDate.toISOString().slice(0, 10),
      daysOverdue: Math.max(0, Math.ceil((today.getTime() - item.dueDate.getTime()) / 86_400_000)),
      amount: Number(item.amount),
      paidAmount: Number(item.paidAmount),
      remaining: Number(item.amount) - Number(item.paidAmount),
      contractStatus: item.contract.status,
    }));
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", "attachment; filename=overdue.csv");
  return reply.send(toCsv(rows));
});


app.post("/reports/exports", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { reportType?: string; filtersJson?: unknown };
  const row = await prisma.reportExport.create({ data: { organizationId: isPlatformOwner(user) ? undefined : user.organizationId, reportType: body.reportType ?? "CUSTOM", filtersJson: (body.filtersJson ?? {}) as Prisma.InputJsonValue, downloadUrl: null } });
  return ok(row);
});

}
