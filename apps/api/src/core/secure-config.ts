import crypto from "node:crypto";

const SECRET_KEY_PATTERN = /(secret|token|password|private|accesskey|access_key|apikey|api_key|smtpurl|smtp_url|webhooksecret|webhook_secret|serviceaccount|service_account)/i;
const ENCRYPTED_PREFIX = "enc:v1:";

function getEncryptionKeyMaterial() {
  return process.env.INTEGRATION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "dev-only-change-this-secret-material";
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(getEncryptionKeyMaterial()).digest();
}

export function isSensitiveConfigKey(key: string) {
  return SECRET_KEY_PATTERN.test(key);
}

export function encryptSecretValue(value: string) {
  if (!value) return value;
  if (value.startsWith(ENCRYPTED_PREFIX)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

export function decryptSecretValue(value: string) {
  if (!value || !value.startsWith(ENCRYPTED_PREFIX)) return value;
  const packed = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), "base64url");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function maskSecretValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  const raw = String(value);
  const visible = raw.startsWith(ENCRYPTED_PREFIX) ? "saved" : raw.slice(-4);
  return `••••••${visible}`;
}

export function protectConfigJson(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string" && isSensitiveConfigKey(key)) output[key] = encryptSecretValue(value);
    else output[key] = value;
  }
  return output;
}

export function unprotectConfigJson(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX)) output[key] = decryptSecretValue(value);
    else output[key] = value;
  }
  return output;
}

export function maskConfigJson(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    output[key] = isSensitiveConfigKey(key) ? maskSecretValue(value) : value;
  }
  return output;
}

export function mergeConfigKeepingExistingSecrets(existing: unknown, incoming: unknown) {
  const current = existing && typeof existing === "object" && !Array.isArray(existing) ? existing as Record<string, unknown> : {};
  const next = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming as Record<string, unknown> : {};
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null || value === "") continue;
    const text = String(value);
    if (isSensitiveConfigKey(key) && text.startsWith("••••••")) continue;
    merged[key] = value;
  }
  return protectConfigJson(merged);
}

export function encryptionStatus() {
  const material = getEncryptionKeyMaterial();
  return {
    configured: Boolean(process.env.INTEGRATION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY),
    fallback: !(process.env.INTEGRATION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY),
    keyLength: material.length,
  };
}
