"use client";

import { useEffect, useMemo, useState } from "react";
import { api, clearToken, setToken } from "../lib/api";
import { baht } from "@repo/shared";

type CustodyRecord = {
  id: string;
  status: string;
  appleIdAlias?: string;
  findMyStatus: string;
  activationStatus: string;
  evidenceUrls?: string[];
  releaseEvidenceUrls?: string[];
  notes?: string;
  lastCheckedAt?: string;
  releaseDueAt?: string;
  releasedAt?: string;
  device: {
    id: string;
    brand: string;
    model: string;
    imei?: string;
    serialNumber?: string;
    controlMode: string;
    controlStatus: string;
    contract?: {
      id: string;
      contractNo: string;
      status: string;
      totalAmount: string;
      customer: { fullName: string; phone: string };
    } | null;
  };
};

type Device = {
  id: string;
  brand: string;
  model: string;
  platform: string;
  imei?: string;
  serialNumber?: string;
  controlMode?: string;
  appleCustodyRecord?: CustodyRecord | null;
  contract?: { contractNo: string; customer: { fullName: string; phone: string } } | null;
};

function dateTH(v?: string) {
  return v ? new Date(v).toLocaleString("th-TH") : "-";
}

function tone(status: string) {
  if (["RELEASED", "OFF"].includes(status)) return "good";
  if (["RELEASE_DUE", "ON", "NEEDS_CHECK"].includes(status)) return "warn";
  if (["DISPUTED"].includes(status)) return "bad";
  return "neutral";
}

export default function AppleCustodyPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [records, setRecords] = useState<CustodyRecord[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [appleIdAlias, setAppleIdAlias] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setLoggedIn(Boolean(localStorage.getItem("koga_admin_token")));
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rs, ds] = await Promise.all([api<CustodyRecord[]>("/apple-custody"), api<Device[]>("/devices")]);
      setRecords(rs);
      setDevices(ds.filter((d) => ["IOS", "IPADOS", "MACOS"].includes(d.platform)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loggedIn) void load();
  }, [loggedIn]);

  const summary = useMemo(() => ({
    total: records.length,
    active: records.filter((r) => r.status === "ACTIVE").length,
    releaseDue: records.filter((r) => r.status === "RELEASE_DUE").length,
    released: records.filter((r) => r.status === "RELEASED").length,
    disputed: records.filter((r) => r.status === "DISPUTED").length,
  }), [records]);

  async function enableCustody() {
    if (!selectedDeviceId) return setError("เลือกเครื่องก่อน");
    await api(`/devices/${selectedDeviceId}/apple-custody`, {
      method: "POST",
      body: JSON.stringify({
        appleIdAlias,
        findMyStatus: "ON",
        activationStatus: "ON",
        evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
        notes,
      }),
    });
    setSelectedDeviceId("");
    setAppleIdAlias("");
    setEvidenceUrl("");
    setNotes("");
    await load();
  }

  async function patchRecord(id: string, body: Record<string, unknown>) {
    await api(`/apple-custody/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    await load();
  }

  async function markReleased(id: string) {
    const url = window.prompt("วาง URL หลักฐานการปลด iCloud/Find My แล้ว เช่น รูปหน้าจอหรือ PDF");
    await api(`/apple-custody/${id}/mark-released`, { method: "POST", body: JSON.stringify({ releaseEvidenceUrls: url ? [url] : [] }) });
    await load();
  }

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo"></div>
          <div>
            <div className="kicker">Legacy iCloud Custody Mode</div>
            <h2 style={{ margin: 0 }}>ระบบเครื่องที่ใช้ iCloud ร้าน</h2>
          </div>
        </div>
        <div className="pill-list">
          <a className="btn secondary" href="/">Store Console</a>
          <button className="btn secondary" onClick={load}>{loading ? "กำลังโหลด..." : "รีเฟรช"}</button>
          <button className="btn danger" onClick={() => { clearToken(); location.href = "/"; }}>ออกจากระบบ</button>
        </div>
      </header>

      <section className="hero hero-grid">
        <div>
          <div className="kicker">สำหรับร้านที่มีเครื่องผูก Apple ID/iCloud ร้านอยู่แล้ว</div>
          <h1>นำเครื่อง iPhone ที่ใช้ iCloud ร้านเข้าระบบการเงินหลักได้</h1>
          <p className="muted" style={{ maxWidth: 850 }}>
            โหมดนี้ใช้เป็นระบบบันทึกสถานะ หลักฐาน และงานปลด iCloud เมื่อจ่ายครบ ระบบจะไม่เก็บรหัสผ่าน Apple ID, 2FA, recovery key หรือช่วย bypass Activation Lock เพราะเราไม่ได้เปิดพิพิธภัณฑ์หลักฐานคดีไซเบอร์ 😑
          </p>
        </div>
        <div className="card strong">
          <h2>สรุป iCloud Custody</h2>
          <div className="stat-grid compact">
            <div className="stat"><span>ทั้งหมด</span><b>{summary.total}</b></div>
            <div className="stat"><span>Active</span><b>{summary.active}</b></div>
            <div className="stat"><span>ต้องปลด</span><b>{summary.releaseDue}</b></div>
            <div className="stat"><span>ปลดแล้ว</span><b>{summary.released}</b></div>
          </div>
        </div>
      </section>

      {error ? <div className="alert bad">{error}</div> : null}

      <section className="grid two">
        <div className="card">
          <h2>เพิ่มเครื่องที่ใช้ iCloud ร้านเข้าระบบ</h2>
          <p className="muted">เลือกเครื่อง Apple ในสต็อกหรือเครื่องที่ผูกสัญญาแล้ว แล้วบันทึก alias/หลักฐาน ไม่เก็บรหัสผ่านเด็ดขาด</p>
          <label>เลือกเครื่อง</label>
          <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>
            <option value="">เลือก iPhone/iPad/Mac</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.brand} {d.model} · {d.serialNumber || d.imei || d.id.slice(0, 6)} {d.contract ? `· ${d.contract.customer.fullName}` : ""}</option>
            ))}
          </select>
          <label>Apple ID alias ของร้าน</label>
          <input value={appleIdAlias} onChange={(e) => setAppleIdAlias(e.target.value)} placeholder="เช่น branch-a-device-01@icloud.com" />
          <label>URL หลักฐานเริ่มต้น</label>
          <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="ลิงก์รูป/ไฟล์หลักฐานจาก storage" />
          <label>หมายเหตุ</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="เช่น ลูกค้าเซ็นรับทราบแล้ว, ตรวจ Find My ON แล้ว" />
          <button className="btn" onClick={enableCustody}>บันทึกเข้า iCloud Custody</button>
        </div>

        <div className="card">
          <h2>กติกาที่ระบบบังคับใช้</h2>
          <ul className="clean-list">
            <li>✅ ผูกทุก record กับร้านผ่าน organizationId</li>
            <li>✅ จ่ายครบแล้วขึ้น Release Queue ให้ร้านปลด iCloud</li>
            <li>✅ ต้องมีหลักฐานก่อน mark released</li>
            <li>✅ Platform Owner เห็น risk รวมทุกร้านได้</li>
            <li>❌ ไม่เก็บรหัสผ่าน Apple ID / 2FA / Recovery key</li>
            <li>❌ ไม่ทำ bypass Activation Lock หรือปลด iCloud แทนร้าน</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>รายการเครื่อง iCloud ร้าน</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>เครื่อง/ลูกค้า</th><th>Apple ID alias</th><th>Find My</th><th>Activation</th><th>สถานะ</th><th>จ่าย/สัญญา</th><th>ตรวจล่าสุด</th><th>จัดการ</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.device.brand} {r.device.model}</b><br />
                    <span className="small">{r.device.serialNumber || r.device.imei || "-"}</span><br />
                    <span className="small">{r.device.contract?.customer.fullName || "ยังไม่ผูกลูกค้า"}</span>
                  </td>
                  <td>{r.appleIdAlias || "-"}</td>
                  <td><span className={`badge ${tone(r.findMyStatus)}`}>{r.findMyStatus}</span></td>
                  <td><span className={`badge ${tone(r.activationStatus)}`}>{r.activationStatus}</span></td>
                  <td><span className={`badge ${tone(r.status)}`}>{r.status}</span></td>
                  <td>
                    {r.device.contract ? <><b>{r.device.contract.contractNo}</b><br /><span className="small">{r.device.contract.status} · {baht(r.device.contract.totalAmount)}</span></> : "-"}
                  </td>
                  <td>{dateTH(r.lastCheckedAt)}</td>
                  <td className="actions-col">
                    <button className="btn tiny secondary" onClick={() => patchRecord(r.id, { findMyStatus: r.findMyStatus === "ON" ? "OFF" : "ON" })}>สลับ Find My</button>
                    <button className="btn tiny secondary" onClick={() => api(`/apple-custody/${r.id}/mark-release-due`, { method: "POST", body: "{}" }).then(load)}>ต้องปลด</button>
                    <button className="btn tiny" onClick={() => markReleased(r.id)}>ปลดแล้ว</button>
                    <button className="btn tiny danger" onClick={() => patchRecord(r.id, { status: "DISPUTED" })}>Dispute</button>
                  </td>
                </tr>
              ))}
              {records.length === 0 ? <tr><td colSpan={8} className="empty">ยังไม่มีเครื่อง iCloud ร้านในระบบ</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit() {
    setError("");
    try {
      const res = await api<{ token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setToken(res.token);
      onLoggedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่ได้");
    }
  }
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="logo big">K</div>
        <h1>เข้าสู่ระบบร้าน</h1>
        <p className="muted">ใช้บัญชีร้านที่สมัครในระบบ</p>
        {error ? <div className="alert bad">{error}</div> : null}
        <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn full" onClick={submit}>เข้าสู่ระบบ</button>
      </div>
    </main>
  );
}
