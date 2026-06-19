"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "../auth-client";

type Row = Record<string, any>;
type StoreData = {
  customers: Row[];
  devices: Row[];
  contracts: Row[];
  payments: Row[];
  paymentRequests: Row[];
  collectionTasks: Row[];
};

const emptyData: StoreData = { customers: [], devices: [], contracts: [], payments: [], paymentRequests: [], collectionTasks: [] };
const menu = [
  { href: "/mobile-store", label: "หน้าหลัก", icon: "⌂" },
  { href: "/mobile-store/customers", label: "ลูกค้า", icon: "♙" },
  { href: "/devices", label: "คลังเครื่อง", icon: "▣" },
  { href: "/contracts", label: "สัญญา", icon: "▤" },
  { href: "/payments", label: "ชำระเงิน", icon: "฿" },
  { href: "/collection", label: "ติดตามงวด", icon: "◎" },
  { href: "/devices", label: "MDM", icon: "🛡" },
  { href: "/reports", label: "รายงาน", icon: "▥" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙" },
];

function readArray(value: any): Row[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

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

function baht(value: unknown) {
  return `฿${Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function isPaid(value: unknown) {
  return ["PAID", "CONFIRMED"].includes(String(value || "").toUpperCase());
}

function isDeviceNeedsCheck(device: Row) {
  const control = String(device.controlStatus || "").toUpperCase();
  const status = String(device.deviceStatus || "").toUpperCase();
  return control.includes("NOT") || control.includes("OFFLINE") || status.includes("REPAIR") || status.includes("OVERDUE");
}

function countDueSoon(contracts: Row[]) {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 7);
  return contracts.reduce((sum, contract) => {
    const items = Array.isArray(contract.installments) ? contract.installments : [];
    return sum + items.filter((installment: Row) => {
      const due = installment.dueDate ? new Date(String(installment.dueDate)) : null;
      return due && !Number.isNaN(due.getTime()) && due >= now && due <= next && !isPaid(installment.status);
    }).length;
  }, 0);
}

function StatBox({ label, value, unit, trend }: { label: string; value: string | number; unit?: string; trend: string }) {
  return <article className="ms-stat"><span>{label}</span><strong>{value}<small>{unit}</small></strong><em>▲ {trend}</em></article>;
}

function ActionRow({ icon, label, value, href }: { icon: string; label: string; value: number; href: string }) {
  return <Link className="ms-action-row" href={href}><i>{icon}</i><span>{label}</span><b>{value}</b><em>›</em></Link>;
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return <Link className="ms-quick" href={href}><i>{icon}</i><span>{label}</span></Link>;
}

function DeviceSwitch({ current }: { current: "desktop" | "mobile" }) {
  return (
    <nav className="koga-device-switch ms-device-switch" aria-label="เลือกหน้าจอสำหรับดูเว็บ">
      <Link href="/" className={current === "desktop" ? "active" : ""}>Desktop</Link>
      <Link href="/mobile-store" className={current === "mobile" ? "active" : ""}>Mobile</Link>
    </nav>
  );
}

export default function MobileStoreRealPage() {
  const [data, setData] = useState<StoreData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    if (!readSessionToken()) {
      setError("ยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }
    const result = await Promise.allSettled([
      getData<any>("/customers"),
      getData<any>("/devices"),
      getData<any>("/contracts"),
      getData<any>("/payments"),
      getData<any>("/payment-requests"),
      getData<any>("/collection/tasks"),
    ]);
    setData({
      customers: result[0].status === "fulfilled" ? readArray(result[0].value) : [],
      devices: result[1].status === "fulfilled" ? readArray(result[1].value) : [],
      contracts: result[2].status === "fulfilled" ? readArray(result[2].value) : [],
      payments: result[3].status === "fulfilled" ? readArray(result[3].value) : [],
      paymentRequests: result[4].status === "fulfilled" ? readArray(result[4].value) : [],
      collectionTasks: result[5].status === "fulfilled" ? readArray(result[5].value) : [],
    });
    const failed = result.find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "เชื่อมต่อ API ไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const dueSoon = useMemo(() => countDueSoon(data.contracts), [data.contracts]);
  const payToday = useMemo(() => data.paymentRequests.filter((request) => !["CONFIRMED", "REJECTED", "CANCELLED"].includes(String(request.status || "").toUpperCase())).length + data.payments.filter((payment) => String(payment.status || "").toUpperCase() === "VERIFYING").length, [data.paymentRequests, data.payments]);
  const deviceCheck = useMemo(() => data.devices.filter(isDeviceNeedsCheck).length, [data.devices]);
  const activeContracts = useMemo(() => data.contracts.filter((contract) => String(contract.status || "").toUpperCase() === "ACTIVE").length, [data.contracts]);
  const revenue = useMemo(() => data.payments.filter((payment) => String(payment.status || "").toUpperCase() === "CONFIRMED").reduce((sum, payment) => sum + Number(payment.amount || 0), 0), [data.payments]);

  async function logout() {
    await logoutFromApi();
    window.location.assign("/login");
  }

  return (
    <main className="koga-mobile-real">
      {menuOpen ? <button className="ms-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`ms-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="ms-drawer-head"><div className="ms-logo">K</div><div><b>KOGA Lease MDM</b><span>Mobile Store</span></div><button aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)}>×</button></div>
        <DeviceSwitch current="mobile" />
        <nav>{menu.map((item) => <Link key={item.href} href={item.href} className={item.href === "/mobile-store" ? "active" : ""} onClick={() => setMenuOpen(false)}><i>{item.icon}</i><span>{item.label}</span></Link>)}</nav>
        <div className="ms-drawer-status"><b>{error ? "API error" : "API live"}</b><span>{API_BASE}</span></div>
        <button className="ms-logout" onClick={logout}>ออกจากระบบ</button>
      </aside>

      <header className="ms-topbar">
        <button aria-label="เปิดเมนู" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>☰</button>
        <h1><span>KOGA</span> Lease MDM</h1>
        <button aria-label="รีเฟรชข้อมูล" onClick={load}>↻</button>
      </header>
      <DeviceSwitch current="mobile" />

      {error ? <section className="ms-error"><b>ระบบยังไม่พร้อม</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></section> : null}

      <section className="ms-greeting">
        <div className="ms-avatar">อน</div>
        <div><h2>สวัสดีครับ, คุณอนนท์</h2><p>เจ้าของร้าน KOGA Mobile Store</p></div>
      </section>

      <section className="ms-card ms-actions-card">
        <div className="ms-card-head"><h3>สิ่งที่ต้องดำเนินการต่อไป</h3><Link href="/collection">ดูทั้งหมด</Link></div>
        <ActionRow icon="▣" label="สัญญาใกล้ครบกำหนดชำระ" value={dueSoon} href="/contracts" />
        <ActionRow icon="▤" label="ชำระเงินวันนี้" value={payToday} href="/payments" />
        <ActionRow icon="◈" label="อุปกรณ์ที่ต้องตรวจสอบ" value={deviceCheck} href="/devices" />
      </section>

      <section className="ms-card">
        <h3>ภาพรวมร้านค้า</h3>
        <div className="ms-stats-grid">
          <StatBox label="ลูกค้า" value={data.customers.length} unit="คน" trend="จาก API" />
          <StatBox label="อุปกรณ์" value={data.devices.length} unit="เครื่อง" trend="จาก API" />
          <StatBox label="สัญญาที่ใช้งาน" value={activeContracts} unit="สัญญา" trend="จาก API" />
          <StatBox label="รายได้ที่ยืนยันแล้ว" value={baht(revenue)} unit="บาท" trend="จาก API" />
        </div>
      </section>

      <section className="ms-quick-grid">
        <QuickLink href="/contracts" icon="▤" label="สัญญา" />
        <QuickLink href="/payments" icon="฿" label="ชำระเงิน" />
        <QuickLink href="/devices" icon="🛡" label="ตั้งค่า MDM" />
        <QuickLink href="/reports" icon="▥" label="รายงาน" />
      </section>

      {loading ? <div className="ms-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
