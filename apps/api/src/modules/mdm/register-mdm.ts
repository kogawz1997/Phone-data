import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerMdmRoutes(app: FastifyInstance) {
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

app.get("/device-actions", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const actions = await prisma.deviceAction.findMany({
    where: { device: { organizationId: user.organizationId } },
    orderBy: { createdAt: "desc" },
    include: { device: true, contract: { include: { customer: true } } },
  });
  return ok(actions);
});


app.post("/device-actions/:id/approve", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };

  const action = await prisma.deviceAction.findFirst({
    where: { id, device: { organizationId: user.organizationId } },
    include: { device: true, contract: { include: { consents: true } } },
  });
  if (!action) return fail(reply, 404, "NOT_FOUND", "Action not found");
  if (!["PENDING_APPROVAL", "QUEUED"].includes(action.status)) return fail(reply, 409, "INVALID_STATE", "Action is not approvable");

  try {
    assertSafeDeviceAction({
      actionType: action.type,
      hasConsent: Boolean(action.contract?.consents.some((c) => c.type === "DEVICE_MANAGEMENT")),
      hasContract: Boolean(action.contract),
      isPaidOff: action.contract?.status === "PAID_OFF",
      legalTitleStatus: action.contract?.legalTitleStatus,
    });
  } catch (error) {
    return fail(reply, 400, "POLICY_BLOCKED", error instanceof Error ? error.message : "Policy blocked");
  }

  const deviceContext = buildDeviceContext({ organizationId: user.organizationId, contractId: action.contractId, device: action.device });
  let result;

  if (action.type === "SEND_REMINDER") {
    result = await deviceAdapter.sendReminder({ ...deviceContext, message: action.reason });
    await sendNotification({ channel: "IN_APP", to: action.contract?.customerId ?? action.deviceId, message: action.reason, metadata: { actionId: action.id } });
  } else if (["REQUEST_LIMITED_MODE", "REQUEST_RESTRICT"].includes(action.type)) {
    result = action.type === "REQUEST_LIMITED_MODE"
      ? await deviceAdapter.requestLimitedMode({ ...deviceContext, reason: action.reason })
      : await deviceAdapter.requestRestriction({ ...deviceContext, reason: action.reason });
    if (result.success) {
      await prisma.device.update({ where: { id: action.deviceId }, data: { controlStatus: "RESTRICT_PENDING" } });
    }
  } else if (action.type === "REQUEST_RELEASE") {
    result = await deviceAdapter.releaseDevice({ ...deviceContext, reason: action.reason });
    if (result.success) {
      await prisma.device.update({ where: { id: action.deviceId }, data: { controlStatus: "RELEASED" } });
      if (action.contractId) {
        await prisma.contract.update({ where: { id: action.contractId }, data: { releaseCompletedAt: new Date(), legalTitleStatus: "TRANSFER_PENDING" } });
        const existingTransfer = await prisma.deviceAction.findFirst({ where: { contractId: action.contractId, type: "CONFIRM_OWNERSHIP_TRANSFER", status: { in: ["PENDING_APPROVAL", "COMPLETED"] } } });
        if (!existingTransfer) {
          await prisma.deviceAction.create({ data: { deviceId: action.deviceId, contractId: action.contractId, type: "CONFIRM_OWNERSHIP_TRANSFER", reason: "MDM release completed. Confirm legal ownership transfer document.", status: "PENDING_APPROVAL" } });
        }
      }
    }
  } else if (action.type === "CONFIRM_OWNERSHIP_TRANSFER") {
    result = await deviceAdapter.confirmOwnershipTransfer({ ...deviceContext, reason: action.reason });
    if (result.success) {
      await prisma.device.update({ where: { id: action.deviceId }, data: { deviceStatus: "RELEASED", controlStatus: "RELEASED" } });
      if (action.contractId) {
        await prisma.contract.update({ where: { id: action.contractId }, data: { legalTitleStatus: "TRANSFERRED", ownershipTransferredAt: new Date() } });
      }
    }
  } else {
    result = { success: true, providerRef: `recovery-workflow-${Date.now()}`, message: "Marked for recovery workflow" };
  }

  const isAppleCommand = ["IOS", "IPADOS", "MACOS"].includes(String(action.device.platform));
  const commandStatus = result.success ? (isAppleCommand ? "SENT" : "COMPLETED") : "FAILED";
  await prisma.mdmCommand.create({
    data: {
      deviceId: action.deviceId,
      provider: providerTypeForPlatform(action.device.platform),
      commandType: action.type,
      payload: { reason: action.reason, deviceToken: action.device.providerDeviceToken, pushMagic: action.device.providerPushMagic } as Prisma.InputJsonObject,
      status: commandStatus,
      providerRef: result.providerRef,
      resultJson: result as Prisma.InputJsonObject,
      completedAt: isAppleCommand && result.success ? undefined : new Date(),
    },
  }).catch(() => null);

  const updated = await prisma.deviceAction.update({
    where: { id },
    data: {
      status: result.success ? (isAppleCommand ? "SENT" : "COMPLETED") : "FAILED",
      approvedBy: user.id,
      resultJson: result as Prisma.InputJsonObject,
      completedAt: isAppleCommand && result.success ? undefined : new Date(),
    },
  });

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "APPROVE_DEVICE_ACTION", targetType: "DeviceAction", targetId: id, metadata: { type: action.type } });
  return ok(updated);
});


app.post("/device-actions/:id/reject", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const action = await prisma.deviceAction.findFirst({ where: { id, device: { organizationId: user.organizationId } } });
  if (!action) return fail(reply, 404, "NOT_FOUND", "Action not found");
  const updated = await prisma.deviceAction.update({ where: { id }, data: { status: "REJECTED", approvedBy: user.id } });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "REJECT_DEVICE_ACTION", targetType: "DeviceAction", targetId: id });
  return ok(updated);
});


app.post("/device-actions", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { deviceId?: string; contractId?: string; type?: any; reason?: string };
  if (!body.deviceId || !body.type || !body.reason) return fail(reply, 400, "BAD_REQUEST", "deviceId, type and reason are required");
  const device = await prisma.device.findFirst({ where: { id: body.deviceId, organizationId: user.organizationId } });
  if (!device) return fail(reply, 404, "NOT_FOUND", "Device not found");
  const action = await prisma.deviceAction.create({
    data: { deviceId: body.deviceId, contractId: body.contractId, type: body.type, reason: body.reason, status: "PENDING_APPROVAL" },
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_DEVICE_ACTION", targetType: "DeviceAction", targetId: action.id, metadata: { type: action.type } });
  return ok(action);
});


app.get("/mdm/enrollments", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const enrollments = await prisma.mdmEnrollment.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { device: true },
  });
  return ok(enrollments);
});


app.post("/devices/:id/mdm/bind", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const { id } = request.params as { id: string };
  const body = cleanEmptyStrings(request.body) as { providerDeviceName?: string; providerEnrollmentId?: string; providerDeviceToken?: string; providerPushMagic?: string; controlStatus?: any };
  const device = await prisma.device.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!device) return fail(reply, 404, "NOT_FOUND", "Device not found");
  if (!body.providerDeviceName && !body.providerEnrollmentId && !body.providerDeviceToken && !body.providerPushMagic) {
    return fail(reply, 400, "BAD_REQUEST", "providerDeviceName/providerEnrollmentId/deviceToken/pushMagic is required");
  }
  const updated = await prisma.device.update({
    where: { id },
    data: {
      providerDeviceName: body.providerDeviceName,
      providerEnrollmentId: body.providerEnrollmentId,
      providerDeviceToken: body.providerDeviceToken,
      providerPushMagic: body.providerPushMagic,
      controlStatus: body.controlStatus ?? "ENROLLED",
      lastMdmSyncAt: new Date(),
    },
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "BIND_MDM_DEVICE", targetType: "Device", targetId: id, metadata: body as Prisma.InputJsonObject });
  return ok(updated);
});


app.get("/mdm/apple/enroll/:enrollmentId.mobileconfig", async (request, reply) => {
  const { enrollmentId } = request.params as { enrollmentId: string };
  const enrollment = await prisma.mdmEnrollment.findFirst({ where: { OR: [{ providerToken: enrollmentId }, { token: enrollmentId }] }, include: { device: true } });
  if (!enrollment) return fail(reply, 404, "NOT_FOUND", "Enrollment profile not found");
  if (!process.env.APPLE_MDM_APNS_TOPIC) return fail(reply, 500, "APPLE_TOPIC_REQUIRED", "APPLE_MDM_APNS_TOPIC is required before generating iOS enrollment profiles");
  const baseUrl = (process.env.APPLE_MDM_BASE_URL ?? process.env.PUBLIC_API_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
  const mobileconfig = buildUnsignedMdmMobileConfig({
    enrollmentId,
    displayName: enrollment.device ? `${enrollment.device.brand} ${enrollment.device.model}` : "KOGA Lease MDM",
    checkInUrl: `${baseUrl}/mdm/apple/checkin`,
    serverUrl: `${baseUrl}/mdm/apple/connect`,
    topic: process.env.APPLE_MDM_APNS_TOPIC,
  });
  const body = maybeSignMobileConfig(mobileconfig);
  reply.header("Content-Type", "application/x-apple-aspen-config");
  reply.header("Content-Disposition", `attachment; filename=${enrollmentId}.mobileconfig`);
  return reply.send(body);
});


app.get("/mdm/providers/status", { preHandler: requireAuth }, async () => {
  return ok(getDualProviderStatus());
});


app.post("/mdm/android/signup-url", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { callbackUrl?: string; adminEmail?: string; allowedDomains?: string[] };
  const android = createAndroidProvider();
  const callbackUrl = body.callbackUrl || process.env.ANDROID_MANAGEMENT_CALLBACK_URL || `${process.env.PUBLIC_API_URL ?? `http://localhost:${PORT}`}/mdm/android/signup-callback`;
  const result = await android.createSignupUrl({ callbackUrl, adminEmail: body.adminEmail ?? user.email, allowedDomains: body.allowedDomains });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_ANDROID_SIGNUP_URL", targetType: "AndroidEnterprise", targetId: result.signupUrlName ?? "signup-url", metadata: result as Prisma.InputJsonObject });
  return ok(result);
});


app.post("/mdm/android/enterprise", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { enterpriseToken?: string; signupUrlName?: string; displayName?: string };
  if (!body.enterpriseToken || !body.signupUrlName) return fail(reply, 400, "BAD_REQUEST", "enterpriseToken and signupUrlName are required");
  const android = createAndroidProvider();
  const result = await android.createEnterprise({ enterpriseToken: body.enterpriseToken, signupUrlName: body.signupUrlName, displayName: body.displayName ?? process.env.ORG_NAME ?? "KOGA Lease MDM" });
  await prisma.mdmEnterprise.create({
    data: {
      organizationId: user.organizationId,
      provider: "ANDROID_MANAGEMENT",
      providerRef: result.enterpriseName,
      displayName: body.displayName ?? process.env.ORG_NAME ?? "KOGA Lease MDM",
      status: result.success ? "ACTIVE" : "FAILED",
    },
  }).catch(() => null);
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_ANDROID_ENTERPRISE", targetType: "AndroidEnterprise", targetId: result.enterpriseName ?? "enterprise", metadata: result as Prisma.InputJsonObject });
  return ok(result);
});

// GET callback is helpful during manual setup: Google redirects with enterpriseToken/signUpUrlName.


app.get("/mdm/android/signup-callback", async (request, reply) => {
  const query = request.query as Record<string, string | undefined>;
  const enterpriseToken = query.enterpriseToken;
  const signupUrlName = query.signupUrlName ?? query.signupUrl;
  reply.header("Content-Type", "text/html; charset=utf-8");
  return reply.send(`<!doctype html><meta charset="utf-8"><title>Android Enterprise Callback</title><body style="font-family:system-ui;padding:32px"><h1>Android Enterprise signup callback</h1><p>นำค่าเหล่านี้ไปใส่ในหน้า Admin > MDM Setup > Android Enterprise</p><pre>enterpriseToken=${htmlEscape(enterpriseToken)}\nsignupUrlName=${htmlEscape(signupUrlName)}</pre><p>อย่าแชร์ token นี้กับคนอื่น มันไม่ใช่คูปองส่วนลดร้านชานม</p></body>`);
});


app.post("/mdm/android/enrollment-token", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { deviceId?: string; contractId?: string; policyId?: string; mode?: any; displayName?: string };
  const android = createAndroidProvider();

  if (body.deviceId) {
    const device = await prisma.device.findFirst({ where: { id: body.deviceId, organizationId: user.organizationId } });
    if (!device) return fail(reply, 404, "NOT_FOUND", "Device not found");
  }

  const result = await android.createEnrollment({
    organizationId: user.organizationId,
    deviceId: body.deviceId,
    contractId: body.contractId,
    platform: "ANDROID",
    mode: body.mode ?? "ANDROID_FULLY_MANAGED",
    policyId: body.policyId ?? "lease-basic",
    displayName: body.displayName,
  });

  const enrollment = await prisma.mdmEnrollment.create({
    data: {
      organizationId: user.organizationId,
      deviceId: body.deviceId,
      platform: "ANDROID",
      provider: "ANDROID_MANAGEMENT",
      mode: body.mode ?? "ANDROID_FULLY_MANAGED",
      token: result.token,
      providerToken: result.providerRef ?? result.enrollmentId,
      qrPayload: result.qrCode ? (() => { try { return JSON.parse(result.qrCode); } catch { return { raw: result.qrCode }; } })() as Prisma.InputJsonObject : undefined,
      enrollmentUrl: result.enrollmentUrl,
      status: result.success ? "CREATED" : "FAILED",
      expiresAt: result.expiresAt ? new Date(result.expiresAt) : undefined,
    },
  });

  if (body.deviceId && result.success) {
    await prisma.device.update({
      where: { id: body.deviceId },
      data: { controlStatus: "ENROLL_PENDING", providerEnrollmentId: result.providerRef ?? result.enrollmentId },
    });
  }

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_ANDROID_ENROLLMENT", targetType: "MDM", targetId: body.deviceId ?? enrollment.id, metadata: result as Prisma.InputJsonObject });
  return ok({ ...result, localEnrollmentId: enrollment.id });
});


app.post("/mdm/android/policies/:policyId/publish", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const { policyId } = request.params as { policyId: string };
  const android = createAndroidProvider();
  const payload = (request.body ?? {}) as unknown;
  const result = await android.publishPolicy({ organizationId: user.organizationId, policyId, payload });
  const policy = await prisma.mdmPolicy.create({
    data: {
      organizationId: user.organizationId,
      provider: "ANDROID_MANAGEMENT",
      platform: "ANDROID",
      name: policyId,
      payload: (payload && typeof payload === "object" ? payload : {}) as Prisma.InputJsonObject,
      status: result.success ? "PUBLISHED" : "FAILED",
      providerRef: result.providerRef,
    },
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "PUBLISH_ANDROID_POLICY", targetType: "MDMPolicy", targetId: policyId, metadata: result as Prisma.InputJsonObject });
  return ok({ ...result, localPolicyId: policy.id });
});


app.post("/mdm/apple/enrollment-profile", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { deviceId?: string; contractId?: string; policyId?: string; mode?: any; displayName?: string };
  const apple = createAppleProvider();

  if (body.deviceId) {
    const device = await prisma.device.findFirst({ where: { id: body.deviceId, organizationId: user.organizationId } });
    if (!device) return fail(reply, 404, "NOT_FOUND", "Device not found");
  }

  const result = await apple.createEnrollment({
    organizationId: user.organizationId,
    deviceId: body.deviceId,
    contractId: body.contractId,
    platform: "IOS",
    mode: body.mode ?? "APPLE_ADE",
    policyId: body.policyId ?? "lease-basic-ios",
    displayName: body.displayName,
  });

  const enrollment = await prisma.mdmEnrollment.create({
    data: {
      organizationId: user.organizationId,
      deviceId: body.deviceId,
      platform: "IOS",
      provider: "APPLE_MDM_ADE",
      mode: body.mode ?? "APPLE_ADE",
      token: result.enrollmentId,
      providerToken: result.providerRef ?? result.enrollmentId,
      enrollmentUrl: result.enrollmentUrl,
      status: result.success ? "CREATED" : "FAILED",
      expiresAt: result.expiresAt ? new Date(result.expiresAt) : undefined,
    },
  });

  if (body.deviceId && result.success) {
    await prisma.device.update({
      where: { id: body.deviceId },
      data: { controlStatus: "ENROLL_PENDING", providerEnrollmentId: result.providerRef ?? result.enrollmentId },
    });
  }

  await audit({ organizationId: user.organizationId, actorId: user.id, action: "CREATE_APPLE_ENROLLMENT", targetType: "MDM", targetId: body.deviceId ?? enrollment.id, metadata: result as Prisma.InputJsonObject });
  return ok({ ...result, localEnrollmentId: enrollment.id });
});


app.post("/mdm/apple/policies/:policyId/publish", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const { policyId } = request.params as { policyId: string };
  const apple = createAppleProvider();
  const payload = (request.body ?? {}) as unknown;
  const result = await apple.publishPolicy({ organizationId: user.organizationId, policyId, payload });
  const policy = await prisma.mdmPolicy.create({
    data: {
      organizationId: user.organizationId,
      provider: "APPLE_MDM_ADE",
      platform: "IOS",
      name: policyId,
      payload: (payload && typeof payload === "object" ? payload : {}) as Prisma.InputJsonObject,
      status: result.success ? "PUBLISHED" : "FAILED",
      providerRef: result.providerRef,
    },
  });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "PUBLISH_APPLE_PROFILE", targetType: "MDMProfile", targetId: policyId, metadata: result as Prisma.InputJsonObject });
  return ok({ ...result, localPolicyId: policy.id });
});


app.post("/mdm/apple/abm/sync", { preHandler: requireAuth }, async (request) => {
  const user = (request as AuthedRequest).user;
  const apple = createAppleProvider();
  const result = await apple.syncDevice({});
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "SYNC_APPLE_ABM", targetType: "MDM", targetId: "apple-abm", metadata: result as Prisma.InputJsonObject });
  return ok(result);
});


app.post("/mdm/webhooks/android", async (request, reply) => {
  if (!requireSharedSecret(request, reply, "ANDROID_MANAGEMENT_WEBHOOK_SECRET")) return;
  const body = (request.body ?? {}) as Record<string, unknown>;
  const deviceName = String(body.name ?? body.deviceName ?? "");
  if (deviceName) {
    await prisma.device.updateMany({
      where: { providerDeviceName: deviceName },
      data: { controlStatus: "ENROLLED", lastMdmSyncAt: new Date() },
    });
  }
  await audit({ action: "ANDROID_WEBHOOK_RECEIVED", targetType: "Webhook", targetId: deviceName || "android", metadata: body as Prisma.InputJsonValue });
  return ok({ received: true, boundDevice: Boolean(deviceName) });
});

function extractPlistValue(xml: string, key: string) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`, "i");
  return xml.match(pattern)?.[1];
}


app.post("/mdm/apple/checkin", async (request, reply) => {
  const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
  const udid = extractPlistValue(rawBody, "UDID");
  const pushMagic = extractPlistValue(rawBody, "PushMagic");
  const token = extractPlistValue(rawBody, "Token");
  const serialNumber = extractPlistValue(rawBody, "SerialNumber");

  if (serialNumber || udid) {
    const device = await prisma.device.findFirst({ where: { OR: [{ serialNumber: serialNumber ?? undefined }, { providerDeviceName: udid ?? undefined }] } });
    if (device) {
      await prisma.device.update({ where: { id: device.id }, data: { providerDeviceName: udid ?? device.providerDeviceName, providerDeviceToken: token ?? device.providerDeviceToken, providerPushMagic: pushMagic ?? device.providerPushMagic, controlStatus: "ENROLLED", lastMdmSyncAt: new Date() } });
    }
  }

  await audit({ action: "APPLE_MDM_CHECKIN", targetType: "AppleMDM", targetId: udid ?? serialNumber ?? "checkin", metadata: { udid, serialNumber, hasToken: Boolean(token), hasPushMagic: Boolean(pushMagic) } });
  reply.header("Content-Type", "application/xml; charset=utf-8");
  return reply.send(`<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict></dict></plist>`);
});


app.put("/mdm/apple/connect", async (request, reply) => {
  const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
  const udid = extractPlistValue(rawBody, "UDID");
  const status = extractPlistValue(rawBody, "Status");
  const commandUuid = extractPlistValue(rawBody, "CommandUUID");

  if (commandUuid && status) {
    await prisma.mdmCommand.updateMany({
      where: { id: commandUuid, provider: "APPLE_MDM_ADE" },
      data: { status: status === "Acknowledged" ? "ACKNOWLEDGED" : status, completedAt: new Date(), resultJson: { status, raw: rawBody.slice(0, 1000) } as Prisma.InputJsonObject },
    });
  }

  const device = udid ? await prisma.device.findFirst({ where: { providerDeviceName: udid } }) : null;
  const nextCommand = device ? await prisma.mdmCommand.findFirst({
    where: { deviceId: device.id, provider: "APPLE_MDM_ADE", status: "SENT", completedAt: null },
    orderBy: { createdAt: "asc" },
  }) : null;

  await audit({ action: "APPLE_MDM_CONNECT", targetType: "AppleMDM", targetId: udid ?? "connect", metadata: { udid, status, commandUuid, hasNextCommand: Boolean(nextCommand) } });
  reply.header("Content-Type", "application/xml; charset=utf-8");

  if (!nextCommand) return reply.send("");
  return reply.send(buildAppleCommandPlist({ id: nextCommand.id, commandType: nextCommand.commandType, payload: nextCommand.payload }));
});

}
