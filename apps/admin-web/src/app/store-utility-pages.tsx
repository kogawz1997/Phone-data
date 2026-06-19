"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "./auth-client";

type Row = Record<string, any>;
type Mode = "desktop" | "mobile";
type UtilityPage = "integrations" | "ledger" | "signup" | "onboarding" | "access";

const desktopNav = [
  ["/", "⌂", "หน้าหลัก"],
  ["/customers", "♙", "ลูกค้า"],
  ["/devices", "▣", "เครื่อง"],
  ["/contracts", "▤", "สัญญา"],
  ["/payments", "◉", "ชำระเงิน"],
  ["/collection", "◎", "ติดตามงาน"],
  ["/integrations", "◆", "เชื่อมต่อ"],
  ["/ledger", "฿", "บัญชีร้าน"],
  ["/onboarding", "✓", "ตั้งค่าสาขา"],
  ["/customer-access", "♙", "Customer Access"],
  ["/reports", "⌁", "รายงาน"],
  ["/settings", "⚙", "ตั้งค่า"],
  ["/users", "♙", "ผู้ใช้ & สิทธิ์"],
] as const;

const mobileNav = [
  ["/mobile-store", "⌂", "หน้าหลัก"],
  ["/mobile-store/customers", "♙", "ลูกค้า"],
  ["/mobile-store/devices", "▣", "คลังเครื่อง"],
  ["/mobile-store/contracts", "▤", "สัญญา"],
  ["/mobile-store/payments", "฿", "ชำระเงิน"],
  ["/mobile-store/collection", "◎", "ติดตามงวด"],
  ["/mobile-store/integrations", "◆", "เชื่อมต่อ"],
  ["/mobile-store/ledger", "฿", "บัญชีร้าน"],
  ["/mobile-store/onboarding", "✓", "ตั้งค่าสาขา"],
  ["/mobile-store/customer-access", "♙", "Customer Access"],
  ["/mobile-store/reports", "⌁", "รายงาน"],
] as const;

const pageTitle: Record<UtilityPage, string> = {
  integrations: "การเชื่อมต่อบริการ",
  ledger: "สมุดบัญชีร้านค้า",
  signup: "สมัครร้านใหม่",
  onboarding: "การตั้งค่าร้านค้า",
  access: "การเข้าถึงลูกค้า",
};

const pageDesc: Record<UtilityPage, string> = {
  integrations: "จัดการการเชื่อมต่อบริการภายนอกและสถานะการใช้งาน",
  ledger: "ภาพรวมบัญชีร้าน รายรับ รายจ่าย และธุรกรรมล่าสุด",
  signup: "ลงทะเบียนร้านค้าใหม่และสร้างบัญชีเจ้าของร้าน",
  onboarding: "ตั้งค่าร้านค้าและเชื่อมต่อระบบงานพื้นฐาน",
  access: "จัดการผู้ใช้งานและสิทธิ์การเข้าถึง Customer Portal",
};

const desktopPath: Record<UtilityPage, string> = {
  integrations: "/integrations",
  ledger: "/ledger",
  signup: "/store-signup",
  onboarding: "/onboarding",
  access: "/customer-access",
};

const mobilePath: Record<UtilityPage, string> = {
  integrations: "/mobile-store/integrations",
  ledger: "/mobile-store/ledger",
  signup: "/mobile-store/store-signup",
  onboarding: "/mobile-store/onboarding",
  access: "/mobile-store/customer-access",
};

function toRows(value: any): Row[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.users)) return value.users;
  if (Array.isArray(value?.integrations)) return value.integrations;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readSessionToken();
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) throw new Error(json?.error?.message || `API ${path} failed`);
  return (json?.data ?? json) as T;
}

function money(value: any) {
  return `฿${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function dateTime(value: any) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rowKey(row: Row, fallback = 0) {
  return String(row.id || row.provider || row.email || row.stepKey || fallback);
}

function providerName(row: Row) {
  return row.displayName || row.name || String(row.provider || "บริการ");
}

function providerIcon(row: Row) {
  const value = String(row.provider || row.displayName || "").toUpperCase();
  if (value.includes("ANDROID")) return "🤖";
  if (value.includes("APPLE")) return "";
  if (value.includes("BANK") || value.includes("PAY") || value.includes("PROMPT")) return "🏦";
  if (value.includes("LINE")) return "LINE";
  if (value.includes("DRIVE") || value.includes("STORAGE") || value.includes("S3")) return "▲";
  return "◆";
}

function chipTone(status: any) {
  const value = String(status || "ACTIVE").toUpperCase();
  if (value.includes("ACTIVE") || value.includes("DONE") || value.includes("CONNECTED")) return "good";
  if (value.includes("PENDING") || value.includes("SETUP") || value.includes("WAIT") || value.includes("DEGRADED")) return "warn";
  if (value.includes("FAIL") || value.includes("DISABLE") || value.includes("REJECT")) return "bad";
  return "info";
}

function chipLabel(status: any) {
  const value = String(status || "ACTIVE").toUpperCase();
  if (value.includes("ACTIVE")) return "เชื่อมต่อแล้ว";
  if (value.includes("DONE")) return "เสร็จสิ้น";
  if (value.includes("PENDING") || value.includes("WAIT")) return "รอดำเนินการ";
  if (value.includes("SETUP") || value.includes("DEGRADED")) return "เชื่อมต่ออยู่";
  if (value.includes("DISABLE")) return "ปิดใช้งาน";
  if (value.includes("FAIL")) return "Failed";
  return String(status || "Active");
}

function Chip({ children, tone = "info" }: { children: ReactNode; tone?: string }) {
  return <span className={`live-chip ${tone}`}>{children}</span>;
}

function DeviceSwitch({ page, mode }: { page: UtilityPage; mode: Mode }) {
  return (
    <nav className="koga-device-switch">
      <Link href={desktopPath[page]} className={mode === "desktop" ? "active" : ""}>Desktop</Link>
      <Link href={mobilePath[page]} className={mode === "mobile" ? "active" : ""}>Mobile</Link>
    </nav>
  );
}

async function logout() {
  await logoutFromApi();
  window.location.assign("/login");
}

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="live-sidebar">
      <div className="live-brand"><div className="live-logo">K</div><div><b>KOGA Lease MDM</b><span>Store OS</span></div></div>
      <nav>
        {desktopNav.map(([href, icon, label]) => (
          <Link key={href} href={href} className={href === active ? "active" : ""}><i>{icon}</i><span>{label}</span></Link>
        ))}
      </nav>
      <div className="live-side-bottom"><b>KOGA Store</b><small>สาขา รัตนาธิเบศร์</small><button className="live-btn small" onClick={logout}>ออกจากระบบ</button></div>
    </aside>
  );
}

function MobileDrawer({ open, setOpen, active }: { open: boolean; setOpen: (value: boolean) => void; active: string }) {
  return (
    <>
      {open ? <button className="ms-backdrop" onClick={() => setOpen(false)} /> : null}
      <aside className={`ms-drawer ${open ? "open" : ""}`}>
        <div className="ms-drawer-head"><div className="ms-logo">K</div><div><b>KOGA Lease MDM</b><span>Mobile Store</span></div><button onClick={() => setOpen(false)}>×</button></div>
        <nav>
          {mobileNav.map(([href, icon, label]) => (
            <Link key={href} href={href} className={href === active ? "active" : ""} onClick={() => setOpen(false)}><i>{icon}</i><span>{label}</span></Link>
          ))}
        </nav>
        <div className="ms-drawer-status"><b>API live</b><span>{API_BASE}</span></div>
        <button className="ms-logout" onClick={logout}>ออกจากระบบ</button>
      </aside>
    </>
  );
}

function Shell({ mode, page, children }: { mode: Mode; page: UtilityPage; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const active = mode === "desktop" ? desktopPath[page] : mobilePath[page];

  if (mode === "mobile") {
    return (
      <main className="live-mobile">
        <MobileDrawer open={open} setOpen={setOpen} active={active} />
        <header className="live-mobile-head"><button onClick={() => setOpen(true)}>☰</button><div className="live-mobile-brand"><b><span>KOGA</span> Lease MDM</b></div><button onClick={() => location.reload()}>↻</button></header>
        <DeviceSwitch page={page} mode={mode} />
        <section className="live-mobile-title"><p>{page}</p><h1>{pageTitle[page]}</h1></section>
        <section className="live-mobile-content">{children}</section>
      </main>
    );
  }

  return (
    <main className="live-app">
      <Sidebar active={active} />
      <section className="live-main">
        <div className="live-top">
          <div><p><Link href="/">หน้าหลัก</Link> / {pageTitle[page]}</p><h1>{pageTitle[page]}</h1><span style={{ color: "#cbd5e1" }}>{pageDesc[page]}</span></div>
          <div className="live-top-actions"><DeviceSwitch page={page} mode={mode} /></div>
        </div>
        <section className="live-content">{children}</section>
      </section>
    </main>
  );
}

function Alert({ error }: { error: string }) {
  if (!error) return null;
  return <div className="live-alert bad"><b>ระบบแจ้งเตือน</b><span>{error}</span><Link href="/login" className="live-btn small">เข้าสู่ระบบ</Link></div>;
}

export function IntegrationsPage({ mode }: { mode: Mode }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    try { setRows(toRows(await api<any>("/integrations"))); }
    catch (err: any) { setError(err?.message || "โหลดข้อมูลการเชื่อมต่อไม่สำเร็จ"); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const keyword = query.toLowerCase().trim();
    return rows.filter((row) => `${providerName(row)} ${row.provider} ${row.category}`.toLowerCase().includes(keyword));
  }, [rows, query]);

  async function toggle(row: Row) {
    try {
      await api(`/integrations/${row.id}`, { method: "PATCH", body: JSON.stringify({ status: chipTone(row.status) === "good" ? "DISABLED" : "ACTIVE" }) });
      await load();
    } catch (err: any) { setError(err?.message || "อัปเดตการเชื่อมต่อไม่สำเร็จ"); }
  }

  return (
    <Shell mode={mode} page="integrations">
      <Alert error={error} />
      {mode === "desktop" ? (
        <>
          <div className="live-top-actions" style={{ justifyContent: "space-between" }}><input className="live-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาบริการ" /><button className="live-btn primary" onClick={load}>เริ่มการเชื่อมต่อ</button></div>
          <section className="live-panel">
            <div className="live-panel-head"><h2>บริการที่เชื่อมต่อ</h2><Chip tone="info">{String(filtered.length)} รายการ</Chip></div>
            <table className="live-table"><thead><tr><th>บริการ</th><th>หมวดหมู่</th><th>สถานะ</th><th>อัปเดตล่าสุด</th><th /></tr></thead><tbody>{filtered.map((row, index) => <tr key={rowKey(row, index)}><td><b>{providerIcon(row)} {providerName(row)}</b><small>{row.provider}</small></td><td>{row.category || "Integration"}</td><td><Chip tone={chipTone(row.status)}>{chipLabel(row.status)}</Chip></td><td>{dateTime(row.lastCheckedAt || row.updatedAt)}</td><td><button className="live-btn small" onClick={() => toggle(row)}>{chipTone(row.status) === "good" ? "ปิด" : "เชื่อมต่อ"}</button></td></tr>)}</tbody></table>
            {!filtered.length ? <div className="live-empty"><b>ยังไม่มีข้อมูลการเชื่อมต่อ</b><span>ระบบจะแสดงข้อมูลจริงจาก API /integrations</span></div> : null}
          </section>
        </>
      ) : (
        <>
          <div className="live-panel"><div className="live-panel-head"><h2>หมวดบริการ</h2></div><div className="pill-list"><button className="live-btn small">MDM</button><button className="live-btn small">Payment</button><button className="live-btn small">Notification</button><button className="live-btn small">Storage</button><button className="live-btn small">Automation</button></div></div>
          {filtered.map((row, index) => <article className="live-panel" key={rowKey(row, index)}><div className="live-mini-row"><div><b>{providerIcon(row)} {providerName(row)}</b><span>{row.provider}</span></div><Chip tone={chipTone(row.status)}>{chipLabel(row.status)}</Chip></div><button className="live-btn" onClick={() => toggle(row)}>{chipTone(row.status) === "good" ? "ปิดใช้งาน" : "เชื่อมต่อ"} ›</button></article>)}
          {!filtered.length ? <div className="live-empty"><b>ไม่พบข้อมูลจริง</b><span>เช็ก API /integrations</span></div> : null}
        </>
      )}
      {loading ? <div className="live-alert">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </Shell>
  );
}

export function LedgerPage({ mode }: { mode: Mode }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    try { setRows(toRows(await api<any>("/store/ledger"))); }
    catch (err: any) { setError(err?.message || "โหลดสมุดบัญชีไม่สำเร็จ"); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const income = rows.filter((row) => Number(row.amount) > 0).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expense = Math.abs(rows.filter((row) => Number(row.amount) < 0).reduce((sum, row) => sum + Number(row.amount || 0), 0));
  const balance = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const latest = rows.slice(0, 8);

  return (
    <Shell mode={mode} page="ledger">
      <Alert error={error} />
      <section className="live-stats-grid"><article className="live-stat"><span>ยอดคงเหลือ</span><strong>{money(balance)}</strong><small>THB</small></article><article className="live-stat good"><span>รายรับรวม</span><strong>{money(income)}</strong><small>จากข้อมูลจริง</small></article><article className="live-stat bad"><span>รายจ่ายรวม</span><strong>{money(expense)}</strong><small>จากข้อมูลจริง</small></article><article className="live-stat"><span>ธุรกรรม</span><strong>{rows.length}</strong><small>รายการ</small></article></section>
      <section className={mode === "desktop" ? "live-grid-3" : "live-stack"}>
        <article className="live-panel" style={{ gridColumn: mode === "desktop" ? "span 2" : undefined }}><div className="live-panel-head"><h2>รายการล่าสุด</h2><button className="live-btn small" onClick={load}>รีเฟรช</button></div><table className="live-table"><thead><tr><th>วันที่</th><th>รายการ</th><th>ยอด</th><th>สถานะ</th></tr></thead><tbody>{latest.map((row, index) => <tr key={rowKey(row, index)}><td>{dateTime(row.createdAt)}</td><td><b>{row.description || row.type || "รายการบัญชี"}</b><small>{row.paymentRequest?.contract?.contractNo || row.refNo || "-"}</small></td><td style={{ color: Number(row.amount) >= 0 ? "#22c55e" : "#ef4444" }}>{money(row.amount)}</td><td><Chip tone="good">สำเร็จ</Chip></td></tr>)}</tbody></table>{!latest.length ? <div className="live-empty"><b>ยังไม่มีธุรกรรมจริง</b><span>ระบบอ่านจาก API /store/ledger</span></div> : null}</article>
        <article className="live-panel"><h2>สรุปการชำระหนี้</h2><div className="live-task"><span>รอรับชำระ</span><b>{money(Math.max(balance, 0))}</b></div><div className="live-task"><span>ค่าใช้จ่าย</span><b>{money(expense)}</b></div><div className="live-task"><span>รับเงินแล้ว</span><b>{money(income)}</b></div></article>
      </section>
      {loading ? <div className="live-alert">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </Shell>
  );
}

export function StoreSignupPage({ mode }: { mode: Mode }) {
  const [form, setForm] = useState({ storeName: "", ownerName: "", email: "", password: "", phone: "", taxId: "", address: "", plan: "PRO" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<any>("/public/store-signup", { method: "POST", body: JSON.stringify(form) });
      setMessage(result?.message || "สมัครร้านสำเร็จ");
    } catch (err: any) { setError(err?.message || "สมัครร้านไม่สำเร็จ"); }
    setBusy(false);
  }

  const plans = [["STARTER", "Starter", "ฟรี"], ["STANDARD", "Standard", "990"], ["PRO", "Pro", "2,490"], ["ENTERPRISE", "Enterprise", "ติดต่อเรา"]] as const;

  return (
    <Shell mode={mode} page="signup">
      <Alert error={error} />
      {message ? <div className="live-alert"><b>สำเร็จ</b><span>{message}</span><Link className="live-btn small" href="/login">เข้าสู่ระบบ</Link></div> : null}
      <form onSubmit={submit} className="live-two-col">
        <section className="live-panel"><div className="live-panel-head"><h2>ข้อมูลร้านค้า</h2><Chip tone="info">ขั้นตอน 1</Chip></div><div className="live-form"><label className="live-field"><span>ชื่อร้านค้า</span><input value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} required placeholder="บริษัท ดีไวซ์ โซลูชัน จำกัด" /></label><label className="live-field"><span>ชื่อเจ้าของร้าน</span><input value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} required placeholder="คุณอนนท์" /></label><label className="live-field"><span>อีเมล</span><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required type="email" placeholder="contact@device-solution.co.th" /></label><label className="live-field"><span>รหัสผ่าน</span><input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" minLength={8} /></label><label className="live-field"><span>เบอร์โทรศัพท์</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="081-234-5678" /></label><label className="live-field"><span>เลขประจำตัวผู้เสียภาษี</span><input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} /></label></div></section>
        <section className="live-panel"><h2>เลือกแพ็กเกจ</h2><div className="live-stats-grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>{plans.map(([id, name, price]) => <button type="button" key={id} className="live-stat" style={{ borderColor: form.plan === id ? "#1677ff" : "rgba(148,163,184,.18)", textAlign: "left" }} onClick={() => setForm({ ...form, plan: id })}><span>{name}</span><strong>{price}</strong><small>บาท/เดือน</small></button>)}</div><label className="live-field" style={{ marginTop: 12 }}><span>ที่อยู่ร้านค้า</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><button className="live-btn primary" disabled={busy} style={{ width: "100%", marginTop: 16 }}>{busy ? "กำลังสร้างร้าน..." : "ถัดไป"}</button></section>
      </form>
    </Shell>
  );
}

export function OnboardingPage({ mode }: { mode: Mode }) {
  const [steps, setSteps] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Row>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("KBank Smart Pay");

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    const result = await Promise.allSettled([api<any>("/store/onboarding"), api<any>("/store/portal-settings")]);
    if (result[0].status === "fulfilled") setSteps(toRows(result[0].value));
    if (result[1].status === "fulfilled") setSettings(result[1].value as Row);
    const failed = result.find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "โหลดการตั้งค่าไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function complete(step: Row) {
    try { await api(`/store/onboarding/${step.stepKey || step.key}`, { method: "PATCH", body: JSON.stringify({ status: "DONE" }) }); await load(); }
    catch (err: any) { setError(err?.message || "บันทึกขั้นตอนไม่สำเร็จ"); }
  }

  async function save() {
    try { await api("/store/portal-settings", { method: "PUT", body: JSON.stringify({ ...settings, qrPaymentEnabled: "true", paymentProvider: provider }) }); setError(""); }
    catch (err: any) { setError(err?.message || "บันทึกการตั้งค่าไม่สำเร็จ"); }
  }

  const shown = steps.length ? steps : [
    { stepKey: "profile", title: "ข้อมูลร้านค้า", status: "DONE" },
    { stepKey: "payment", title: "ตั้งค่าการชำระเงิน", status: "PENDING" },
    { stepKey: "service", title: "เชื่อมต่อบริการ", status: "PENDING" },
    { stepKey: "fee", title: "ค่าธรรมเนียม", status: "PENDING" },
  ];

  return (
    <Shell mode={mode} page="onboarding">
      <Alert error={error} />
      <section className="live-two-col"><article className="live-panel"><h2>ขั้นตอนตั้งค่าร้านค้า</h2><div className="timeline">{shown.map((step, index) => <button className="live-task" key={rowKey(step, index)} onClick={() => complete(step)}><span>{index + 1}. {step.title || step.stepKey}</span><Chip tone={chipTone(step.status)}>{chipLabel(step.status)}</Chip></button>)}</div></article><article className="live-panel"><h2>ตั้งค่าการรับชำระเงิน</h2><div className="live-grid-3" style={{ gridTemplateColumns: mode === "desktop" ? "1fr 1fr" : "1fr" }}><button className="live-panel" style={{ borderColor: provider.includes("KBank") ? "#1677ff" : "rgba(148,163,184,.18)" }} onClick={() => setProvider("KBank Smart Pay")}><b>🏦 KBank Smart Pay</b><p>QR พร้อมเพย์</p></button><button className="live-panel" style={{ borderColor: provider.includes("Prompt") ? "#1677ff" : "rgba(148,163,184,.18)" }} onClick={() => setProvider("PromptPay")}><b>▣ PromptPay</b><p>พร้อมเพย์</p></button></div><div className="live-form" style={{ marginTop: 12 }}><label className="live-field"><span>ค่าธรรมเนียม (%)</span><input value={String(settings.processingFee || "1.75")} onChange={(event) => setSettings({ ...settings, processingFee: event.target.value })} /></label><label className="live-field"><span>รูปแบบการเก็บเงิน</span><select value={String(settings.billingMode || "ร้านค้าเป็นผู้ชำระ")} onChange={(event) => setSettings({ ...settings, billingMode: event.target.value })}><option>ร้านค้าเป็นผู้ชำระ</option><option>ผลักภาระให้ลูกค้า</option></select></label><button className="live-btn primary" onClick={save}>บันทึกและถัดไป</button></div></article></section>
      {loading ? <div className="live-alert">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </Shell>
  );
}

export function CustomerAccessPage({ mode }: { mode: Mode }) {
  const [users, setUsers] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Row>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    const result = await Promise.allSettled([api<any>("/store/users"), api<any>("/store/portal-settings")]);
    if (result[0].status === "fulfilled") setUsers(toRows(result[0].value));
    if (result[1].status === "fulfilled") setSettings(result[1].value as Row);
    const failed = result.find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "โหลดผู้ใช้ไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveSettings() {
    try { await api("/store/portal-settings", { method: "PUT", body: JSON.stringify(settings) }); await load(); }
    catch (err: any) { setError(err?.message || "บันทึกการตั้งค่า PIN ไม่สำเร็จ"); }
  }

  const active = users.filter((user) => String(user.status || "ACTIVE").toUpperCase() !== "DISABLED");

  return (
    <Shell mode={mode} page="access">
      <Alert error={error} />
      <section className="live-stats-grid"><article className="live-stat"><span>ผู้ใช้ทั้งหมด</span><strong>{users.length}</strong><small>คน</small></article><article className="live-stat good"><span>ใช้งานอยู่</span><strong>{active.length}</strong><small>คน</small></article><article className="live-stat warn"><span>รอเชิญ</span><strong>0</strong><small>คน</small></article><article className="live-stat"><span>PIN</span><strong>{String(settings.twoFactorEnabled) === "true" ? "เปิด" : "ปิด"}</strong><small>ยืนยันตัวตน</small></article></section>
      <section className="live-two-col"><article className="live-panel"><div className="live-panel-head"><h2>รายชื่อผู้ใช้งาน</h2><button className="live-btn primary" onClick={load}>รีเฟรช</button></div><table className="live-table"><thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>เข้าล่าสุด</th></tr></thead><tbody>{users.map((user, index) => <tr key={rowKey(user, index)}><td><b>{user.name || user.email}</b><small>{user.email}</small></td><td>{user.role || "STAFF"}</td><td><Chip tone={chipTone(user.status || "ACTIVE")}>{chipLabel(user.status || "ACTIVE")}</Chip></td><td>{dateTime(user.lastLoginAt || user.updatedAt)}</td></tr>)}</tbody></table>{!users.length ? <div className="live-empty"><b>ไม่พบผู้ใช้จริง</b><span>ระบบอ่านจาก API /store/users</span></div> : null}</article><article className="live-panel"><h2>ตั้งค่า PIN สำหรับ Customer Portal</h2><label className="live-field"><span>เปิดใช้งาน PIN</span><select value={String(settings.twoFactorEnabled || "false")} onChange={(event) => setSettings({ ...settings, twoFactorEnabled: event.target.value })}><option value="true">เปิดใช้งาน</option><option value="false">ปิดใช้งาน</option></select></label><label className="live-field"><span>รูปแบบ PIN</span><select value={String(settings.pinMode || "PIN 6 หลัก")} onChange={(event) => setSettings({ ...settings, pinMode: event.target.value })}><option>PIN 6 หลัก</option><option>PIN 4 หลัก</option></select></label><button className="live-btn primary" onClick={saveSettings}>บันทึกการตั้งค่า</button></article></section>
      {loading ? <div className="live-alert">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </Shell>
  );
}
