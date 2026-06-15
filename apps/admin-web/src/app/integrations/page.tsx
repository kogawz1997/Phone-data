"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const categoryOrder = ["MDM", "PAYMENT", "NOTIFICATION", "STORAGE", "AUTOMATION"];

function badgeClass(status: string) {
  if (status === "ACTIVE") return "badge good";
  if (status === "FAILED") return "badge bad";
  if (status === "DEGRADED" || status === "CONNECTING") return "badge warn";
  return "badge";
}

export default function IntegrationsPage() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [plan, setPlan] = useState<any>(null);

  async function load() {
    try {
      const [c, r, ready] = await Promise.all([
        api<any[]>("/integrations/catalog"),
        api<any[]>("/integrations"),
        api<any>("/integrations/readiness"),
      ]);
      setCatalog(c);
      setRows(r);
      setReadiness(ready);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "โหลดไม่ได้");
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredRows = useMemo(() => {
    const list = readiness?.results?.map((x: any) => ({ ...x.connector, test: x.test })) || rows;
    if (selectedCategory === "ALL") return list;
    return list.filter((x: any) => x.category === selectedCategory);
  }, [readiness, rows, selectedCategory]);

  async function testOne(id: string) {
    try {
      setBusy(id);
      const result = await api<any>(`/integrations/${id}/test`, { method: "POST" });
      setPlan({ title: "ผลทดสอบ", ...result });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ทดสอบไม่ได้");
    } finally {
      setBusy("");
    }
  }

  async function testAll() {
    try {
      setBusy("all");
      await api("/integrations/test-all", { method: "POST" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ทดสอบทั้งหมดไม่ได้");
    } finally {
      setBusy("");
    }
  }

  async function showPlan(id: string) {
    try {
      setPlan(await api(`/integrations/${id}/setup-plan`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "เปิดแผนตั้งค่าไม่ได้");
    }
  }

  const score = readiness?.score ?? 0;

  return <main className="app-shell">
    <section className="hero">
      <div className="kicker">External Systems</div>
      <h1>Integration Hub พร้อมหน้างานระบบนอก</h1>
      <p className="muted">รวม MDM, Payment, Slip Verification, Storage, LINE/SMS/Email และ Webhook พร้อมตัวกรองและ checklist ให้ร้านต่อระบบจริงง่ายขึ้น</p>
      <div className="hero-actions">
        <button className="btn secondary" onClick={load}>รีเฟรช</button>
        <button className="btn" onClick={testAll} disabled={busy === "all"}>{busy === "all" ? "กำลังทดสอบ..." : "ทดสอบทั้งหมด"}</button>
        <a className="btn secondary" href="/onboarding">ไป Onboarding</a>
      </div>
    </section>

    {err && <div className="alert bad">{err}</div>}

    <div className="grid cols-4">
      <section className="card"><div className="kicker">Readiness</div><h2>{score}%</h2><p className="muted">คะแนน readiness ของระบบนอกในร้านนี้</p></section>
      <section className="card"><div className="kicker">Active</div><h2>{readiness?.active ?? 0}</h2><p className="muted">ระบบที่พร้อมใช้งานระดับ configuration</p></section>
      <section className="card"><div className="kicker">Total</div><h2>{readiness?.total ?? rows.length}</h2><p className="muted">ตัวเชื่อมระบบนอกทั้งหมด</p></section>
      <section className="card"><div className="kicker">Mode</div><h2>Tenant Safe</h2><p className="muted">ทุกรายการผูก organizationId ไม่ปนร้าน</p></section>
    </div>

    <section className="card" style={{ marginTop: 16 }}>
      <div className="row between wrap">
        <div>
          <h2>ตัวกรองระบบนอก</h2>
          <p className="muted">เลือกหมวดเพื่อดูว่ายังต้องสมัคร/ตั้งค่าอะไรบ้าง</p>
        </div>
        <div className="pill-list">
          {["ALL", ...categoryOrder].map(c => <button key={c} className={`btn tiny ${selectedCategory === c ? "" : "secondary"}`} onClick={() => setSelectedCategory(c)}>{c}</button>)}
        </div>
      </div>
    </section>

    <section className="card" style={{ marginTop: 16 }}>
      <h2>สถานะ Integration ของร้าน</h2>
      <div className="table-wrap"><table className="table"><thead><tr><th>ระบบ</th><th>หมวด</th><th>สถานะ</th><th>สิ่งที่ยังขาด</th><th>จัดการ</th></tr></thead><tbody>
        {filteredRows.map((r: any) => <tr key={r.id}>
          <td><strong>{r.displayName}</strong><div className="small">{r.provider}</div></td>
          <td>{r.category}</td>
          <td><span className={badgeClass(r.test?.status || r.status)}>{r.test?.status || r.status}</span></td>
          <td>{r.test?.missing?.length ? <div className="pill-list">{r.test.missing.map((m: string) => <span key={m} className="badge warn">{m}</span>)}</div> : <span className="muted">ไม่พบ env ที่ขาด</span>}</td>
          <td>
            <button className="btn tiny" disabled={busy === r.id} onClick={() => testOne(r.id)}>{busy === r.id ? "ตรวจ..." : "ทดสอบ"}</button>
            <button className="btn tiny secondary" onClick={() => showPlan(r.id)}>วิธีต่อ</button>
          </td>
        </tr>)}
      </tbody></table></div>
    </section>

    {plan && <section className="card" style={{ marginTop: 16 }}>
      <div className="row between wrap"><h2>{plan.title || plan.connector?.displayName || "Setup Plan"}</h2><button className="btn tiny secondary" onClick={() => setPlan(null)}>ปิด</button></div>
      <div className="grid cols-2">
        <div>
          <h3>ต้องทำต่อ</h3>
          <ol>{(plan.plan || plan.setupNext || []).map((x: string) => <li key={x}>{x}</li>)}</ol>
        </div>
        <div>
          <h3>ไฟล์คู่มือ</h3>
          <ul>{(plan.docs || []).map((x: string) => <li key={x}><code>{x}</code></li>)}</ul>
          {plan.missing?.length ? <><h3>ยังขาด</h3><div className="pill-list">{plan.missing.map((x: string) => <span key={x} className="badge warn">{x}</span>)}</div></> : null}
        </div>
      </div>
    </section>}

    <section className="card" style={{ marginTop: 16 }}>
      <h2>Catalog</h2>
      <div className="grid cols-3">{catalog.map(x => <section key={x.provider} className="mini-card"><h3>{x.displayName}</h3><p className="small">{x.category}</p><p className="muted">{(x.docs || []).join(" / ") || "ดูเอกสารใน docs"}</p></section>)}</div>
    </section>
  </main>;
}
