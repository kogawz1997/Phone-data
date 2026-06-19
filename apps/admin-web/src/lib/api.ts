export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_KOGA_API_URL ??
  "http://localhost:4000"
).replace(/\/+$/, "");

const BUILD_SURFACE = process.env.NEXT_PUBLIC_APP_SURFACE || "auto";
let inMemoryTokenBySurface: Record<string, string> = {};

function currentSurface() {
  if (BUILD_SURFACE && BUILD_SURFACE !== "auto") return BUILD_SURFACE;
  if (typeof window === "undefined") return "admin";
  const path = window.location.pathname;
  if (path.startsWith("/platform")) return "owner";
  if (path.startsWith("/portal") || path.startsWith("/customer")) return "customer";
  return "admin";
}

function markerKey(surface = currentSurface()) {
  return `koga_${surface}_session_marker`;
}

function valueKey(surface = currentSurface()) {
  return `koga_${surface}_session_value`;
}

const LEGACY_TOKEN_KEYS = [
  "koga_token",
  "koga_access_token",
  "accessToken",
  "token",
  "adminToken",
  "koga_admin_token",
];

function readLegacyToken() {
  if (typeof window === "undefined") return "";
  for (const key of LEGACY_TOKEN_KEYS) {
    const value = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
    if (value && value !== "cookie-session") return value;
  }
  return "";
}

export function getToken() {
  const surface = currentSurface();
  if (inMemoryTokenBySurface[surface]) return inMemoryTokenBySurface[surface];
  if (typeof window === "undefined") return "";
  const stored = window.sessionStorage.getItem(valueKey(surface)) || readLegacyToken();
  if (stored) {
    inMemoryTokenBySurface[surface] = stored;
    return stored;
  }
  return "";
}

export function setToken(token: string) {
  const surface = currentSurface();
  inMemoryTokenBySurface[surface] = token;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(valueKey(surface), token);
    window.localStorage.setItem(markerKey(surface), "signed-in");
    for (const key of LEGACY_TOKEN_KEYS) window.localStorage.setItem(key, token);
  }
}

export function clearToken() {
  const surface = currentSurface();
  inMemoryTokenBySurface[surface] = "";
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(valueKey(surface));
    window.localStorage.removeItem(markerKey(surface));
    for (const key of LEGACY_TOKEN_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
    window.localStorage.removeItem("koga_admin");
    window.localStorage.removeItem("koga_store");
  }
  void fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => null);
}

function buildHeaders(options: RequestInit = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };
}

function readableApiError(message?: string) {
  const raw = message || "API error";
  const lower = raw.toLowerCase();
  if (lower.includes("missing bearer token") || lower.includes("bearer token") || lower.includes("jwt") || lower.includes("unauthorized")) {
    return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  }
  return raw;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(readableApiError(json?.error?.message || json?.message));
  return (json?.data ?? json) as T;
}

export async function downloadCsv(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openHtml(path: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Open failed: ${res.status}`);
  const html = await res.text();
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
