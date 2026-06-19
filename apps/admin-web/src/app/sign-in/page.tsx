"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_BASE, loginWithEmail, readSessionToken, verifySession } from "../auth-client";

function getReturnTo() {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const value = params.get("returnTo") || "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value === "/login" || value === "/sign-in") return "/";
  return value;
}

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);
  const ready = useMemo(() => email.trim().length > 0 && password.trim().length > 0 && !busy, [busy, email, password]);

  useEffect(() => {
    const token = readSessionToken();
    if (!token) {
      setChecking(false);
      return;
    }
    verifySession(token)
      .then(() => window.location.replace(getReturnTo()))
      .catch(() => setChecking(false));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const session = await loginWithEmail(email.trim(), password);
      await verifySession(session.token);
      window.location.assign(getReturnTo());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-hero">
          <div className="login-logo">K</div>
          <p className="login-kicker">KOGA Lease MDM</p>
          <h1>เข้าสู่ระบบร้าน</h1>
          <p>ใช้บัญชีร้านเดิมเพื่อจัดการลูกค้า เครื่อง สัญญา การรับชำระ และงานติดตามงวดจากข้อมูลจริงของระบบ</p>
          <div className="login-health"><span>API endpoint</span><b>{API_BASE}</b></div>
        </div>
        <form className="login-card" onSubmit={onSubmit}>
          <div><p className="login-kicker">Store console</p><h2>Admin login</h2></div>
          {message ? <div className="login-error">{message}</div> : null}
          {checking ? <div className="login-note">กำลังตรวจ session เดิม...</div> : null}
          <label><span>อีเมล</span><input autoComplete="email" inputMode="email" type="email" placeholder="owner@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label><span>รหัสผ่าน</span><input autoComplete="current-password" type="password" placeholder="รหัสผ่านบัญชีร้าน" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="login-submit" disabled={!ready || checking} type="submit">{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
          <p className="login-note">หลังเข้าสู่ระบบ Desktop และ Mobile จะใช้ session เดียวกันในการเรียก API จริง</p>
        </form>
      </section>
    </main>
  );
}
