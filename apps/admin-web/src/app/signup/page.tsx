"use client";

import { FormEvent, useState } from "react";
import { API_BASE_URL } from "../../lib/api";

export default function StoreSignupPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch(`${API_BASE_URL}/public/store-signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "สมัครร้านไม่สำเร็จ");
      setMessage(`สมัครสำเร็จ: ${json.data.organization.name} · login: ${json.data.loginEmail}`);
      e.currentTarget.reset();
    } catch (err) { setError(err instanceof Error ? err.message : "สมัครร้านไม่สำเร็จ"); }
    finally { setLoading(false); }
  }

  return <main className="login-page"><div className="login-card"><section className="login-poster"><div className="kicker">KOGA Lease MDM SaaS</div><h1>ให้ร้านเช่ามือถือสมัครใช้ระบบเราได้เอง</h1><p className="muted">ร้านจะได้ tenant แยกของตัวเอง มี dashboard จัดการลูกค้า เครื่อง สัญญา งวด และ MDM integration โดยข้อมูลไม่ปนกับร้านอื่น เพราะเราไม่ได้ทำระบบด้วยความหวังล้วน ๆ</p><div className="grid cols-2"><div className="card"><h3>ร้านได้อะไร</h3><p className="small">ระบบสัญญา lease-to-own, แจ้งชำระ, ตรวจสลิป, ติดตามค้างงวด, consent และ release workflow</p></div><div className="card"><h3>เราดูแลอะไร</h3><p className="small">แพ็กเกจ, ค่าบริการรายเดือน, สถานะร้าน, integration readiness และ billing</p></div></div></section><section className="card login-form"><h2>สมัครร้านใหม่</h2>{error && <div className="notice error">{error}</div>}{message && <div className="notice">{message}</div>}<form className="form-grid" onSubmit={submit}><label>ชื่อร้าน<input className="input" name="storeName" required /></label><label>ชื่อเจ้าของร้าน<input className="input" name="ownerName" required /></label><label>อีเมลเข้าระบบ<input className="input" name="email" type="email" required /></label><label>รหัสผ่าน<input className="input" name="password" type="password" minLength={8} required /></label><label>เบอร์ร้าน<input className="input" name="phone" /></label><label>เลขผู้เสียภาษี<input className="input" name="taxId" /></label><label>แพ็กเกจ<select className="input" name="plan" defaultValue="STARTER"><option value="STARTER">Starter 990/เดือน</option><option value="STANDARD">Standard 1,990/เดือน</option><option value="PRO">Pro 3,990/เดือน</option><option value="ENTERPRISE">Enterprise</option></select></label><label>ที่อยู่<textarea className="input" name="address" /></label><button className="btn" disabled={loading}>{loading ? "กำลังสมัคร..." : "สร้างร้านและบัญชีเจ้าของ"}</button><a className="btn secondary" href="/">กลับหน้า Login</a></form></section></div></main>;
}
