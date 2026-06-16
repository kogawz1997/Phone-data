export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

const SURFACE = process.env.NEXT_PUBLIC_APP_SURFACE || "admin";
const SESSION_MARKER_KEY = `koga_${SURFACE}_session_marker`;
const SESSION_VALUE_KEY = `koga_${SURFACE}_session_value`;
let inMemoryToken = "";

export function getToken() {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window === "undefined") return "";
  const stored = window.sessionStorage.getItem(SESSION_VALUE_KEY);
  if (stored) {
    inMemoryToken = stored;
    return stored;
  }
  return "";
}

export function setToken(token: string) {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SESSION_VALUE_KEY, token);
    window.localStorage.setItem(SESSION_MARKER_KEY, "signed-in");
    window.localStorage.setItem("koga_admin_token", "cookie-session");
  }
}

export function clearToken() {
  inMemoryToken = "";
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_VALUE_KEY);
    window.localStorage.removeItem(SESSION_MARKER_KEY);
    window.localStorage.removeItem("koga_admin_token");
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

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "API error");
  return json.data;
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
