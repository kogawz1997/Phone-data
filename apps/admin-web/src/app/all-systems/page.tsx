"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Bundle = {
  templates?: { documents: any[]; notifications: any[] };
  automation?: any[];
  risk?: any[];
  tasks?: any[];
  disputes?: any[];
  ledger?: any[];
  consent?: any[];
};

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export default function AllSystemsPage() {
  const [data, setData] = useState<Bundle>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const [templates, automation, risk, tasks, disputes, ledger, consent] = await Promise.all([
        api<any>("/templates"),
        api<any[]>("/automation/rules"),
        api<any[]>("/risk/customers"),
        api<any[]>("/collection/tasks"),
        api<any[]>("/disputes"),
        api<any[]>("/store/ledger"),
        api<any[]>("/consent/snapshots"),
      ]);
      setData({ templates, automation, risk, tasks, disputes, ledger, consent });
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="kicker">KOGA Lease MDM</div>
        <h1>ระบบที่ลิสไว้ทั้งหมด</h1>
        <p className="muted">รวม Risk Score, Collection, Dispute, Template, Automation, Consent Snapshot, Ledger และ Settlement-ready data สำหรับร้าน</p>
        <div className="hero-actions"><button className="btn" onClick={load}>รีเฟรช</button><a className="btn secondary" href="/">กลับ Store Console</a></div>
      </section>
      {error && <div className="alert bad">{error}</div>}
      {loading && <div className="card">กำลังโหลด...</div>}
      {!loading && (
        <div className="grid cols-3">
          <Card title="Risk Score" count={data.risk?.length ?? 0} note="คะแนนความเสี่ยงลูกค้า" />
          <Card title="Collection Tasks" count={data.tasks?.length ?? 0} note="งานติดตามงวด" />
          <Card title="Disputes" count={data.disputes?.length ?? 0} note="เคสโต้แย้ง/ปัญหา" />
          <Card title="Automation Rules" count={data.automation?.length ?? 0} note="กติกาอัตโนมัติ" />
          <Card title="Notification Templates" count={data.templates?.notifications?.length ?? 0} note="ข้อความแจ้งเตือน" />
          <Card title="Document Templates" count={data.templates?.documents?.length ?? 0} note="สัญญา/PDPA/Consent" />
          <Card title="Ledger Entries" count={data.ledger?.length ?? 0} note="บัญชีการเงินร้าน" />
          <Card title="Consent Snapshots" count={data.consent?.length ?? 0} note="หลักฐานเอกสารที่ลูกค้ารับทราบ" />
          <section className="card good"><h2>สถานะ</h2><Badge tone="good">พร้อมต่อ production flow</Badge><p className="muted small">ยังต้องต่อ gateway/storage/MDM credential จริงตามเอกสาร</p></section>
        </div>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <h2>งานที่แนะนำให้ร้านใช้ทุกวัน</h2>
        <div className="table-wrap">
          <table className="table"><thead><tr><th>ระบบ</th><th>ใช้ทำอะไร</th><th>Endpoint</th></tr></thead><tbody>
            <tr><td>Collection</td><td>สร้างงานโทร/LINE/ตามงวดค้าง</td><td>/collection/tasks</td></tr>
            <tr><td>Risk</td><td>ให้คะแนนลูกค้าก่อนปล่อยเครื่อง</td><td>/risk/customers</td></tr>
            <tr><td>Dispute</td><td>เคสจ่ายแล้วไม่ขึ้น สลิปมีปัญหา เครื่องหาย/เสีย</td><td>/disputes</td></tr>
            <tr><td>Template</td><td>แก้ข้อความสัญญา แจ้งเตือน PDPA</td><td>/templates</td></tr>
            <tr><td>Automation</td><td>แจ้งเตือนก่อนครบกำหนด สร้างงานติดตาม</td><td>/automation/rules</td></tr>
            <tr><td>Ledger</td><td>ดูเงินเข้าและรายการที่ยืนยันแล้ว</td><td>/store/ledger</td></tr>
          </tbody></table>
        </div>
      </section>
    </main>
  );
}

function Card({ title, count, note }: { title: string; count: number; note: string }) {
  return <section className="card metric"><div className="metric-label">{title}</div><div className="metric-value">{count}</div><div className="metric-note">{note}</div></section>;
}
