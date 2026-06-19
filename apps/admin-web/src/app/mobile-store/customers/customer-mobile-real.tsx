"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "../../auth-client";

type Row = Record<string, any>;
type CustomerForm = { fullName: string; phone: string; email: string; address: string; riskScore: string };

const menu = [
  { href: "/mobile-store", label: "หน้าหลัก", icon: "⌂" },
  { href: "/mobile-store/customers", label: "ลูกค้า", icon: "♙" },
  { href: "/devices", label: "คลังเครื่อง", icon: "▣" },
  { href: "/contracts", label: "สัญญา", icon: "▤" },
  { href: "/payments", label: "ชำระเงิน", icon: "฿" },
  { href: "/collection", label: "ติดตามงวด", icon: "◎" },
  { href: "/devices", label: "MDM", icon: "🛡" },
  { href: "/collection", label: "รายงาน", icon: "▥" },
  { href: "/mobile-store", label: "ตั้งค่า", icon: "⚙" },
];

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readSessionToken();
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) throw new Error(json?.error?.message || `API ${path} failed`);
  return (json?.data ?? json) as T;
}

function safeArray(value: any): Row[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.customers)) return value.customers;
  return [];
}

function displayName(customer: Row) {
  return customer.fullName || customer.name || customer.customerName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "ไม่ระบุชื่อ";
}

function phoneOf(customer: Row) {
  return customer.phone || customer.mobile || customer.tel || customer.phoneNumber || "-";
}

function contractsFor(customer: Row, contracts: Row[]) {
  const id = String(customer.id || customer.customerId || "");
  return contracts.filter((contract) => String(contract.customerId || contract.customer?.id || "") === id);
}

function outstandingFor(customer: Row, contracts: Row[]) {
  return contractsFor(customer, contracts).reduce((sum, contract) => {
    if (String(contract.status || "").toUpperCase().includes("OVERDUE")) return sum + Number(contract.overdueAmount || contract.balanceDue || contract.monthlyAmount || 0);
    const items = Array.isArray(contract.installments) ? contract.installments : [];
    return sum + items.filter((item: Row) => ["OVERDUE", "DUE", "PENDING"].includes(String(item.status || "").toUpperCase())).reduce((total: number, item: Row) => total + Number(item.amount || 0), 0);
  }, 0);
}

function riskOf(customer: Row, contracts: Row[]) {
  const outstanding = outstandingFor(customer, contracts);
  const score = Number(customer.riskScore ?? customer.creditRisk ?? 0);
  const raw = String(customer.riskLevel || customer.risk || customer.status || "").toUpperCase();
  if (raw.includes("HIGH") || raw.includes("DELINQUENT") || score >= 70 || outstanding >= 3000) return { label: "ค้างชำระ", risk: "สูง", tone: "bad" };
  if (raw.includes("MEDIUM") || raw.includes("WATCH") || score >= 35 || outstanding > 0) return { label: "เฝ้าระวัง", risk: "ปานกลาง", tone: "warn" };
  return { label: "ปกติ", risk: "ต่ำ", tone: "good" };
}

function DeviceSwitch({ current }: { current: "desktop" | "mobile" }) {
  return <nav className="koga-device-switch ms-device-switch" aria-label="เลือกหน้าจอ"><Link href="/customers" className={current === "desktop" ? "active" : ""}>Desktop</Link><Link href="/mobile-store/customers" className={current === "mobile" ? "active" : ""}>Mobile</Link></nav>;
}

function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`kc-chip ${tone}`}>{children}</span>;
}

export default function CustomerMobileRealPage() {
  const [customers, setCustomers] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomerForm>({ fullName: "", phone: "", email: "", address: "", riskScore: "0" });
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    const [customerResult, contractResult] = await Promise.allSettled([apiJson<Row[]>("/customers"), apiJson<Row[]>("/contracts")]);
    if (customerResult.status === "fulfilled") setCustomers(safeArray(customerResult.value));
    if (contractResult.status === "fulfilled") setContracts(safeArray(contractResult.value));
    const failed = [customerResult, contractResult].find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "เชื่อมต่อ API ไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const decorated = useMemo(() => customers.map((customer) => ({ customer, contracts: contractsFor(customer, contracts), risk: riskOf(customer, contracts), outstanding: outstandingFor(customer, contracts) })), [customers, contracts]);
  const filtered = useMemo(() => decorated.filter((item) => {
    const haystack = `${displayName(item.customer)} ${phoneOf(item.customer)} ${item.customer.email || ""} ${item.customer.cardId || item.customer.idCard || ""}`.toLowerCase();
    const matchesSearch = haystack.includes(query.trim().toLowerCase());
    const matchesFilter = filter === "all" || item.risk.tone === filter;
    return matchesSearch && matchesFilter;
  }), [decorated, query, filter]);

  async function logout() {
    await logoutFromApi();
    window.location.assign("/login");
  }

  async function createCustomer(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiJson("/customers", { method: "POST", body: JSON.stringify({ ...form, riskScore: Number(form.riskScore || 0) }) });
      setForm({ fullName: "", phone: "", email: "", address: "", riskScore: "0" });
      setShowCreate(false);
      await load();
    } catch (err: any) {
      setError(err?.message || "เพิ่มลูกค้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiJson("/customers/import", { method: "POST", body: formData });
      await load();
    } catch (err: any) {
      setError(err?.message || "นำเข้าลูกค้าไม่สำเร็จ API อาจยังไม่มี /customers/import");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  return (
    <main className="kcm-page">
      {menuOpen ? <button className="ms-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`ms-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="ms-drawer-head"><div className="ms-logo">K</div><div><b>KOGA Lease MDM</b><span>Mobile Store</span></div><button aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)}>×</button></div>
        <DeviceSwitch current="mobile" />
        <nav>{menu.map((item, index) => <Link key={`${item.href}-${index}`} href={item.href} className={item.href === "/mobile-store/customers" ? "active" : ""} onClick={() => setMenuOpen(false)}><i>{item.icon}</i><span>{item.label}</span></Link>)}</nav>
        <div className="ms-drawer-status"><b>{error ? "API error" : "API live"}</b><span>{API_BASE}</span></div>
        <button className="ms-logout" onClick={logout}>ออกจากระบบ</button>
      </aside>

      <header className="kcm-top"><button aria-label="เปิดเมนู" onClick={() => setMenuOpen(true)}>☰</button><h1><span>KOGA</span> Lease MDM</h1><button aria-label="รีเฟรชข้อมูล" onClick={load}>↻</button></header>
      <DeviceSwitch current="mobile" />
      <section className="kcm-title"><h2>ลูกค้า</h2><button onClick={() => setFilter(filter === "all" ? "bad" : "all")}>▽ ตัวกรอง</button></section>
      <label className="kcm-search">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, เลขบัตร"/></label>
      {filter !== "all" ? <div className="kcm-filter-panel"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">ทั้งหมด</option><option value="good">ปกติ / ความเสี่ยงต่ำ</option><option value="warn">เฝ้าระวัง</option><option value="bad">ค้างชำระ / เสี่ยงสูง</option></select></div> : null}
      {error ? <section className="ms-error"><b>ระบบยังไม่พร้อม</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></section> : null}
      <section className="kcm-list">{filtered.slice(0, 8).map((item) => <article className="kcm-card" key={item.customer.id || displayName(item.customer)}><div className="kcm-avatar">{displayName(item.customer).slice(0, 1)}</div><div className="kcm-info"><b>{displayName(item.customer)}</b><span>{phoneOf(item.customer)}</span><em>สัญญา {item.contracts.length} สัญญา | ยอดค้างชำระ: <strong>{item.outstanding.toLocaleString("th-TH")}</strong> บาท</em></div><div className="kcm-risk"><span>สถานะ</span><Chip tone={item.risk.tone}>{item.risk.label}</Chip><span>ความเสี่ยง</span><b className={item.risk.tone}>{item.risk.risk}</b></div></article>)}{!filtered.length ? <div className="kcm-empty">ไม่พบลูกค้าที่ตรงกับเงื่อนไข</div> : null}</section>
      <input ref={fileRef} hidden type="file" accept=".csv,.xlsx,.xls" onChange={importFile}/>
      <button className="kcm-fab" onClick={() => setShowCreate(true)}>+</button>
      {showCreate ? <div className="kc-modal"><form onSubmit={createCustomer}><button type="button" onClick={() => setShowCreate(false)}>×</button><h2>เพิ่มลูกค้า</h2><label>ชื่อ-นามสกุล<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })}/></label><label>เบอร์โทร<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label><label>อีเมล<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label><label>ที่อยู่<textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })}/></label><label>Risk score<input type="number" min="0" max="100" value={form.riskScore} onChange={(event) => setForm({ ...form, riskScore: event.target.value })}/></label><button className="primary" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกลูกค้า"}</button><button type="button" onClick={() => fileRef.current?.click()}>นำเข้าจากไฟล์</button></form></div> : null}
      {loading ? <div className="ms-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
