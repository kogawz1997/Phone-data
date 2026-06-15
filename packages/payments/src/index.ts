import crypto from "node:crypto";

export type PaymentGatewayProvider = "manual" | "webhook" | "omise" | "gbprimepay" | "2c2p" | "scb_bill_payment";
export type SlipVerificationProvider = "manual" | "webhook" | "bank_api";

export function normalizePaymentAmount(value: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payment amount");
  }
  return Math.round(amount * 100) / 100;
}

function crc16ccitt(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function normalizePromptPayId(promptPayId: string) {
  const clean = promptPayId.replace(/[^0-9]/g, "");
  if (clean.length === 10 && clean.startsWith("0")) return `0066${clean.slice(1)}`;
  return clean;
}

export function validatePromptPayId(promptPayId?: string) {
  if (!promptPayId) return { ok: false, message: "PROMPTPAY_ID ยังไม่ถูกตั้งค่า" };
  const clean = promptPayId.replace(/[^0-9]/g, "");
  if (![10, 13, 15].includes(clean.length)) {
    return { ok: false, message: "PromptPay ID ควรเป็นเบอร์ 10 หลัก, เลขบัตร/ภาษี 13 หลัก หรือ e-wallet 15 หลัก" };
  }
  return { ok: true, clean, message: "PromptPay ID format looks valid" };
}

export function createPromptPayEmvPayload(input: { promptPayId: string; amount: number; ref?: string }) {
  const validation = validatePromptPayId(input.promptPayId);
  if (!validation.ok) throw new Error(validation.message);
  const proxyType = input.promptPayId.replace(/[^0-9]/g, "").length === 13 ? "02" : "01";
  const proxyValue = normalizePromptPayId(input.promptPayId);
  const merchantAccountInfo = tlv("00", "A000000677010111") + tlv(proxyType, proxyValue);
  const amount = normalizePaymentAmount(input.amount).toFixed(2);
  const body =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("29", merchantAccountInfo) +
    tlv("53", "764") +
    tlv("54", amount) +
    tlv("58", "TH") +
    tlv("59", "KOGA LEASE") +
    tlv("60", "BANGKOK") +
    (input.ref ? tlv("62", tlv("05", input.ref.slice(0, 25))) : "");
  const withoutCrc = `${body}6304`;
  return `${withoutCrc}${crc16ccitt(withoutCrc)}`;
}

export function createMockPromptPayPayload(input: { promptPayId?: string; amount: number; ref?: string }) {
  if (input.promptPayId) {
    return {
      provider: "PROMPTPAY_EMV",
      promptPayId: input.promptPayId,
      amount: normalizePaymentAmount(input.amount),
      ref: input.ref ?? `PAY-${Date.now()}`,
      qrPayload: createPromptPayEmvPayload({ promptPayId: input.promptPayId, amount: input.amount, ref: input.ref }),
    };
  }
  return {
    provider: "MOCK_PROMPTPAY",
    promptPayId: "not-configured",
    amount: input.amount,
    ref: input.ref ?? `PAY-${Date.now()}`,
    note: "Set store PromptPay ID to generate real EMV payload.",
  };
}

export function hmacSha256Hex(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function timingSafeEqualText(a = "", b = "") {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function verifyGatewayWebhookSignature(input: {
  provider?: PaymentGatewayProvider | string;
  rawBody: string;
  signature?: string;
  secret?: string;
}) {
  const provider = String(input.provider ?? "manual").toLowerCase();
  if (!input.secret) return { ok: provider === "manual", skipped: true, message: "No webhook secret configured" };
  if (!input.signature) return { ok: false, message: "Missing webhook signature header" };
  const expected = hmacSha256Hex(input.secret, input.rawBody);
  const normalized = input.signature.replace(/^sha256=/, "");
  return { ok: timingSafeEqualText(expected, normalized), expectedPrefix: expected.slice(0, 10), provider };
}

export function normalizeGatewayEvent(input: Record<string, unknown>) {
  const status = String(input.status ?? input.paymentStatus ?? input.event ?? "").toLowerCase();
  const paid = ["paid", "confirmed", "success", "succeeded", "charge.complete", "payment.succeeded"].includes(status);
  return {
    paymentId: String(input.paymentId ?? input.metadata_payment_id ?? input.reference ?? input.ref ?? ""),
    providerRef: String(input.providerRef ?? input.transactionId ?? input.chargeId ?? input.id ?? ""),
    amount: input.amount !== undefined ? normalizePaymentAmount(String(input.amount)) : undefined,
    status,
    paid,
    raw: input,
  };
}

export function getPaymentGatewaySetupStatus(env: NodeJS.ProcessEnv = process.env) {
  const provider = String(env.PAYMENT_GATEWAY_PROVIDER ?? env.PAYMENT_PROVIDER ?? "manual").toLowerCase();
  const requiredByProvider: Record<string, string[]> = {
    manual: [],
    webhook: ["PAYMENT_GATEWAY_WEBHOOK_SECRET"],
    omise: ["OMISE_PUBLIC_KEY", "OMISE_SECRET_KEY", "PAYMENT_GATEWAY_WEBHOOK_SECRET"],
    gbprimepay: ["GBPRIMEPAY_MERCHANT_ID", "GBPRIMEPAY_PUBLIC_KEY", "GBPRIMEPAY_SECRET_KEY", "PAYMENT_GATEWAY_WEBHOOK_SECRET"],
    "2c2p": ["TWOC2P_MERCHANT_ID", "TWOC2P_SECRET_KEY", "PAYMENT_GATEWAY_WEBHOOK_SECRET"],
    scb_bill_payment: ["SCB_BILLER_ID", "SCB_API_KEY", "PAYMENT_GATEWAY_WEBHOOK_SECRET"],
  };
  const required = requiredByProvider[provider] ?? ["PAYMENT_GATEWAY_WEBHOOK_SECRET"];
  const missing = required.filter((key) => !env[key]);
  return {
    provider,
    status: missing.length ? "SETUP_REQUIRED" : "ACTIVE",
    required,
    missing,
    docs: ["docs/external/payment-gateway-production-th.md", "docs/payment-storage-notification-real-th.md"],
  };
}

export function getSlipVerificationSetupStatus(env: NodeJS.ProcessEnv = process.env) {
  const provider = String(env.SLIP_VERIFICATION_PROVIDER ?? env.SLIP_VERIFY_PROVIDER ?? "manual").toLowerCase();
  const requiredByProvider: Record<string, string[]> = {
    manual: [],
    webhook: ["SLIP_VERIFICATION_WEBHOOK_URL", "SLIP_VERIFICATION_WEBHOOK_SECRET"],
    bank_api: ["SLIP_VERIFY_API_KEY"],
  };
  const required = requiredByProvider[provider] ?? [];
  const missing = required.filter((key) => !env[key]);
  return {
    provider,
    status: missing.length ? "SETUP_REQUIRED" : "ACTIVE",
    required,
    missing,
    docs: ["docs/external/slip-verification-production-th.md"],
  };
}
