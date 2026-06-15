import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { type FastifyReply, type FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { prisma, type Prisma } from "@repo/db";
import { signSession, verifySession, type SessionUser } from "@repo/auth";
import {
  createContractSchema,
  createCustomerSchema,
  createDeviceSchema,
  createPaymentSchema,
  loginSchema,
} from "@repo/shared";
import { calculateInstallments, generateContractNo, getOverdueLevel } from "@repo/contracts";
import { createPromptPayEmvPayload, normalizePaymentAmount, validatePromptPayId, getPaymentGatewaySetupStatus, getSlipVerificationSetupStatus, normalizeGatewayEvent, verifyGatewayWebhookSignature } from "@repo/payments";
import { getStorageSetupStatus, saveLocalBase64 } from "@repo/storage";
import { assertSafeDeviceAction, buildUnsignedMdmMobileConfig, createAndroidProvider, createAppleProvider, createDeviceControlAdapter, getDualProviderStatus } from "@repo/device-control";
import { sendNotification } from "@repo/notifications";
import { getPermissionsForRole } from "./permissions";
import { API_ROUTE_GROUPS, countRoutes } from "./route-groups";

export { validatePromptPayId, getPaymentGatewaySetupStatus, getSlipVerificationSetupStatus, normalizeGatewayEvent, verifyGatewayWebhookSignature, getStorageSetupStatus };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const deviceAdapter = createDeviceControlAdapter();
export const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-in-production";
export const PORT = Number(process.env.API_PORT ?? 4000);

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || [process.env.ADMIN_WEB_URL, process.env.CUSTOMER_WEB_URL].filter(Boolean).join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(request: FastifyRequest) {
  return String(request.headers["x-forwarded-for"] ?? request.ip ?? "unknown").split(",")[0].trim();
}

export function rateLimit(request: FastifyRequest, reply: FastifyReply, keyPrefix: string, limit = 60, windowMs = 60_000) {
  const key = `${keyPrefix}:${getClientIp(request)}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    reply.status(429).send({ ok: false, error: { code: "RATE_LIMITED", message: "Too many requests" } });
    return false;
  }
  return true;
}

export function constantTimeEquals(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function requireSharedSecret(request: FastifyRequest, reply: FastifyReply, envKey: string, headerName = "x-koga-webhook-secret") {
  const secret = process.env[envKey];
  if (!secret) return true;
  const provided = String(request.headers[headerName] ?? "");
  if (!provided || !constantTimeEquals(provided, secret)) {
    fail(reply, 401, "INVALID_WEBHOOK_SECRET", `${envKey} verification failed`);
    return false;
  }
  return true;
}

export function envStatus(keys: string[]) {
  return keys.map((key) => ({ key, present: Boolean(process.env[key] && String(process.env[key]).trim()) }));
}

export function safeUploadName(filename: string) {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
  return clean || `upload-${Date.now()}.bin`;
}

export async function saveBase64Upload(input: { filename: string; contentBase64: string; folder?: string }) {
  const status = getStorageSetupStatus();
  if (status.provider !== "local" && status.missing.length) {
    throw new Error(`Storage provider ${status.provider} ยังตั้งค่าไม่ครบ: ${status.missing.join(", ")}`);
  }

  // ใช้งานได้ทันทีสำหรับ local/dev และยังเป็น fallback ที่ปลอดภัยใน pilot.
  // Provider S3/R2/Supabase เตรียม env + checklist ไว้แล้ว แต่ต้องเสียบ SDK/credential จริงก่อนส่งไฟล์ขึ้น cloud.
  return saveLocalBase64({
    filename: input.filename,
    contentBase64: input.contentBase64,
    folder: input.folder ?? "documents",
    uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads"),
    publicBaseUrl: process.env.PUBLIC_UPLOAD_BASE_URL || `${process.env.PUBLIC_API_URL ?? `http://localhost:${PORT}`}/uploads`,
    maxBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 8_000_000),
  });
}


export function maybeSignMobileConfig(xml: string) {
  if (process.env.APPLE_SIGN_MOBILECONFIG !== "true") return Buffer.from(xml, "utf8");
  const cert = process.env.APPLE_MDM_PROFILE_SIGNING_CERT_PATH;
  const key = process.env.APPLE_MDM_PROFILE_SIGNING_KEY_PATH;
  if (!cert || !key || !fs.existsSync(cert) || !fs.existsSync(key)) throw new Error("Profile signing cert/key not found");
  const signed = spawnSync("openssl", ["smime", "-sign", "-signer", cert, "-inkey", key, "-nodetach", "-outform", "der"], {
    input: xml,
    encoding: "buffer",
    maxBuffer: 10_000_000,
  });
  if (signed.status !== 0) throw new Error(`OpenSSL profile signing failed: ${signed.stderr?.toString()}`);
  return signed.stdout;
}


export function buildAppleCommandPlist(command: { id: string; commandType: string; payload?: unknown }) {
  const uuid = command.id;
  if (command.commandType === "REQUEST_RELEASE") {
    return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Command</key><dict><key>RequestType</key><string>RemoveProfile</string><key>Identifier</key><string>com.koga.lease.restrictions</string></dict><key>CommandUUID</key><string>${uuid}</string></dict></plist>`;
  }
  if (["REQUEST_LIMITED_MODE", "REQUEST_RESTRICT"].includes(command.commandType)) {
    return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Command</key><dict><key>RequestType</key><string>DeviceLock</string><key>Message</key><string>กรุณาติดต่อผู้ให้เช่าเพื่อดำเนินการตามสัญญา</string></dict><key>CommandUUID</key><string>${uuid}</string></dict></plist>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Command</key><dict><key>RequestType</key><string>DeviceInformation</string><key>Queries</key><array><string>DeviceName</string><string>OSVersion</string><string>SerialNumber</string><string>UDID</string></array></dict><key>CommandUUID</key><string>${uuid}</string></dict></plist>`;
}


export function providerTypeForPlatform(platform?: string): "MOCK" | "ANDROID_MANAGEMENT" | "APPLE_MDM_ADE" {
  if (platform === "ANDROID") return "ANDROID_MANAGEMENT";
  if (["IOS", "IPADOS", "MACOS"].includes(String(platform))) return "APPLE_MDM_ADE";
  return "MOCK";
}

export function providerNameFromEnv() {
  return (process.env.DEVICE_CONTROL_PROVIDER ?? "local").toLowerCase();
}

export function buildDeviceContext(input: { organizationId?: string; contractId?: string | null; device: any; payload?: unknown }) {
  return {
    organizationId: input.organizationId,
    contractId: input.contractId ?? undefined,
    deviceId: input.device.id,
    platform: input.device.platform,
    providerDeviceId: input.device.providerDeviceName ?? undefined,
    displayName: `${input.device.brand ?? ""} ${input.device.model ?? ""}`.trim(),
    payload: {
      ...(typeof input.payload === "object" && input.payload ? input.payload as Record<string, unknown> : {}),
      deviceToken: input.device.providerDeviceToken ?? undefined,
      pushMagic: input.device.providerPushMagic ?? undefined,
    },
  };
}

export type AuthedRequest = FastifyRequest & { user: SessionUser };

export function ok<T>(data: T) {
  return { ok: true, data };
}


export function cleanEmptyStrings<T>(input: T): T {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, value === "" ? undefined : value]),
  ) as T;
}

export function fail(reply: FastifyReply, statusCode: number, code: string, message: string) {
  return reply.status(statusCode).send({ ok: false, error: { code, message } });
}

export async function getUserFromRequest(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    fail(reply, 401, "UNAUTHORIZED", "Missing bearer token");
    return null;
  }
  try {
    return verifySession(header.slice("Bearer ".length), JWT_SECRET);
  } catch {
    fail(reply, 401, "UNAUTHORIZED", "Invalid or expired token");
    return null;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = await getUserFromRequest(request, reply);
  if (!user) return;
  if (user.role === "CUSTOMER") {
    fail(reply, 403, "FORBIDDEN", "Customer portal tokens cannot access store/admin APIs");
    return;
  }
  (request as AuthedRequest).user = user;
}

export type CustomerPortalRequest = FastifyRequest & { portalUser: { id: string; organizationId: string; customerId: string; phone: string; name: string } };

export async function requireCustomerAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = await getUserFromRequest(request, reply);
  if (!user) return;
  if (user.role !== "CUSTOMER") {
    fail(reply, 403, "FORBIDDEN", "Customer portal token required");
    return;
  }
  const portalUser = await prisma.customerPortalUser.findFirst({
    where: { id: user.id, organizationId: user.organizationId, status: "ACTIVE" },
    include: { customer: true },
  });
  if (!portalUser) {
    fail(reply, 401, "UNAUTHORIZED", "Customer portal user is disabled or not found");
    return;
  }
  (request as CustomerPortalRequest).portalUser = {
    id: portalUser.id,
    organizationId: portalUser.organizationId,
    customerId: portalUser.customerId,
    phone: portalUser.phone,
    name: portalUser.customer.fullName,
  };
}

export async function audit(input: {
  organizationId?: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ?? {},
    },
  });
}



export function isPlatformOwner(user: SessionUser) {
  return user.role === "PLATFORM_OWNER";
}

export function ensurePlatformOwner(user: SessionUser, reply: FastifyReply) {
  if (!isPlatformOwner(user)) {
    fail(reply, 403, "FORBIDDEN", "Platform owner permission required");
    return false;
  }
  return true;
}

export function makeSlug(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `store-${crypto.randomBytes(3).toString("hex")}`;
}

export function planMonthlyFee(plan?: string) {
  const map: Record<string, number> = { STARTER: 990, STANDARD: 1990, PRO: 3990, ENTERPRISE: 8990 };
  return map[String(plan || "STARTER").toUpperCase()] ?? map.STARTER;
}

export function planDeviceLimit(plan?: string) {
  const map: Record<string, number> = { STARTER: 50, STANDARD: 150, PRO: 500, ENTERPRISE: 5000 };
  return map[String(plan || "STARTER").toUpperCase()] ?? map.STARTER;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}


export function customerPortalBaseUrl() {
  return (process.env.CUSTOMER_WEB_URL || "http://localhost:3002").replace(/\/$/, "");
}

export function makeCustomerPortalShareUrl(input: { storeSlug?: string | null; inviteToken: string }) {
  const params = new URLSearchParams();
  if (input.storeSlug) params.set("store", input.storeSlug);
  params.set("invite", input.inviteToken);
  return `${customerPortalBaseUrl()}/?${params.toString()}`;
}

export function generateCustomerPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function buildPaymentQr(input: { organizationId: string; paymentRequestId: string; amount: number }) {
  const setting = await prisma.storePaymentSetting.findFirst({ where: { organizationId: input.organizationId, isActive: true }, orderBy: { updatedAt: "desc" } });
  const promptPayId = setting?.promptPayId || process.env.DEFAULT_PROMPTPAY_ID || process.env.PROMPTPAY_ID;
  if (!promptPayId) return { qrPayload: null as string | null, qrImageDataUrl: null as string | null, paymentUrl: null as string | null };
  const ref = input.paymentRequestId.slice(0, 25);
  const qrPayload = createPromptPayEmvPayload({ promptPayId, amount: input.amount, ref });
  const qrImageDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 420 });
  return { qrPayload, qrImageDataUrl, paymentUrl: null as string | null };
}

export async function createDefaultOnboarding(organizationId: string) {
  const steps = [
    ["profile", "ตั้งค่าข้อมูลร้าน", "ชื่อร้าน เบอร์ ภาษี และข้อมูลออกใบแจ้งหนี้"],
    ["devices", "เพิ่มสต็อกเครื่อง", "เพิ่ม IMEI/Serial และระบุ Android หรือ iOS"],
    ["contracts", "สร้างสัญญาเช่าใช้", "ทำ lease-to-own พร้อม consent ก่อนส่งมอบ"],
    ["payment", "ตั้งค่ารับเงิน", "PromptPay/manual ก่อน แล้วค่อยต่อ gateway"],
    ["notification", "ตั้งค่าแจ้งเตือน", "LINE/SMS/email สำหรับเตือนงวด"],
    ["mdm", "เชื่อม Android/iOS MDM", "Android Management API / Apple Business Manager"],
    ["legal", "ตรวจสัญญาและ PDPA", "ทนาย/ผู้เชี่ยวชาญตรวจเทมเพลตก่อนใช้จริง"],
    ["customer_portal", "เปิดพอร์ทัลลูกค้า", "ให้ลูกค้าดูงวด QR และแจ้งชำระเอง"],
    ["collection", "ตั้งค่างานติดตาม", "สร้างกติกาแจ้งเตือนและงานโทรติดตาม"],
    ["risk", "เปิด Risk Score", "ใช้คะแนนช่วยร้านตัดสินใจก่อนปล่อยเครื่อง"],
    ["icloud_custody", "นำเครื่อง iCloud ร้านเข้าระบบ", "ใช้สำหรับร้านที่มีเครื่อง Apple ผูก iCloud ร้านอยู่แล้ว"],
  ] as const;
  for (let i = 0; i < steps.length; i++) {
    const [stepKey, title, description] = steps[i];
    await prisma.storeOnboardingStep.upsert({
      where: { organizationId_stepKey: { organizationId, stepKey } },
      create: { organizationId, stepKey, title, description, sortOrder: i + 1 },
      update: { title, description, sortOrder: i + 1 },
    });
  }
}

export const integrationCatalog = [
  { provider: "ANDROID_MANAGEMENT", category: "MDM", displayName: "Android Management API", requiredEnv: ["ANDROID_MANAGEMENT_PROJECT_ID", "ANDROID_MANAGEMENT_ENTERPRISE_NAME", "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON"], docs: ["docs/providers/android-management-api-setup-th.md"], canTestNow: true },
  { provider: "APPLE_BUSINESS_MANAGER", category: "MDM", displayName: "Apple Business Manager / ADE", requiredEnv: ["APPLE_MDM_BASE_URL", "APPLE_MDM_APNS_CERT_PATH", "APPLE_ABM_SERVER_TOKEN_PATH"], docs: ["docs/providers/apple-business-manager-setup-th.md"], canTestNow: true },
  { provider: "ICLOUD_CUSTODY_TRACKING", category: "MDM", displayName: "Legacy iCloud Custody Tracking", requiredEnv: ["ENABLE_ICLOUD_CUSTODY"], docs: ["docs/apple-icloud-custody-mode-th.md"], canTestNow: true },
  { provider: "PROMPTPAY_MANUAL", category: "PAYMENT", displayName: "PromptPay / โอนพร้อมตรวจสลิป", requiredEnv: ["PROMPTPAY_ID"], docs: ["docs/external/payment-gateway-production-th.md"], canTestNow: true },
  { provider: "PAYMENT_GATEWAY", category: "PAYMENT", displayName: "Payment Gateway / Webhook", requiredEnv: ["PAYMENT_GATEWAY_PROVIDER", "PAYMENT_GATEWAY_WEBHOOK_SECRET"], docs: ["docs/external/payment-gateway-production-th.md"], canTestNow: true },
  { provider: "SLIP_VERIFICATION", category: "PAYMENT", displayName: "Slip Verification", requiredEnv: ["SLIP_VERIFICATION_PROVIDER"], docs: ["docs/external/slip-verification-production-th.md"], canTestNow: true },
  { provider: "LINE_MESSAGING", category: "NOTIFICATION", displayName: "LINE Messaging API", requiredEnv: ["LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_SECRET"], docs: ["docs/external/line-sms-email-production-th.md"], canTestNow: true },
  { provider: "SMS_GATEWAY", category: "NOTIFICATION", displayName: "SMS Gateway", requiredEnv: ["SMS_PROVIDER"], docs: ["docs/external/line-sms-email-production-th.md"], canTestNow: true },
  { provider: "EMAIL_SMTP", category: "NOTIFICATION", displayName: "Email / SMTP", requiredEnv: ["SMTP_URL", "EMAIL_FROM"], docs: ["docs/external/line-sms-email-production-th.md"], canTestNow: true },
  { provider: "STORAGE_S3_R2", category: "STORAGE", displayName: "File Storage: Local/S3/R2/Supabase", requiredEnv: ["STORAGE_PROVIDER"], docs: ["docs/external/storage-production-th.md"], canTestNow: true },
  { provider: "WEBHOOK", category: "AUTOMATION", displayName: "External Webhook", requiredEnv: ["NOTIFICATION_WEBHOOK_URL"], docs: ["docs/external/webhook-automation-production-th.md"], canTestNow: true },
];

export async function ensureDefaultIntegrations(organizationId: string) {
  for (const item of integrationCatalog) {
    await prisma.integrationConnector.upsert({
      where: { organizationId_provider: { organizationId, provider: item.provider as any } },
      create: { organizationId, provider: item.provider as any, category: item.category as any, displayName: item.displayName, status: "SETUP_REQUIRED", configJson: { requiredEnv: item.requiredEnv } },
      update: { displayName: item.displayName, category: item.category as any },
    });
  }
}


export async function ensureDefaultOperationalTemplates(organizationId: string) {
  const notificationTemplates = [
    ["due_3_days", "LINE", "ใกล้ครบกำหนดชำระ", "แจ้งเตือน: งวดของคุณจะครบกำหนดในอีก 3 วัน ยอด {{amount}} บาท"],
    ["due_today", "LINE", "ครบกำหนดชำระวันนี้", "วันนี้ครบกำหนดชำระงวด ยอด {{amount}} บาท กรุณาชำระผ่านลิงก์/QR ในพอร์ทัล"],
    ["overdue_3_days", "LINE", "ค้างชำระ 3 วัน", "ระบบพบว่างวดของคุณค้างชำระ 3 วัน กรุณาติดต่อร้านเพื่อดำเนินการ"],
    ["paid_confirmed", "LINE", "ยืนยันรับชำระแล้ว", "ร้านยืนยันการชำระเงินเรียบร้อย ขอบคุณครับ/ค่ะ"],
    ["paid_off_release", "LINE", "จ่ายครบและรอดำเนินการปลดเครื่อง", "คุณชำระครบแล้ว ร้านจะดำเนินการปลด/โอนกรรมสิทธิ์ตามขั้นตอน"],
  ] as const;
  for (const [key, channel, title, body] of notificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { organizationId_key_channel: { organizationId, key, channel: channel as any } },
      create: { organizationId, key, channel: channel as any, title, body },
      update: { title, body },
    });
  }

  const templateItems = [
    ["CONTRACT", "สัญญาเช่าใช้พร้อมสิทธิ์ซื้อขาด", "1.0", "เทมเพลตสัญญาหลักสำหรับร้าน แก้ข้อความให้ทนายตรวจอีกครั้งก่อนใช้จริง"],
    ["MDM_CONSENT", "หนังสือยินยอมการจัดการอุปกรณ์", "1.0", "ลูกค้ารับทราบการจัดการอุปกรณ์ของร้านจนกว่าจะชำระครบและปลดเครื่อง"],
    ["PRIVACY_NOTICE", "Privacy Notice / PDPA", "1.0", "แจ้งวัตถุประสงค์การเก็บ ใช้ เปิดเผยข้อมูล และสิทธิของเจ้าของข้อมูล"],
    ["ICLOUD_CUSTODY", "หนังสือรับทราบ iCloud ร้าน", "1.0", "ใช้สำหรับร้านที่นำเครื่อง iPhone ที่ใช้ iCloud ร้านเข้า workflow หลักของระบบ"],
  ] as const;
  for (const [type, title, version, body] of templateItems) {
    await prisma.templateCenterItem.upsert({
      where: { id: `${organizationId}-${type}` },
      create: { id: `${organizationId}-${type}`, organizationId, type: type as any, title, version, body, isSystem: false },
      update: { title, version, body },
    });
  }

  const automationRules = [
    ["แจ้งเตือนก่อนครบกำหนด 3 วัน", "BEFORE_DUE_3_DAYS", "SEND_LINE", { templateKey: "due_3_days" }],
    ["ครบกำหนดวันนี้ ส่งแจ้งเตือน", "DUE_TODAY", "SEND_LINE", { templateKey: "due_today" }],
    ["ค้าง 3 วัน สร้างงานติดตาม", "OVERDUE_3_DAYS", "CREATE_COLLECTION_TASK", { priority: "HIGH" }],
    ["จ่ายครบ สร้างคิวปลดเครื่อง", "PAID_OFF", "CREATE_RELEASE_REQUEST", { requiresApproval: true }],
  ] as const;
  for (const [name, trigger, action, configJson] of automationRules) {
    const existing = await prisma.automationRule.findFirst({ where: { organizationId, trigger: trigger as any, action: action as any } });
    if (!existing) await prisma.automationRule.create({ data: { organizationId, name, trigger: trigger as any, action: action as any, configJson: configJson as Prisma.InputJsonObject } });
  }
}

export function riskGradeFromScore(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

export async function calculateCustomerRisk(customerId: string, organizationId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId }, include: { contracts: { include: { installments: true, payments: true } } } });
  if (!customer) return null;
  let score = 80;
  const reasons: string[] = [];
  const overdueInstallments = customer.contracts.flatMap((c) => c.installments).filter((i) => ["OVERDUE", "PARTIAL"].includes(i.status)).length;
  const activeContracts = customer.contracts.filter((c) => ["ACTIVE", "DUE_SOON", "OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED"].includes(c.status)).length;
  const totalValue = customer.contracts.reduce((sum, c) => sum + Number(c.totalAmount ?? 0), 0);
  if (overdueInstallments > 0) { score -= Math.min(35, overdueInstallments * 10); reasons.push(`มีงวดค้าง/จ่ายบางส่วน ${overdueInstallments} รายการ`); }
  if (activeContracts > 1) { score -= 8; reasons.push("มีสัญญา active มากกว่า 1 รายการ"); }
  if (totalValue > 50000) { score -= 8; reasons.push("มูลค่าสัญญารวมสูง"); }
  if (!customer.address) { score -= 6; reasons.push("ข้อมูลที่อยู่ยังไม่ครบ"); }
  if (!customer.nationalIdHash) { score -= 6; reasons.push("ยังไม่มีข้อมูลยืนยันตัวตนในระบบ"); }
  if (customer.status === "WATCHLIST") { score -= 20; reasons.push("ร้านกำหนดเป็น watchlist"); }
  if (customer.status === "BLACKLISTED") { score = Math.min(score, 25); reasons.push("ร้านกำหนดเป็น blacklist"); }
  score = Math.max(0, Math.min(100, score));
  const grade = riskGradeFromScore(score);
  const assessment = await prisma.customerRiskAssessment.create({ data: { organizationId, customerId, score, grade, reasons: reasons as unknown as Prisma.InputJsonArray } });
  await prisma.customer.update({ where: { id: customerId }, data: { riskScore: score } });
  return assessment;
}

export async function buildStoreHealth(organizationId: string) {
  const [org, customers, contracts, overdue, pendingPayments, failedMdm, unpaidInvoices, integrations] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.customer.count({ where: { organizationId } }),
    prisma.contract.count({ where: { organizationId } }),
    prisma.contract.count({ where: { organizationId, status: { in: ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RECOVERY", "RESTRICTED"] } } }),
    prisma.customerPaymentRequest.count({ where: { organizationId, status: { in: ["SUBMITTED", "OPEN"] } } }),
    prisma.deviceAction.count({ where: { status: "FAILED", device: { organizationId } } }),
    prisma.platformInvoice.count({ where: { organizationId, status: { in: ["ISSUED", "OVERDUE"] }, dueDate: { lt: new Date() } } }),
    prisma.integrationConnector.findMany({ where: { organizationId } }),
  ]);
  let score = 90;
  const signals: Record<string, unknown> = { customers, contracts, overdue, pendingPayments, failedMdm, unpaidInvoices };
  if (contracts > 0) score -= Math.min(25, Math.round((overdue / contracts) * 100));
  if (pendingPayments > 10) score -= 8;
  if (failedMdm > 0) score -= Math.min(15, failedMdm * 3);
  if (unpaidInvoices > 0) score -= 15;
  const inactiveRequired = integrations.filter((i) => ["PAYMENT", "MDM", "NOTIFICATION"].includes(i.category) && !["ACTIVE", "DISABLED"].includes(i.status)).length;
  if (inactiveRequired > 0) { score -= Math.min(15, inactiveRequired * 3); signals.incompleteIntegrations = inactiveRequired; }
  if (org?.status === "SUSPENDED") score = Math.min(score, 30);
  score = Math.max(0, Math.min(100, score));
  const grade = score >= 80 ? "HEALTHY" : score >= 60 ? "NEEDS_ATTENTION" : score >= 40 ? "RISKY" : "SUSPENDED_RISK";
  return prisma.storeHealthSnapshot.create({ data: { organizationId, score, grade, signals: signals as Prisma.InputJsonObject } });
}

export function createInvoiceNo() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  return lines.join("\n");
}

export function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatThaiDate(value: Date | string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

export function formatBaht(value: unknown) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value ?? 0));
}

export function renderContractHtml(contract: any) {
  const rows = contract.installments.map((item: any) => `
    <tr>
      <td>${item.installmentNo}</td>
      <td>${formatThaiDate(item.dueDate)}</td>
      <td>${formatBaht(item.amount)}</td>
      <td>${formatBaht(item.paidAmount)}</td>
      <td>${htmlEscape(item.status)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>สัญญาเช่าใช้พร้อมสิทธิ์ซื้อขาด ${htmlEscape(contract.contractNo)}</title>
<style>
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #111827; padding: 32px; }
  .page { max-width: 840px; margin: auto; }
  h1 { margin-bottom: 0; }
  .muted { color: #64748b; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
  .box { border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
  th { background: #f1f5f9; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 72px; }
  .line { border-top: 1px solid #111827; padding-top: 10px; text-align: center; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="page">
  <button class="no-print" onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button>
  <h1>สัญญาเช่าใช้พร้อมสิทธิ์ซื้อขาดโทรศัพท์</h1>
  <p class="muted">เลขสัญญา ${htmlEscape(contract.contractNo)} | สถานะสัญญา ${htmlEscape(contract.status)} | สถานะกรรมสิทธิ์ ${htmlEscape(contract.legalTitleStatus)}</p>

  <div class="grid">
    <div class="box">
      <h2>ข้อมูลลูกค้า</h2>
      <p><b>ชื่อ:</b> ${htmlEscape(contract.customer.fullName)}</p>
      <p><b>เบอร์:</b> ${htmlEscape(contract.customer.phone)}</p>
      <p><b>ที่อยู่:</b> ${htmlEscape(contract.customer.address)}</p>
    </div>
    <div class="box">
      <h2>ข้อมูลเครื่อง</h2>
      <p><b>รุ่น:</b> ${htmlEscape(contract.device.brand)} ${htmlEscape(contract.device.model)}</p>
      <p><b>IMEI:</b> ${htmlEscape(contract.device.imei)}</p>
      <p><b>Serial:</b> ${htmlEscape(contract.device.serialNumber)}</p>
    </div>
  </div>

  <div class="box">
    <h2>รายละเอียดราคา</h2>
    <p><b>ราคาเครื่อง:</b> ${formatBaht(contract.salePrice)}</p>
    <p><b>เงินดาวน์:</b> ${formatBaht(contract.downPayment)}</p>
    <p><b>ยอดผ่อน:</b> ${formatBaht(contract.principalAmount)}</p>
    <p><b>ดอกเบี้ย/ค่าธรรมเนียม:</b> ${formatBaht(contract.interestAmount)}</p>
    <p><b>ยอดรวม:</b> ${formatBaht(contract.totalAmount)}</p>
  </div>

  <h2>ตารางงวด</h2>
  <table>
    <thead><tr><th>งวด</th><th>ครบกำหนด</th><th>ยอดงวด</th><th>จ่ายแล้ว</th><th>สถานะ</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>เงื่อนไขสำคัญแบบ Lease-to-own</h2>
  <ol>
    <li>คู่สัญญาตกลงว่าเครื่องเป็นทรัพย์สินของผู้ให้เช่า/ร้าน จนกว่าลูกค้าจะชำระครบตามสัญญาและมีการปลดการจัดการอุปกรณ์สำเร็จ</li>
    <li>ลูกค้ารับทราบว่าเครื่องถูกลงทะเบียนในระบบจัดการอุปกรณ์ของร้าน/องค์กร เพื่อคุ้มครองทรัพย์สิน แจ้งเตือนงวด และดำเนินการตามนโยบายที่ระบุไว้เท่านั้น</li>
    <li>การจำกัดการใช้งานต้องผ่านขั้นตอนแจ้งเตือน ระยะผ่อนผัน การตรวจสอบ และการอนุมัติโดยผู้มีอำนาจ ไม่ใช่การล็อกทันทีอัตโนมัติ</li>
    <li>ห้ามใช้ MDM เพื่อแอบดูรูป แชต รหัสผ่าน เปิดกล้อง/ไมค์ หรือติดตามตำแหน่งเกินจำเป็น</li>
    <li>เมื่อชำระครบ ร้านต้องปลด MDM/release เครื่อง และออกหลักฐานการโอนกรรมสิทธิ์หรือปิดสัญญา</li>
    <li>เอกสารฉบับนี้เป็นเทมเพลต MVP ควรให้ทนายตรวจถ้าจะใช้จริงกับลูกค้า เพราะชีวิตจริงไม่ใช่ unit test ที่รีรันแล้วหาย</li>
  </ol>

  <div class="sign">
    <div class="line">ผู้ซื้อ / ผู้เช่าซื้อ</div>
    <div class="line">ผู้ขาย / ผู้ให้เช่าซื้อ</div>
  </div>
</div>
</body>
</html>`;
}

export async function recalculateContractStatus(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { installments: true, device: true },
  });

  if (!contract) return null;
  if (contract.status === "CANCELLED") return contract;

  const unpaid = contract.installments.filter((i) => i.status !== "PAID" && i.status !== "WAIVED");
  if (unpaid.length === 0) {
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "PAID_OFF",
        paidOffAt: new Date(),
        legalTitleStatus: "TRANSFER_PENDING",
        releaseDueAt: new Date(),
      },
    });

    await prisma.device.update({
      where: { id: contract.deviceId },
      data: { deviceStatus: "PAID_OFF", controlStatus: "RELEASE_PENDING" },
    });

    const existingRelease = await prisma.deviceAction.findFirst({
      where: { contractId, type: "REQUEST_RELEASE", status: { in: ["PENDING_APPROVAL", "APPROVED", "QUEUED", "SENT", "COMPLETED"] } },
    });

    if (!existingRelease) {
      await prisma.deviceAction.create({
        data: {
          deviceId: contract.deviceId,
          contractId,
          type: "REQUEST_RELEASE",
          reason: "ลูกค้าชำระครบทุกงวดแล้ว ต้องปลดการจัดการอุปกรณ์ / iCloud custody ตามโหมดของเครื่อง",
          status: "PENDING_APPROVAL",
        },
      });
    }

    await prisma.appleCustodyRecord.updateMany({
      where: { contractId },
      data: { status: "RELEASE_DUE", releaseDueAt: new Date() },
    }).catch(() => null);

    return updated;
  }

  const today = new Date();
  const overdue = unpaid
    .filter((i) => i.dueDate < today)
    .map((i) => Math.ceil((today.getTime() - i.dueDate.getTime()) / 86_400_000));

  if (overdue.length === 0) {
    return prisma.contract.update({ where: { id: contractId }, data: { status: "ACTIVE" } });
  }

  const maxDays = Math.max(...overdue);
  const level = getOverdueLevel(maxDays);
  const nextStatus = level === "NONE" ? "ACTIVE" : level;

  return prisma.contract.update({
    where: { id: contractId },
    data: { status: nextStatus as any },
  });
}



export {
  crypto,
  fs,
  path,
  spawnSync,
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
};

export type { Prisma, SessionUser, FastifyReply, FastifyRequest };
