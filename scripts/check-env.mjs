import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
const examplePath = path.resolve(process.cwd(), ".env.example");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env. Copy .env.example to .env first.");
  process.exit(1);
}

const env = fs.readFileSync(envPath, "utf8");

function readEnv(key) {
  const match = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^['\"]|['\"]$/g, "");
}

const requiredCore = ["DATABASE_URL", "JWT_SECRET", "API_PORT"];
const missingCore = requiredCore.filter((key) => !readEnv(key));

const isProd = readEnv("NODE_ENV") === "production";
const strictExternalChecks = readEnv("STRICT_EXTERNAL_CHECKS") === "true";
const errors = [];
const warnings = [];

if (missingCore.length) errors.push(`Missing required env keys: ${missingCore.join(", ")}`);

const jwtSecret = readEnv("JWT_SECRET");
if (/^(change-this|replace_with|replace-with|demo)/i.test(jwtSecret)) warnings.push("JWT_SECRET ยังเป็นค่า default");
if (isProd && jwtSecret.length < 32) errors.push("JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษรใน production");

const allowedOrigins = readEnv("ALLOWED_ORIGINS");
const adminWebUrl = readEnv("ADMIN_WEB_URL");
const customerWebUrl = readEnv("CUSTOMER_WEB_URL");
if (isProd && !allowedOrigins && !adminWebUrl && !customerWebUrl) {
  errors.push("production ต้องตั้ง ALLOWED_ORIGINS หรือ ADMIN_WEB_URL/CUSTOMER_WEB_URL");
}

if (isProd && /^(replace|demo1234|change)/i.test(readEnv("ADMIN_PASSWORD"))) {
  errors.push("ADMIN_PASSWORD ยังไม่ใช่รหัส production");
}

const paymentGatewayProvider = readEnv("PAYMENT_GATEWAY_PROVIDER");
const paymentWebhookSecret = readEnv("PAYMENT_WEBHOOK_SECRET") || readEnv("PAYMENT_GATEWAY_WEBHOOK_SECRET");
if (isProd && paymentGatewayProvider && paymentGatewayProvider !== "manual" && !paymentWebhookSecret) {
  errors.push("เปิด PAYMENT_GATEWAY_PROVIDER แล้ว ต้องตั้ง PAYMENT_WEBHOOK_SECRET หรือ PAYMENT_GATEWAY_WEBHOOK_SECRET");
}

if (isProd && /^(mock|local)$/i.test(readEnv("DEVICE_CONTROL_PROVIDER"))) {
  warnings.push("DEVICE_CONTROL_PROVIDER ยังเป็น local/mock: ใช้ได้เฉพาะ pilot/internal ก่อนต่อ MDM จริง");
}
if (isProd && /^(mock|local)$/i.test(readEnv("NOTIFICATION_PROVIDER"))) {
  warnings.push("NOTIFICATION_PROVIDER ยังเป็น local/mock: external notification ยังไม่ได้เปิดจริง");
}
if (isProd && /^(local)$/i.test(readEnv("STORAGE_PROVIDER"))) {
  warnings.push("STORAGE_PROVIDER ยังเป็น local: production จริงควรใช้ private object storage");
}

if (warnings.length) {
  console.warn("Environment warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length || (strictExternalChecks && warnings.length)) {
  console.error("Environment check failed:");
  for (const error of errors) console.error(`- ${error}`);
  if (strictExternalChecks && warnings.length) console.error("- STRICT_EXTERNAL_CHECKS=true ทำให้ external warnings เป็น fail");
  process.exit(1);
}

console.log("Environment core checks passed.");
console.log(`Reference template: ${examplePath}`);
