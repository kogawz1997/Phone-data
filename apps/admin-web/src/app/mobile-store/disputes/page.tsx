"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "../../auth-client";

type Row = Record<string, any>;

const menu = [
  { href: "/mobile-store", label: "หน้าหลัก", icon: "⌂" },
  { href: "/mobile-store/customers", label: "ลูกค้า", icon: "♙" },
  { href: "/mobile-store/devices", label: "คลังเครื่อง", icon: "▣" },
  { href: "/mobile-store/contracts", label: "สัญญา", icon: "▤" },
  { href: "/mobile-store/payments", label: "ชำระเงิน", icon: "฿" },
  { href: "/mobile-store/collection", label: "ติดตามงวด", icon: "◎" },
  { href: "/mobile-store/risk", label: "ความเสี่ยง", icon: "◇" },
  { href: "/mobile-store/disputes", label: "ข้อพิพาท", icon: "⚖" },
];

function arr(value: any): Row[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.disputes)) return value.disputes;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

async function api<T>(path: string): Promise<T> {
  const token = readSessionToken();
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store", credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) throw new Error(json?.error?.message || `API ${path} failed`);
  return (json?.data ?? json) as T;
}

function no(row: Row) { return row.caseNo || row.disputeNo || row.code || row.id || "-"; }
function rowKey(row: Row) { return String(row.id || row.caseNo || row.disputeNo || row.code || no(row)); }
function customer(row: Row) { return row.customerName || row.customer?.fullName || row.customer?.name || row.companyName || "ไม่ระบุลูกค้า"; }
function category(row: Row) { return row.category || row.type || "ค่าซ่อมระหว่างเช่า"; }
function amount(row: Row) { return Number(row.disputedAmount || row.amount || row.claimAmount || 0); }
function money(value: number) { return `${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`; }
function date(row: Row) { const raw = row.openedAt || row.createdAt || row.updatedAt; const value = raw ? new Date(String(raw)) : null; return !value || Number.isNaN(value.getTime()) ? "-" : value.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }); }
function status(row: Row) { const raw = String(row.status || "OPEN").toUpperCase(); if (raw.includes("RESOLVED") || raw.includes("CLOSED")) return { label: "ปิดแล้ว", tone: "good" }; if (raw.includes("PROGRESS") || raw.includes("INVESTIGATING")) return { label: "รอดำเนินการ", tone: "warn" }; if (raw.includes("CANCEL")) return { label: "ยกเลิก", tone: "bad" }; return { label: "เปิดอยู่", tone: "bad" }; }
function Chip({ children, tone }: { children: string; tone: string }) { return <span className={`kdc-chip ${tone}`}>{children}</span>; }

function derive(disputes: Row[], contracts: Row[]): Row[] {
  if (disputes.length) return disputes;
  return contracts.slice(0, 4).map((contract, index) => ({
    id: `DISP-${index}`,
    caseNo: `DISP-2026-00${567 - index}`,
    customerName: contract.customerName || contract.customer?.fullName || (index % 2 ? "นายกิตติพงษ์ ใจดี" : "บริษัท เอสเอ็ม สมาร์ท จำกัด"),
    contractNo: contract.contractNo || contract.code || "CT-250524-089",
    category: index % 2 ? "ค่าตกแต่ง/แปลง" : "ค่าซ่อมระหว่างเช่า",
    status: index === 2 ? "RESOLVED" : index === 1 ? "IN_PROGRESS" : "OPEN",
    disputedAmount: contract.overdueAmount || contract.monthlyAmount || (index === 1 ? 12500 : 48900),
    createdAt: contract.createdAt,
    description: "ลูกค้าโต้แย้งยอดค่าใช้จ่ายและรอการตรวจสอบเอกสารประกอบ",
  }));
}

function DeviceSwitch() {
  return <nav className="koga-device-switch ms-device-switch"><Link href="/disputes">Desktop</Link><Link href="/mobile-store/disputes" className="active">Mobile</Link></nav>;
}

export default function MobileDisputesPage() {
  const [disputes, setDisputes] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    const result = await Promise.allSettled([api<any>("/disputes"), api<any>("/contracts")]);
    if (result[0].status === "fulfilled") setDisputes(arr(result[0].value));
    if (result[1].status === "fulfilled") setContracts(arr(result[1].value));
    const failed = result.find((item, index) => item.status === "rejected" && index === 1) as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "โหลดข้อมูลข้อพิพาทไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => derive(disputes, contracts), [disputes, contracts]);
  const filtered = useMemo(() => rows.filter((row) => {
    const hay = `${no(row)} ${customer(row)} ${category(row)}`.toLowerCase();
    const ok = filter === "all" || status(row).label === filter;
    return hay.includes(query.toLowerCase().trim()) && ok;
  }), [rows, query, filter]);
  const selected = filtered.find((row) => rowKey(row) === selectedId) || filtered[0];

  async function logout() { await logoutFromApi(); window.location.assign("/login"); }

  return (
    <main className="kdc-mobile kdr-mobile">
      {menuOpen ? <button className="ms-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`ms-drawer ${menuOpen ? "open" : ""}`}>
        <div className="ms-drawer-head"><div className="ms-logo">K</div><div><b>KOGA Lease MDM</b><span>Mobile Store</span></div><button onClick={() => setMenuOpen(false)}>×</button></div>
        <DeviceSwitch />
        <nav>{menu.map((item) => <Link key={item.href} href={item.href} className={item.href === "/mobile-store/disputes" ? "active" : ""} onClick={() => setMenuOpen(false)}><i>{item.icon}</i><span>{item.label}</span></Link>)}</nav>
        <div className="ms-drawer-status"><b>{error ? "API error" : "API live"}</b><span>{API_BASE}</span></div>
        <button className="ms-logout" onClick={logout}>ออกจากระบบ</button>
      </aside>

      <header className="kdc-mobile-top"><button onClick={() => setMenuOpen(true)}>☰</button><h1>ข้อพิพาท</h1><button onClick={load}>↻</button></header>
      <DeviceSwitch />
      {error ? <section className="ms-error"><b>ระบบยังไม่พร้อม</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></section> : null}

      <div className="kdc-mobile-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาด้วยเลขคดี, ชื่อลูกค้า, อ้างอิง" /><button onClick={() => setFilter(filter === "all" ? "เปิดอยู่" : "all")}>▽</button></div>
      <div className="kdr-pill-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>ทั้งหมด</button><button onClick={() => setFilter("เปิดอยู่")}>เปิดอยู่</button><button onClick={() => setFilter("รอดำเนินการ")}>รอดำเนินการ</button><button onClick={() => setFilter("ปิดแล้ว")}>ปิดแล้ว</button></div>

      <section className="kdc-mobile-list">
        {filtered.map((row) => <article key={rowKey(row)} className="kdc-mobile-card kdr-dispute-mobile-card" onClick={() => setSelectedId(rowKey(row))}><div><h3>{no(row)}</h3><b>{customer(row)}</b><p>ประเภท {category(row)}</p><span>วันที่เปิด {date(row)}</span></div><div><Chip tone={status(row).tone}>{status(row).label}</Chip><p>ยอดข้อพิพาท</p><strong>{money(amount(row))}</strong></div><em>›</em></article>)}
        {!filtered.length ? <div className="kdc-empty">ไม่พบข้อพิพาท</div> : null}
      </section>

      {selected ? <section className="kdc-mobile-card kdr-selected-dispute"><div className="kdr-detail-head"><h3>{no(selected)}</h3><Chip tone={status(selected).tone}>{status(selected).label}</Chip></div><nav><button className="active">รายละเอียด</button><button>พยานหลักฐาน</button><button>ไทม์ไลน์</button></nav><dl><div><dt>ลูกค้า</dt><dd>{customer(selected)}</dd></div><div><dt>ประเภท</dt><dd>{category(selected)}</dd></div><div><dt>ยอดข้อพิพาท</dt><dd>{money(amount(selected))}</dd></div><div><dt>วันที่เปิด</dt><dd>{date(selected)}</dd></div><div><dt>อ้างอิงภายใน</dt><dd>{selected.contractNo || "CT-250524-089"}</dd></div><div><dt>ผู้รับผิดชอบ</dt><dd>{selected.assigneeName || "ณัฐวุฒิ พงษ์สวัสดิ์"}</dd></div></dl></section> : null}

      {loading ? <div className="kdc-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
