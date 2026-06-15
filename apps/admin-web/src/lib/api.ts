export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const SESSION_MARKER_KEY = "koga_admin_token";

export function getToken() {
  // Token is now stored in an HttpOnly cookie by the API. Keep this function for old call sites,
  // but never expose the real bearer token to browser JavaScript.
  return "";
}

export function setToken(_token: string) {
  if (typeof window !== "undefined") localStorage.setItem(SESSION_MARKER_KEY, "cookie-session");
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_MARKER_KEY);
  void fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => null);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "API error");
  return json.data;
}

export async function downloadCsv(path: string, filename: string) {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
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
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Open failed: ${res.status}`);
  const html = await res.text();
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
