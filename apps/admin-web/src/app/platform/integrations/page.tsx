"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

function cls(status: string) {
  if (status === "ACTIVE") return "badge good";
  if (status === "FAILED") return "badge bad";
  if (status === "DEGRADED" || status === "CONNECTING") return "badge warn";
  return "badge";
}

export default function PlatformIntegrationsPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  async function load() {
    try {
      setData(await api<any>("/platform/integrations/readiness"));
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "โหลดไม่ได้");
    }
  }
  useEffect(() => { void load(); }, []);
  const stores = data?.stores || [];
  return <main className="app-shell">
    <section className="hero">
      <div className="kicker">Platform Owner</div>
      <h1>External Integration Readiness รวมทุกร้าน</h1>
      <p className="muted">ดูว่าร้านไหนต่อ Payment, Storage, Notification, MDM, iCloud Custody ครบแล้ว และร้านไหนยังต้องไล่ตั้งค่า ไม่ใช่รอให้ร้านทักว่า “พี่ ระบบไม่ไป” ตอนสามทุ่ม</p>
      <div className="hero-actions"><button className="btn secondary" onClick={load}>รีเฟรช</button><a className="btn secondary" href="/platform/mdm">Platform MDM</a><a className="btn secondary" href="/platform/billing">Billing</a></div>
    </section>
    {err && <div className="alert bad">{err}</div>}
    <div className="grid cols-4">
      <section className="card"><div className="kicker">Readiness รวม</div><h2>{data?.score ?? 0}%</h2></section>
      <section className="card"><div className="kicker">ร้านทั้งหมด</div><h2>{stores.length}</h2></section>
      <section className="card"><div className="kicker">ร้านพร้อมเกิน 80%</div><h2>{stores.filter((s:any)=>s.score>=80).length}</h2></section>
      <section className="card"><div className="kicker">ร้านต้องดูแล</div><h2>{stores.filter((s:any)=>s.score<80).length}</h2></section>
    </div>
    <section className="card" style={{ marginTop: 16 }}>
      <h2>ร้านและสถานะระบบนอก</h2>
      <div className="table-wrap"><table className="table"><thead><tr><th>ร้าน</th><th>คะแนน</th><th>พร้อม</th><th>ต้องตั้งค่า</th><th>ล้มเหลว</th><th>รายละเอียด</th></tr></thead><tbody>{stores.map((s:any)=><tr key={s.store.id}>
        <td><strong>{s.store.name}</strong><div className="small">{s.store.slug}</div></td>
        <td><span className={s.score>=80?"badge good":s.score>=50?"badge warn":"badge bad"}>{s.score}%</span></td>
        <td>{s.active}</td><td>{s.setupRequired}</td><td>{s.failed}</td>
        <td><div className="pill-list">{(s.connectors||[]).map((c:any)=><span key={c.id} className={cls(c.status)}>{c.displayName}: {c.status}</span>)}</div></td>
      </tr>)}</tbody></table></div>
    </section>
  </main>;
}
