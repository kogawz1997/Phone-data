"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE, logoutFromApi, readSessionToken } from "../auth-client";

type Row = Record<string, any>;
type RiskRow = Row & { score: number; level: "high" | "medium" | "low"; customerId: string; customerName: string; phone: string; reason: string };

const nav = [
  ["/", "⌂", "หน้าหลัก"],
  ["/customers", "♙", "ลูกค้า"],
  ["/devices", "▣", "เครื่อง"],
  ["/contracts", "▤", "สัญญา"],
  ["/payments", "◉", "ชำระเงิน"],
  ["/collection", "◎", "ติดตามงาน"],
  ["/risk", "◇", "ความเสี่ยง"],
  ["/reports", "⌁", "รายงาน"],
  ["/settings", "⚙", "ตั้งค่า"],
  ["/users", "♙", "ผู้ใช้ & สิทธิ์"],
] as const;

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
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) throw new Error(json?.error?.message || `API ${path} failed`);
  return (json?.data ?? json) as T;
}

function customerName(row: Row) {
  return row.fullName || row.name || row.customerName || row.customer?.fullName || "ไม่ระบุลูกค้า";
}

function phone(row: Row) {
  return row.phone || row.mobile || row.customer?.phone || "-";
}

function money(value: number) {
  return `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function level(score: number): RiskRow["level"] {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function levelText(value: RiskRow["level"]) {
  if (value === "high") return "เสี่ยงสูง";
  if (value === "medium") return "เฝ้าระวัง";
  return "ความเสี่ยงต่ำ";
}

function tone(value: RiskRow["level"]) {
  if (value === "high") return "bad";
  if (value === "medium") return "warn";
  return "good";
}

function Chip({ children, tone }: { children: string; tone: string }) {
  return <span className={`kdc-chip ${tone}`}>{children}</span>;
}

function DeviceSwitch() {
  return (
    <nav className="koga-device-switch">
      <Link href="/risk" className="active">Desktop</Link>
      <Link href="/mobile-store/risk">Mobile</Link>
    </nav>
  );
}

function scoreFrom(customer: Row, contracts: Row[], collection: Row[], riskRow?: Row): number {
  const raw = Number(riskRow?.score ?? riskRow?.riskScore ?? customer.riskScore ?? customer.creditRiskScore);
  if (Number.isFinite(raw) && raw > 0) return Math.min(100, Math.max(0, raw));
  const customerId = customer.id || customer.customerId;
  const ownContracts = contracts.filter((contract) => String(contract.customerId || contract.customer?.id || contract.customer?.customerId || "") === String(customerId));
  const overdueContracts = ownContracts.filter((contract) => String(contract.status || "").toUpperCase().includes("OVER"));
  const ownCollection = collection.filter((task) => String(task.customerId || task.customer?.id || task.contract?.customerId || "") === String(customerId));
  return Math.min(100, 18 + overdueContracts.length * 28 + ownCollection.length * 12 + Math.min(ownContracts.length, 5) * 5);
}

function deriveRisk(customers: Row[], contracts: Row[], collection: Row[], riskRows: Row[]): RiskRow[] {
  return customers.map((customer, index) => {
    const riskRow = riskRows.find((row) => String(row.customerId || row.customer?.id || row.id) === String(customer.id));
    const score = scoreFrom(customer, contracts, collection, riskRow);
    const currentLevel = level(score);
    return {
      ...customer,
      ...riskRow,
      id: customer.id || riskRow?.id || `risk-${index}`,
      customerId: String(customer.id || riskRow?.customerId || `risk-${index}`),
      customerName: customerName(customer),
      phone: phone(customer),
      score,
      level: currentLevel,
      reason: riskRow?.reason || riskRow?.summary || (currentLevel === "high" ? "ค้างชำระหรือมีประวัติติดตามหลายรายการ" : currentLevel === "medium" ? "มีพฤติกรรมที่ควรเฝ้าระวัง" : "ประวัติชำระเงินอยู่ในเกณฑ์ปกติ"),
    };
  });
}

export default function RiskPage() {
  const [customers, setCustomers] = useState<Row[]>([]);
  const [contracts, setContracts] = useState<Row[]>([]);
  const [collection, setCollection] = useState<Row[]>([]);
  const [riskApiRows, setRiskApiRows] = useState<Row[]>([]);
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
    const result = await Promise.allSettled([
      api<any>("/customers"),
      api<any>("/contracts"),
      api<any>("/collection/tasks"),
      api<any>("/risk/customers"),
    ]);
    if (result[0].status === "fulfilled") setCustomers(arr(result[0].value));
    if (result[1].status === "fulfilled") setContracts(arr(result[1].value));
    if (result[2].status === "fulfilled") setCollection(arr(result[2].value));
    if (result[3].status === "fulfilled") setRiskApiRows(arr(result[3].value));
    const failed = result.find((item, index) => item.status === "rejected" && index < 2) as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || "โหลดข้อมูลความเสี่ยงไม่สำเร็จ");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => deriveRisk(customers, contracts, collection, riskApiRows), [customers, contracts, collection, riskApiRows]);
  const sorted = useMemo(() => [...rows].sort((a, b) => b.score - a.score), [rows]);
  const avg = Math.round(rows.reduce((sum, row) => sum + row.score, 0) / Math.max(rows.length, 1));
  const high = rows.filter((row) => row.level === "high");
  const medium = rows.filter((row) => row.level === "medium");
  const low = rows.filter((row) => row.level === "low");
  const heat = [2, 5, 8, 14, 7, 3, 6, 9, 11, 6, 6, 10, 12, 13, 7, 8, 14, 16, 12, 9, 15, 22, 28, 18, 11];

  function exportRisk() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "koga-risk-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await logoutFromApi();
    window.location.assign("/login");
  }

  return (
    <main className="kdc-shell kdr-shell">
      <aside className="kc-sidebar">
        <div className="kc-brand"><div>K</div><b>KOGA Lease MDM</b></div>
        <nav>
          {nav.map(([href, icon, label]) => (
            <Link key={href} href={href} className={href === "/risk" ? "active" : ""}><i>{icon}</i><span>{label}</span></Link>
          ))}
        </nav>
        <div className="kc-store"><div>K</div><b>KOGA Store</b><span>สาขา รัตนาธิเบศร์</span><em>⌄</em></div>
        <button className="kc-logout" onClick={logout}>⇱ ออกจากระบบ</button>
      </aside>

      <section className="kdc-main">
        <div className="kdc-toolbar">
          <div className="kdc-breadcrumb"><Link href="/">หน้าหลัก</Link><span>/</span><b>ความเสี่ยงลูกค้า</b></div>
          <DeviceSwitch />
        </div>

        <header className="kdc-header">
          <div>
            <h1>ภาพรวมความเสี่ยงลูกค้า</h1>
            <p>ประเมินความเสี่ยงและคะแนนในภาพรวมจากพฤติกรรมการชำระเงินและสถานะการใช้งานเครื่อง</p>
          </div>
          <div className="kdc-actions"><button className="kdc-btn" onClick={exportRisk}>⇧ ส่งออก</button><button className="kdc-btn">⚙ ตั้งค่าเกณฑ์</button></div>
        </header>

        {error ? <div className="kdc-alert"><b>ระบบแจ้งเตือน</b><span>{error}</span><Link href="/login">เข้าสู่ระบบ</Link></div> : null}

        <section className="kdc-stats kdr-risk-stats">
          <article className="kdc-stat warn"><span>คะแนนความเสี่ยงเฉลี่ย</span><strong>{avg}<small>/100</small></strong><p>ระดับ{avg >= 70 ? "สูง" : avg >= 40 ? "ปานกลาง" : "ต่ำ"}</p></article>
          <article className="kdc-stat bad"><span>ลูกค้าความเสี่ยงสูง</span><strong>{high.length}<small>ราย</small></strong><p>{rows.length ? ((high.length / rows.length) * 100).toFixed(1) : "0.0"}% ของลูกค้าทั้งหมด</p></article>
          <article className="kdc-stat warn"><span>ลูกค้าที่ต้องเฝ้าระวัง</span><strong>{medium.length}<small>ราย</small></strong><p>{rows.length ? ((medium.length / rows.length) * 100).toFixed(1) : "0.0"}% ของลูกค้าทั้งหมด</p></article>
          <article className="kdc-stat good"><span>ลูกค้าความเสี่ยงต่ำ</span><strong>{low.length}<small>ราย</small></strong><p>{rows.length ? ((low.length / rows.length) * 100).toFixed(1) : "0.0"}% ของลูกค้าทั้งหมด</p></article>
        </section>

        <section className="kdr-risk-grid">
          <article className="kdc-card kpc-card-pad">
            <h2>รายการเตือนความเสี่ยง</h2>
            <div className="kdr-alert-list">
              {sorted.slice(0, 5).map((row) => (
                <div key={row.customerId} className="kdr-alert-row">
                  <i>{row.customerName.slice(0, 2).toUpperCase()}</i>
                  <div><b>{row.customerName}</b><span>{row.reason}</span></div>
                  <strong className={tone(row.level)}>{row.score}</strong>
                  <Chip tone={tone(row.level)}>{levelText(row.level)}</Chip>
                </div>
              ))}
              {!sorted.length ? <div className="kdc-empty">ยังไม่มีข้อมูลลูกค้า</div> : null}
            </div>
            <Link href="/customers" className="kdr-link">ดูทั้งหมด ›</Link>
          </article>

          <article className="kdc-card kpc-card-pad">
            <h2>เมทริกซ์ความเสี่ยง</h2>
            <div className="kdr-heatmap">
              {heat.map((value, index) => <span key={index} className={value > 20 ? "good" : value > 12 ? "warn" : value > 7 ? "hot" : "bad"}>{value}</span>)}
            </div>
            <p className="kdr-muted">พฤติกรรมการชำระเงิน × สถานะการใช้งานเครื่อง</p>
            <Link href="/reports" className="kdr-link">ดูรายละเอียด ›</Link>
          </article>

          <article className="kdc-card kpc-card-pad">
            <h2>แนวทางการดำเนินงานแนะนำ</h2>
            <div className="kdr-action-list">
              <div><i className="bad" /> <b>ติดตามลูกค้าเสี่ยงสูง</b><span>ติดต่อและเร่งรัดการชำระเงินทันที พร้อมประเมินความสามารถในการชำระหนี้</span></div>
              <div><i className="warn" /> <b>เฝ้าระวังอย่างใกล้ชิด</b><span>ติดตามพฤติกรรมการชำระเงินและการใช้งานเครื่องต่อเนื่อง</span></div>
              <div><i className="good" /> <b>ดูแลเชิงรุก</b><span>เสนอแผนการชำระเงินและโปรโมชันเพื่อรักษาความสัมพันธ์</span></div>
              <div><i className="info" /> <b>ทบทวนเกณฑ์ความเสี่ยง</b><span>ตรวจสอบและปรับเกณฑ์การประเมินเป็นประจำเพื่อความแม่นยำ</span></div>
            </div>
          </article>
        </section>
      </section>
      {loading ? <div className="kdc-loading">กำลังโหลดข้อมูลจริงจาก API...</div> : null}
    </main>
  );
}
