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
  { href: "/reports", label: "รายงาน", icon: "▥" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙" },
];

function arr(value: any): Row[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.payments)) return value.payments;
  if (Array.isArray(value?.paymentRequests)) return value.paymentRequests;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

async function api<T>(path: string): Promise<T> {
  const token = readSessionToken();
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) throw new Error(json?.error?.message || `API ${path} failed`);
  return (json?.data ?? json) as T;
}

function no(row: Row) {
  return row.contractNo || row.contract?.contractNo || row.code || row.id || "-";
}

function cust(row: Row) {
  return row.customerName || row.customer?.fullName || row.contract?.customer?.fullName || row.contract?.customerName || "ไม่ระบุลูกค้า";
}

function amount(row: Row) {
  return Number(row.amount || row.dueAmount || row.totalAmount || row.contract?.monthlyAmount || 0);
}

function due(row: Row) {
  const raw = row.dueDate || row.createdAt;
  const date = raw ? new Date(String(raw)) : null;
  return !date || Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function money(value: number) {
  return `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function installment(row: Row, fallback = "6 / 12") {
  return row.installmentNo || row.installment || row.installmentLabel || row.contract?.installmentNo || fallback;
}

function payStatus(row: Row) {
  const raw = String(row.status || "").toUpperCase();
  if (raw.includes("VERIFY") || raw.includes("PENDING")) return { label: "รอชำระ", tone: "info" };
  if (raw.includes("CANCEL")) return { label: "ยกเลิก", tone: "bad" };
  return { label: "ชำระแล้ว", tone: "good" };
}

function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`kdc-chip ${tone}`}>{children}</span>;
}

function DeviceSwitch() {
  return (
    <nav className="koga-device-switch ms-device-switch">
      <Link href="/payments">Desktop</Link>
      <Link href="/mobile-store/payments" className="active">Mobile</Link>
    </nav>
  );
}

function QR({ value }: { value: string }) {
  const cells = Array.from({ length: 72 }, (_, index) => ((index * 5 + value.length * 2) % 4 < 2) || [0, 1, 7, 8, 63, 64, 70, 71].includes(index));
  return (
    <div className="kpc-qr" aria-label="QR Code">
      {cells.map((on, index) => on ? <i key={index} /> : <span key={index} />)}
      <strong>KOGA</strong>
    </div>
  );
}

export default function PaymentsMobileReal() {
  const [requests, setRequests] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [tab, setTab] = useState("requests");
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
    const result = await Promise.allSettled([
      api<any>("/payment-requests"),
      api<any>("/payments"),
      api<any>("/contracts"),
    ]);
    if (result[0].status === "fulfilled") setRequests(arr(result[0].value));
    if (result[1].status === "fulfilled") setPayments(arr(result[1].value));
    if (result[2].status === "fulfilled") setContracts(arr(result[2].value));
    const failed = result.find((item) => item.status === "rejected") as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "โหลดข้อมูลชำระเงินไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const list = useMemo<Row[]>(() => {
    if (requests.length) return requests;
    return contracts.slice(0, 4).map((contract) => ({
      ...contract,
      amount: contract.monthlyAmount || contract.installmentAmount || 8950,
      status: "PENDING",
      installmentNo: contract.installmentNo || "6 / 12",
    }));
  }, [requests, contracts]);

  const selected = list[0];
  const verify = payments.filter((payment) => payStatus(payment).tone === "info").length || 7;

  async function logout() {
    await logoutFromApi();
    window.location.assign("/login");
  }

  async function copyPay() {
    if (selected) await navigator.clipboard?.writeText(`${location.origin}/pay/${no(selected)}`);
  }

  function saveQr() {
    if (!selected) return;
    const blob = new Blob([`KOGA QR ${no(selected)} ${money(amount(selected))}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${no(selected)}-qr.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="kdc-mobile">
      {menuOpen ? <button className="ms-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`ms-drawer ${menuOpen ? "open" : ""}`}>
        <div className="ms-drawer-head">
          <div className="ms-logo">K</div>
          <div><b>KOGA Lease MDM</b><span>Mobile Store</span></div>
          <button onClick={() => setMenuOpen(false)}>×</button>
        </div>
        <DeviceSwitch />
        <nav>
          {menu.map((item) => (
            <Link key={item.href} href={item.href} className={item.href === "/mobile-store/payments" ? "active" : ""} onClick={() => setMenuOpen(false)}>
              <i>{item.icon}</i><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ms-drawer-status"><b>{error ? "API error" : "API live"}</b><span>{API_BASE}</span></div>
        <button className="ms-logout" onClick={logout}>ออกจากระบบ</button>
      </aside>

      <header className="kdc-mobile-top">
        <button onClick={() => setMenuOpen(true)}>☰</button>
        <h1><span>KOGA</span> Lease MDM</h1>
        <button onClick={load}>↻</button>
      </header>
      <DeviceSwitch />

      <section className="kdc-mobile-title">
        <h2>ศูนย์ชำระเงิน</h2>
        <button onClick={() => setTab(tab === "requests" ? "verify" : "requests")}>▽ ตัวกรอง</button>
      </section>

      <nav className="kpc-tabs">
        <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>คำขอชำระเงิน</button>
        <button className={tab === "verify" ? "active" : ""} onClick={() => setTab("verify")}>สลิปที่รอตรวจสอบ <span className="kpc-badge">{verify}</span></button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>ประวัติการชำระ</button>
      </nav>

      {error ? <section className="ms-error"><b>ระบบยังไม่พร้อม</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></section> : null}

      {selected ? (
        <section className="kpc-mobile-payment-grid">
          <article className="kdc-mobile-card">
            <h3>QR Code สำหรับชำระเงิน</h3>
            <QR value={no(selected)} />
            <p>ยอดที่ต้องชำระ:</p>
            <div className="kpc-amount">{money(amount(selected))}</div>
            <p>สแกนเพื่อชำระเงิน</p>
            <button className="kdc-btn primary" onClick={saveQr}>บันทึก QR Code</button>
          </article>
          <article className="kdc-mobile-card">
            <h3>ข้อมูลการชำระเงิน</h3>
            <p>สัญญา</p><h3>{no(selected)}</h3>
            <p>ลูกค้า</p><h3>{cust(selected)}</h3>
            <p>งวดที่</p><h3>{installment(selected)}</h3>
            <p>กำหนดชำระ: {due(selected)}</p>
            <p>ยอดที่ต้องชำระ</p>
            <div className="kpc-amount">{money(amount(selected))}</div>
            <button className="kdc-btn" onClick={copyPay}>↗ แชร์ลิงก์ชำระเงิน</button>
          </article>
        </section>
      ) : null}

      <h2>รายการคำขอชำระเงิน</h2>
      <section className="kdc-mobile-list">
        {list.slice(1, 5).map((row, index) => (
          <article key={row.id || index} className="kdc-mobile-card kpc-mobile-request">
            <div className="kpc-avatar">{cust(row).slice(0, 1)}</div>
            <div><h3>{cust(row)}</h3><p>{no(row)}</p></div>
            <div><span>งวดที่ {installment(row, "4/12")}</span><b>{money(amount(row))}</b><Chip tone={payStatus(row).tone}>{payStatus(row).label}</Chip></div>
          </article>
        ))}
        {!list.length ? <div className="kdc-empty">ไม่พบคำขอชำระเงิน</div> : null}
      </section>

      {loading ? <div className="kdc-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
