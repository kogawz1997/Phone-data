"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Profile = { organization: any; subscription: any; counts: { customers: number; devices: number; contracts: number; pendingPayments: number } };
type Step = { id: string; stepKey: string; title: string; description?: string; status: string };
type Integration = { id: string; provider: string; category: string; displayName: string; status: string; configJson?: any; lastError?: string };

function tone(status?: string) { if (["DONE", "ACTIVE"].includes(String(status))) return "good"; if (["PENDING", "SETUP_REQUIRED", "IN_PROGRESS"].includes(String(status))) return "warn"; if (["FAILED", "DEGRADED"].includes(String(status))) return "bad"; return "neutral"; }
function Badge({ value }: { value: string }) { return <span className={`badge ${tone(value)}`}>{value}</span>; }

export default function StoreOnboardingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [p, s, i] = await Promise.all([api<Profile>("/store/profile"), api<Step[]>("/store/onboarding"), api<Integration[]>("/integrations")]);
      setProfile(p); setSteps(s); setIntegrations(i);
    } catch (e) { setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้"); }
  }
  useEffect(() => { void load(); }, []);
  const filtered = integrations.filter((i) => (category === "ALL" || i.category === category) && (status === "ALL" || i.status === status));

  async function done(stepKey: string) { await api(`/store/onboarding/${stepKey}`, { method: "PATCH", body: JSON.stringify({ status: "DONE" }) }); await load(); }
  async function setIntegration(i: Integration, next: string) { await api(`/integrations/${i.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) }); await load(); }

  return <main className="app-shell"><header className="topbar"><div className="brand"><div className="logo">K</div><div><div className="kicker">Store Workspace</div><h2 style={{ margin: 0 }}>{profile?.organization?.name ?? "ตั้งค่าร้าน"}</h2></div></div><div className="pill-list"><a className="btn secondary" href="/">กลับ Dashboard</a><button className="btn secondary" onClick={load}>รีเฟรช</button></div></header>{error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}<section className="hero hero-grid"><div><div className="kicker">ร้านใช้งานง่ายขึ้น</div><h1>Setup Wizard + ตัวกรองระบบนอกสำหรับร้าน</h1><p className="muted">หน้านี้คือ checklist ให้ร้านรู้ว่าต้องทำอะไรก่อนเปิดใช้จริง เช่น เพิ่มเครื่อง ตั้งรับเงิน เชื่อม LINE/SMS และเชื่อม MDM ไม่ต้องให้ร้านไปถามในไลน์ทุก 3 นาทีเหมือนระบบยังไม่เกิด</p></div><div className="card strong"><h2>สถานะร้าน</h2><div className="pill-list"><Badge value={profile?.organization?.status ?? "-"}/><Badge value={profile?.organization?.plan ?? "-"}/><Badge value={profile?.organization?.billingStatus ?? "-"}/></div><div className="grid cols-2" style={{ marginTop: 12 }}><div className="card"><div className="metric-label">ลูกค้า</div><div className="metric-value">{profile?.counts.customers ?? 0}</div></div><div className="card"><div className="metric-label">เครื่อง</div><div className="metric-value">{profile?.counts.devices ?? 0}</div></div></div></div></section><section className="grid cols-2" style={{ marginBottom: 16 }}><div className="card"><h2>Checklist เปิดร้าน</h2><div className="timeline">{steps.map((s) => <div className="timeline-item" key={s.id}><span className="dot"/><div><b>{s.title}</b> <Badge value={s.status}/><div className="small">{s.description}</div>{s.status !== "DONE" && <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => done(s.stepKey)}>ทำแล้ว</button>}</div></div>)}</div></div><div className="card"><h2>Quick Ops</h2><div className="grid"><a className="btn" href="/">สร้างลูกค้า/สัญญา</a><a className="btn secondary" href="/">ตรวจสลิป/งวด</a><a className="btn secondary" href="/">MDM Setup</a><div className="notice">แพ็กเกจปัจจุบัน: {profile?.subscription?.plan ?? profile?.organization?.plan} · limit เครื่อง {profile?.subscription?.deviceLimit ?? "-"}</div></div></div></section><section className="card"><div className="topbar" style={{ marginBottom: 12 }}><div><h2>ระบบนอก / Integrations</h2><p className="small">กรองเพื่อดูเฉพาะ MDM, Payment, Notification, Storage แล้วตั้งสถานะงานต่อระบบนอก</p></div><div className="pill-list"><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}><option>ALL</option><option>MDM</option><option>PAYMENT</option><option>NOTIFICATION</option><option>STORAGE</option><option>AUTOMATION</option></select><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option>ALL</option><option>SETUP_REQUIRED</option><option>CONNECTING</option><option>ACTIVE</option><option>DEGRADED</option><option>FAILED</option><option>DISABLED</option></select></div></div><div className="grid cols-3">{filtered.map((i) => <div className="card" key={i.id}><h3>{i.displayName}</h3><div className="pill-list"><Badge value={i.category}/><Badge value={i.status}/></div><p className="small" style={{ marginTop: 10 }}>Provider: {i.provider}</p><p className="small">ต้องเตรียม: {(i.configJson?.requiredEnv ?? []).join(", ") || "ดูเอกสารใน docs/providers"}</p><div className="pill-list"><button className="btn secondary" onClick={() => setIntegration(i, "CONNECTING")}>กำลังต่อ</button><button className="btn secondary" onClick={() => setIntegration(i, "ACTIVE")}>ใช้งานได้</button><button className="btn danger" onClick={() => setIntegration(i, "FAILED")}>มีปัญหา</button></div></div>)}</div></section></main>;
}
