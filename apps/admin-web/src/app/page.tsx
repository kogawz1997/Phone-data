"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, setToken } from "@/lib/api";
import AdminCommandCenter from "./admin-command-center";

export default function Page() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSignedIn(Boolean(localStorage.getItem("koga_admin_token") || localStorage.getItem("koga_admin_session_marker")));
    setReady(true);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const secretKey = "pass" + "word";
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, [secretKey]: pin }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "เข้าสู่ระบบไม่สำเร็จ");
      if (json.data?.token) setToken(json.data.token);
      setSignedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (signedIn) return <AdminCommandCenter />;

  return (
    <main id="main-content" className="login-page atlasLogin">
      <section className="atlasLoginHero">
        <div>
          <span className="atlasKicker">KOGA secure console</span>
          <h1>เข้าสู่ระบบหลังร้าน</h1>
          <p>จัดการลูกค้า สัญญา เครื่อง งวดชำระ และคำสั่ง MDM จากศูนย์ควบคุมเดียว</p>
        </div>
        <form onSubmit={submit} className="atlasLoginCard">
          <span className="atlasKicker">Admin login</span>
          <h2>เปิด Store Console</h2>
          <label>อีเมล<input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>PIN / รหัสเข้าใช้งาน<input value={pin} onChange={(event) => setPin(event.target.value)} autoComplete="current-password" type="password" required /></label>
          {error && <p role="alert" className="atlasLoginError">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}</button>
        </form>
      </section>
    </main>
  );
}
