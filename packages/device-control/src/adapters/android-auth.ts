import fs from "node:fs";
import { GoogleAuth } from "google-auth-library";

const SCOPE = "https://www.googleapis.com/auth/androidmanagement";

function loadServiceAccount() {
  const raw = process.env.ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON is required");

  const value = raw.trim();
  if (value.startsWith("{")) return JSON.parse(value);

  if (!fs.existsSync(value)) {
    throw new Error(`ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON file not found: ${value}`);
  }
  return JSON.parse(fs.readFileSync(value, "utf8"));
}

export async function getAndroidManagementAccessToken() {
  const auth = new GoogleAuth({
    credentials: loadServiceAccount(),
    scopes: [SCOPE],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Unable to obtain Android Management API access token");
  return token.token;
}

export function getAndroidEnterpriseName() {
  const value = process.env.ANDROID_MANAGEMENT_ENTERPRISE_NAME;
  if (!value) throw new Error("ANDROID_MANAGEMENT_ENTERPRISE_NAME is required");
  return value.startsWith("enterprises/") ? value : `enterprises/${value}`;
}
