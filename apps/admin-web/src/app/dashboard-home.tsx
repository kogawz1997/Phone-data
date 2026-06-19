"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "./auth-client";

type Row = Record<string, any>;
type HomeData = {
  customers: Row[];
  devices: Row[];
  contracts: Row[];
  payments: Row[];
  paymentRequests: Row[];
  collectionTasks: Row[];
};

const emptyData: HomeData = { customers: [], devices: [], contracts: [], payments: [], paymentRequests: [], collectionTasks: [] };
const nav = [
  ["/", "⌂", "หน้าหลัก"],
  ["/customers", "♙", "ลูกค้า"],
  ["/devices", "▣", "เครื่อง"],
  ["/contracts", "▤", "สัญญา"],
  ["/payments", "◉", "ชำระเงิน"],
  ["/collection", "◎", "ติดตามงาน"],
  ["/reports", "⌁", "รายงาน"],
  ["/settings", "⚙", "ตั้งค่า"],
  ["/users", "♙", "ผู้ใช้ & สิทธิ์"],
] as const;

async function getData<T>(path: string): Promise<T> {
  const session = readSessionToken();
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    credentials: "include",
    headers: session ? { Authorization: `Bearer ${session}` } : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) throw new Error(json?.error?.message || `API ${path} failed`);
  return (json?.data ?? json) as T;
}

function money(value: unknown, compact = false) {
  const n = Number(value || 0);
  if (compact && n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`;
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function dateShort(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function statusTone(status: unknown) {
  const value = String(status || "").toUpperCase();
  if (["ACTIVE", "PAID", "CONFIRMED", "ENROLLED", "IN_STOCK", "LEASE_ACTIVE", "DONE"].some((x) => value.includes(x))) return "good";
  if (["PENDING", "VERIFYING", "WATCH", "DUE", "REVIEW", "NOT_ENROLLED"].some((x) => value.includes(x))) return "warn";
  if (["OVERDUE", "FAILED", "REJECT", "BLOCK", "OFFLINE", "RECOVERY"].some((x) => value.includes(x))) return "bad";
  return "info";
}

function statusLabel(status: unknown) {
  const value = String(status || "-").toUpperCase();
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    CONFIRMED: "ชำระแล้ว",
    VERIFYING: "รอตรวจสอบ",
    PENDING: "รอดำเนินการ",
    OVERDUE: "ค้างชำระ",
    REVIEW_REQUIRED: "Review",
    ENROLLED: "ออนไลน์",
    NOT_ENROLLED: "Not Controlled",
    DUE_SOON: "ใกล้ครบกำหนด",
  };
  return labels[value] || String(status || "-");
}

function Chip({ children, tone = "info" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`koga-chip ${tone}`}>{children}</span>;
}

function StatCard({ label, value, note, icon }: { label: string; value: React.ReactNode; note: string; icon: string }) {
  return <article className="koga-stat-card"><div><p>{label}</p><strong>{value}</strong><span>{note}</span></div><i>{icon}</i></article>;
}

function QueueItem({ title, sub, value, tone = "warn" }: { title: string; sub: string; value: React.ReactNode; tone?: string }) {
  return <div className="koga-queue-item"><div><b>{title}</b><span>{sub}</span></div><strong className={tone}>{value}</strong></div>;
}

function WatchItem({ title, sub, chip, tone }: { title: string; sub: string; chip: string; tone: string }) {
  return <div className="koga-watch-item"><div><b>{title}</b><span>{sub}</span></div><Chip tone={tone}>{chip}</Chip></div>;
}

function PayItem({ payment }: { payment: Row }) {
  return <div className="koga-pay-item"><div className="koga-pay-icon">▣</div><div><b>{dateShort(payment.paidAt || payment.createdAt)}</b><span>{payment.contract?.contractNo || "-"}</span></div><strong>{money(payment.amount)}</strong></div>;
}

function DeviceSwitch({ current }: { current: "desktop" | "mobile" }) {
  return (
    <nav className="koga-device-switch" aria-label="เลือกหน้าจอสำหรับดูเว็บ">
      <Link href="/" className={current === "desktop" ? "active" : ""}>Desktop</Link>
      <Link href="/mobile-store" className={current === "mobile" ? "active" : ""}>Mobile</Link>
    </nav>
  );
}

export function DashboardHome() {
  const [data, setData] = useState<HomeData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const session = readSessionToken();
    if (!session) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    const result = await Promise.allSettled([
      getData<Row[]>("/customers"),
      getData<Row[]>("/devices"),
      getData<Row[]>("/contracts"),
      getData<Row[]>("/payments"),
      getData<Row[]>("/payment-requests"),
      getData<Row[]>("/collection/tasks"),
    ]);
    setData({
      customers: result[0].status === "fulfilled" ? result[0].value : [],
      devices: result[1].status === "fulfilled" ? result[1].value : [],
      contracts: result[2].status === "fulfilled" ? result[2].value : [],
      payments: result[3].status === "fulfilled" ? result[3].value : [],
      paymentRequests: result[4].status === "fulfilled" ? result[4].value : [],
      collectionTasks: result[5].status === "fulfilled" ? result[5].value : [],
    });
    const failed = result.find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "เชื่อมต่อ API ไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const activeContracts = useMemo(() => data.contracts.filter((item) => String(item.status).toUpperCase() === "ACTIVE"), [data.contracts]);
  const confirmedRevenue = useMemo(() => data.payments.filter((item) => String(item.status).toUpperCase() === "CONFIRMED").reduce((sum, item) => sum + Number(item.amount || 0), 0), [data.payments]);
  const pendingPayments = useMemo(() => data.payments.filter((item) => !["CONFIRMED", "REJECTED"].includes(String(item.status).toUpperCase())).length + data.paymentRequests.filter((item) => !["CONFIRMED", "REJECTED", "CANCELLED"].includes(String(item.status).toUpperCase())).length, [data.payments, data.paymentRequests]);
  const overdueContracts = useMemo(() => data.contracts.filter((item) => statusTone(item.status) !== "good"), [data.contracts]);
  const openTasks = useMemo(() => data.collectionTasks.filter((item) => String(item.status).toUpperCase() !== "DONE"), [data.collectionTasks]);

  async function logout() {
    await logoutFromApi();
    window.location.assign("/login");
  }

  return (
    <main className="koga-home-shell">
      <div className="koga-browser-frame">
        <div className="koga-window-bar"><div className="koga-dots"><span/><span/><span/></div><b>KOGA Lease MDM</b><div><button onClick={load}>↻</button><button>⌄</button></div></div>
        <div className="koga-app-frame">
          <aside className="koga-home-sidebar">
            <div className="koga-brand-row"><div className="koga-home-logo">K</div><b>KOGA Lease MDM</b></div>
            <nav>{nav.map(([href, icon, label]) => <Link key={href} href={href} className={href === "/" ? "active" : ""}><i>{icon}</i><span>{label}</span></Link>)}</nav>
            <div className="koga-store-card"><div className="koga-store-avatar">K</div><div><b>KOGA Store</b><span>สาขา รัตนาธิเบศร์</span></div><span>⌄</span></div>
            <button className="koga-logout" onClick={logout}>⇱ ออกจากระบบ</button>
          </aside>

          <section className="koga-home-main">
            <div className="koga-view-toolbar"><DeviceSwitch current="desktop" /></div>
            <header className="koga-home-top"><div><p><Link href="/">หน้าหลัก</Link> / Command Center</p><h1>ยินดีต้อนรับ, KOGA Store</h1><span>ภาพรวมการดำเนินงานของร้านค้าในวันนี้</span></div><div className="koga-top-chips"><Chip tone={error ? "bad" : "good"}>{error ? "API warning" : "Database ready"}</Chip><Chip tone="purple">Tenant Isolation</Chip></div></header>
            {error ? <div className="koga-home-alert"><b>ระบบยังไม่สมบูรณ์</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></div> : null}

            <section className="koga-hero-grid">
              <article className="koga-priority-card"><p>Priority cockpit</p><h2>จัดการลูกค้า เครื่อง สัญญา และ MDM ได้อย่างครบจบในระบบเดียว</h2><span>ตรวจสอบงานสำคัญ ติดตามความเสี่ยง และเร่งดำเนินการที่ต้องให้ครบถ้วน</span><div><Link className="koga-primary" href="/contracts">จัดการข้อมูล</Link><Link className="koga-secondary" href="/payments">ตรวจเช็ก {pendingPayments} รายการ</Link></div></article>
              <article className="koga-ready-card"><p>System readiness</p><h2>READY <em>●</em></h2><span>API, Database, Billing & Integration พร้อมใช้งาน</span><b>○ Live health check: {error ? "Needs review" : "Normal"}</b></article>
            </section>

            <section className="koga-stat-grid"><StatCard label="ลูกค้า" value={data.customers.length} note="ในวันนี้ทั้งหมด" icon="♙"/><StatCard label="เครื่อง" value={data.devices.length} note="ใช้งานอยู่ทั้งหมด" icon="▣"/><StatCard label="สัญญา active" value={activeContracts.length} note={`${overdueContracts.length} ค้างชำระ`} icon="▤"/><StatCard label="รายรับยืนยัน" value={money(confirmedRevenue, true)} note="ยอดยืนยันแล้ว" icon="▱"/></section>

            <section className="koga-bottom-grid">
              <article className="koga-panel"><h3>⚑ งานที่ควรจัดการก่อน</h3><QueueItem title="ตรวจสอบคำขอเอกสาร" sub="รอการตรวจสอบ" value={pendingPayments} tone="bad"/><QueueItem title="สัญญาค้างชำระ" sub="เกินกำหนดชำระ" value={overdueContracts.length} tone="warn"/><QueueItem title="MDM action รออนุมัติ" sub="รอหัวหน้าทีมอนุมัติ" value={openTasks.length} tone="warn"/><Link href="/collection">ดูทั้งหมด ›</Link></article>
              <article className="koga-panel"><h3>◉ สัญญาที่ต้องจับตา</h3>{overdueContracts.slice(0, 3).map((item, index) => <WatchItem key={item.id || index} title={item.contractNo || `KOGA-${index + 1}`} sub={`ลูกค้า: ${item.customer?.fullName || "-"}`} chip={index === 0 ? "HIGH" : index === 1 ? "MEDIUM" : statusLabel(item.status)} tone={index === 0 ? "bad" : index === 1 ? "warn" : statusTone(item.status)} />)}{overdueContracts.length === 0 ? <WatchItem title="ยังไม่มีสัญญาเสี่ยง" sub="ข้อมูลจาก API ปกติ" chip="LOW" tone="good"/> : null}<Link href="/contracts">ดูทั้งหมด ›</Link></article>
              <article className="koga-panel"><h3>ⓑ ชำระเงินล่าสุด</h3>{data.payments.slice(0, 3).map((payment) => <PayItem key={payment.id} payment={payment}/>)}{data.payments.length === 0 ? <QueueItem title="ยังไม่มีรายการชำระ" sub="รอข้อมูลจาก API" value="0"/> : null}<Link href="/payments">ดูทั้งหมด ›</Link></article>
            </section>
          </section>
        </div>
      </div>
      {loading ? <div className="koga-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
