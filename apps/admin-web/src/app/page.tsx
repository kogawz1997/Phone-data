"use client";

import { useEffect, useMemo, useState } from "react";
import { api, clearToken, setToken, downloadCsv, openHtml, API_BASE_URL } from "@/lib/api";
import { baht } from "@repo/shared";

type Summary = {
  customers: number;
  devices: number;
  leasedDevices: number;
  activeContracts: number;
  overdueContracts: number;
  paidOffContracts: number;
  pendingActions: number;
  transferPendingContracts: number;
  confirmedRevenue: number;
};

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  address?: string;
  riskScore: number;
  status?: string;
  contracts?: Contract[];
};

type Device = {
  id: string;
  brand: string;
  model: string;
  imei?: string;
  serialNumber?: string;
  platform: string;
  deviceStatus: string;
  controlStatus: string;
  providerDeviceName?: string;
  providerEnrollmentId?: string;
  providerDeviceToken?: string;
  providerPushMagic?: string;
  storage?: string;
  color?: string;
};

type Installment = {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: string;
  paidAmount: string;
  status: string;
};

type Contract = {
  id: string;
  contractNo: string;
  status: string;
  agreementType?: string;
  legalTitleStatus?: string;
  totalAmount: string;
  salePrice?: string;
  downPayment?: string;
  interestAmount?: string;
  signedAt?: string;
  paidOffAt?: string;
  customer: Customer;
  device: Device;
  installments: Installment[];
};

type Payment = {
  id: string;
  amount: string;
  method: string;
  status: string;
  slipUrl?: string;
  note?: string;
  createdAt?: string;
  contract: Contract;
  installment?: Installment;
};

type DeviceAction = {
  id: string;
  type: string;
  reason: string;
  status: string;
  createdAt?: string;
  device: Device;
  contract?: Contract;
};

type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  actor?: { name: string; email: string };
};

type ContactLog = {
  id: string;
  channel: string;
  message: string;
  createdAt: string;
};

type Readiness = {
  status: string;
  database: string;
  deviceControlProvider: string;
  now: string;
};

type Tab = "overview" | "customers" | "inventory" | "contracts" | "payments" | "collection" | "actions" | "mdm" | "reports" | "readiness" | "audit";

const tabs: Array<[Tab, string, string]> = [
  ["overview", "ภาพรวม", "ศูนย์บัญชาการ"],
  ["customers", "ลูกค้า", "ข้อมูลและความเสี่ยง"],
  ["inventory", "สต็อกเครื่อง", "IMEI/สถานะ"],
  ["contracts", "สัญญา", "สร้างและพิมพ์"],
  ["payments", "ชำระเงิน", "ตรวจสลิป"],
  ["collection", "ติดตามงวด", "งานค้างชำระ"],
  ["actions", "Device Actions", "อนุมัติก่อนทำ"],
  ["mdm", "MDM Setup", "Android + iOS"],
  ["reports", "รายงาน", "CSV/เอกสาร"],
  ["readiness", "หน้างานจริง", "สิ่งที่ต้องต่อ"],
  ["audit", "Audit", "หลักฐานระบบ"],
];

function statusTone(status?: string): "good" | "warn" | "bad" | "neutral" | "" {
  if (!status) return "";
  if (["PAID", "PAID_OFF", "CONFIRMED", "ACTIVE", "COMPLETED", "ENROLLED", "RELEASED", "LEASE_ACTIVE", "TRANSFERRED"].includes(status)) return "good";
  if (["DUE_SOON", "PENDING", "VERIFYING", "PENDING_APPROVAL", "RELEASE_PENDING", "DRAFT", "PARTIAL", "TRANSFER_PENDING", "ORGANIZATION_OWNED"].includes(status)) return "warn";
  if (["OVERDUE", "REJECTED", "FAILED", "RESTRICTED", "REVIEW_REQUIRED", "RECOVERY", "CANCELLED"].includes(status)) return "bad";
  return "neutral";
}

function remainingOf(i: Installment) {
  return Math.max(0, Number(i.amount) - Number(i.paidAmount));
}

function paidPercent(contract: Contract) {
  const total = contract.installments.reduce((sum, i) => sum + Number(i.amount), 0);
  const paid = contract.installments.reduce((sum, i) => sum + Number(i.paidAmount), 0);
  return total <= 0 ? 0 : Math.min(100, Math.round((paid / total) * 100));
}

function nextDue(contract: Contract) {
  return contract.installments
    .filter((i) => !["PAID", "WAIVED"].includes(i.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
}

function dateTH(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminPage() {
  const [tokenReady, setTokenReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [actions, setActions] = useState<DeviceAction[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    setLoggedIn(Boolean(localStorage.getItem("koga_admin_token")));
    setTokenReady(true);
  }, []);

  async function loadAll() {
    setError("");
    setLoading(true);
    try {
      const [s, c, d, ct, p, a, logs] = await Promise.all([
        api<Summary>("/reports/summary"),
        api<Customer[]>("/customers"),
        api<Device[]>("/devices"),
        api<Contract[]>("/contracts"),
        api<Payment[]>("/payments"),
        api<DeviceAction[]>("/device-actions"),
        api<AuditLog[]>("/audit-logs"),
      ]);
      setSummary(s);
      setCustomers(c);
      setDevices(d);
      setContracts(ct);
      setPayments(p);
      setActions(a);
      setAudits(logs);
      const res = await fetch(`${API_BASE_URL}/ops/readiness`);
      const json = await res.json();
      if (json.ok) setReadiness(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loggedIn) void loadAll();
  }, [loggedIn]);

  if (!tokenReady) return null;
  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;

  const pendingPayments = payments.filter((p) => !["CONFIRMED", "REJECTED", "REFUNDED"].includes(p.status));
  const overdueContracts = contracts.filter((c) => ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RECOVERY", "RESTRICTED"].includes(c.status));
  const pendingActions = actions.filter((a) => ["PENDING_APPROVAL", "QUEUED"].includes(a.status));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">K</div>
          <div>
            <div className="kicker">KOGA Lease MDM SaaS</div>
            <h2 style={{ margin: 0 }}>Store Console</h2>
          </div>
        </div>
        <div className="pill-list">
          <span className={`badge ${readiness?.status === "ready" ? "good" : "warn"}`}>API {readiness?.status ?? "checking"}</span>
          <span className="badge neutral">Provider: {readiness?.deviceControlProvider ?? "local"}</span>
          <a className="btn secondary" href="/platform">Owner</a><a className="btn secondary" href="/integrations">Integrations</a><a className="btn secondary" href="/collection">Collection</a><a className="btn secondary" href="/risk">Risk</a><a className="btn secondary" href="/customer-access">Users ลูกค้า</a><a className="btn secondary" href="/payment-requests">QR งวด</a><a className="btn secondary" href="/apple-custody">iCloud ร้าน</a><a className="btn secondary" href="/all-systems">All Systems</a><button className="btn secondary" onClick={loadAll}>{loading ? "กำลังโหลด..." : "รีเฟรช"}</button>
          <button className="btn danger" onClick={() => { clearToken(); setLoggedIn(false); }}>ออกจากระบบ</button>
        </div>
      </header>

      <section className="hero hero-grid">
        <div>
          <div className="kicker">ร้านเช่าใช้บนแพลตฟอร์ม SaaS + Lease-to-own MDM</div>
          <h1>ร้านจัดการลูกค้า เครื่อง สัญญา งวด และ MDM ได้ง่ายในเว็บเรา</h1>
          <p className="muted" style={{ maxWidth: 780 }}>
            คอนโซลนี้เป็นพื้นที่ของแต่ละร้าน ร้านเห็นเฉพาะข้อมูลตัวเอง: ลูกค้า สต็อกเครื่อง สัญญา การชำระ การติดตามงวด และ MDM/release workflow ส่วนเจ้าของแพลตฟอร์มไปดู /platform เพื่อจัดการร้าน แพ็กเกจ และค่าบริการ
          </p>
          <div className="hero-actions">
            <button className="btn" onClick={() => setTab("contracts")}>+ สร้างสัญญา</button>
            <button className="btn secondary" onClick={() => setTab("payments")}>ตรวจรายการชำระ {pendingPayments.length > 0 ? `(${pendingPayments.length})` : ""}</button>
            <button className="btn secondary" onClick={async () => { await api("/jobs/overdue-check", { method: "POST", body: "{}" }); await loadAll(); }}>รัน Overdue Check</button>
          </div>
        </div>
        <div className="card strong">
          <h2>งานที่ต้องทำวันนี้</h2>
          <div className="timeline">
            <div className="timeline-item"><span className="dot" /><div><b>{pendingPayments.length} รายการชำระรอตรวจ</b><div className="small">อย่าปล่อยให้เงินนอนค้างอยู่ในจักรวาล pending</div></div></div>
            <div className="timeline-item"><span className="dot" /><div><b>{overdueContracts.length} สัญญา lease ค้าง/ต้อง review</b><div className="small">ติดตามแบบมีหลักฐาน ไม่ใช่ดราม่าหน้าร้าน</div></div></div>
            <div className="timeline-item"><span className="dot" /><div><b>{pendingActions.length} MDM/release action รออนุมัติ</b><div className="small">ทุก action ต้องมีเหตุผลและ audit log</div></div></div>
          </div>
        </div>
      </section>

      <nav className="nav">
        {tabs.map(([key, label, sub]) => (
          <button key={key} className={`tab-btn ${key === tab ? "active" : ""}`} onClick={() => setTab(key)} title={sub}>{label}</button>
        ))}
      </nav>

      {error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}

      {tab === "overview" && <Overview summary={summary} contracts={contracts} payments={payments} actions={actions} setTab={setTab} />}
      {tab === "customers" && <Customers customers={customers} onDone={loadAll} />}
      {tab === "inventory" && <Devices devices={devices} onDone={loadAll} />}
      {tab === "contracts" && <Contracts contracts={contracts} customers={customers} devices={devices} onDone={loadAll} />}
      {tab === "payments" && <Payments payments={payments} contracts={contracts} onDone={loadAll} />}
      {tab === "collection" && <Collection contracts={contracts} customers={customers} onDone={loadAll} />}
      {tab === "actions" && <Actions actions={actions} contracts={contracts} onDone={loadAll} />}
      {tab === "mdm" && <MdmSetup devices={devices} contracts={contracts} />}
      {tab === "reports" && <Reports summary={summary} />}
      {tab === "readiness" && <ReadinessPanel readiness={readiness} />}
      {tab === "audit" && <AuditLogs logs={audits} />}
    </main>
  );
}

function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Login failed");
      setToken(json.data.token);
      onLoggedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <section className="login-poster">
          <div className="brand" style={{ marginBottom: 28 }}><div className="logo">K</div><div><div className="kicker">KOGA Finance</div><h2 style={{ margin: 0 }}>Ready MVP</h2></div></div>
          <h1>ร้านมือถือปล่อยผ่อน แต่ไม่ปล่อยระบบให้รก</h1>
          <p className="muted">จัดการลูกค้า เครื่อง สัญญา งวดชำระ และรายงานในที่เดียว พร้อมหน้างานสำหรับสิ่งที่ยังต้องต่อจริง เช่น payment gateway, SMS, storage และ device provider ที่ถูกต้อง</p>
          <div className="grid cols-3" style={{ marginTop: 22 }}>
            <div className="card"><b>Contracts</b><p className="small">สร้างงวดอัตโนมัติ</p></div>
            <div className="card"><b>Payments</b><p className="small">ตรวจและยืนยันยอด</p></div>
            <div className="card"><b>Audit</b><p className="small">มีหลักฐานทุก action</p></div>
          </div>
        </section>
        <form className="card login-form form-grid" onSubmit={submit}>
          <div><div className="kicker">Admin Login</div><h2>เข้าสู่ระบบ</h2><p className="small">ใช้บัญชีที่สร้างด้วย <code>pnpm bootstrap:prod</code> หรือบัญชี seed เฉพาะตอน dev</p></div>
          {error && <div className="notice error">{error}</div>}
          <label>Email<input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></label>
          <button className="btn">เข้าสู่ระบบ</button>
          <p className="small">ก่อนใช้จริงต้องตั้ง JWT_SECRET, DATABASE_URL, ADMIN_EMAIL/ADMIN_PASSWORD และ provider keys ให้ครบ ไม่งั้นเหมือนเปิดร้านแล้ววางกุญแจไว้หน้าประตู</p>
        </form>
      </div>
    </main>
  );
}

function Overview({ summary, contracts, payments, actions, setTab }: { summary: Summary | null; contracts: Contract[]; payments: Payment[]; actions: DeviceAction[]; setTab: (tab: Tab) => void }) {
  const revenueTarget = Math.max(1, contracts.reduce((sum, c) => sum + Number(c.totalAmount), 0));
  const confirmed = summary?.confirmedRevenue ?? 0;
  const revenuePercent = Math.round((confirmed / revenueTarget) * 100);
  const recentPayments = payments.slice(0, 5);
  const riskyContracts = contracts.filter((c) => ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RECOVERY", "RESTRICTED"].includes(c.status)).slice(0, 5);

  return (
    <div className="grid">
      <section className="grid cols-4">
        <Metric label="ลูกค้าทั้งหมด" value={summary?.customers ?? 0} note="คนที่มีในระบบ" />
        <Metric label="เครื่องในระบบ" value={summary?.devices ?? 0} note="รวม stock และ lease" />
        <Metric label="เครื่อง lease" value={summary?.leasedDevices ?? 0} note="ยังเป็นกรรมสิทธิ์ร้าน" tone="warn" />
        <Metric label="สัญญา active" value={summary?.activeContracts ?? 0} note="lease active" />
        <Metric label="ค้าง/ต้อง review" value={summary?.overdueContracts ?? 0} note="ต้องติดตามวันนี้" tone="bad" />
      </section>
      <section className="grid cols-3">
        <div className="card good">
          <h2>รายรับยืนยันแล้ว</h2>
          <div className="metric-value">{baht(confirmed)}</div>
          <div className="progress" style={{ marginTop: 14 }}><span style={{ width: `${Math.min(100, revenuePercent)}%` }} /></div>
          <p className="small" style={{ marginTop: 10 }}>คิดเทียบกับยอดสัญญาทั้งหมดในระบบ</p>
        </div>
        <div className="card warn">
          <h2>Payment Queue</h2>
          <div className="metric-value">{payments.filter((p) => !["CONFIRMED", "REJECTED"].includes(p.status)).length}</div>
          <p className="small">รายการชำระที่ต้องตรวจ ไม่ใช่ให้มันแก่ตายในตาราง</p>
          <button className="btn secondary" onClick={() => setTab("payments")}>ไปตรวจ</button>
        </div>
        <div className="card bad">
          <h2>Action Approval</h2>
          <div className="metric-value">{actions.filter((a) => ["PENDING_APPROVAL", "QUEUED"].includes(a.status)).length}</div>
          <p className="small">ทุกคำสั่งต้องผ่านคนตรวจและมีเหตุผล</p>
          <button className="btn secondary" onClick={() => setTab("actions")}>ไปอนุมัติ</button>
        </div>
      </section>
      <section className="grid cols-2">
        <div className="card">
          <h2>สัญญาเสี่ยงล่าสุด</h2>
          <div className="table-wrap"><table className="table"><thead><tr><th>เลขสัญญา</th><th>ลูกค้า</th><th>งวดถัดไป</th><th>Status</th></tr></thead><tbody>{riskyContracts.map((c) => <tr key={c.id}><td>{c.contractNo}</td><td>{c.customer.fullName}<div className="small">{c.customer.phone}</div></td><td>{nextDue(c) ? dateTH(nextDue(c)?.dueDate) : "-"}</td><td><StatusBadge status={c.status} /></td></tr>)}</tbody></table></div>
        </div>
        <div className="card">
          <h2>รายการชำระล่าสุด</h2>
          <div className="table-wrap"><table className="table"><thead><tr><th>สัญญา</th><th>ยอด</th><th>ช่องทาง</th><th>Status</th></tr></thead><tbody>{recentPayments.map((p) => <tr key={p.id}><td>{p.contract.contractNo}<div className="small">{p.contract.customer.fullName}</div></td><td>{baht(p.amount)}</td><td>{p.method}</td><td><StatusBadge status={p.status} /></td></tr>)}</tbody></table></div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string | number; note: string; tone?: "bad" | "warn" | "good" }) {
  return <div className={`card metric ${tone ?? ""}`}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>;
}

function StatusBadge({ status }: { status?: string }) {
  return <span className={`badge ${statusTone(status)}`}>{status ?? "-"}</span>;
}

function Customers({ customers, onDone }: { customers: Customer[]; onDone: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const filtered = customers.filter((c) => `${c.fullName} ${c.phone}`.toLowerCase().includes(search.toLowerCase()));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api("/customers", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) });
    e.currentTarget.reset();
    await onDone();
  }
  return <div className="layout-rail"><form className="card form-grid" onSubmit={submit}><div><h2>เพิ่มลูกค้า</h2><p className="small">เก็บเท่าที่จำเป็น ใช้จริงค่อยต่อ KYC/เอกสาร อย่าเก็บทุกอย่างเหมือนสะสมโปเกมอนข้อมูลส่วนตัว</p></div><label>ชื่อ-นามสกุล<input name="fullName" className="input" placeholder="เช่น สมชาย ตัวอย่าง" required /></label><label>เบอร์โทร<input name="phone" className="input" placeholder="08xxxxxxxx" required /></label><label>ที่อยู่<textarea name="address" className="input" placeholder="ที่อยู่ตามสัญญา" /></label><label>Risk score<input name="riskScore" className="input" placeholder="0-100" defaultValue="0" /></label><button className="btn">บันทึกลูกค้า</button></form><div className="card"><div className="topbar"><div><h2>ลูกค้า</h2><p className="small">ค้นหาและดูจำนวนสัญญา</p></div><input className="input" style={{ maxWidth: 280 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ/เบอร์" /></div><div className="table-wrap"><table className="table"><thead><tr><th>ลูกค้า</th><th>เบอร์</th><th>Risk</th><th>Status</th><th>สัญญา</th></tr></thead><tbody>{filtered.map(c => <tr key={c.id}><td><b>{c.fullName}</b><div className="small">{c.address ?? "ไม่ระบุที่อยู่"}</div></td><td>{c.phone}</td><td><StatusBadge status={Number(c.riskScore) >= 70 ? "HIGH" : Number(c.riskScore) >= 40 ? "MEDIUM" : "LOW"} /></td><td><StatusBadge status={c.status ?? "ACTIVE"} /></td><td>{c.contracts?.length ?? 0}</td></tr>)}</tbody></table></div></div></div>;
}

function Devices({ devices, onDone }: { devices: Device[]; onDone: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const filtered = devices.filter((d) => `${d.brand} ${d.model} ${d.imei} ${d.serialNumber}`.toLowerCase().includes(search.toLowerCase()));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api("/devices", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) });
    e.currentTarget.reset();
    await onDone();
  }
  return <div className="layout-rail"><form className="card form-grid" onSubmit={submit}><div><h2>เพิ่มเครื่องเข้าสต็อก</h2><p className="small">ใช้ IMEI/Serial เป็นหลักฐานคุมทรัพย์สิน</p></div><div className="form-row"><label>Brand<input name="brand" className="input" placeholder="Samsung" required /></label><label>Model<input name="model" className="input" placeholder="Galaxy A55" required /></label></div><label>Platform<select name="platform" className="input" defaultValue="ANDROID"><option>ANDROID</option><option>IOS</option><option>IPADOS</option><option>MACOS</option><option>OTHER</option></select></label><label>โหมดควบคุม<select name="controlMode" className="input" defaultValue="NONE"><option value="NONE">ไม่มี / ยังไม่ตั้งค่า</option><option value="ANDROID_ENTERPRISE">Android Enterprise</option><option value="APPLE_MDM_ADE">Apple MDM / ADE</option><option value="ICLOUD_CUSTODY">iCloud ร้าน (Legacy Custody)</option></select></label><label>Apple ID alias ร้าน<input name="icloudAppleIdAlias" className="input" placeholder="branch-a-device-01@icloud.com" /></label><label>IMEI<input name="imei" className="input" placeholder="IMEI" /></label><label>Serial<input name="serialNumber" className="input" placeholder="Serial Number" /></label><div className="form-row"><label>Storage<input name="storage" className="input" placeholder="128GB" /></label><label>Color<input name="color" className="input" placeholder="Black" /></label></div><button className="btn">บันทึกเครื่อง</button></form><div className="card"><div className="topbar"><div><h2>สต็อกและเครื่องที่ขายแล้ว</h2><p className="small">สถานะเครื่องกับ control แยกกัน อย่าปน เดี๋ยวระบบกลายเป็นผัดรวม</p></div><input className="input" style={{ maxWidth: 280 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหารุ่น/IMEI" /></div><div className="table-wrap"><table className="table"><thead><tr><th>เครื่อง</th><th>IMEI/Serial</th><th>Platform</th><th>Stock Status</th><th>Control</th><th>Mode</th></tr></thead><tbody>{filtered.map(d => <tr key={d.id}><td><b>{d.brand} {d.model}</b><div className="small">{[d.storage, d.color].filter(Boolean).join(" / ")}</div></td><td>{d.imei ?? "-"}<div className="small">{d.serialNumber ?? "-"}</div></td><td>{d.platform}</td><td><StatusBadge status={d.deviceStatus} /></td><td><StatusBadge status={d.controlStatus} /></td><td><StatusBadge status={(d as any).controlMode ?? "NONE"} /></td></tr>)}</tbody></table></div></div></div>;
}

function Contracts({ contracts, customers, devices, onDone }: { contracts: Contract[]; customers: Customer[]; devices: Device[]; onDone: () => Promise<void> }) {
  const stockDevices = devices.filter((d) => d.deviceStatus === "IN_STOCK");
  const [search, setSearch] = useState("");
  const filtered = contracts.filter((c) => `${c.contractNo} ${c.customer.fullName} ${c.customer.phone} ${c.device.brand} ${c.device.model}`.toLowerCase().includes(search.toLowerCase()));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api("/contracts", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) });
    e.currentTarget.reset();
    await onDone();
  }
  async function sign(id: string) { await api(`/contracts/${id}/sign`, { method: "POST", body: "{}" }); await onDone(); }
  async function cancel(id: string) { if (confirm("ยกเลิกสัญญานี้?")) { await api(`/contracts/${id}/cancel`, { method: "POST", body: "{}" }); await onDone(); } }
  return <div className="grid"><form className="card form-grid" onSubmit={submit}><div className="topbar"><div><h2>สร้างสัญญา Lease-to-own</h2><p className="small">ร้านถือกรรมสิทธิ์ก่อน ลูกค้าเซ็นยินยอม MDM แล้วจ่ายครบจึง release/โอนกรรมสิทธิ์</p></div><span className="badge warn">เครื่องในสต็อก {stockDevices.length}</span></div><div className="grid cols-3"><label>ลูกค้า<select name="customerId" className="input" required><option value="">เลือกลูกค้า</option>{customers.map(c => <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>)}</select></label><label>เครื่อง<select name="deviceId" className="input" required><option value="">เลือกเครื่องในสต็อก</option>{stockDevices.map(d => <option key={d.id} value={d.id}>{d.brand} {d.model} {d.imei}</option>)}</select></label><label>วันครบกำหนดงวดแรก<input name="firstDueDate" className="input" type="date" required /></label></div><div className="grid cols-4"><label>ราคาเครื่อง<input name="salePrice" className="input" placeholder="12900" required /></label><label>เงินดาวน์<input name="downPayment" className="input" placeholder="2900" defaultValue="0" /></label><label>ดอก/ค่าธรรมเนียม<input name="interestAmount" className="input" placeholder="1200" defaultValue="0" /></label><label>จำนวนงวด<input name="installmentCount" className="input" placeholder="6" defaultValue="6" /></label></div><input type="hidden" name="agreementType" value="LEASE_TO_OWN" /><input type="hidden" name="managementPurpose" value="LEASE_TO_OWN_ASSET_PROTECTION" /><button className="btn">สร้างสัญญา Lease-to-own</button></form><div className="card"><div className="topbar"><div><h2>รายการสัญญา</h2><p className="small">พิมพ์สัญญา/บันทึก PDF จาก browser ได้</p></div><input className="input" style={{ maxWidth: 340 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาเลขสัญญา/ลูกค้า/เครื่อง" /></div><div className="table-wrap"><table className="table"><thead><tr><th>สัญญา</th><th>ลูกค้า</th><th>เครื่อง</th><th>ยอดรวม</th><th>จ่ายแล้ว</th><th>งวดถัดไป</th><th>Status / กรรมสิทธิ์</th><th>จัดการ</th></tr></thead><tbody>{filtered.map(c => { const pct = paidPercent(c); const due = nextDue(c); return <tr key={c.id}><td><b>{c.contractNo}</b><div className="small">signed: {dateTH(c.signedAt)}</div></td><td>{c.customer.fullName}<div className="small">{c.customer.phone}</div></td><td>{c.device.brand} {c.device.model}<div className="small">{c.device.imei}</div></td><td>{baht(c.totalAmount)}</td><td><div className="progress"><span style={{ width: `${pct}%` }} /></div><div className="small">{pct}%</div></td><td>{due ? <>งวด {due.installmentNo}<div className="small">{dateTH(due.dueDate)} / {baht(remainingOf(due))}</div></> : "-"}</td><td><StatusBadge status={c.status} /> <StatusBadge status={c.legalTitleStatus} /></td><td><div className="pill-list"><button className="btn secondary" onClick={() => openHtml(`/contracts/${c.id}/print`)}>Print</button>{c.status === "DRAFT" && <button className="btn secondary" onClick={() => sign(c.id)}>Sign</button>}{c.status !== "CANCELLED" && c.status !== "PAID_OFF" && <button className="btn danger" onClick={() => cancel(c.id)}>Cancel</button>}</div></td></tr>; })}</tbody></table></div></div></div>;
}

function Payments({ payments, contracts, onDone }: { payments: Payment[]; contracts: Contract[]; onDone: () => Promise<void> }) {
  const activeContracts = useMemo(() => contracts.filter((c) => !["PAID_OFF", "CANCELLED"].includes(c.status)), [contracts]);
  const [selectedContract, setSelectedContract] = useState("");
  const contract = activeContracts.find((c) => c.id === selectedContract);
  const pending = payments.filter((p) => !["CONFIRMED", "REJECTED", "REFUNDED"].includes(p.status));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await api("/payments", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) });
    e.currentTarget.reset();
    setSelectedContract("");
    await onDone();
  }
  async function confirmPayment(id: string) { await api(`/payments/${id}/confirm`, { method: "POST", body: "{}" }); await onDone(); }
  async function rejectPayment(id: string) { await api(`/payments/${id}/reject`, { method: "POST", body: "{}" }); await onDone(); }
  return <div className="grid"><div className="grid cols-3"><Metric label="รอตรวจ" value={pending.length} note="รายการที่ยังไม่ confirmed" tone="warn" /><Metric label="ยืนยันแล้ว" value={payments.filter(p => p.status === "CONFIRMED").length} note="ยอดรับเงินจริง" tone="good" /><Metric label="ถูกปฏิเสธ" value={payments.filter(p => p.status === "REJECTED").length} note="ต้องแจ้งลูกค้า" tone="bad" /></div><form className="card form-grid" onSubmit={submit}><div><h2>บันทึก/รับแจ้งชำระ</h2><p className="small">MVP รับ slipUrl ก่อน ใช้จริงค่อยต่อ upload storage + slip verify provider</p></div><div className="grid cols-3"><label>สัญญา<select name="contractId" className="input" required value={selectedContract} onChange={(e) => setSelectedContract(e.target.value)}><option value="">เลือกสัญญา</option>{activeContracts.map(c => <option key={c.id} value={c.id}>{c.contractNo} - {c.customer.fullName}</option>)}</select></label><label>งวด<select name="installmentId" className="input"><option value="">ไม่ระบุงวด</option>{contract?.installments.filter(i => remainingOf(i) > 0).map(i => <option key={i.id} value={i.id}>งวด {i.installmentNo} - เหลือ {baht(remainingOf(i))} - {i.status}</option>)}</select></label><label>ยอดเงิน<input name="amount" className="input" placeholder="2800" required /></label></div><div className="grid cols-3"><label>วิธีชำระ<select name="method" className="input" defaultValue="BANK_TRANSFER"><option>BANK_TRANSFER</option><option>PROMPTPAY</option><option>CASH</option><option>CARD</option><option>OTHER</option></select></label><label>Slip URL<input name="slipUrl" className="input" placeholder="https://..." /></label><label>หมายเหตุ<input name="note" className="input" placeholder="ลูกค้าส่งผ่าน LINE" /></label></div><button className="btn">บันทึกรายการชำระ</button></form><div className="card"><h2>รายการชำระ</h2><div className="table-wrap"><table className="table"><thead><tr><th>สัญญา</th><th>ลูกค้า</th><th>ยอด</th><th>งวด</th><th>วิธี</th><th>Status</th><th>สลิป</th><th>จัดการ</th></tr></thead><tbody>{payments.map(p => <tr key={p.id}><td>{p.contract.contractNo}</td><td>{p.contract.customer.fullName}</td><td>{baht(p.amount)}</td><td>{p.installment ? `งวด ${p.installment.installmentNo}` : "-"}</td><td>{p.method}</td><td><StatusBadge status={p.status} /></td><td>{p.slipUrl ? <a className="badge neutral" href={p.slipUrl} target="_blank">เปิด</a> : <span className="small">ไม่มี</span>}</td><td>{!["CONFIRMED", "REJECTED"].includes(p.status) && <div className="pill-list"><button className="btn secondary" onClick={() => confirmPayment(p.id)}>Confirm</button><button className="btn danger" onClick={() => rejectPayment(p.id)}>Reject</button></div>}</td></tr>)}</tbody></table></div></div></div>;
}

function Collection({ contracts, customers, onDone }: { contracts: Contract[]; customers: Customer[]; onDone: () => Promise<void> }) {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const risky = contracts.filter((c) => ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RECOVERY", "RESTRICTED", "DUE_SOON"].includes(c.status));
  const customer = customers.find((c) => c.id === selectedCustomer);
  async function loadLogs(customerId: string) {
    setSelectedCustomer(customerId);
    if (!customerId) return setLogs([]);
    setLogs(await api<ContactLog[]>(`/customers/${customerId}/contact-logs`));
  }
  async function submitLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCustomer) return;
    const fd = new FormData(e.currentTarget);
    await api(`/customers/${selectedCustomer}/contact-logs`, { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) });
    e.currentTarget.reset();
    await loadLogs(selectedCustomer);
    await onDone();
  }
  return <div className="grid cols-2"><div className="card"><h2>งานติดตามงวด</h2><p className="small">ใช้เป็นหน้าทำงานของคนโทร/LINE หาลูกค้า เก็บหลักฐานทุกครั้ง หยุดการทวงแบบจำจากอารมณ์เถอะ โลกเหนื่อยแล้ว</p><div className="table-wrap"><table className="table"><thead><tr><th>สัญญา</th><th>ลูกค้า</th><th>งวดถัดไป</th><th>ยอดค้าง</th><th>Status</th><th></th></tr></thead><tbody>{risky.map((c) => { const due = nextDue(c); return <tr key={c.id}><td>{c.contractNo}</td><td>{c.customer.fullName}<div className="small">{c.customer.phone}</div></td><td>{due ? `${dateTH(due.dueDate)} / งวด ${due.installmentNo}` : "-"}</td><td>{due ? baht(remainingOf(due)) : "-"}</td><td><StatusBadge status={c.status} /></td><td><button className="btn secondary" onClick={() => loadLogs(c.customer.id)}>บันทึกการติดต่อ</button></td></tr>; })}</tbody></table></div></div><div className="card form-grid"><h2>Contact Log</h2>{customer ? <><div className="notice"><b>{customer.fullName}</b><div className="small">{customer.phone} | risk {customer.riskScore}</div></div><form className="form-grid" onSubmit={submitLog}><label>ช่องทาง<select name="channel" className="input" defaultValue="PHONE"><option>PHONE</option><option>LINE</option><option>SMS</option><option>EMAIL</option><option>OTHER</option></select></label><label>ข้อความ/ผลการติดต่อ<textarea name="message" className="input" placeholder="เช่น โทรแจ้งงวดที่ 2 ลูกค้าขอจ่ายวันศุกร์" required /></label><button className="btn">บันทึก Log</button></form><div className="timeline">{logs.map((log) => <div className="timeline-item" key={log.id}><span className="dot" /><div><b>{log.channel}</b><div className="small">{new Date(log.createdAt).toLocaleString("th-TH")}</div><p style={{ marginTop: 6 }}>{log.message}</p></div></div>)}</div></> : <p className="muted">เลือกลูกค้าจากรายการด้านซ้ายเพื่อบันทึกการติดต่อ</p>}</div></div>;
}

function Actions({ actions, contracts, onDone }: { actions: DeviceAction[]; contracts: Contract[]; onDone: () => Promise<void> }) {
  const [selectedContract, setSelectedContract] = useState("");
  const contract = contracts.find((c) => c.id === selectedContract);
  async function approve(id: string) { await api(`/device-actions/${id}/approve`, { method: "POST", body: "{}" }); await onDone(); }
  async function reject(id: string) { await api(`/device-actions/${id}/reject`, { method: "POST", body: "{}" }); await onDone(); }
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contract) return;
    const fd = new FormData(e.currentTarget);
    await api("/device-actions", { method: "POST", body: JSON.stringify({ ...Object.fromEntries(fd), contractId: contract.id, deviceId: contract.device.id }) });
    e.currentTarget.reset();
    setSelectedContract("");
    await onDone();
  }
  return <div className="grid"><div className="notice"><b>Device-control ส่งเข้า provider ตาม DEVICE_CONTROL_PROVIDER แล้ว</b><br />โหมด local ใช้ทดสอบเท่านั้น ถ้าตั้งเป็น android/apple/dual ระบบจะเรียก adapter จริงและต้องมี providerDeviceName/cert/token ครบก่อนอนุมัติคำสั่ง ไม่ใช่กดแล้วหวังว่าจักรวาลจะรู้จักเครื่องเอง</div><form className="card form-grid" onSubmit={create}><h2>สร้าง Device Action</h2><div className="grid cols-3"><label>สัญญา<select className="input" value={selectedContract} onChange={(e) => setSelectedContract(e.target.value)} required><option value="">เลือกสัญญา</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNo} - {c.customer.fullName}</option>)}</select></label><label>Action<select name="type" className="input" defaultValue="SEND_REMINDER"><option>SEND_REMINDER</option><option>REQUEST_LIMITED_MODE</option><option>REQUEST_RESTRICT</option><option>REQUEST_RELEASE</option><option>CONFIRM_OWNERSHIP_TRANSFER</option><option>MARK_RECOVERY</option></select></label><label>เครื่อง<input className="input" value={contract ? `${contract.device.brand} ${contract.device.model}` : ""} readOnly placeholder="เลือกสัญญาก่อน" /></label></div><label>เหตุผล<textarea name="reason" className="input" placeholder="เช่น ค้างชำระเกิน X วัน หลังแจ้งเตือนแล้ว" required /></label><button className="btn">สร้างคำสั่งรออนุมัติ</button></form><div className="card"><h2>Device Actions</h2><div className="table-wrap"><table className="table"><thead><tr><th>Type</th><th>เครื่อง</th><th>สัญญา</th><th>เหตุผล</th><th>Status / กรรมสิทธิ์</th><th>จัดการ</th></tr></thead><tbody>{actions.map(a => <tr key={a.id}><td>{a.type}</td><td>{a.device.brand} {a.device.model}<div className="small">{a.device.imei}</div></td><td>{a.contract?.contractNo ?? "-"}</td><td>{a.reason}</td><td><StatusBadge status={a.status} /></td><td>{["PENDING_APPROVAL", "QUEUED"].includes(a.status) && <div className="pill-list"><button className="btn secondary" onClick={() => approve(a.id)}>Approve</button><button className="btn danger" onClick={() => reject(a.id)}>Reject</button></div>}</td></tr>)}</tbody></table></div></div></div>;
}


function MdmSetup({ devices, contracts }: { devices: Device[]; contracts: Contract[] }) {
  const [result, setResult] = useState<any>(null);
  const [selectedContract, setSelectedContract] = useState(contracts[0]?.id ?? "");
  const contract = contracts.find((c) => c.id === selectedContract);
  async function loadStatus() { setResult(await api("/mdm/providers/status")); }
  async function androidSignupUrl(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setResult(await api("/mdm/android/signup-url", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) }));
  }
  async function androidEnterprise(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setResult(await api("/mdm/android/enterprise", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) }));
  }
  async function androidEnroll() {
    if (!contract) return;
    setResult(await api("/mdm/android/enrollment-token", { method: "POST", body: JSON.stringify({ deviceId: contract.device.id, contractId: contract.id, mode: "ANDROID_FULLY_MANAGED", policyId: "lease-basic" }) }));
  }
  async function appleEnroll() {
    if (!contract) return;
    setResult(await api("/mdm/apple/enrollment-profile", { method: "POST", body: JSON.stringify({ deviceId: contract.device.id, contractId: contract.id, mode: "APPLE_ADE", policyId: "lease-basic-ios" }) }));
  }
  async function publishAndroidBasic() { setResult(await api("/mdm/android/policies/lease-basic/publish", { method: "POST", body: JSON.stringify({ preset: "lease-basic" }) })); }
  async function publishAppleProfile() { setResult(await api("/mdm/apple/policies/lease-basic-ios/publish", { method: "POST", body: JSON.stringify({ preset: "lease-basic-ios" }) })); }
  async function syncAppleAbm() { setResult(await api("/mdm/apple/abm/sync", { method: "POST", body: "{}" })); }
  async function bindProviderDevice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contract) return;
    const fd = new FormData(e.currentTarget);
    setResult(await api(`/devices/${contract.device.id}/mdm/bind`, { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) }));
  }
  return <div className="grid">
    <div className="notice"><b>MDM Setup: Android + iOS ใช้งานจริง</b><br />หน้านี้ไม่ได้เป็น demo แล้ว: Android มี enterprise signup flow, enrollment token, policy publish; Apple มี profile, check-in/connect และ command queue. ส่วนบัญชี/cert/token ต้องสมัครข้างนอกตามคู่มือ เพราะผมยังไม่ได้กลายเป็นฝ่ายอนุมัติของ Google/Apple แบบน่าเสียดาย</div>
    <div className="grid cols-2">
      <div className="card form-grid"><h2>1) เลือกสัญญา/เครื่อง</h2><label>สัญญา<select className="input" value={selectedContract} onChange={(e) => setSelectedContract(e.target.value)}><option value="">เลือกสัญญา</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNo} - {c.customer.fullName} - {c.device.platform}</option>)}</select></label>{contract && <div className="notice"><b>{contract.device.brand} {contract.device.model}</b><div className="small">IMEI {contract.device.imei ?? "-"} | Serial {contract.device.serialNumber ?? "-"} | {contract.device.platform}</div><div className="small">Provider device: {contract.device.providerDeviceName ?? "ยังไม่ bind"}</div></div>}<button className="btn secondary" onClick={loadStatus}>ตรวจสถานะ provider</button>{contract && <form className="form-grid" onSubmit={bindProviderDevice}><h3>Bind Provider Device หลัง enroll จริง</h3><label>providerDeviceName<input name="providerDeviceName" className="input" placeholder="Android: enterprises/.../devices/... | Apple: UDID" /></label><label>providerEnrollmentId<input name="providerEnrollmentId" className="input" placeholder="enrollment token/profile id" /></label><div className="grid cols-2"><label>Apple deviceToken<input name="providerDeviceToken" className="input" placeholder="จาก Apple check-in" /></label><label>Apple PushMagic<input name="providerPushMagic" className="input" placeholder="จาก Apple check-in" /></label></div><button className="btn secondary">บันทึก binding</button></form>}</div>
      <div className="card"><h2>สิ่งที่ต้องสมัคร</h2><div className="timeline"><div className="timeline-item"><span className="dot" /><div><b>Android</b><div className="small">Google Cloud → Enable Android Management API → Service Account → Enterprise signup URL → Enterprise name → Device quota</div></div></div><div className="timeline-item"><span className="dot" /><div><b>iOS/iPadOS</b><div className="small">Apple Business → APNs MDM certificate → ADE server token → HTTPS MDM server → supervised devices</div></div></div></div></div>
    </div>
    <div className="grid cols-2">
      <form className="card form-grid" onSubmit={androidSignupUrl}><h2>2) Android Enterprise Signup</h2><label>Callback URL<input name="callbackUrl" className="input" placeholder="https://api.example.com/mdm/android/signup-callback" /></label><label>Admin email<input name="adminEmail" className="input" placeholder="it@company.com" /></label><button className="btn">สร้าง signup URL</button></form>
      <form className="card form-grid" onSubmit={androidEnterprise}><h2>3) สร้าง Android Enterprise</h2><label>enterpriseToken<input name="enterpriseToken" className="input" placeholder="จาก callback" /></label><label>signupUrlName<input name="signupUrlName" className="input" placeholder="signupUrls/..." /></label><label>Display name<input name="displayName" className="input" placeholder="ชื่อบริษัท" /></label><button className="btn">สร้าง Enterprise</button></form>
    </div>
    <div className="grid cols-2">
      <div className="card"><h2>Android Management API</h2><p className="small">ใช้กับเครื่อง Android company-owned / fully managed ที่ enroll ก่อนส่งมอบ</p><div className="pill-list"><button className="btn" onClick={androidEnroll}>สร้าง Android Enrollment</button><button className="btn secondary" onClick={publishAndroidBasic}>Publish lease-basic policy</button></div></div>
      <div className="card"><h2>Apple MDM / ADE</h2><p className="small">ใช้กับ iPhone/iPad ที่เข้า Apple Business Manager และ supervised/ADE</p><div className="pill-list"><button className="btn" onClick={appleEnroll}>สร้าง Apple Enrollment Profile</button><button className="btn secondary" onClick={publishAppleProfile}>Publish Apple Profile</button><button className="btn secondary" onClick={syncAppleAbm}>Sync ABM</button></div></div>
    </div>
    <div className="card"><h2>ผลลัพธ์ API</h2><pre style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>{result ? JSON.stringify(result, null, 2) : "กดปุ่มด้านบนเพื่อเริ่มตั้งค่า"}</pre></div>
    <div className="grid cols-3"><Checklist title="Android docs" items={["docs/providers/android-management-api-setup-th.md", "docs/providers/google-cloud-service-account-th.md", "docs/providers/android-enrollment-test-plan-th.md"]} /><Checklist title="Apple docs" items={["docs/providers/apple-business-manager-setup-th.md", "docs/providers/apple-mdm-certificate-apns-th.md", "docs/providers/apple-ade-server-token-th.md"]} /><Checklist title="ใช้จริง" items={["enroll ก่อนส่งมอบ", "ลูกค้าเซ็น consent", "จ่ายครบแล้ว release", "เก็บ audit ทุก action"]} /></div>
  </div>;
}


function Reports({ summary }: { summary: Summary | null }) {
  return <div className="grid cols-2"><div className="card"><h2>Export รายงาน</h2><p className="muted">ไฟล์ CSV เปิดใน Excel/Google Sheets ได้ ไม่ต้องก็อปจากตารางทีละแถวเหมือนชดใช้กรรมดิจิทัล</p><div className="pill-list"><button className="btn" onClick={() => downloadCsv("/reports/contracts.csv", "contracts.csv")}>Contracts CSV</button><button className="btn" onClick={() => downloadCsv("/reports/payments.csv", "payments.csv")}>Payments CSV</button><button className="btn" onClick={() => downloadCsv("/reports/overdue.csv", "overdue.csv")}>Overdue CSV</button></div></div><div className="card"><h2>ตัวเลขสรุป</h2><div className="grid cols-2"><Metric label="ลูกค้า" value={summary?.customers ?? 0} note="ทั้งหมด" /><Metric label="ค้างชำระ" value={summary?.overdueContracts ?? 0} note="ต้องติดตาม" tone="bad" /><Metric label="จ่ายครบ" value={summary?.paidOffContracts ?? 0} note="พร้อม release/โอน" tone="good" /><Metric label="รายรับ" value={baht(summary?.confirmedRevenue ?? 0)} note="confirmed" tone="good" /><Metric label="รอโอนกรรมสิทธิ์" value={summary?.transferPendingContracts ?? 0} note="release แล้ว/กำลังรอ" tone="warn" /></div></div><div className="card" style={{ gridColumn: "1 / -1" }}><h2>เอกสารก่อนใช้จริง</h2><div className="grid cols-3"><Checklist title="สัญญา" items={["ให้ทนายตรวจเทมเพลต", "ระบุเงื่อนไขค้างชำระ", "ระบุการปลดเมื่อจ่ายครบ"]} /><Checklist title="การเงิน" items={["เปิดบัญชีร้าน", "ต่อ payment gateway", "เก็บใบเสร็จ/ภาษี"]} /><Checklist title="ข้อมูลส่วนบุคคล" items={["ทำ privacy notice", "กำหนด retention", "จำกัดสิทธิ์พนักงาน"]} /></div></div></div>;
}

function ReadinessPanel({ readiness }: { readiness: Readiness | null }) {
  return <div className="grid"><div className="card"><h2>Production Readiness</h2><p className="muted">นี่คือหน้างานที่ผมทำไม่ได้แทนจากในไฟล์ เพราะมันต้องใช้บัญชีจริง ผู้ให้บริการจริง และการตัดสินใจธุรกิจจริง น่าเสียดายที่ยังไม่มี API สำหรับขอใบอนุญาตแทนมนุษย์</p><div className="grid cols-4"><Metric label="API" value={readiness?.status ?? "unknown"} note="/ops/readiness" tone={readiness?.status === "ready" ? "good" : "warn"} /><Metric label="Database" value={readiness?.database ?? "unknown"} note="Prisma connection" tone={readiness?.database === "ok" ? "good" : "warn"} /><Metric label="Device Provider" value={readiness?.deviceControlProvider ?? "local"} note="android/apple/dual = โหมดจริง" tone={String(readiness?.deviceControlProvider).includes("dual") || String(readiness?.deviceControlProvider).includes("android") || String(readiness?.deviceControlProvider).includes("apple") ? "good" : "warn"} /><Metric label="Last Check" value={readiness ? new Date(readiness.now).toLocaleTimeString("th-TH") : "-"} note="เวลาตรวจล่าสุด" /></div></div><div className="grid cols-2"><Checklist title="1) Server/Domain" items={["ซื้อ VPS หรือใช้ Render/Fly/Railway", "ตั้ง domain admin/customer/api", "ตั้ง HTTPS ด้วย Caddy/Nginx", "ตั้ง CRON เรียก /jobs/overdue-check/cron"]} /><Checklist title="2) Payment" items={["เลือก gateway: Omise/Stripe/2C2P/โอน+PromptPay", "ตั้ง webhook secret", "ต่อ slip upload ไป S3/R2", "ทำหน้า receipt/ใบเสร็จ"]} /><Checklist title="3) Notification" items={["เปิด LINE Messaging API", "ต่อ SMS provider", "ทำ template แจ้งเตือนก่อน/หลังครบกำหนด", "ทำ unsubscribe/ช่องทางติดต่อกลับ"]} /><Checklist title="4) Device Control" items={["ใช้ provider/OEM ที่อนุญาต device finance", "เก็บ consent ก่อนส่งมอบ", "เปิด dry-run ทดสอบก่อน", "ใช้เฉพาะเครื่องที่ร้านถือกรรมสิทธิ์และลูกค้าเซ็น consent ชัดเจน"]} /><Checklist title="5) Security" items={["ตั้ง ADMIN_EMAIL/ADMIN_PASSWORD ด้วย bootstrap:prod", "ตั้ง JWT_SECRET ยาวมาก", "เปิด 2FA ภายหลัง", "จำกัด role พนักงาน", "backup database ทุกวัน"]} /><Checklist title="6) Legal/Ops" items={["ให้ทนายตรวจสัญญา", "ทำ PDPA notice", "กำหนดขั้นตอนติดตามหนี้", "อบรมพนักงานก่อนใช้งาน", "ทดสอบเคสจ่ายครบแล้ว release"]} /></div></div>;
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return <div className="card"><h3>{title}</h3><div className="timeline">{items.map((item) => <div className="timeline-item" key={item}><span className="dot" /><div>{item}</div></div>)}</div></div>;
}

function AuditLogs({ logs }: { logs: AuditLog[] }) {
  return <div className="card"><h2>Audit Log ล่าสุด</h2><p className="small">หลักฐานว่าใครทำอะไรกับระบบ สำคัญกว่าที่มนุษย์ชอบคิดจนกว่าจะมีเรื่อง</p><div className="table-wrap"><table className="table"><thead><tr><th>เวลา</th><th>ผู้ทำ</th><th>Action</th><th>Target</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString("th-TH")}</td><td>{log.actor?.name ?? "System"}<div className="small">{log.actor?.email ?? "-"}</div></td><td><StatusBadge status={log.action} /></td><td>{log.targetType}<div className="small">{log.targetId}</div></td></tr>)}</tbody></table></div></div>;
}
