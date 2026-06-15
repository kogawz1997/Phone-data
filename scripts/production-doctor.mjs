import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const failures = [];
const warnings = [];
function must(key) { if (!process.env[key]) failures.push(`${key} missing`); }
function warnDefault(key, re) { if (process.env[key] && re.test(process.env[key])) failures.push(`${key} still looks like a placeholder`); }

for (const key of ["DATABASE_URL", "JWT_SECRET", "ORG_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD", "CRON_SECRET", "PUBLIC_API_URL"]) must(key);
warnDefault("JWT_SECRET", /change|replace/i);
warnDefault("ADMIN_PASSWORD", /demo|replace|change/i);
warnDefault("CRON_SECRET", /change|replace/i);

if (process.env.NODE_ENV === "production") {
  if (!process.env.ALLOWED_ORIGINS) failures.push("ALLOWED_ORIGINS is required in production");
  if ((process.env.DEVICE_CONTROL_PROVIDER || "mock").match(/mock|local/i)) failures.push("DEVICE_CONTROL_PROVIDER must be android/apple/dual for real MDM");
  if ((process.env.NOTIFICATION_PROVIDER || "local") === "local") warnings.push("NOTIFICATION_PROVIDER=local; switch to webhook/line/sms before go-live messaging");
}

for (const key of ["ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON", "APPLE_MDM_APNS_CERT_PATH", "APPLE_MDM_APNS_KEY_PATH", "APPLE_ABM_SERVER_TOKEN_PATH"]) {
  const value = process.env[key];
  if (value && !value.trim().startsWith("{") && !fs.existsSync(value)) warnings.push(`${key} path not found yet: ${value}`);
}

console.log("Production doctor");
if (warnings.length) console.log("Warnings:\n" + warnings.map((w) => `- ${w}`).join("\n"));
if (failures.length) {
  console.error("Failures:\n" + failures.map((f) => `- ${f}`).join("\n"));
  process.exit(1);
}
console.log("Core production checks passed.");
