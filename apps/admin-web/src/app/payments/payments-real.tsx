"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "../auth-client";

type Row = Record<string, any>;

const nav = [
  ["/", "⌂", "หน้าหลัก"],
  ["/customers", "♙", "ลูกค้า"],
  ["/devices", "▣", "อุปกรณ์"],
  ["/contracts", "▤", "สัญญา"],
  ["/payments", "◉", "คำขอ"],
  ["/collection", "◎", "ติดตามทวงถาม"],
  ["/reports", "⌁", "รายงาน"],
  ["/settings", "⚙", "ตั้งค่า"],
  ["/users", "♙", "ผู้ใช้ & สิทธิ์"],
] as const;

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

function rowKey(row: Row) {
  return String(row.id || row.paymentRequestId || row.contractId || row.contract?.id || no(row));
}

function cust(row: Row) {
  return row.customerName || row.customer?.fullName || row.contract?.customer?.fullName || row.contract?.customerName || "ไม่ระบุลูกค้า";
}

function dev(row: Row) {
  return row.deviceName || row.device?.name || row.contract?.device?.name || row.contract?.deviceName || "-";
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

function time(row: Row) {
  const raw = row.paidAt || row.updatedAt || row.createdAt;
  const date = raw ? new Date(String(raw)) : null;
  return !date || Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function money(value: number) {
  return `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function status(row: Row) {
  const raw = String(row.status || "").toUpperCase();
  if (raw.includes("OVER")) return { label: "Overdue", tone: "bad" };
  if (raw.includes("VERIFY") || raw.includes("PENDING") || raw.includes("WAIT")) return { label: "รอตรวจสอบ", tone: "info" };
  return { label: "Active", tone: "good" };
}

function payStatus(row: Row) {
  const raw = String(row.status || "").toUpperCase();
  if (raw.includes("CANCEL")) return { label: "ยกเลิก", tone: "bad" };
  if (raw.includes("VERIFY") || raw.includes("PENDING")) return { label: "รอตรวจสอบ", tone: "info" };
  return { label: "ชำระเงินสำเร็จ", tone: "good" };
}

function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`kdc-chip ${tone}`}>{children}</span>;
}

function DeviceSwitch() {
  return (
    <nav className="koga-device-switch">
      <Link href="/payments" className="active">Desktop</Link>
      <Link href="/mobile-store/payments">Mobile</Link>
    </nav>
  );
}

function QR({ value }: { value: string }) {
  const cells = Array.from({ length: 72 }, (_, index) => ((index * 7 + value.length * 3) % 5 < 2) || [0, 1, 7, 8, 63, 64, 70, 71].includes(index));
  return (
    <div className="kpc-qr" aria-label="QR Code">
      {cells.map((on, index) => on ? <i key={index} /> : <span key={index} />)}
      <strong>KOGA</strong>
    </div>
  );
}

export default function PaymentsReal() {
  const [requests, setRequests] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [tab, setTab] = useState("requests");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");

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

  const requestRows = useMemo<Row[]>(() => {
    if (requests.length) return requests;
    return contracts.slice(0, 8).map((contract) => ({
      ...contract,
      id: contract.id || contract.contractId || contract.contractNo || contract.code,
      amount: contract.monthlyAmount || contract.installmentAmount || 8900,
      status: contract.status || "ACTIVE",
    }));
  }, [requests, contracts]);

  const filtered = useMemo<Row[]>(() => {
    const keyword = query.toLowerCase().trim();
    return requestRows.filter((row) => `${no(row)} ${cust(row)} ${dev(row)}`.toLowerCase().includes(keyword));
  }, [requestRows, query]);

  const selected = filtered.find((row) => rowKey(row) === selectedId) || filtered[0];
  const verifyCount = payments.filter((payment) => payStatus(payment).tone === "info").length || requests.filter((request) => status(request).tone === "info").length;

  async function logout() {
    await logoutFromApi();
    window.location.assign("/login");
  }

  async function copyPayment() {
    if (!selected) return;
    await navigator.clipboard?.writeText(`${location.origin}/pay/${no(selected)}`);
  }

  function downloadQr() {
    if (!selected) return;
    const blob = new Blob([
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="white"/><text x="200" y="200" text-anchor="middle" font-size="28" fill="#1677ff">KOGA ${no(selected)}</text></svg>`,
    ], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${no(selected)}-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="kdc-shell">
      <aside className="kc-sidebar">
        <div className="kc-brand"><div>K</div><b>KOGA Lease MDM</b></div>
        <nav>
          {nav.map(([href, icon, label]) => (
            <Link key={href} href={href} className={href === "/payments" ? "active" : ""}>
              <i>{icon}</i><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="kc-store"><div>K</div><b>KOGA Store</b><span>สาขา นนทบุรี</span><em>⌄</em></div>
        <button className="kc-logout" onClick={logout}>⇱ ออกจากระบบ</button>
      </aside>

      <section className="kdc-main">
        <div className="kdc-toolbar">
          <div className="kdc-breadcrumb"><Link href="/payments">ชำระเงิน</Link><span>/</span><b>Payments Desk</b></div>
          <DeviceSwitch />
        </div>

        <header className="kdc-header">
          <div><h1>ศูนย์รับชำระเงิน</h1><p>จัดการคำขอรับชำระเงิน ตรวจสอบสถานะ และยืนยันการชำระเงิน</p></div>
          <div className="kdc-actions"><button className="kdc-btn">▤ รายงาน</button><button className="kdc-btn">⚙ ตั้งค่า</button></div>
        </header>

        {error ? <div className="kdc-alert"><b>ระบบแจ้งเตือน</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></div> : null}

        <nav className="kpc-tabs">
          <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>คำขอชำระเงิน</button>
          <button className={tab === "verify" ? "active" : ""} onClick={() => setTab("verify")}>รอการตรวจสอบ <span className="kpc-badge">{verifyCount}</span></button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>ประวัติการชำระเงิน</button>
        </nav>

        <section className="kpc-pay-grid">
          <article className="kdc-card kpc-card-pad">
            <h2>คำขอชำระเงิน</h2>
            <div className="kdc-filterbar" style={{ gridTemplateColumns: "1fr 110px", marginBottom: 12 }}>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาสัญญา, ลูกค้า, เลขที่คำขอ" />
              <button className="kdc-btn">▽ ตัวกรอง</button>
            </div>
            <div className="kpc-list">
              {filtered.slice(0, 6).map((row) => {
                const key = rowKey(row);
                return (
                  <button key={key} className={`kpc-request ${selected && rowKey(selected) === key ? "active" : ""}`} onClick={() => setSelectedId(key)}>
                    <div><b>{no(row)}</b><span>{due(row)}</span></div>
                    <div><strong>{cust(row)}</strong><span>{dev(row)}</span></div>
                    <div><b>{money(amount(row))}</b><Chip tone={status(row).tone}>{status(row).label}</Chip></div>
                  </button>
                );
              })}
              {!filtered.length ? <div className="kdc-empty">ไม่พบคำขอชำระเงิน</div> : null}
            </div>
            <button className="kdc-btn primary" style={{ width: "100%", marginTop: 16 }}>ดูรายการทั้งหมด</button>
          </article>

          <article className="kdc-card kpc-card-pad">
            <h2>QR สำหรับชำระเงิน</h2>
            {selected ? (
              <div className="kpc-qr-box">
                <span>เลขที่คำขอรับชำระเงิน</span><b>{no(selected)}</b>
                <span>ชื่อลูกค้า</span><b>{cust(selected)}</b>
                <span>จำนวนเงินที่ต้องชำระ</span><div className="kpc-amount">{money(amount(selected))}</div>
                <span>ครบกำหนด {due(selected)}</span>
                <QR value={no(selected)} />
                <button className="kdc-btn primary" onClick={downloadQr}>▣ ดาวน์โหลด QR</button>
                <button className="kdc-btn" onClick={copyPayment}>⧉ คัดลอกข้อมูล</button>
              </div>
            ) : <div className="kdc-empty">เลือกคำขอเพื่อสร้าง QR</div>}
          </article>

          <article className="kdc-card kpc-card-pad">
            <h2>ชำระเงินล่าสุด</h2>
            <div className="kpc-timeline">
              {payments.slice(0, 6).map((payment, index) => (
                <div className="kpc-time-row" key={rowKey(payment) || index}>
                  <i className={`kpc-dot ${payStatus(payment).tone === "info" ? "info" : payStatus(payment).tone === "bad" ? "bad" : ""}`} />
                  <div><b>{payStatus(payment).label}</b><span>{time(payment)}</span><b>{no(payment)}</b></div>
                  <strong>{money(amount(payment))}</strong>
                </div>
              ))}
              {!payments.length ? <div className="kdc-empty">ยังไม่มีประวัติการชำระเงิน</div> : null}
            </div>
            <Link className="kdc-btn" href="/payments" style={{ marginTop: 14 }}>ทั้งหมด</Link>
          </article>
        </section>
      </section>
      {loading ? <div className="kdc-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
