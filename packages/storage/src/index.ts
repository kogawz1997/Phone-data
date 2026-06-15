import fs from "node:fs";
import path from "node:path";

export type StorageProviderName = "local" | "s3" | "r2" | "supabase";

export function safeStorageName(filename: string) {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
  return clean || `upload-${Date.now()}.bin`;
}

export function getStorageSetupStatus(env: NodeJS.ProcessEnv = process.env) {
  const provider = String(env.STORAGE_PROVIDER ?? "local").toLowerCase() as StorageProviderName;
  const requiredByProvider: Record<string, string[]> = {
    local: ["UPLOAD_DIR"],
    s3: ["STORAGE_BUCKET", "STORAGE_REGION", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"],
    r2: ["STORAGE_BUCKET", "STORAGE_ENDPOINT", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"],
    supabase: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STORAGE_BUCKET"],
  };
  const required = requiredByProvider[provider] ?? requiredByProvider.local;
  const missing = required.filter((key) => !env[key]);
  return {
    provider,
    status: missing.length ? "SETUP_REQUIRED" : "ACTIVE",
    required,
    missing,
    docs: ["docs/external/storage-production-th.md", "docs/payment-storage-notification-real-th.md"],
  };
}

export async function saveLocalBase64(input: { filename: string; contentBase64: string; folder?: string; uploadDir?: string; publicBaseUrl?: string; maxBytes?: number }) {
  const uploadRoot = input.uploadDir || process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
  const folder = safeStorageName(input.folder || "misc");
  const targetDir = path.join(uploadRoot, folder);
  await fs.promises.mkdir(targetDir, { recursive: true });
  const filename = `${Date.now()}-${safeStorageName(input.filename)}`;
  const filePath = path.join(targetDir, filename);
  const buffer = Buffer.from(input.contentBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  const maxBytes = input.maxBytes ?? Number(process.env.MAX_UPLOAD_BYTES ?? 8_000_000);
  if (buffer.byteLength > maxBytes) throw new Error(`Upload too large: ${buffer.byteLength}/${maxBytes}`);
  await fs.promises.writeFile(filePath, buffer);
  const publicBase = input.publicBaseUrl || process.env.PUBLIC_UPLOAD_BASE_URL || "/uploads";
  return { provider: "local" as const, filePath, url: `${publicBase.replace(/\/$/, "")}/${folder}/${filename}`, size: buffer.byteLength };
}

export function buildObjectKey(input: { organizationId: string; folder: string; filename: string }) {
  return [input.organizationId, safeStorageName(input.folder), `${Date.now()}-${safeStorageName(input.filename)}`].join("/");
}
