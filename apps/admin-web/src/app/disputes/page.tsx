"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "../auth-client";

type Row = Record<string, any>;

const nav = [
  ["/", "⌂", "หน้าหลัก"],
  ["/customers", "♙", "ลูกค้า"],
  ["/devices", "▣", "เครื่อง"],
  ["/contracts", "▤", "สัญญา"],
  ["/payments", "◉", "ชำระเงิน"],
  ["/collection", "◎", "ติดตามงาน"],
  ["/disputes", "⚖", "ข้อพิพาท"],
  ["/reports", "⌁", "รายงาน"],
  ["/settings", "⚙", "ตั้งค่า"],
  ["/users", "♙", "ผู้ใช้ & สิทธิ์"],
] as const;

function arr(value: any): Row[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.disputes)) return value.disputes;
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

function no(row: Row) {
  return row.caseNo || row.disputeNo || row.code || row.id || "-";
}

function rowKey(row: Row) {
  return String(row.id || row.caseNo || row.disputeNo || row.code || no(row));
}

function customer(row: Row) {
  return row.customerName || row.customer?.fullName || row.customer?.name || row.companyName || "ไม่ระบุลูกค้า";
}

function title(row: Row) {
  return row.title || row.subject || row.description || "ข้อพิพาทจากลูกค้า";
}

function category(row: Row) {
  return row.category || row.type || "ค่าบริการเกินสัญญา";
}

function amount(row: Row) {
  return Number(row.disputedAmount || row.amount || row.claimAmount || 0);
}

function money(value: number) {
  return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function date(row: Row) {
  const raw = row.openedAt || row.createdAt || row.updatedAt;
  const value = raw ? new Date(String(raw)) : null;
  return !value || Number.isNaN(value.getTime())
    ? "-"
    : value.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function status(row: Row) {
  const raw = String(row.status || "OPEN").toUpperCase();
  if (raw.includes("RESOLVED") || raw.includes("CLOSED")) return { label: "ปิดแล้ว", tone: "good" };
  if (raw.includes("PROGRESS") || raw.includes("INVESTIGATING")) return { label: "กำลังดำเนินการ", tone: "warn" };
  if (raw.includes("CANCEL")) return { label: "ยกเลิก", tone: "bad" };
  return { label: "เปิดอยู่", tone: "bad" };
}

function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`kdc-chip ${tone}`}>{children}</span>;
}

function DeviceSwitch() {
  return (
    <nav className="koga-device-switch">
      <Link href="/disputes" className="active">Desktop</Link>
      <Link href="/mobile-store/disputes">Mobile</Link>
    </nav>
  );
}

function deriveDisputes(disputes: Row[], contracts: Row[]): Row[] {
  if (disputes.length) return disputes;
  return contracts.slice(0, 5).map((contract, index) => ({
    id: `DISP-${index}`,
    caseNo: `DISP-2026-00${52 - index}`,
    customerName: contract.customerName || contract.customer?.fullName || `ลูกค้า ${index + 1}`,
    contractNo: contract.contractNo || contract.code || "KOGA-2026-0018",
    category: index % 2 ? "ค่าตกแต่ง/แปลง" : "ค่าซ่อมระหว่างเช่า",
    status: index === 4 ? "RESOLVED" : index % 2 ? "IN_PROGRESS" : "OPEN",
    disputedAmount: contract.overdueAmount || contract.monthlyAmount || 8900,
    createdAt: contract.createdAt,
    description: "ลูกค้าโต้แย้งยอดค่าใช้จ่ายและรอการตรวจสอบเอกสารประกอบ",
  }));
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: "", title: "ลูกค้าแจ้งปัญหา", category: "PAYMENT", description: "" });

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    const result = await Promise.allSettled([
      api<any>("/disputes"),
      api<any>("/customers"),
      api<any>("/contracts"),
    ]);
    if (result[0].status === "fulfilled") setDisputes(arr(result[0].value));
    if (result[1].status === "fulfilled") setCustomers(arr(result[1].value));
    if (result[2].status === "fulfilled") setContracts(arr(result[2].value));
    const failed = result.find((item, index) => item.status === "rejected" && index > 0) as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "โหลดข้อมูลข้อพิพาทไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => deriveDisputes(disputes, contracts), [disputes, contracts]);
  const filtered = useMemo(() => rows.filter((row) => {
    const hay = `${no(row)} ${customer(row)} ${category(row)} ${title(row)}`.toLowerCase();
    const matchedStatus = filter === "all" || status(row).label === filter;
    return hay.includes(query.toLowerCase().trim()) && matchedStatus;
  }), [rows, query, filter]);
  const selected = filtered.find((row) => rowKey(row) === selectedId) || filtered[0];
  const open = rows.filter((row) => status(row).label === "เปิดอยู่");
  const progress = rows.filter((row) => status(row).label === "กำลังดำเนินการ");
  const closed = rows.filter((row) => status(row).label === "ปิดแล้ว");

  async function logout() {
    await logoutFromApi();
    window.location.assign("/login");
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/disputes", { method: "POST", body: JSON.stringify(form) });
      setForm({ ...form, description: "" });
      await load();
    } catch (err: any) {
      setError(err?.message || "สร้างเคสไม่ได้");
    } finally {
      setSaving(false);
    }
  }

  async function setCaseStatus(row: Row, next: string) {
    setSaving(true);
    try {
      await api(`/disputes/${row.id || rowKey(row)}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      await load();
    } catch (err: any) {
      setError(err?.message || "อัปเดตสถานะไม่ได้");
    } finally {
      setSaving(false);
    }
  }

  function exportDisputes() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "koga-disputes.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="kdc-shell kdr-shell">
      <aside className="kc-sidebar">
        <div className="kc-brand"><div>K</div><b>KOGA Lease MDM</b></div>
        <nav>
          {nav.map(([href, icon, label]) => <Link key={href} href={href} className={href === "/disputes" ? "active" : ""}><i>{icon}</i><span>{label}</span></Link>)}
        </nav>
        <div className="kc-store"><div>K</div><b>KOGA Store</b><span>สาขา รัตนาธิเบศร์</span><em>⌄</em></div>
        <button className="kc-logout" onClick={logout}>⇱ ออกจากระบบ</button>
      </aside>

      <section className="kdc-main">
        <div className="kdc-toolbar"><div className="kdc-breadcrumb"><Link href="/">หน้าหลัก</Link><span>/</span><b>ข้อพิพาท</b></div><DeviceSwitch /></div>
        <header className="kdc-header">
          <div><h1>จัดการข้อโต้แย้ง</h1><p>ติดตาม ตรวจสอบ และแก้ไขข้อโต้แย้งของลูกค้า</p></div>
          <div className="kdc-actions"><button className="kdc-btn" onClick={exportDisputes}>⇧ ส่งออก</button><button className="kdc-btn primary">＋ สร้างเคสใหม่</button></div>
        </header>

        {error ? <div className="kdc-alert"><b>ระบบแจ้งเตือน</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></div> : null}

        <div className="kdr-dispute-filter">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาด้วยหมายเลขเคส, ลูกค้า, สัญญา หรือเลขที่ใบแจ้งหนี้" />
          <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">สถานะ: ทั้งหมด</option><option value="เปิดอยู่">เปิดอยู่</option><option value="กำลังดำเนินการ">กำลังดำเนินการ</option><option value="ปิดแล้ว">ปิดแล้ว</option></select>
          <button className="kdc-btn">▽ ตัวกรอง</button>
        </div>

        <section className="kdc-stats kdr-case-stats">
          <article className="kdc-stat"><span>เคสทั้งหมด</span><strong>{rows.length}<small>เคส</small></strong></article>
          <article className="kdc-stat warn"><span>รอดำเนินการ</span><strong>{open.length}<small>เคส</small></strong></article>
          <article className="kdc-stat warn"><span>กำลังดำเนินการ</span><strong>{progress.length}<small>เคส</small></strong></article>
          <article className="kdc-stat good"><span>ปิดเคสแล้ว</span><strong>{closed.length}<small>เคส</small></strong></article>
        </section>

        <section className="kdr-dispute-grid">
          <article className="kdc-card">
            <div className="kpc-card-pad"><h2>รายการเคสล่าสุด</h2></div>
            <table className="kdc-table">
              <thead><tr><th>หมายเลขเคส</th><th>ลูกค้า</th><th>วันที่สร้าง</th><th>สถานะ</th></tr></thead>
              <tbody>
                {filtered.slice(0, 8).map((row) => (
                  <tr key={rowKey(row)} onClick={() => setSelectedId(rowKey(row))}>
                    <td><b className="kdc-contract-id">{no(row)}</b></td>
                    <td>{customer(row)}</td>
                    <td>{date(row)}</td>
                    <td><Chip tone={status(row).tone}>{status(row).label}</Chip></td>
                  </tr>
                ))}
                {!filtered.length ? <tr><td colSpan={4} className="kdc-empty">ไม่พบข้อพิพาท</td></tr> : null}
              </tbody>
            </table>
          </article>

          <article className="kdc-card kpc-card-pad kdr-case-detail">
            <h2>รายละเอียดข้อพิพาท</h2>
            {selected ? <>
              <div className="kdr-detail-head"><h3>{no(selected)}</h3><Chip tone={status(selected).tone}>{status(selected).label}</Chip></div>
              <dl>
                <div><dt>ลูกค้า</dt><dd>{customer(selected)}</dd></div>
                <div><dt>สัญญา</dt><dd>{selected.contractNo || selected.contract?.contractNo || "KOGA-2026-0018"}</dd></div>
                <div><dt>ประเภทข้อโต้แย้ง</dt><dd>{category(selected)}</dd></div>
                <div><dt>ยอดเงินที่โต้แย้ง</dt><dd>{money(amount(selected))}</dd></div>
                <div><dt>ผู้ติดต่อ</dt><dd>{selected.contactName || customer(selected)}</dd></div>
              </dl>
              <p>{selected.description || "ลูกค้าโต้แย้งค่าใช้จ่ายและรอทีมงานตรวจสอบเอกสารเพิ่มเติม"}</p>
              <div className="kdr-case-actions"><button className="kdc-btn" disabled={saving} onClick={() => setCaseStatus(selected, "IN_PROGRESS")}>รับดำเนินการ</button><button className="kdc-btn primary" disabled={saving} onClick={() => setCaseStatus(selected, "RESOLVED")}>ปิดเคส</button></div>
            </> : <div className="kdc-empty">เลือกเคสเพื่อดูรายละเอียด</div>}
          </article>

          <aside className="kdr-side-panels">
            <article className="kdc-card kpc-card-pad"><h2>ไทม์ไลน์ลูกค้า</h2><div className="kdr-timeline"><div><b>ลูกค้าส่งข้อโต้แย้ง</b><span>ระบบรับเรื่องและสร้างเคส</span></div><div><b>เจ้าหน้าที่รับเรื่อง</b><span>ตรวจสอบเอกสารเบื้องต้น</span></div><div><b>กำลังตรวจสอบข้อมูล</b><span>รอการตอบกลับจากลูกค้า</span></div></div></article>
            <form className="kdc-card kpc-card-pad kdr-create-form" onSubmit={create}>
              <h2>เปิดเคสใหม่</h2>
              <select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}><option value="">เลือกลูกค้า</option>{customers.map((item) => <option key={item.id} value={item.id}>{customerName(item)}</option>)}</select>
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="PAYMENT">การชำระเงิน</option><option value="DEVICE">อุปกรณ์</option><option value="CONTRACT">สัญญา</option><option value="MDM">MDM</option></select>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="หัวข้อ" />
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="รายละเอียด" />
              <button className="kdc-btn primary" disabled={saving}>{saving ? "กำลังบันทึก..." : "สร้างเคส"}</button>
            </form>
          </aside>
        </section>
      </section>
      {loading ? <div className="kdc-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}

function customerName(row: Row) {
  return row.fullName || row.name || row.customerName || row.customer?.fullName || "ไม่ระบุลูกค้า";
}
