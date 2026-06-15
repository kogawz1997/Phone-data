export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

const SESSION_MARKER_KEY = "koga_admin_token";
let inMemoryToken = "";

export function getToken() {
  // The real session should live in the HttpOnly cookie. Keep a short-lived in-memory
  // fallback so cross-origin local development still works right after login.
  return inMemoryToken;
}

export function setToken(token: string) {
  inMemoryToken = token;
  if (typeof window !== "undefined") localStorage.setItem(SESSION_MARKER_KEY, "cookie-session");
}

export function clearToken() {
  inMemoryToken = "";
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_MARKER_KEY);
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
