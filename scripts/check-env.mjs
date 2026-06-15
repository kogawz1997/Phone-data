import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
const examplePath = path.resolve(process.cwd(), ".env.example");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env. Copy .env.example to .env first.");
  process.exit(1);
}

const env = fs.readFileSync(envPath, "utf8");
const required = ["DATABASE_URL", "JWT_SECRET", "API_PORT"];
const missing = required.filter((key) => !new RegExp(`^${key}=`, "m").test(env));

if (missing.length) {
  console.error(`Missing required env keys: ${missing.join(", ")}`);
  process.exit(1);
}

const isProd = /^NODE_ENV=production/m.test(env);
const warnings = [];
if (/JWT_SECRET="?(change-this|replace_with|replace-with)/i.test(env)) warnings.push("JWT_SECRET ยังเป็นค่า default");
if (isProd && /ADMIN_PASSWORD="?(replace|demo1234|change)/i.test(env)) warnings.push("ADMIN_PASSWORD ยังไม่ใช่รหัส production");
if (isProd && /DEVICE_CONTROL_PROVIDER="?(mock|local)/i.test(env)) warnings.push("DEVICE_CONTROL_PROVIDER ยังเป็น local/mock");
if (isProd && /NOTIFICATION_PROVIDER="?(mock|local)/i.test(env)) warnings.push("NOTIFICATION_PROVIDER ยังเป็น local/mock");

if (warnings.length) {
  console.warn("Environment warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
  if (isProd) process.exitCode = 1;
} else {
  console.log("Environment looks ready.");
}

console.log(`Reference template: ${examplePath}`);
