import fs from "node:fs";
import path from "node:path";
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const localEnvPath = path.resolve(process.cwd(), ".env");
loadEnvFile(localEnvPath);
if (!fs.existsSync(localEnvPath)) {
  loadEnvFile(path.resolve(process.cwd(), ".env.production.template"));
}

const checks = [
  { group: "Payment", name: "PromptPay manual", keys: ["PROMPTPAY_ID"], required: false, docs: "docs/external/payment-gateway-production-th.md" },
  { group: "Payment", name: "Payment gateway", keys: ["PAYMENT_GATEWAY_PROVIDER", "PAYMENT_GATEWAY_WEBHOOK_SECRET"], enabled: process.env.PAYMENT_GATEWAY_PROVIDER && process.env.PAYMENT_GATEWAY_PROVIDER !== "manual", docs: "docs/external/payment-gateway-production-th.md" },
  { group: "Payment", name: "Slip verification", keys: ["SLIP_VERIFICATION_PROVIDER"], required: true, docs: "docs/external/slip-verification-production-th.md" },
  { group: "Storage", name: "Storage provider", keys: process.env.STORAGE_PROVIDER === "r2" ? ["STORAGE_PROVIDER", "STORAGE_BUCKET", "STORAGE_ENDPOINT", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"] : ["STORAGE_PROVIDER"], required: true, docs: "docs/external/storage-production-th.md" },
  { group: "Notification", name: "LINE", keys: ["LINE_CHANNEL_ACCESS_TOKEN", "LINE_CHANNEL_SECRET"], enabled: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN), docs: "docs/external/line-sms-email-production-th.md" },
  { group: "Notification", name: "SMS", keys: process.env.SMS_PROVIDER === "webhook" ? ["SMS_PROVIDER", "SMS_WEBHOOK_URL"] : ["SMS_PROVIDER"], required: false, docs: "docs/external/line-sms-email-production-th.md" },
  { group: "MDM", name: "Android Management", keys: ["ANDROID_MANAGEMENT_PROJECT_ID", "ANDROID_MANAGEMENT_ENTERPRISE_NAME", "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON"], enabled: process.env.ENABLE_MDM_ANDROID === "true", docs: "docs/providers/android-management-api-setup-th.md" },
  { group: "MDM", name: "Apple MDM/ADE", keys: ["APPLE_MDM_BASE_URL", "APPLE_MDM_APNS_CERT_PATH", "APPLE_MDM_APNS_KEY_PATH", "APPLE_MDM_APNS_TOPIC", "APPLE_ABM_SERVER_TOKEN_PATH"], enabled: process.env.ENABLE_MDM_APPLE === "true", docs: "docs/providers/apple-business-manager-setup-th.md" },
  { group: "Automation", name: "External webhook", keys: ["NOTIFICATION_WEBHOOK_URL", "NOTIFICATION_WEBHOOK_SECRET"], enabled: Boolean(process.env.NOTIFICATION_WEBHOOK_URL), docs: "docs/external/webhook-automation-production-th.md" },
];

const rows = [];
for (const check of checks) {
  const active = check.required || check.enabled;
  const missing = check.keys.filter((key) => !process.env[key]);
  const ok = active ? missing.length === 0 : true;
  rows.push({ ...check, active, ok, missing });
}

const activeRows = rows.filter((x) => x.active);
const passed = activeRows.filter((x) => x.ok).length;
const score = activeRows.length ? Math.round((passed / activeRows.length) * 100) : 100;
console.log(`External integration check: ${score}% (${passed}/${activeRows.length})`);
for (const row of rows) {
  const icon = row.active ? (row.ok ? "✅" : "❌") : "⚪";
  console.log(`${icon} [${row.group}] ${row.name}${row.active ? "" : " (optional/off)"}`);
  if (row.missing.length) console.log(`   missing: ${row.missing.join(", ")}`);
  console.log(`   docs: ${row.docs}`);
}

const requiredDocs = [
  "docs/external/payment-gateway-production-th.md",
  "docs/external/slip-verification-production-th.md",
  "docs/external/storage-production-th.md",
  "docs/external/line-sms-email-production-th.md",
  "docs/external/webhook-automation-production-th.md",
];
for (const doc of requiredDocs) {
  if (!fs.existsSync(path.join(process.cwd(), doc))) {
    console.error(`Missing doc: ${doc}`);
    process.exitCode = 1;
  }
}
if (score < 85 && process.env.NODE_ENV === "production") process.exitCode = 1;
