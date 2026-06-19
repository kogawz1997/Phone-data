"use client";

import { FormEvent, useMemo, useState } from "react";
import { API_BASE, loginWithEmail, verifySession } from "../auth-client";

export default function Page() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const ready = useMemo(() => email.trim().length > 0 && code.trim().length > 0 && !busy, [busy, email, code]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const session = await loginWithEmail(email.trim(), code);
      await verifySession(session.token);
      window.location.assign("/");
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
          <p>จัดการลูกค้า เครื่อง สัญญา การรับชำระ และงานติดตามงวดจากข้อมูลจริงของระบบ</p>
          <div className="login-health"><span>API endpoint</span><b>{API_BASE}</b></div>
        </div>
        <form className="login-card" onSubmit={onSubmit}>
          <div><p className="login-kicker">Store console</p><h2>Admin sign in</h2></div>
          {message ? <div className="login-error">{message}</div> : null}
          <label><span>อีเมล</span><input autoComplete="email" inputMode="email" type="email" placeholder="owner@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label><span>รหัสเข้าใช้งาน</span><input type="password" placeholder="รหัสเข้าใช้งาน" value={code} onChange={(event) => setCode(event.target.value)} required /></label>
          <button className="login-submit" disabled={!ready} type="submit">{busy ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}</button>
          <p className="login-note">หลังเข้าสู่ระบบ Desktop และ Mobile จะใช้ session เดียวกันในการเรียก API</p>
        </form>
      </section>
    </main>
  );
}
