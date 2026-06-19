"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "../../auth-client";

type Row = Record<string, any>;
type RiskRow = Row & { score: number; level: "high" | "medium" | "low"; customerName: string; customerId: string; reason: string };

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
  if (Array.isArray(value?.customers)) return value.customers;
  if (Array.isArray(value?.risks)) return value.risks;
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

function name(row: Row) { return row.fullName || row.name || row.customerName || row.customer?.fullName || "ไม่ระบุลูกค้า"; }
function phone(row: Row) { return row.phone || row.mobile || row.customer?.phone || "-"; }
function level(score: number): RiskRow["level"] { return score >= 70 ? "high" : score >= 40 ? "medium" : "low"; }
function tone(value: RiskRow["level"]) { return value === "high" ? "bad" : value === "medium" ? "warn" : "good"; }
function text(value: RiskRow["level"]) { return value === "high" ? "สูง" : value === "medium" ? "ปานกลาง" : "ต่ำ"; }
function Chip({ children, tone }: { children: string; tone: string }) { return <span className={`kdc-chip ${tone}`}>{children}</span>; }

function scoreFrom(customer: Row, contracts: Row[], collection: Row[], riskRow?: Row) {
  const raw = Number(riskRow?.score ?? riskRow?.riskScore ?? customer.riskScore ?? customer.creditRiskScore);
  if (Number.isFinite(raw) && raw > 0) return Math.min(100, Math.max(0, raw));
  const customerId = customer.id || customer.customerId;
  const ownContracts = contracts.filter((contract) => String(contract.customerId || contract.customer?.id || "") === String(customerId));
  const overdueContracts = ownContracts.filter((contract) => String(contract.status || "").toUpperCase().includes("OVER"));
  const ownCollection = collection.filter((task) => String(task.customerId || task.customer?.id || task.contract?.customerId || "") === String(customerId));
  return Math.min(100, 18 + overdueContracts.length * 28 + ownCollection.length * 12 + Math.min(ownContracts.length, 5) * 5);
}

function derive(customers: Row[], contracts: Row[], collection: Row[], riskRows: Row[]): RiskRow[] {
  return customers.map((customer, index) => {
    const riskRow = riskRows.find((item) => String(item.customerId || item.customer?.id || item.id) === String(customer.id));
    const score = scoreFrom(customer, contracts, collection, riskRow);
    const currentLevel = level(score);
    return {
      ...customer,
      ...riskRow,
      id: customer.id || riskRow?.id || `risk-${index}`,
      customerId: String(customer.id || riskRow?.customerId || `risk-${index}`),
      customerName: name(customer),
      score,
      level: currentLevel,
      reason: riskRow?.reason || (currentLevel === "high" ? "ติดตามลูกค้าเสี่ยงสูงและจัดระดับเพื่อปิดปัญหา" : currentLevel === "medium" ? "ควรเฝ้าระวังการชำระเงินและการใช้งานเครื่อง" : "ประวัติอยู่ในเกณฑ์ปกติ"),
    };
  });
}

function DeviceSwitch() {
  return <nav className="koga-device-switch ms-device-switch"><Link href="/risk">Desktop</Link><Link href="/mobile-store/risk" className="active">Mobile</Link></nav>;
}

export default function MobileRiskPage() {
  const [customers, setCustomers] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [collection, setCollection] = useState<Row[]>([]);
  const [riskRows, setRiskRows] = useState<Row[]>([]);
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
    const result = await Promise.allSettled([api<any>("/customers"), api<any>("/contracts"), api<any>("/collection/tasks"), api<any>("/risk/customers")]);
    if (result[0].status === "fulfilled") setCustomers(arr(result[0].value));
    if (result[1].status === "fulfilled") setContracts(arr(result[1].value));
    if (result[2].status === "fulfilled") setCollection(arr(result[2].value));
    if (result[3].status === "fulfilled") setRiskRows(arr(result[3].value));
    const failed = result.find((item, index) => item.status === "rejected" && index < 2) as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "โหลดข้อมูลความเสี่ยงไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => derive(customers, contracts, collection, riskRows), [customers, contracts, collection, riskRows]);
  const sorted = useMemo(() => [...rows].sort((a, b) => b.score - a.score), [rows]);
  const avg = Math.round(rows.reduce((sum, row) => sum + row.score, 0) / Math.max(rows.length, 1));
  const high = rows.filter((row) => row.level === "high");
  const medium = rows.filter((row) => row.level === "medium");
  const low = rows.filter((row) => row.level === "low");

  async function logout() { await logoutFromApi(); window.location.assign("/login"); }

  return (
    <main className="kdc-mobile kdr-mobile">
      {menuOpen ? <button className="ms-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`ms-drawer ${menuOpen ? "open" : ""}`}>
        <div className="ms-drawer-head"><div className="ms-logo">K</div><div><b>KOGA Lease MDM</b><span>Mobile Store</span></div><button onClick={() => setMenuOpen(false)}>×</button></div>
        <DeviceSwitch />
        <nav>{menu.map((item) => <Link key={item.href} href={item.href} className={item.href === "/mobile-store/risk" ? "active" : ""} onClick={() => setMenuOpen(false)}><i>{item.icon}</i><span>{item.label}</span></Link>)}</nav>
        <div className="ms-drawer-status"><b>{error ? "API error" : "API live"}</b><span>{API_BASE}</span></div>
        <button className="ms-logout" onClick={logout}>ออกจากระบบ</button>
      </aside>

      <header className="kdc-mobile-top"><button onClick={() => setMenuOpen(true)}>☰</button><h1>ภาพรวมความเสี่ยง</h1><button onClick={load}>↻</button></header>
      <DeviceSwitch />
      {error ? <section className="ms-error"><b>ระบบยังไม่พร้อม</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></section> : null}

      <section className="kdc-mobile-card kdr-score-mobile">
        <h3>คะแนนความเสี่ยงเฉลี่ย (Average Risk Score)</h3>
        <div className="kdr-score-flex">
          <div className="kdr-meter" style={{ background: `conic-gradient(#f59e0b 0 ${avg * 3.6}deg, rgba(148,163,184,.28) ${avg * 3.6}deg 360deg)` }}><span><b>{avg}</b><em>{avg >= 70 ? "สูง" : avg >= 40 ? "ปานกลาง" : "ต่ำ"}</em></span></div>
          <div className="kdr-score-legend"><p><i className="bad" />สูง <b>{rows.length ? Math.round((high.length / rows.length) * 100) : 0}%</b></p><p><i className="warn" />ปานกลาง <b>{rows.length ? Math.round((medium.length / rows.length) * 100) : 0}%</b></p><p><i className="good" />ต่ำ <b>{rows.length ? Math.round((low.length / rows.length) * 100) : 0}%</b></p><small>จากลูกค้าทั้งหมด {rows.length.toLocaleString("th-TH")} ราย</small></div>
        </div>
      </section>

      <section className="kdr-mini-stats"><article><b>{high.length}</b><span>ลูกค้าความเสี่ยงสูง</span></article><article><b>{medium.length + high.length}</b><span>แจ้งเตือนวันนี้</span></article></section>

      <section className="kdc-mobile-card"><h3>แนวโน้มความเสี่ยง (30 วันล่าสุด)</h3><div className="kdr-trend"><i style={{ height: "30%" }} /><i style={{ height: "38%" }} /><i style={{ height: "52%" }} /><i style={{ height: "48%" }} /><i style={{ height: "62%" }} /><i style={{ height: "58%" }} /><i style={{ height: "70%" }} /><i style={{ height: "68%" }} /></div></section>

      <section className="kdc-mobile-card"><h3>การดำเนินการแนะนำ</h3><div className="kdr-mobile-actions"><div><i>⚠</i><b>ติดตามลูกค้าเสี่ยงสูง {high.length} ราย</b><span>เร่งติดตามและจัดระดับเพื่อปิดปัญหา</span><em>›</em></div><div><i>♙</i><b>ตรวจสอบเอกสารค้างอัปเดต</b><span>ลูกค้า {medium.length} ราย เอกสารใกล้หมดอายุ</span><em>›</em></div><div><i>▣</i><b>ส่งข้อความเตือนเอกสารล่วงหน้า</b><span>ลูกค้าที่คาดว่าใกล้ครบกำหนด 30 วัน</span><em>›</em></div></div></section>

      <section className="kdc-mobile-list">
        {sorted.slice(0, 4).map((row) => <article key={row.customerId} className="kdc-mobile-card kdr-risk-row"><div><h3>{row.customerName}</h3><p>{phone(row)}</p><span>{row.reason}</span></div><div><strong>{row.score}</strong><Chip tone={tone(row.level)}>{text(row.level)}</Chip></div></article>)}
      </section>
      {loading ? <div className="kdc-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
