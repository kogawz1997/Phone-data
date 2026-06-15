"use client";

import { useMemo, useState } from "react";
import "./production-workflows.css";

type WorkflowTab = "contract" | "payment" | "collection" | "settings" | "notification" | "documents";

type ContractDraft = {
  customerName: string;
  deviceName: string;
  salePrice: number;
  downPayment: number;
  months: number;
  startDate: string;
};

const tabs: Array<{ key: WorkflowTab; label: string; caption: string }> = [
  { key: "contract", label: "Contract Wizard", caption: "สร้างสัญญา" },
  { key: "payment", label: "Payment Review", caption: "ตรวจยอด" },
  { key: "collection", label: "Collection CRM", caption: "ติดตามงวด" },
  { key: "settings", label: "Store Settings", caption: "ตั้งค่าร้าน" },
  { key: "notification", label: "Notification Center", caption: "แจ้งเตือน" },
  { key: "documents", label: "Document & Consent", caption: "เอกสาร" },
];

const paymentRows = [
  { customer: "สมชาย ใจดี", contract: "KOGA-0001", amount: 2490, status: "รอตรวจ", evidence: "slip_001.jpg" },
  { customer: "มาลี ทดสอบ", contract: "KOGA-0002", amount: 1890, status: "รอหลักฐาน", evidence: "-" },
  { customer: "อนันต์ โมบาย", contract: "KOGA-0003", amount: 3290, status: "ยืนยันแล้ว", evidence: "slip_003.jpg" },
];

const collectionRows = [
  { customer: "สมชาย ใจดี", due: "วันนี้", level: "เตือนก่อนครบกำหนด", next: "ส่ง LINE" },
  { customer: "มาลี ทดสอบ", due: "ค้าง 3 วัน", level: "ติดตาม", next: "โทร + บันทึกผล" },
  { customer: "อนันต์ โมบาย", due: "ค้าง 7 วัน", level: "เสี่ยง", next: "นัดชำระ / review" },
];

const templates = [
  { name: "ก่อนครบกำหนด", channel: "LINE", body: "แจ้งเตือน: งวดของคุณจะครบกำหนดในอีก 3 วัน ยอด {{amount}} บาท" },
  { name: "ครบกำหนดวันนี้", channel: "SMS", body: "วันนี้ครบกำหนดชำระงวด กรุณาชำระผ่าน QR ในพอร์ทัล" },
  { name: "ยืนยันรับเงิน", channel: "LINE", body: "ร้านยืนยันการชำระเงินเรียบร้อย ขอบคุณครับ/ค่ะ" },
];

const documents = [
  { title: "สัญญาเช่าใช้พร้อมสิทธิ์ซื้อขาด", status: "พร้อมสร้าง PDF", type: "Contract" },
  { title: "หนังสือยินยอมการจัดการอุปกรณ์", status: "ต้องให้ลูกค้ายอมรับ", type: "Consent" },
  { title: "Privacy Notice / PDPA", status: "รอตรวจข้อความจริง", type: "Legal" },
  { title: "รูปเครื่อง / กล่อง / IMEI", status: "รอ Storage Provider", type: "Evidence" },
];

function money(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value || 0);
}

function addMonths(date: string, months: number) {
  const base = date ? new Date(date) : new Date();
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default function ProductionWorkflowsPage() {
  const [active, setActive] = useState<WorkflowTab>("contract");
  const [draft, setDraft] = useState<ContractDraft>({
    customerName: "ลูกค้าทดสอบ",
    deviceName: "iPhone 14 Pro Max 256GB",
    salePrice: 35900,
    downPayment: 5000,
    months: 12,
    startDate: new Date().toISOString().slice(0, 10),
  });

  const principal = Math.max(0, draft.salePrice - draft.downPayment);
  const monthly = Math.ceil(principal / Math.max(1, draft.months));
  const completion = useMemo(() => {
    const checks = [draft.customerName, draft.deviceName, draft.salePrice > 0, draft.downPayment >= 0, draft.months > 0, draft.startDate];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [draft]);

  return (
    <main className="wf-page">
      <section className="wf-hero">
        <a className="wf-back" href="/">← กลับหน้า Admin</a>
        <div>
          <p className="wf-kicker">Production Workflow Console</p>
          <h1>ศูนย์ทำงานจริงของร้าน</h1>
          <p>รวม flow ที่ร้านใช้ทุกวัน: สร้างสัญญา ตรวจชำระเงิน ติดตามงวด ตั้งค่าร้าน แจ้งเตือน และจัดการเอกสารในจุดเดียว</p>
        </div>
        <div className="wf-health">
          <span>Workflow Readiness</span>
          <strong>{completion}%</strong>
          <small>คำนวณจากข้อมูล draft สัญญา</small>
        </div>
      </section>

      <nav className="wf-tabs">
        {tabs.map((tab) => (
          <button key={tab.key} className={active === tab.key ? "active" : ""} onClick={() => setActive(tab.key)}>
            <strong>{tab.label}</strong>
            <span>{tab.caption}</span>
          </button>
        ))}
      </nav>

      {active === "contract" && (
        <section className="wf-grid two">
          <form className="wf-card wf-form">
            <div className="wf-card-head">
              <div><p className="wf-kicker">Step-by-step</p><h2>Contract Wizard</h2></div>
              <span className="wf-badge good">Draft Ready</span>
            </div>
            <label>ชื่อลูกค้า<input value={draft.customerName} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} /></label>
            <label>เครื่อง / รุ่น<input value={draft.deviceName} onChange={(e) => setDraft({ ...draft, deviceName: e.target.value })} /></label>
            <div className="wf-row">
              <label>ราคาขาย<input type="number" value={draft.salePrice} onChange={(e) => setDraft({ ...draft, salePrice: Number(e.target.value) })} /></label>
              <label>เงินดาวน์<input type="number" value={draft.downPayment} onChange={(e) => setDraft({ ...draft, downPayment: Number(e.target.value) })} /></label>
            </div>
            <div className="wf-row">
              <label>จำนวนงวด<input type="number" value={draft.months} onChange={(e) => setDraft({ ...draft, months: Number(e.target.value) })} /></label>
              <label>วันเริ่ม<input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
            </div>
            <div className="wf-actions"><button type="button">ตรวจสรุป</button><button type="button" className="secondary">สร้าง PDF Draft</button></div>
          </form>

          <aside className="wf-card wf-summary">
            <p className="wf-kicker">Contract Preview</p>
            <h2>{draft.customerName || "ยังไม่ระบุลูกค้า"}</h2>
            <div className="wf-device">{draft.deviceName}</div>
            <div className="wf-stat"><span>ราคาขาย</span><strong>{money(draft.salePrice)}</strong></div>
            <div className="wf-stat"><span>เงินดาวน์</span><strong>{money(draft.downPayment)}</strong></div>
            <div className="wf-stat"><span>ยอดจัด</span><strong>{money(principal)}</strong></div>
            <div className="wf-stat highlight"><span>งวดละ</span><strong>{money(monthly)}</strong></div>
            <div className="wf-timeline">
              <b>จ่ายครบโดยประมาณ</b>
              <span>{addMonths(draft.startDate, draft.months)}</span>
            </div>
          </aside>
        </section>
      )}

      {active === "payment" && (
        <section className="wf-card">
          <div className="wf-card-head"><div><p className="wf-kicker">Payment Operations</p><h2>Payment Review Flow</h2></div><span className="wf-badge warn">3 รายการ</span></div>
          <div className="wf-table">
            <table><thead><tr><th>ลูกค้า</th><th>สัญญา</th><th>ยอด</th><th>หลักฐาน</th><th>สถานะ</th><th>Action</th></tr></thead><tbody>
              {paymentRows.map((row) => <tr key={row.contract}><td>{row.customer}</td><td>{row.contract}</td><td>{money(row.amount)}</td><td>{row.evidence}</td><td><span className="wf-chip">{row.status}</span></td><td><button>ตรวจ</button></td></tr>)}
            </tbody></table>
          </div>
        </section>
      )}

      {active === "collection" && (
        <section className="wf-grid three">
          {collectionRows.map((row) => <article className="wf-card" key={row.customer}><p className="wf-kicker">{row.level}</p><h2>{row.customer}</h2><div className="wf-device">{row.due}</div><p>{row.next}</p><button>บันทึกการติดตาม</button></article>)}
        </section>
      )}

      {active === "settings" && (
        <section className="wf-grid two">
          <form className="wf-card wf-form">
            <div className="wf-card-head"><div><p className="wf-kicker">Store Setup</p><h2>Store Settings</h2></div><span className="wf-badge good">Pilot</span></div>
            <label>ชื่อร้าน<input defaultValue="KOGA Mobile" /></label>
            <label>เบอร์ติดต่อ<input defaultValue="099-999-9999" /></label>
            <label>PromptPay ID<input placeholder="เลขพร้อมเพย์" /></label>
            <div className="wf-row"><label>Grace Period<input defaultValue="3" /></label><label>ค่าปรับล่าช้า<input defaultValue="0" /></label></div>
            <button type="button">บันทึกการตั้งค่า</button>
          </form>
          <aside className="wf-card"><p className="wf-kicker">Readiness</p><h2>ค่าที่ควรตั้งก่อนขายจริง</h2><ul className="wf-list"><li>ข้อมูลร้านและภาษี</li><li>PromptPay / Payment provider</li><li>ข้อความแจ้งเตือน</li><li>Grace period และเงื่อนไขสัญญา</li><li>Provider Android / Apple หากใช้งาน MDM</li></ul></aside>
        </section>
      )}

      {active === "notification" && (
        <section className="wf-grid three">
          {templates.map((template) => <article className="wf-card" key={template.name}><div className="wf-card-head"><h2>{template.name}</h2><span className="wf-badge">{template.channel}</span></div><p>{template.body}</p><button>แก้เทมเพลต</button></article>)}
        </section>
      )}

      {active === "documents" && (
        <section className="wf-card">
          <div className="wf-card-head"><div><p className="wf-kicker">Legal & Evidence</p><h2>Document & Consent Center</h2></div><span className="wf-badge warn">ต้องตรวจจริง</span></div>
          <div className="wf-grid two">
            {documents.map((doc) => <article className="wf-mini" key={doc.title}><span>{doc.type}</span><h3>{doc.title}</h3><p>{doc.status}</p><button>เปิดดู</button></article>)}
          </div>
        </section>
      )}
    </main>
  );
}
