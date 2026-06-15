import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const requiredFiles = [
  "apps/admin-web/src/app/collection/page.tsx",
  "apps/admin-web/src/app/risk/page.tsx",
  "apps/admin-web/src/app/disputes/page.tsx",
  "apps/admin-web/src/app/templates/page.tsx",
  "apps/admin-web/src/app/automation/page.tsx",
  "apps/admin-web/src/app/consents/page.tsx",
  "apps/admin-web/src/app/reports/page.tsx",
  "apps/admin-web/src/app/integrations/page.tsx",
  "apps/admin-web/src/app/store/ledger/page.tsx",
  "apps/admin-web/src/app/platform/billing/page.tsx",
  "apps/admin-web/src/app/platform/store-health/page.tsx",
  "apps/admin-web/src/app/platform/integrations/page.tsx",
  "apps/admin-web/src/app/platform/mdm/devices/page.tsx",
  "apps/admin-web/src/app/platform/mdm/commands/page.tsx",
  "docs/FINAL_PRODUCTION_HANDOVER_TH.md",
  "docs/GO_LIVE_MASTER_CHECKLIST_TH.md",
  "docs/EXTERNAL_INTEGRATION_WIZARD_TH.md"
];

const checks = [];
for (const f of requiredFiles) checks.push({ key: f, ok: fs.existsSync(path.join(process.cwd(), f)), detail: "required final page/doc" });

const envChecks = [
  ["DATABASE_URL", "ฐานข้อมูล"],
  ["JWT_SECRET", "session secret"],
  ["ADMIN_EMAIL", "platform owner email"],
  ["ADMIN_PASSWORD", "platform owner password"],
  ["PUBLIC_API_URL", "public API base URL"],
  ["ALLOWED_ORIGINS", "CORS origins"],
  ["STORAGE_PROVIDER", "storage provider"],
  ["PAYMENT_GATEWAY_PROVIDER", "payment gateway mode"],
  ["PLATFORM_MDM_SCOPE", "MDM scope"],
];
for (const [key, label] of envChecks) checks.push({ key, ok: Boolean(process.env[key]), detail: label });

if (process.env.ENABLE_MDM_ANDROID === "true") {
  for (const key of ["ANDROID_MANAGEMENT_PROJECT_ID", "ANDROID_MANAGEMENT_ENTERPRISE_NAME", "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON"]) checks.push({ key, ok: Boolean(process.env[key]), detail: "Android real mode" });
}
if (process.env.ENABLE_MDM_APPLE === "true") {
  for (const key of ["APPLE_MDM_BASE_URL", "APPLE_MDM_APNS_CERT_PATH", "APPLE_MDM_APNS_KEY_PATH", "APPLE_MDM_APNS_TOPIC", "APPLE_ABM_SERVER_TOKEN_PATH"]) checks.push({ key, ok: Boolean(process.env[key]), detail: "Apple real mode" });
}

const passed = checks.filter(c => c.ok).length;
const score = Math.round((passed / checks.length) * 100);
console.log(`Go-live master check: ${score}% (${passed}/${checks.length})`);
for (const c of checks) console.log(`${c.ok ? "✅" : "❌"} ${c.key} - ${c.detail}`);
if (score < 85) process.exit(1);
