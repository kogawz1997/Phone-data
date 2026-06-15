import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const groups = {
  android: [
    "ANDROID_MANAGEMENT_PROJECT_ID",
    "ANDROID_MANAGEMENT_ENTERPRISE_NAME",
    "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON",
    "ANDROID_MANAGEMENT_CALLBACK_URL",
  ],
  apple: [
    "APPLE_MDM_BASE_URL",
    "APPLE_MDM_APNS_CERT_PATH",
    "APPLE_MDM_APNS_KEY_PATH",
    "APPLE_MDM_APNS_TOPIC",
    "APPLE_ABM_SERVER_TOKEN_PATH",
    "APPLE_MDM_PROFILE_SIGNING_CERT_PATH",
    "APPLE_MDM_PROFILE_SIGNING_KEY_PATH",
  ],
};

let failed = false;
for (const [name, keys] of Object.entries(groups)) {
  const missing = keys.filter((key) => !process.env[key] || process.env[key] === "");
  console.log(`\n[${name}]`);
  if (missing.length === 0) console.log("env keys: OK");
  else {
    failed = true;
    console.log("missing env:", missing.join(", "));
  }
}

for (const key of [
  "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON",
  "APPLE_MDM_APNS_CERT_PATH",
  "APPLE_MDM_APNS_KEY_PATH",
  "APPLE_ABM_SERVER_TOKEN_PATH",
  "APPLE_MDM_PROFILE_SIGNING_CERT_PATH",
  "APPLE_MDM_PROFILE_SIGNING_KEY_PATH",
]) {
  const value = process.env[key];
  if (value && !value.trim().startsWith("{") && !fs.existsSync(value)) {
    failed = true;
    console.log(`[file] ${key} not found: ${value}`);
  }
}

if (failed) process.exitCode = 1;
