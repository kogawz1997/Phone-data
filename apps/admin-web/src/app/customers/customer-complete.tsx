"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "../auth-client";

type Row = Record<string, any>;
type CustomerForm = { fullName: string; phone: string; email: string; address: string; riskScore: string };

type CustomerView = {
  customer: Row;
  ownContracts: Row[];
  outstanding: number;
  status: { label: string; th: string; tone: string };
  risk: { label: string; th: string; tone: string };
};

const nav = [
  ["/", "⌂", "หน้าหลัก"],
  ["/customers", "♙", "ลูกค้า"],
  ["/devices", "▣", "อุปกรณ์"],
  ["/contracts", "▤", "สัญญา"],
  ["/payments", "◉", "การชำระเงิน"],
  ["/collection", "◎", "ติดตามทวงถาม"],
  ["/reports", "⌁", "รายงาน"],
  ["/settings", "⚙", "ตั้งค่า"],
] as const;

function readArray(value: any): Row[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.customers)) return value.customers;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

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

function displayName(customer: Row) {
  return customer.fullName || customer.name || customer.customerName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "ไม่ระบุชื่อ";
}

function phoneOf(customer: Row) {
  return customer.phone || customer.mobile || customer.tel || customer.phoneNumber || "-";
}

function updatedAt(customer: Row) {
  const value = customer.updatedAt || customer.createdAt || customer.lastActivityAt;
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function contractsFor(customer: Row, contracts: Row[]) {
  const id = String(customer.id || customer.customerId || "");
  const phone = phoneOf(customer);
  return contracts.filter((contract) => {
    const contractCustomerId = String(contract.customerId || contract.customer?.id || "");
    const contractPhone = contract.customer?.phone || contract.customerPhone || "";
    return contractCustomerId === id || (!!phone && phone !== "-" && contractPhone === phone);
  });
}

function outstandingFor(customer: Row, contracts: Row[]) {
  return contractsFor(customer, contracts).reduce((sum, contract) => {
    const status = String(contract.status || "").toUpperCase();
    if (status.includes("OVERDUE")) return sum + Number(contract.overdueAmount || contract.balanceDue || contract.monthlyAmount || 0);
    const installments = Array.isArray(contract.installments) ? contract.installments : [];
    return sum + installments.filter((item: Row) => ["OVERDUE", "DUE", "PENDING"].includes(String(item.status || "").toUpperCase())).reduce((total: number, item: Row) => total + Number(item.amount || 0), 0);
  }, 0);
}

function riskOf(customer: Row, contracts: Row[]) {
  const outstanding = outstandingFor(customer, contracts);
  const score = Number(customer.riskScore ?? customer.creditRisk ?? 0);
  const raw = String(customer.riskLevel || customer.risk || customer.status || "").toUpperCase();
  if (raw.includes("HIGH") || raw.includes("DELINQUENT") || score >= 70 || outstanding >= 3000) return { label: "High risk", th: "สูง", tone: "bad" };
  if (raw.includes("MEDIUM") || raw.includes("WATCH") || score >= 35 || outstanding > 0) return { label: "Medium risk", th: "ปานกลาง", tone: "warn" };
  return { label: "Low risk", th: "ต่ำ", tone: "good" };
}

function statusOf(customer: Row, contracts: Row[]) {
  const raw = String(customer.status || "").toUpperCase();
  const outstanding = outstandingFor(customer, contracts);
  if (raw.includes("BLOCK")) return { label: "Blocked", th: "ระงับ", tone: "bad" };
  if (raw.includes("DELINQUENT") || raw.includes("OVERDUE") || outstanding >= 3000) return { label: "Delinquent", th: "ค้างชำระ", tone: "bad" };
  if (raw.includes("HOLD")) return { label: "On Hold", th: "พักบัญชี", tone: "info" };
  return { label: "Active", th: "Active", tone: "good" };
}

function money(value: unknown) {
  return `฿${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`kc-chip ${tone}`}>{children}</span>;
}

function DeviceSwitch() {
  return <nav className="koga-device-switch" aria-label="เลือกหน้าจอ"><Link href="/customers" className="active">Desktop</Link><Link href="/mobile-store/customers">Mobile</Link></nav>;
}

export default function CustomerCompletePage() {
  const [customers, setCustomers] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<CustomerForm>({ fullName: "", phone: "", email: "", address: "", riskScore: "0" });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pageSize = 8;

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    const [customerResult, contractResult] = await Promise.allSettled([apiJson<any>("/customers"), apiJson<any>("/contracts")]);
    if (customerResult.status === "fulfilled") setCustomers(readArray(customerResult.value));
    if (contractResult.status === "fulfilled") setContracts(readArray(contractResult.value));
    const failed = [customerResult, contractResult].find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "เชื่อมต่อ API ไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const decorated = useMemo<CustomerView[]>(() => customers.map((customer) => {
    const ownContracts = contractsFor(customer, contracts);
    return { customer, ownContracts, outstanding: outstandingFor(customer, contracts), status: statusOf(customer, contracts), risk: riskOf(customer, contracts) };
  }), [customers, contracts]);

  const filtered = useMemo(() => decorated.filter((item) => {
    const haystack = `${displayName(item.customer)} ${phoneOf(item.customer)} ${item.customer.email || ""} ${item.customer.cardId || item.customer.idCard || ""}`.toLowerCase();
    const matchesSearch = haystack.includes(query.trim().toLowerCase());
    const normalizedStatus = item.status.label.toLowerCase().replace(/\s+/g, "-");
    const normalizedRisk = item.risk.label.toLowerCase().replace(/\s+/g, "-");
    return matchesSearch && (filter === "all" || normalizedStatus === filter || normalizedRisk === filter);
  }), [decorated, query, filter]);

  useEffect(() => { setPage(1); }, [query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = decorated.find((item) => String(item.customer.id || displayName(item.customer)) === selectedId) || visibleRows[0] || decorated[0];

  const totals = useMemo(() => ({
    active: decorated.filter((item) => item.status.label === "Active").length,
    hold: decorated.filter((item) => item.status.label === "On Hold").length,
    delinquent: decorated.filter((item) => item.status.label === "Delinquent").length,
    blocked: decorated.filter((item) => item.status.label === "Blocked").length,
    low: decorated.filter((item) => item.risk.label === "Low risk").length,
    medium: decorated.filter((item) => item.risk.label === "Medium risk").length,
    high: decorated.filter((item) => item.risk.label === "High risk").length,
  }), [decorated]);

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

  function exportCsv() {
    const rows = [["name", "phone", "status", "risk", "contracts", "outstanding"], ...filtered.map((item) => [displayName(item.customer), phoneOf(item.customer), item.status.label, item.risk.label, String(item.ownContracts.length), String(item.outstanding)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "koga-customers.csv";
    a.click();
    URL.revokeObjectURL(url);
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
    } catch {
      try {
        const text = await file.text();
        const rows = text.split(/\r?\n/).slice(1).map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim())).filter((row) => row[0]);
        for (const row of rows) await apiJson("/customers", { method: "POST", body: JSON.stringify({ fullName: row[0], phone: row[1] || "", email: row[2] || "" }) });
        await load();
      } catch (err: any) {
        setError(err?.message || "นำเข้าลูกค้าไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  }

  return (
    <main className="kc-shell">
      <aside className="kc-sidebar">
        <div className="kc-brand"><div>K</div><b>KOGA Lease MDM</b></div>
        <nav>{nav.map(([href, icon, label]) => <Link key={href} href={href} className={href === "/customers" ? "active" : ""}><i>{icon}</i><span>{label}</span></Link>)}</nav>
        <div className="kc-store"><div>⌂</div><b>KOGA Store</b><span>สาขา รัตนาธิเบศร์</span><em>⌄</em></div>
        <button className="kc-logout" onClick={logout}>⇱ ออกจากระบบ</button>
      </aside>

      <section className="kc-main">
        <div className="kc-toolbar"><div className="kc-breadcrumb"><Link href="/">หน้าหลัก</Link><span>/</span><b>รายชื่อลูกค้า</b></div><DeviceSwitch /></div>
        <header className="kc-header"><div><h1>รายชื่อลูกค้า</h1><p>จัดการข้อมูลลูกค้าและตรวจสอบสถานะสัญญา</p></div><div className="kc-header-actions"><input ref={fileRef} hidden type="file" accept=".csv,.xlsx,.xls" onChange={importFile}/><button onClick={() => fileRef.current?.click()}>⇧ นำเข้าไฟล์</button><button className="primary" onClick={() => setShowCreate(true)}>+ เพิ่มลูกค้า</button></div></header>
        {error ? <div className="kc-alert"><b>ระบบแจ้งเตือน</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></div> : null}

        <section className="kc-content-grid">
          <div className="kc-table-zone">
            <div className="kc-filterbar"><label>⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ, เลขที่บัตร, เบอร์โทร, เลขที่สัญญา"/></label><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">ตัวกรองทั้งหมด</option><option value="active">Active</option><option value="on-hold">On Hold</option><option value="delinquent">Delinquent</option><option value="low-risk">Low risk</option><option value="medium-risk">Medium risk</option><option value="high-risk">High risk</option></select><button onClick={exportCsv}>⇩ ส่งออก</button></div>
            <div className="kc-table-card"><table><thead><tr><th>ลูกค้า</th><th>เบอร์โทร</th><th>สถานะ</th><th>ระดับความเสี่ยง</th><th>สัญญา</th><th>อัปเดตล่าสุด</th></tr></thead><tbody>{visibleRows.map((item) => <tr key={item.customer.id || displayName(item.customer)} onClick={() => setSelectedId(String(item.customer.id || displayName(item.customer)))}><td>{displayName(item.customer)}</td><td>{phoneOf(item.customer)}</td><td><Chip tone={item.status.tone}>{item.status.label}</Chip></td><td><Chip tone={item.risk.tone}>{item.risk.label}</Chip></td><td>{item.ownContracts.length}</td><td>{updatedAt(item.customer)}</td></tr>)}{!visibleRows.length ? <tr><td colSpan={6} className="empty">ไม่พบลูกค้าที่ตรงกับเงื่อนไข</td></tr> : null}</tbody></table><div className="kc-pagination"><button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><b>{currentPage}</b><span>/</span><span>{totalPages}</span><button disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button><p>แสดง {(currentPage - 1) * pageSize + (visibleRows.length ? 1 : 0)}-{(currentPage - 1) * pageSize + visibleRows.length} จาก {filtered.length} รายการ</p></div></div>
          </div>

          <aside className="kc-summary"><h2>ภาพรวมลูกค้า</h2><strong>{customers.length}</strong><span>รวมทั้งหมด</span><dl><div><dt>Active</dt><dd>{totals.active}</dd></div><div><dt>On Hold</dt><dd>{totals.hold}</dd></div><div><dt>Delinquent</dt><dd>{totals.delinquent}</dd></div><div><dt>Blocked</dt><dd>{totals.blocked}</dd></div></dl><hr/><h3>ความเสี่ยงโดยรวม</h3><div className="kc-donut" style={{ background: `conic-gradient(#22c55e 0 ${totals.low * 360 / Math.max(customers.length, 1)}deg,#f59e0b 0 ${(totals.low + totals.medium) * 360 / Math.max(customers.length, 1)}deg,#ef4444 0 360deg)` }}><span/></div><ul><li><i className="good"/>Low risk ({totals.low})</li><li><i className="warn"/>Medium risk ({totals.medium})</li><li><i className="bad"/>High risk ({totals.high})</li></ul>{selected ? <div className="kc-selected"><b>{displayName(selected.customer)}</b><span>{phoneOf(selected.customer)}</span><small>{selected.ownContracts.length} สัญญา · ค้าง {money(selected.outstanding)}</small></div> : null}<button onClick={() => selected && setSelectedId(String(selected.customer.id || displayName(selected.customer)))}>ดูรายละเอียดลูกค้า ›</button></aside>
        </section>
      </section>

      {showCreate ? <div className="kc-modal"><form onSubmit={createCustomer}><button type="button" onClick={() => setShowCreate(false)}>×</button><h2>เพิ่มลูกค้า</h2><label>ชื่อ-นามสกุล<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })}/></label><label>เบอร์โทร<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label><label>อีเมล<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label><label>ที่อยู่<textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })}/></label><label>Risk score<input type="number" min="0" max="100" value={form.riskScore} onChange={(event) => setForm({ ...form, riskScore: event.target.value })}/></label><button className="primary" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกลูกค้า"}</button></form></div> : null}
      {loading ? <div className="kc-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
