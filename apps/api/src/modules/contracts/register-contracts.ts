import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerContractsRoutes(app: FastifyInstance) {
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

app.get("/contracts", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const contracts = await prisma.contract.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, device: true, installments: true, payments: true },
  });
  return ok(contracts);
});


app.post("/contracts", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const parsed = createContractSchema.safeParse(cleanEmptyStrings(request.body));
  if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", parsed.error.message);

  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, organizationId: user.organizationId } });
  if (!customer) return fail(reply, 404, "NOT_FOUND", "Customer not found");

  const device = await prisma.device.findFirst({ where: { id: parsed.data.deviceId, organizationId: user.organizationId } });
  if (!device) return fail(reply, 404, "NOT_FOUND", "Device not found");
  if (device.deviceStatus !== "IN_STOCK") return fail(reply, 409, "DEVICE_NOT_AVAILABLE", "Device is not in stock");

  const principalAmount = parsed.data.salePrice - parsed.data.downPayment;
  if (principalAmount <= 0) return fail(reply, 400, "BAD_REQUEST", "ยอดเงินผ่อนต้องมากกว่า 0");

  const totalAmount = principalAmount + parsed.data.interestAmount;
  const schedule = calculateInstallments({
    totalAmount,
    installmentCount: parsed.data.installmentCount,
    firstDueDate: parsed.data.firstDueDate,
  });

  const contract = await prisma.$transaction(async (tx) => {
    const created = await tx.contract.create({
      data: {
        organizationId: user.organizationId,
        customerId: parsed.data.customerId,
        deviceId: parsed.data.deviceId,
        contractNo: generateContractNo(),
        salePrice: parsed.data.salePrice,
        downPayment: parsed.data.downPayment,
        principalAmount,
        interestAmount: parsed.data.interestAmount,
        totalAmount,
        installmentCount: parsed.data.installmentCount,
        status: "DRAFT",
        agreementType: parsed.data.agreementType,
        legalTitleStatus: parsed.data.agreementType === "LEASE_TO_OWN" ? "ORGANIZATION_OWNED" : "ORGANIZATION_OWNED",
        managementPurpose: parsed.data.managementPurpose,
        installments: {
          create: schedule.map((item) => ({
            installmentNo: item.installmentNo,
            dueDate: item.dueDate,
            amount: item.amount,
            status: "PENDING",
          })),
        },
      },
      include: { installments: true, customer: true, device: true },
    });

    await tx.device.update({ where: { id: parsed.data.deviceId }, data: { deviceStatus: "LEASE_ACTIVE", controlStatus: "ENROLL_PENDING" } });
    return created;
  });

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_CONTRACT", targetType: "Contract", targetId: contract.id, metadata: { contractNo: contract.contractNo } });
  return ok(contract);
});


app.get("/contracts/:id", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const contract = await prisma.contract.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { customer: true, device: true, installments: true, payments: true, consents: true, actions: true },
  });
  if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");
  return ok(contract);
});


app.post("/contracts/:id/sign", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const contract = await prisma.contract.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");
  if (contract.status !== "DRAFT") return fail(reply, 409, "INVALID_STATE", "Only draft contracts can be signed");

  const updated = await prisma.$transaction(async (tx) => {
    const signed = await tx.contract.update({ where: { id }, data: { status: "ACTIVE", signedAt: new Date(), legalTitleStatus: "ORGANIZATION_OWNED" } });
    await tx.device.update({ where: { id: contract.deviceId }, data: { deviceStatus: "LEASE_ACTIVE", controlStatus: "ENROLLED" } });
    await tx.consent.createMany({
      data: [
        { customerId: contract.customerId, contractId: id, type: "INSTALLMENT_CONTRACT", version: "lease-a-1" },
        { customerId: contract.customerId, contractId: id, type: "LEASE_TO_OWN_TERMS", version: "lease-a-1" },
        { customerId: contract.customerId, contractId: id, type: "OWNERSHIP_RETENTION", version: "lease-a-1" },
        { customerId: contract.customerId, contractId: id, type: "PAYMENT_REMINDER", version: "lease-a-1" },
        { customerId: contract.customerId, contractId: id, type: "DEVICE_MANAGEMENT", version: "lease-a-1" },
        { customerId: contract.customerId, contractId: id, type: "DATA_PROCESSING", version: "lease-a-1" },
        { customerId: contract.customerId, contractId: id, type: "RELEASE_PROCESS", version: "lease-a-1" },
      ],
    });
    return signed;
  });

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "SIGN_CONTRACT", targetType: "Contract", targetId: id });
  return ok(updated);
});


app.post("/contracts/:id/cancel", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const contract = await prisma.contract.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");

  const updated = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.contract.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await tx.device.update({ where: { id: contract.deviceId }, data: { deviceStatus: "IN_STOCK", controlStatus: "NOT_ENROLLED" } });
    return cancelled;
  });

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CANCEL_CONTRACT", targetType: "Contract", targetId: id });
  return ok(updated);
});


app.get("/contracts/:id/print", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const contract = await prisma.contract.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { customer: true, device: true, installments: { orderBy: { installmentNo: "asc" } } },
  });
  if (!contract) return fail(reply, 404, "NOT_FOUND", "Contract not found");
  reply.header("Content-Type", "text/html; charset=utf-8");
  return reply.send(renderContractHtml(contract));
});

}
