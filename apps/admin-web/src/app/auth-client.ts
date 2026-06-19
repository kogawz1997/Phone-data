export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_KOGA_API_URL ||
  "http://localhost:4000"
).replace(/\/+$/, "");

export const LOGIN_PATH = "/login";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  organizationId?: string;
};

type LoginPayload = {
  token?: string;
  accessToken?: string;
  access_token?: string;
  jwt?: string;
  sessionToken?: string;
  user?: SessionUser | null;
  admin?: SessionUser | null;
  account?: SessionUser | null;
  data?: LoginPayload;
  session?: LoginPayload;
};

function unwrapPayload(input: any): LoginPayload {
  if (!input || typeof input !== "object") return {};
  return input.data || input.session || input;
}

function readToken(input: any) {
  const payload = unwrapPayload(input);
  return (
    payload.token ||
    payload.accessToken ||
    payload.access_token ||
    payload.jwt ||
    payload.sessionToken ||
    payload.data?.token ||
    payload.session?.token ||
    ""
  );
}

function readUser(input: any): SessionUser | null {
  const payload = unwrapPayload(input);
  return payload.user || payload.admin || payload.account || payload.data?.user || payload.session?.user || null;
}

export function readSessionToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("koga_token") ||
    localStorage.getItem("koga_access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    ""
  );
}

export function saveSession(input: { token: string; user?: SessionUser | null }) {
  localStorage.setItem("koga_token", input.token);
  localStorage.setItem("koga_access_token", input.token);
  localStorage.setItem("accessToken", input.token);
  localStorage.setItem("token", input.token);
  localStorage.setItem("adminToken", input.token);
  if (input.user) localStorage.setItem("koga_admin", JSON.stringify(input.user));
}

export function clearSession() {
  ["koga_token", "koga_access_token", "accessToken", "token", "adminToken", "koga_admin", "koga_store"].forEach((key) => localStorage.removeItem(key));
}

async function postLogin(path: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, code: password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || json?.message || `เข้าสู่ระบบไม่สำเร็จ (${path})`);
  return json;
}

export async function loginWithEmail(email: string, password: string) {
  const endpoints = ["/auth/login", "/auth/sign-in", "/login"];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const json = await postLogin(endpoint, email, password);
      const token = readToken(json);
      const user = readUser(json);
      if (!token) throw new Error("API login ไม่ได้ส่ง session token กลับมา");
      saveSession({ token, user });
      return { token, user };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("เข้าสู่ระบบไม่สำเร็จ");
}

export async function verifySession(token: string) {
  const endpoints = ["/auth/me", "/me", "/users/me"];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || json?.message || `ตรวจ session ไม่ผ่าน (${endpoint})`);
      return json;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("ตรวจ session ไม่ผ่าน กรุณาเช็ก API/JWT_SECRET");
}

export async function logoutFromApi() {
  const token = readSessionToken();
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).catch(() => undefined);
  clearSession();
}

export function redirectToLogin(returnTo?: string) {
  if (typeof window === "undefined") return;
  const target = returnTo || window.location.pathname + window.location.search;
  window.location.assign(`${LOGIN_PATH}?returnTo=${encodeURIComponent(target)}`);
}
