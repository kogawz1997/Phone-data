"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { baht } from "@repo/shared";

type Summary = {
  customers: number;
  devices: number;
  leasedDevices: number;
  activeContracts: number;
  overdueContracts: number;
  paidOffContracts: number;
  pendingActions: number;
  transferPendingContracts: number;
  confirmedRevenue: number;
};

type Contract = {
  id: string;
  contractNo: string;
  status: string;
  totalAmount: string;
  customer?: { fullName?: string; phone?: string };
  device?: { brand?: string; model?: string; imei?: string };
  installments?: Array<{ status: string; dueDate: string; amount: string; paidAmount: string }>;
};

type Payment = { id: string; amount: string; status: string; method: string; createdAt?: string; contract?: Contract };
type DeviceAction = { id: string; type: string; status: string; reason?: string; createdAt?: string; device?: { brand?: string; model?: string } };
type Readiness = { status: string; database: string; deviceControlProvider: string; now: string };

function goTab(tabLabel: string) {
  window.sessionStorage.setItem("koga_pending_tab", tabLabel);
  window.location.href = "/";
}

function openPath(path: string) {
  window.location.href = path;
}

function statusText(status?: string) {
  if (!status) return "รอตรวจ";
  return status.replaceAll("_", " ").toLowerCase();
}

function dateTH(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function nextDue(contract: Contract) {
  return contract.installments
    ?.filter((item) => !["PAID", "WAIVED"].includes(item.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
}

export default function AdminCommandCenter() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [actions, setActions] = useState<DeviceAction[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const [s, ct, p, a] = await Promise.all([
        api<Summary>("/reports/summary"),
        api<Contract[]>("/contracts"),
        api<Payment[]>("/payments"),
        api<DeviceAction[]>("/device-actions"),
      ]);
      setSummary(s);
      setContracts(ct);
      setPayments(p);
      setActions(a);
      const readinessResult = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || ""}/ops/readiness`);
      const readinessJson = await readinessResult.json().catch(() => null);
      if (readinessJson?.ok) setReadiness(readinessJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const isHome = window.location.pathname === "/";
    const loggedIn = Boolean(window.localStorage.getItem("koga_admin_token"));
    setActive(isHome && loggedIn);
    if (isHome && loggedIn) void load();
  }, []);

  const pendingPayments = useMemo(() => payments.filter((item) => !["CONFIRMED", "REJECTED", "REFUNDED"].includes(item.status)), [payments]);
  const riskContracts = useMemo(() => contracts.filter((item) => ["OVERDUE", "GRACE_PERIOD", "REVIEW_REQUIRED", "RECOVERY", "RESTRICTED"].includes(item.status)).slice(0, 5), [contracts]);
  const pendingActions = useMemo(() => actions.filter((item) => ["PENDING_APPROVAL", "QUEUED"].includes(item.status)).slice(0, 5), [actions]);
  const activeContracts = summary?.activeContracts ?? contracts.filter((item) => item.status === "ACTIVE").length;

  if (!active) return null;

  const metricCards = [
    { label: "ลูกค้า", value: summary?.customers ?? 0, detail: "โปรไฟล์ในระบบ", icon: "♙" },
    { label: "เครื่อง", value: summary?.devices ?? 0, detail: `${summary?.leasedDevices ?? 0} เครื่องกำลังปล่อย`, icon: "▦" },
    { label: "สัญญา active", value: activeContracts, detail: `${summary?.overdueContracts ?? 0} ค้าง/ต้องตาม`, icon: "▤" },
    { label: "รายรับยืนยัน", value: baht(summary?.confirmedRevenue ?? 0), detail: "ยอดที่ตรวจแล้ว", icon: "฿", wide: true },
  ];

  return (
    <main id="main-content" className="kogaCommandCenter" aria-label="KOGA command center">
      <section className="kcHero">
        <div className="kcHeroCopy">
          <span className="kcEyebrow">KOGA store command center</span>
          <h1>ควบคุมร้านเช่าซื้อได้ครบ โดยไม่ต้องจมกับข้อมูลรก</h1>
          <p>ดูสถานะร้าน ลูกค้า เครื่อง สัญญา งวดชำระ และงาน MDM ในหน้าเดียว แล้วค่อยเจาะไปทำงานเฉพาะจุด</p>
          <div className="kcHeroActions">
            <button type="button" onClick={() => goTab("สัญญา")}>สร้าง / จัดการสัญญา</button>
            <button type="button" className="ghost" onClick={() => goTab("ชำระเงิน")}>ตรวจชำระ {pendingPayments.length ? `(${pendingPayments.length})` : ""}</button>
            <button type="button" className="ghost" onClick={() => openPath("/settings")}>โปรไฟล์ร้าน</button>
          </div>
        </div>
        <aside className="kcPulsePanel">
          <span>สถานะระบบ</span>
          <strong>{readiness?.status ?? (loading ? "checking" : "ready")}</strong>
          <p>Database: {readiness?.database ?? "-"}</p>
          <p>Device provider: {readiness?.deviceControlProvider ?? "local"}</p>
          <button type="button" onClick={load}>{loading ? "กำลังรีเฟรช" : "รีเฟรชข้อมูล"}</button>
        </aside>
      </section>

      {error && <section className="kcNotice" role="alert">{error}</section>}

      <section className="kcMetrics" aria-label="ภาพรวมตัวเลขร้าน">
        {metricCards.map((metric) => (
          <article className={metric.wide ? "wide" : ""} key={metric.label}>
            <i aria-hidden="true">{metric.icon}</i>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <section className="kcWorkGrid">
        <article className="kcPanel priority">
          <div className="kcPanelHead">
            <div><span className="kcEyebrow">Priority queue</span><h2>งานที่ควรจัดการก่อน</h2></div>
            <button type="button" onClick={() => goTab("ติดตามงวด")}>เปิดงานตามงวด</button>
          </div>
          <div className="kcStack">
            <button type="button" onClick={() => goTab("ชำระเงิน")}>
              <span>รายการชำระรอตรวจ</span><strong>{pendingPayments.length}</strong><small>ตรวจยอดก่อนปิดงวด</small>
            </button>
            <button type="button" onClick={() => goTab("ติดตามงวด")}>
              <span>สัญญาค้าง / review</span><strong>{riskContracts.length}</strong><small>ต้องมีหลักฐานการติดตาม</small>
            </button>
            <button type="button" onClick={() => goTab("Device Actions")}>
              <span>MDM action รออนุมัติ</span><strong>{pendingActions.length}</strong><small>ไม่รัน action แบบไม่มีเหตุผล</small>
            </button>
          </div>
        </article>

        <article className="kcPanel">
          <div className="kcPanelHead"><div><span className="kcEyebrow">Risk watch</span><h2>สัญญาที่ต้องจับตา</h2></div><button type="button" onClick={() => goTab("ติดตามงวด")}>ดูทั้งหมด</button></div>
          <div className="kcList">
            {riskContracts.length === 0 && <p className="kcEmpty">ยังไม่มีสัญญาเสี่ยงที่ต้องรีบจัดการ</p>}
            {riskContracts.map((contract) => {
              const due = nextDue(contract);
              return <button type="button" key={contract.id} onClick={() => goTab("ติดตามงวด")}>
                <strong>{contract.contractNo}</strong>
                <span>{contract.customer?.fullName ?? "ไม่ระบุลูกค้า"}</span>
                <small>{contract.device?.brand ?? ""} {contract.device?.model ?? ""} · งวดถัดไป {dateTH(due?.dueDate)}</small>
              </button>;
            })}
          </div>
        </article>

        <article className="kcPanel">
          <div className="kcPanelHead"><div><span className="kcEyebrow">Payment desk</span><h2>ชำระเงินล่าสุด</h2></div><button type="button" onClick={() => goTab("ชำระเงิน")}>ตรวจสลิป</button></div>
          <div className="kcList">
            {pendingPayments.slice(0, 5).map((payment) => (
              <button type="button" key={payment.id} onClick={() => goTab("ชำระเงิน")}>
                <strong>{baht(Number(payment.amount))}</strong>
                <span>{payment.contract?.customer?.fullName ?? payment.method}</span>
                <small>{statusText(payment.status)} · {dateTH(payment.createdAt)}</small>
              </button>
            ))}
            {pendingPayments.length === 0 && <p className="kcEmpty">ไม่มีรายการชำระที่รอตรวจ</p>}
          </div>
        </article>

        <article className="kcPanel shortcuts">
          <div className="kcPanelHead"><div><span className="kcEyebrow">Shortcuts</span><h2>ทางลัดงานหลัก</h2></div></div>
          <div className="kcShortcutGrid">
            <button type="button" onClick={() => goTab("ลูกค้า")}>ลูกค้า</button>
            <button type="button" onClick={() => goTab("สต็อกเครื่อง")}>สต็อกเครื่อง</button>
            <button type="button" onClick={() => goTab("สัญญา")}>สัญญา</button>
            <button type="button" onClick={() => goTab("MDM Setup")}>MDM setup</button>
            <button type="button" onClick={() => openPath("/customer-access")}>ผู้ใช้</button>
            <button type="button" onClick={() => openPath("/payment-requests")}>QR งวด</button>
          </div>
        </article>
      </section>
    </main>
  );
}
