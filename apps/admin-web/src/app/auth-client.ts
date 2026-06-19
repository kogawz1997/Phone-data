export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  organizationId?: string;
};

export function readSessionToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("koga_token") || localStorage.getItem("token") || localStorage.getItem("adminToken") || "";
}

export function saveSession(input: { token: string; user?: SessionUser | null }) {
  localStorage.setItem("koga_token", input.token);
  localStorage.setItem("token", input.token);
  localStorage.setItem("adminToken", input.token);
  if (input.user) localStorage.setItem("koga_admin", JSON.stringify(input.user));
}

export function clearSession() {
  ["koga_token", "token", "adminToken", "koga_admin", "koga_store"].forEach((key) => localStorage.removeItem(key));
}

export async function loginWithEmail(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || "เข้าสู่ระบบไม่สำเร็จ");
  const token = json?.data?.token || json?.token;
  const user = json?.data?.user || json?.user || null;
  if (!token) throw new Error("API login ไม่ได้ส่ง session token กลับมา");
  saveSession({ token, user });
  return { token, user };
}

export async function verifySession(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("ตรวจ session ไม่ผ่าน กรุณาเช็ก API/JWT_SECRET");
  return res.json();
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
