"use client";

import { useEffect, useState } from "react";
import { api, clearToken, setToken } from "../../../lib/api";

type StoreRisk = { organizationId: string; storeName: string; total: number; releaseDue: number; released: number; missingEvidence: number; disputed: number };
type RecordRow = {
  id: string;
  status: string;
  appleIdAlias?: string;
  findMyStatus: string;
  activationStatus: string;
  organization: { name: string; storeCode?: string };
  device: { brand: string; model: string; serialNumber?: string; imei?: string; contract?: { contractNo: string; customer: { fullName: string; phone: string } } | null };
};

function tone(v: string) {
  if (["RELEASED", "OFF"].includes(v)) return "good";
  if (["RELEASE_DUE", "ON", "NEEDS_CHECK"].includes(v)) return "warn";
  if (["DISPUTED"].includes(v)) return "bad";
  return "neutral";
}

export default function PlatformAppleCustodyRiskPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [stores, setStores] = useState<StoreRisk[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setLoggedIn(Boolean(localStorage.getItem("koga_admin_token"))), []);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await api<{ stores: StoreRisk[]; records: RecordRow[] }>("/platform/apple-custody-risk");
      setStores(res.stores); setRecords(res.records);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (loggedIn) void load(); }, [loggedIn]);
  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="logo"></div><div><div className="kicker">Platform Owner Risk</div><h2 style={{ margin: 0 }}>iCloud Custody Risk</h2></div></div>
      <div className="pill-list"><a className="btn secondary" href="/platform">Owner Dashboard</a><button className="btn secondary" onClick={load}>{loading ? "กำลังโหลด..." : "รีเฟรช"}</button><button className="btn danger" onClick={() => { clearToken(); location.href = "/"; }}>ออกจากระบบ</button></div>
    </header>
    <section className="hero">
      <div className="kicker">ดูร้านที่ใช้ iCloud ร้านเป็นระบบควบคุมเดิม</div>
      <h1>ติดตามความเสี่ยง iCloud Custody ทุก tenant</h1>
      <p className="muted">หน้านี้ไว้ดูว่าร้านไหนใช้ iCloud ร้านเยอะ, ร้านไหนจ่ายครบแล้วแต่ยังไม่ปลด, ร้านไหนไม่มีหลักฐาน หรือมี dispute เพื่อไม่ให้ชื่อแพลตฟอร์มเราโดนลากไปอยู่ในดราม่าหน้าร้านแบบไม่จำเป็น 😑</p>
    </section>
    {error ? <div className="alert bad">{error}</div> : null}
    <section className="grid cols-4" style={{ marginBottom: 16 }}>
      <div className="card metric"><div className="metric-label">ร้านที่ใช้โหมดนี้</div><div className="metric-value">{stores.length}</div><div className="metric-note">tenant</div></div>
      <div className="card metric warn"><div className="metric-label">ต้องปลด</div><div className="metric-value">{stores.reduce((s, x) => s + x.releaseDue, 0)}</div><div className="metric-note">release due</div></div>
      <div className="card metric good"><div className="metric-label">ปลดแล้ว</div><div className="metric-value">{stores.reduce((s, x) => s + x.released, 0)}</div><div className="metric-note">released</div></div>
      <div className="card metric bad"><div className="metric-label">Dispute</div><div className="metric-value">{stores.reduce((s, x) => s + x.disputed, 0)}</div><div className="metric-note">ต้องตรวจ</div></div>
    </section>
    <section className="card" style={{ marginBottom: 16 }}>
      <h2>สรุปตามร้าน</h2>
      <div className="table-wrap"><table className="table"><thead><tr><th>ร้าน</th><th>ทั้งหมด</th><th>ต้องปลด</th><th>ปลดแล้ว</th><th>ไม่มีหลักฐาน</th><th>Dispute</th></tr></thead><tbody>{stores.map((s) => <tr key={s.organizationId}><td><b>{s.storeName}</b></td><td>{s.total}</td><td><span className="badge warn">{s.releaseDue}</span></td><td><span className="badge good">{s.released}</span></td><td><span className="badge warn">{s.missingEvidence}</span></td><td><span className="badge bad">{s.disputed}</span></td></tr>)}</tbody></table></div>
    </section>
    <section className="card">
      <h2>รายการล่าสุด</h2>
      <div className="table-wrap"><table className="table"><thead><tr><th>ร้าน</th><th>เครื่อง</th><th>ลูกค้า/สัญญา</th><th>Apple ID alias</th><th>Find My</th><th>Activation</th><th>Status</th></tr></thead><tbody>{records.map((r) => <tr key={r.id}><td>{r.organization.name}<div className="small">{r.organization.storeCode}</div></td><td><b>{r.device.brand} {r.device.model}</b><div className="small">{r.device.serialNumber || r.device.imei || "-"}</div></td><td>{r.device.contract ? <><b>{r.device.contract.customer.fullName}</b><div className="small">{r.device.contract.contractNo}</div></> : "-"}</td><td>{r.appleIdAlias || "-"}</td><td><span className={`badge ${tone(r.findMyStatus)}`}>{r.findMyStatus}</span></td><td><span className={`badge ${tone(r.activationStatus)}`}>{r.activationStatus}</span></td><td><span className={`badge ${tone(r.status)}`}>{r.status}</span></td></tr>)}</tbody></table></div>
    </section>
  </main>;
}

function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit() {
    setError("");
    try {
      const res = await api<{ token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setToken(res.token); onLoggedIn();
    } catch (e) { setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่ได้"); }
  }
  return <main className="login-page"><div className="login-card"><div className="logo big">K</div><h1>Platform Owner</h1>{error ? <div className="alert bad">{error}</div> : null}<input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} /><input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><button className="btn full" onClick={submit}>เข้าสู่ระบบ</button></div></main>;
}
