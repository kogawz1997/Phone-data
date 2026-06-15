"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type MdmSummary = {
  totals: { devices: number; enrollments: number; commands: number; failedCommands: number; appleCustodyDue: number };
  byStore: Array<{ id: string; name: string; slug?: string; _count: { devices: number; mdmEnrollments: number; appleCustodyRecords: number } }>;
  providerStatus: unknown;
};

export default function PlatformMdmPage() {
  const [summary, setSummary] = useState<MdmSummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError("");
    try {
      setSummary(await api<MdmSummary>("/platform/mdm/summary"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูล MDM ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="brand">
          <div className="logo">K</div>
          <div>
            <div className="kicker">Platform Owner</div>
            <h2>MDM Control Center</h2>
          </div>
        </div>
        <div className="pill-list">
          <a className="btn secondary" href="/platform">Owner</a>
          <a className="btn secondary" href="/">Store Console</a>
        </div>
      </section>

      <section className="hero hero-grid">
        <div>
          <span className="badge good">Owner only</span>
          <h1>ตั้งค่าและตรวจสถานะ MDM จากส่วนกลาง</h1>
          <p className="muted">MDM key และ provider credential ไม่ควรอยู่ในหน้าร้าน ร้านเห็นแค่สถานะพร้อมใช้งาน ส่วน key จริงให้เจ้าของแพลตฟอร์มคุมตรงนี้ เพราะปล่อยร้านกรอกเองคือเปิดประตูให้ความโกลาหลเข้ามาถอดรองเท้าในบ้าน</p>
          <div className="hero-actions">
            <button className="btn" onClick={load} disabled={busy}>{busy ? "กำลังโหลด..." : "รีเฟรช"}</button>
            <a className="btn secondary" href="/integrations">Store Integrations</a>
          </div>
        </div>
        <div className="card strong">
          <h3>Provider status</h3>
          <pre className="notice" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{JSON.stringify(summary?.providerStatus ?? {}, null, 2)}</pre>
        </div>
      </section>

      {error && <div className="alert bad">{error}</div>}

      <section className="grid cols-4">
        <div className="card metric"><div className="metric-label">Devices</div><div className="metric-value">{summary?.totals.devices ?? 0}</div><p className="metric-note">เครื่องทั้งหมดในระบบ</p></div>
        <div className="card metric"><div className="metric-label">Enrollments</div><div className="metric-value">{summary?.totals.enrollments ?? 0}</div><p className="metric-note">รายการ enrollment</p></div>
        <div className="card metric"><div className="metric-label">Commands</div><div className="metric-value">{summary?.totals.commands ?? 0}</div><p className="metric-note">คำสั่ง MDM ทั้งหมด</p></div>
        <div className="card metric bad"><div className="metric-label">Failed</div><div className="metric-value">{summary?.totals.failedCommands ?? 0}</div><p className="metric-note">คำสั่งล้มเหลว</p></div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>ร้านที่ใช้ MDM</h2>
        <div className="table-wrap"><table className="table"><thead><tr><th>ร้าน</th><th>เครื่อง</th><th>Enrollments</th><th>iCloud custody</th></tr></thead><tbody>{(summary?.byStore ?? []).map((store) => <tr key={store.id}><td><strong>{store.name}</strong><div className="small">{store.slug || store.id}</div></td><td>{store._count.devices}</td><td>{store._count.mdmEnrollments}</td><td>{store._count.appleCustodyRecords}</td></tr>)}</tbody></table></div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>ช่องตั้งค่า MDM ที่ควรอยู่ฝั่ง Owner</h2>
        <div className="grid cols-2">
          <div className="notice"><b>Android Management</b><p>Project ID, Enterprise Name, Service Account JSON, Callback URL</p></div>
          <div className="notice"><b>Apple MDM / ABM</b><p>Base URL, APNs cert/key/topic, ADE token, profile signing cert/key</p></div>
        </div>
      </section>
    </main>
  );
}
