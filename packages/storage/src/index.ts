import fs from "node:fs";
import path from "node:path";

export type StorageProviderName = "local" | "s3" | "r2" | "supabase";

const DEFAULT_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const DEFAULT_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function safeStorageName(filename: string) {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
  return clean || `upload-${Date.now()}.bin`;
}

function envList(key: string, fallback: string[]) {
  return String(process.env[key] || fallback.join(","))
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseBase64Payload(input: string) {
  const match = input.match(/^data:([^;]+);base64,(.*)$/s);
  if (!match) return { mimeType: "", payload: input };
  return { mimeType: match[1].toLowerCase(), payload: match[2] };
}

function detectMimeFromMagic(buffer: Buffer) {
  if (buffer.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (buffer.subarray(0, 3).toString("hex") === "ffd8ff") return "image/jpeg";
  if (buffer.subarray(0, 4).toString("utf8") === "%PDF") return "application/pdf";
  if (buffer.subarray(0, 4).toString("utf8") === "RIFF" && buffer.subarray(8, 12).toString("utf8") === "WEBP") return "image/webp";
  return "application/octet-stream";
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
  const safeName = safeStorageName(input.filename);
  const extension = path.extname(safeName).toLowerCase();
  const allowedExtensions = envList("UPLOAD_ALLOWED_EXTENSIONS", DEFAULT_ALLOWED_EXTENSIONS);
  const allowedMimeTypes = envList("UPLOAD_ALLOWED_MIME_TYPES", DEFAULT_ALLOWED_MIME_TYPES);

  if (!allowedExtensions.includes(extension)) {
    throw new Error(`Upload file extension not allowed: ${extension || "none"}`);
  }

  const parsed = parseBase64Payload(input.contentBase64);
  const buffer = Buffer.from(parsed.payload, "base64");
  const maxBytes = input.maxBytes ?? Number(process.env.MAX_UPLOAD_BYTES ?? 8_000_000);
  if (buffer.byteLength > maxBytes) throw new Error(`Upload too large: ${buffer.byteLength}/${maxBytes}`);

  const detectedMime = detectMimeFromMagic(buffer);
  const claimedMime = parsed.mimeType;
  const effectiveMime = claimedMime || detectedMime;

  if (!allowedMimeTypes.includes(effectiveMime) || !allowedMimeTypes.includes(detectedMime)) {
    throw new Error(`Upload MIME type not allowed: ${effectiveMime}/${detectedMime}`);
  }

  const targetDir = path.join(uploadRoot, folder);
  await fs.promises.mkdir(targetDir, { recursive: true });
  const filename = `${Date.now()}-${safeName}`;
  const filePath = path.join(targetDir, filename);
  await fs.promises.writeFile(filePath, buffer, { mode: 0o600 });

  const publicBase = input.publicBaseUrl || process.env.PUBLIC_UPLOAD_BASE_URL || "/uploads";
  return { provider: "local" as const, filePath, url: `${publicBase.replace(/\/$/, "")}/${folder}/${filename}`, size: buffer.byteLength, mimeType: detectedMime };
}

export function buildObjectKey(input: { organizationId: string; folder: string; filename: string }) {
  return [input.organizationId, safeStorageName(input.folder), `${Date.now()}-${safeStorageName(input.filename)}`].join("/");
}
