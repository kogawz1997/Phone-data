"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, openHtml } from "@/lib/api";
import "./production-workflows.css";

type WorkflowTab = "contract" | "payment" | "collection" | "settings" | "notification" | "documents";
type Customer = { id: string; fullName: string; phone: string; address?: string; riskScore?: number };
type Device = { id: string; brand: string; model: string; platform: string; deviceStatus: string; storage?: string; color?: string; imei?: string; serialNumber?: string };
type Installment = { id: string; installmentNo: number; dueDate: string; amount: string | number; paidAmount: string | number; status: string };
type Contract = { id: string; contractNo: string; status: string; salePrice: string | number; downPayment: string | number; totalAmount: string | number; customerId: string; deviceId: string; customer: Customer; device: Device; installments: Installment[] };
type Payment = { id: string; amount: string | number; status: string; method: string; slipUrl?: string; note?: string; contract: Contract; installment?: Installment; createdAt: string };
type CollectionTask = { id: string; title: string; status: string; priority: string; dueAt?: string; channel: string; note?: string; customer: Customer; contract?: Contract };
type TemplateBundle = { notifications: Array<{ id: string; key: string; channel: string; title: string; body: string }>; documents: Array<{ id: string; type: string; title: string; version: string; body: string }> };
type ConsentSnapshot = { id: string; title: string; type: string; acceptedAt?: string; customer?: Customer; contract?: Contract; createdAt: string };

type ContractDraft = {
  customerId: string;
  newCustomerName: string;
  newCustomerPhone: string;
  newCustomerAddress: string;
  deviceId: string;
  deviceBrand: string;
  deviceModel: string;
  devicePlatform: "ANDROID" | "IOS" | "IPADOS" | "MACOS" | "OTHER";
  deviceStorage: string;
  salePrice: number;
  downPayment: number;
  months: number;
  firstDueDate: string;
  signNow: boolean;
};

const tabs: Array<{ key: WorkflowTab; label: string; caption: string }> = [
  { key: "contract", label: "Contract Wizard", caption: "สร้างสัญญา" },
  { key: "payment", label: "Payment Review", caption: "ตรวจยอด" },
  { key: "collection", label: "Collection CRM", caption: "ติดตามงวด" },
  { key: "settings", label: "Store Settings", caption: "ตั้งค่าร้าน" },
  { key: "notification", label: "Notification Center", caption: "แจ้งเตือน" },
  { key: "documents", label: "Document & Consent", caption: "เอกสาร" },
];

function money(value: unknown) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function remainingOf(i?: Installment) {
  if (!i) return 0;
  return Math.max(0, Number(i.amount || 0) - Number(i.paidAmount || 0));
}

function addMonths(date: string, months: number) {
  const base = date ? new Date(date) : new Date();
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function dateTH(value?: string) {
  return value ? new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-";
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function ProductionWorkflowsPage() {
  const [active, setActive] = useState<WorkflowTab>("contract");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<CollectionTask[]>([]);
  const [templates, setTemplates] = useState<TemplateBundle>({ notifications: [], documents: [] });
  const [consents, setConsents] = useState<ConsentSnapshot[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<Array<{ id: string; displayName: string; promptPayId?: string; instructions?: string }>>([]);

  const [draft, setDraft] = useState<ContractDraft>({
    customerId: "new",
    newCustomerName: "",
    newCustomerPhone: "",
    newCustomerAddress: "",
    deviceId: "new",
    deviceBrand: "Apple",
    deviceModel: "iPhone 14 Pro Max 256GB",
    devicePlatform: "IOS",
    deviceStorage: "256GB",
    salePrice: 35900,
    downPayment: 5000,
    months: 12,
    firstDueDate: defaultDueDate(),
    signNow: false,
  });
  const [paymentForm, setPaymentForm] = useState({ contractId: "", installmentId: "", amount: 0, slipUrl: "", note: "" });
  const [collectionForm, setCollectionForm] = useState({ customerId: "", contractId: "", title: "ติดตามค่างวด", dueAt: new Date().toISOString().slice(0, 10), priority: "NORMAL", channel: "PHONE", note: "" });
  const [settingsForm, setSettingsForm] = useState({ displayName: "PromptPay / Bank Transfer", promptPayId: "", bankName: "", accountNo: "", accountName: "", instructions: "" });
  const [templateForm, setTemplateForm] = useState({ key: "due_today", channel: "LINE", title: "ครบกำหนดชำระวันนี้", body: "วันนี้ครบกำหนดชำระงวด ยอด {{amount}} บาท กรุณาชำระผ่านลิงก์/QR ในพอร์ทัล" });
  const [documentForm, setDocumentForm] = useState({ customerId: "", contractId: "", type: "MDM_CONSENT", title: "หนังสือยินยอมการจัดการอุปกรณ์", body: "ลูกค้ารับทราบและยินยอมให้ร้านจัดการอุปกรณ์ตามเงื่อนไขสัญญาจนกว่าจะชำระครบ", accepted: true });

  async function load() {
    setError("");
    setLoading(true);
    try {
      const [customerRows, deviceRows, contractRows, paymentRows, taskRows, templateRows, consentRows, settingsRows] = await Promise.all([
        api<Customer[]>("/customers"),
        api<Device[]>("/devices"),
        api<Contract[]>("/contracts"),
        api<Payment[]>("/payments"),
        api<CollectionTask[]>("/collection/tasks"),
        api<TemplateBundle>("/templates"),
        api<ConsentSnapshot[]>("/consent/snapshots"),
        api<Array<{ id: string; displayName: string; promptPayId?: string; instructions?: string }>>("/store/payment-settings"),
      ]);
      setCustomers(customerRows);
      setDevices(deviceRows);
      setContracts(contractRows);
      setPayments(paymentRows);
      setTasks(taskRows);
      setTemplates(templateRows);
      setConsents(consentRows);
      setPaymentSettings(settingsRows);

      const stockDevice = deviceRows.find((device) => device.deviceStatus === "IN_STOCK");
      setDraft((old) => ({ ...old, customerId: old.customerId !== "new" ? old.customerId : customerRows[0]?.id ?? "new", deviceId: old.deviceId !== "new" ? old.deviceId : stockDevice?.id ?? "new" }));
      setPaymentForm((old) => ({ ...old, contractId: old.contractId || contractRows[0]?.id || "" }));
      setCollectionForm((old) => ({ ...old, customerId: old.customerId || customerRows[0]?.id || "", contractId: old.contractId || contractRows[0]?.id || "" }));
      setDocumentForm((old) => ({ ...old, customerId: old.customerId || customerRows[0]?.id || "", contractId: old.contractId || contractRows[0]?.id || "" }));
      const activeSetting = settingsRows[0];
      if (activeSetting) setSettingsForm((old) => ({ ...old, displayName: activeSetting.displayName || old.displayName, promptPayId: activeSetting.promptPayId || old.promptPayId, instructions: activeSetting.instructions || old.instructions }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const stockDevices = devices.filter((device) => device.deviceStatus === "IN_STOCK");
  const principal = Math.max(0, draft.salePrice - draft.downPayment);
  const monthly = Math.ceil(principal / Math.max(1, draft.months));
  const selectedContract = contracts.find((contract) => contract.id === paymentForm.contractId) ?? contracts[0];
  const unpaidInstallments = selectedContract?.installments?.filter((item) => remainingOf(item) > 0) ?? [];
  const selectedInstallment = unpaidInstallments.find((item) => item.id === paymentForm.installmentId) ?? unpaidInstallments[0];
  const workflowScore = useMemo(() => {
    const checks = [customers.length > 0, devices.length > 0, contracts.length > 0, payments.length > 0, templates.notifications.length > 0, paymentSettings.length > 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [customers.length, devices.length, contracts.length, payments.length, templates.notifications.length, paymentSettings.length]);

  useEffect(() => {
    if (!selectedContract) return;
    const amount = remainingOf(selectedInstallment) || Math.ceil(Number(selectedContract.totalAmount || 0) / Math.max(1, selectedContract.installments?.length || 1));
    setPaymentForm((old) => ({ ...old, installmentId: old.installmentId || selectedInstallment?.id || "", amount: old.amount || amount }));
  }, [selectedContract?.id, selectedInstallment?.id]);

  async function runAction<T>(label: string, fn: () => Promise<T>) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await fn();
      setMessage(label);
      await load();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function submitContract(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runAction("สร้างสัญญาเรียบร้อย", async () => {
      let customerId = draft.customerId;
      if (customerId === "new") {
        const created = await api<Customer>("/customers", { method: "POST", body: JSON.stringify({ fullName: draft.newCustomerName, phone: draft.newCustomerPhone, address: draft.newCustomerAddress, riskScore: 50 }) });
        customerId = created.id;
      }

      let deviceId = draft.deviceId;
      if (deviceId === "new") {
        const created = await api<Device>("/devices", { method: "POST", body: JSON.stringify({ brand: draft.deviceBrand, model: draft.deviceModel, platform: draft.devicePlatform, storage: draft.deviceStorage, controlMode: "NONE" }) });
        deviceId = created.id;
      }

      const contract = await api<Contract>("/contracts", { method: "POST", body: JSON.stringify({ customerId, deviceId, salePrice: draft.salePrice, downPayment: draft.downPayment, interestAmount: 0, installmentCount: draft.months, firstDueDate: draft.firstDueDate, agreementType: "LEASE_TO_OWN", managementPurpose: "LEASE_TO_OWN_ASSET_PROTECTION" }) });
      if (draft.signNow) await api(`/contracts/${contract.id}/sign`, { method: "POST", body: "{}" });
      return contract;
    });
  }

  async function submitPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runAction("บันทึกรายการชำระเงินแล้ว", async () => api("/payments", { method: "POST", body: JSON.stringify({ contractId: paymentForm.contractId, installmentId: paymentForm.installmentId || selectedInstallment?.id, amount: paymentForm.amount || remainingOf(selectedInstallment), method: "PROMPTPAY", slipUrl: paymentForm.slipUrl, note: paymentForm.note }) }));
  }

  async function submitCollection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runAction("สร้างงานติดตามและบันทึก contact log แล้ว", async () => {
      const task = await api("/collection/tasks", { method: "POST", body: JSON.stringify(collectionForm) });
      if (collectionForm.note) await api(`/customers/${collectionForm.customerId}/contact-logs`, { method: "POST", body: JSON.stringify({ channel: collectionForm.channel, message: collectionForm.note }) });
      return task;
    });
  }

  async function submitSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runAction("บันทึก Store Payment Settings แล้ว", async () => api("/store/payment-settings", { method: "PUT", body: JSON.stringify({ provider: "PROMPTPAY_MANUAL", ...settingsForm, isActive: true }) }));
  }

  async function submitTemplate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runAction("บันทึก Notification Template แล้ว", async () => api("/templates/notifications", { method: "POST", body: JSON.stringify(templateForm) }));
  }

  async function submitDocument(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runAction("สร้าง Consent Snapshot แล้ว", async () => api("/consent/snapshots", { method: "POST", body: JSON.stringify(documentForm) }));
  }

  return (
    <main className="wf-page">
      <section className="wf-hero">
        <a className="wf-back" href="/">← กลับหน้า Admin</a>
        <div>
          <p className="wf-kicker">Production Workflow Console</p>
          <h1>ศูนย์ทำงานจริงของร้าน</h1>
          <p>เชื่อมกับ API จริงแล้วสำหรับลูกค้า เครื่อง สัญญา ชำระเงิน งานติดตาม ตั้งค่ารับเงิน เทมเพลต และ consent snapshot</p>
        </div>
        <div className="wf-health">
          <span>Workflow Readiness</span>
          <strong>{loading ? "..." : `${workflowScore}%`}</strong>
          <small>{customers.length} ลูกค้า · {devices.length} เครื่อง · {contracts.length} สัญญา</small>
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

      {(message || error) && <div className={`wf-alert ${error ? "bad" : "good"}`}>{error || message}</div>}

      {active === "contract" && (
        <section className="wf-grid two">
          <form className="wf-card wf-form" onSubmit={submitContract}>
            <div className="wf-card-head"><div><p className="wf-kicker">Step-by-step</p><h2>Contract Wizard</h2></div><span className="wf-badge good">API Connected</span></div>
            <label>ลูกค้า
              <select value={draft.customerId} onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}>
                <option value="new">+ สร้างลูกค้าใหม่</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.phone}</option>)}
              </select>
            </label>
            {draft.customerId === "new" && <div className="wf-row"><label>ชื่อลูกค้า<input value={draft.newCustomerName} onChange={(e) => setDraft({ ...draft, newCustomerName: e.target.value })} required /></label><label>เบอร์โทร<input value={draft.newCustomerPhone} onChange={(e) => setDraft({ ...draft, newCustomerPhone: e.target.value })} required /></label></div>}
            {draft.customerId === "new" && <label>ที่อยู่<input value={draft.newCustomerAddress} onChange={(e) => setDraft({ ...draft, newCustomerAddress: e.target.value })} /></label>}
            <label>เครื่อง
              <select value={draft.deviceId} onChange={(e) => setDraft({ ...draft, deviceId: e.target.value })}>
                <option value="new">+ เพิ่มเครื่องใหม่</option>
                {stockDevices.map((device) => <option key={device.id} value={device.id}>{device.brand} {device.model} · {device.platform}</option>)}
              </select>
            </label>
            {draft.deviceId === "new" && <div className="wf-row"><label>แบรนด์<input value={draft.deviceBrand} onChange={(e) => setDraft({ ...draft, deviceBrand: e.target.value })} required /></label><label>รุ่น<input value={draft.deviceModel} onChange={(e) => setDraft({ ...draft, deviceModel: e.target.value })} required /></label></div>}
            {draft.deviceId === "new" && <div className="wf-row"><label>ระบบ<select value={draft.devicePlatform} onChange={(e) => setDraft({ ...draft, devicePlatform: e.target.value as ContractDraft["devicePlatform"] })}><option value="ANDROID">Android</option><option value="IOS">iOS</option><option value="IPADOS">iPadOS</option><option value="MACOS">macOS</option><option value="OTHER">Other</option></select></label><label>ความจุ<input value={draft.deviceStorage} onChange={(e) => setDraft({ ...draft, deviceStorage: e.target.value })} /></label></div>}
            <div className="wf-row"><label>ราคาขาย<input type="number" value={draft.salePrice} onChange={(e) => setDraft({ ...draft, salePrice: Number(e.target.value) })} /></label><label>เงินดาวน์<input type="number" value={draft.downPayment} onChange={(e) => setDraft({ ...draft, downPayment: Number(e.target.value) })} /></label></div>
            <div className="wf-row"><label>จำนวนงวด<input type="number" value={draft.months} onChange={(e) => setDraft({ ...draft, months: Number(e.target.value) })} /></label><label>งวดแรก<input type="date" value={draft.firstDueDate} onChange={(e) => setDraft({ ...draft, firstDueDate: e.target.value })} /></label></div>
            <label className="wf-check"><input type="checkbox" checked={draft.signNow} onChange={(e) => setDraft({ ...draft, signNow: e.target.checked })} /> เปิดใช้สัญญาทันทีหลังสร้าง</label>
            <div className="wf-actions"><button disabled={saving} type="submit">สร้างสัญญาจริง</button><button disabled={!selectedContract} type="button" className="secondary" onClick={() => selectedContract && openHtml(`/contracts/${selectedContract.id}/print`)}>เปิด PDF/HTML ล่าสุด</button></div>
          </form>

          <aside className="wf-card wf-summary">
            <p className="wf-kicker">Contract Preview</p><h2>{draft.customerId === "new" ? draft.newCustomerName || "ลูกค้าใหม่" : customers.find((c) => c.id === draft.customerId)?.fullName}</h2><div className="wf-device">{draft.deviceId === "new" ? `${draft.deviceBrand} ${draft.deviceModel}` : devices.find((d) => d.id === draft.deviceId)?.brand + " " + devices.find((d) => d.id === draft.deviceId)?.model}</div>
            <div className="wf-stat"><span>ราคาขาย</span><strong>{money(draft.salePrice)}</strong></div><div className="wf-stat"><span>เงินดาวน์</span><strong>{money(draft.downPayment)}</strong></div><div className="wf-stat"><span>ยอดจัด</span><strong>{money(principal)}</strong></div><div className="wf-stat highlight"><span>งวดละ</span><strong>{money(monthly)}</strong></div><div className="wf-timeline"><b>จ่ายครบโดยประมาณ</b><span>{addMonths(draft.firstDueDate, draft.months)}</span></div>
          </aside>
        </section>
      )}

      {active === "payment" && (
        <section className="wf-grid two">
          <form className="wf-card wf-form" onSubmit={submitPayment}>
            <div className="wf-card-head"><div><p className="wf-kicker">Payment Operations</p><h2>บันทึกชำระเงิน</h2></div><span className="wf-badge good">API Connected</span></div>
            <label>สัญญา<select value={paymentForm.contractId} onChange={(e) => setPaymentForm({ ...paymentForm, contractId: e.target.value, installmentId: "", amount: 0 })}>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contractNo} · {contract.customer.fullName}</option>)}</select></label>
            <label>งวด<select value={paymentForm.installmentId || selectedInstallment?.id || ""} onChange={(e) => { const i = unpaidInstallments.find((item) => item.id === e.target.value); setPaymentForm({ ...paymentForm, installmentId: e.target.value, amount: remainingOf(i) }); }}>{unpaidInstallments.map((item) => <option key={item.id} value={item.id}>งวด {item.installmentNo} · เหลือ {money(remainingOf(item))}</option>)}</select></label>
            <div className="wf-row"><label>ยอด<input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} /></label><label>ลิงก์สลิป<input value={paymentForm.slipUrl} onChange={(e) => setPaymentForm({ ...paymentForm, slipUrl: e.target.value })} /></label></div>
            <label>หมายเหตุ<input value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} /></label>
            <button disabled={saving || !paymentForm.contractId} type="submit">บันทึก Payment</button>
          </form>
          <section className="wf-card"><div className="wf-card-head"><h2>รายการล่าสุด</h2><span className="wf-badge warn">{payments.length}</span></div><div className="wf-table"><table><thead><tr><th>ลูกค้า</th><th>ยอด</th><th>สถานะ</th><th>Action</th></tr></thead><tbody>{payments.slice(0, 8).map((payment) => <tr key={payment.id}><td>{payment.contract?.customer?.fullName ?? "-"}</td><td>{money(payment.amount)}</td><td><span className="wf-chip">{payment.status}</span></td><td><div className="wf-inline"><button type="button" onClick={() => runAction("ยืนยันยอดแล้ว", () => api(`/payments/${payment.id}/confirm`, { method: "POST", body: "{}" }))}>ยืนยัน</button><button type="button" className="secondary" onClick={() => runAction("ปฏิเสธยอดแล้ว", () => api(`/payments/${payment.id}/reject`, { method: "POST", body: "{}" }))}>ปฏิเสธ</button></div></td></tr>)}</tbody></table></div></section>
        </section>
      )}

      {active === "collection" && (
        <section className="wf-grid two">
          <form className="wf-card wf-form" onSubmit={submitCollection}><div className="wf-card-head"><div><p className="wf-kicker">Collection CRM</p><h2>สร้างงานติดตาม</h2></div><span className="wf-badge good">API Connected</span></div><label>ลูกค้า<select value={collectionForm.customerId} onChange={(e) => setCollectionForm({ ...collectionForm, customerId: e.target.value })}>{customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select></label><label>สัญญา<select value={collectionForm.contractId} onChange={(e) => setCollectionForm({ ...collectionForm, contractId: e.target.value })}><option value="">ไม่ผูกสัญญา</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNo}</option>)}</select></label><label>หัวข้อ<input value={collectionForm.title} onChange={(e) => setCollectionForm({ ...collectionForm, title: e.target.value })} /></label><div className="wf-row"><label>กำหนดติดตาม<input type="date" value={collectionForm.dueAt} onChange={(e) => setCollectionForm({ ...collectionForm, dueAt: e.target.value })} /></label><label>ช่องทาง<select value={collectionForm.channel} onChange={(e) => setCollectionForm({ ...collectionForm, channel: e.target.value })}><option value="PHONE">โทร</option><option value="LINE">LINE</option><option value="SMS">SMS</option><option value="IN_PERSON">หน้าร้าน</option></select></label></div><label>บันทึกการติดต่อ<input value={collectionForm.note} onChange={(e) => setCollectionForm({ ...collectionForm, note: e.target.value })} /></label><button disabled={saving || !collectionForm.customerId} type="submit">สร้างงานติดตาม</button></form>
          <section className="wf-card"><div className="wf-card-head"><h2>งานติดตาม</h2><button type="button" onClick={() => runAction("สร้างงานค้างชำระอัตโนมัติแล้ว", () => api("/collection/tasks/generate-overdue", { method: "POST", body: "{}" }))}>Generate Overdue</button></div><div className="wf-stack">{tasks.slice(0, 8).map((task) => <article className="wf-mini" key={task.id}><span>{task.priority} · {task.status}</span><h3>{task.title}</h3><p>{task.customer.fullName} · {dateTH(task.dueAt)}</p><button type="button" onClick={() => runAction("ปิดงานติดตามแล้ว", () => api(`/collection/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status: "DONE" }) }))}>ปิดงาน</button></article>)}</div></section>
        </section>
      )}

      {active === "settings" && (
        <section className="wf-grid two"><form className="wf-card wf-form" onSubmit={submitSettings}><div className="wf-card-head"><div><p className="wf-kicker">Store Setup</p><h2>Store Payment Settings</h2></div><span className="wf-badge good">API Connected</span></div><label>ชื่อการรับเงิน<input value={settingsForm.displayName} onChange={(e) => setSettingsForm({ ...settingsForm, displayName: e.target.value })} /></label><label>PromptPay ID<input value={settingsForm.promptPayId} onChange={(e) => setSettingsForm({ ...settingsForm, promptPayId: e.target.value })} /></label><div className="wf-row"><label>ธนาคาร<input value={settingsForm.bankName} onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })} /></label><label>เลขบัญชี<input value={settingsForm.accountNo} onChange={(e) => setSettingsForm({ ...settingsForm, accountNo: e.target.value })} /></label></div><label>ชื่อบัญชี<input value={settingsForm.accountName} onChange={(e) => setSettingsForm({ ...settingsForm, accountName: e.target.value })} /></label><label>คำแนะนำลูกค้า<input value={settingsForm.instructions} onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })} /></label><button disabled={saving} type="submit">บันทึกการตั้งค่า</button></form><aside className="wf-card"><p className="wf-kicker">Current Settings</p><h2>ตั้งค่าแล้ว {paymentSettings.length} รายการ</h2><div className="wf-stack">{paymentSettings.map((setting) => <div className="wf-mini" key={setting.id}><span>{setting.displayName}</span><h3>{setting.promptPayId || "ยังไม่มี PromptPay"}</h3><p>{setting.instructions || "ไม่มีคำแนะนำ"}</p></div>)}</div></aside></section>
      )}

      {active === "notification" && (
        <section className="wf-grid two"><form className="wf-card wf-form" onSubmit={submitTemplate}><div className="wf-card-head"><div><p className="wf-kicker">Template Center</p><h2>Notification Template</h2></div><span className="wf-badge good">API Connected</span></div><div className="wf-row"><label>Key<input value={templateForm.key} onChange={(e) => setTemplateForm({ ...templateForm, key: e.target.value })} /></label><label>Channel<select value={templateForm.channel} onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value })}><option value="LINE">LINE</option><option value="SMS">SMS</option><option value="EMAIL">Email</option><option value="IN_APP">In-app</option></select></label></div><label>หัวข้อ<input value={templateForm.title} onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })} /></label><label>ข้อความ<textarea value={templateForm.body} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} /></label><button disabled={saving} type="submit">บันทึก Template</button></form><section className="wf-card"><div className="wf-card-head"><h2>Templates</h2><span className="wf-badge">{templates.notifications.length}</span></div><div className="wf-stack">{templates.notifications.slice(0, 8).map((template) => <article className="wf-mini" key={template.id}><span>{template.channel} · {template.key}</span><h3>{template.title}</h3><p>{template.body}</p></article>)}</div></section></section>
      )}

      {active === "documents" && (
        <section className="wf-grid two"><form className="wf-card wf-form" onSubmit={submitDocument}><div className="wf-card-head"><div><p className="wf-kicker">Legal & Evidence</p><h2>Consent Snapshot</h2></div><span className="wf-badge good">API Connected</span></div><label>ลูกค้า<select value={documentForm.customerId} onChange={(e) => setDocumentForm({ ...documentForm, customerId: e.target.value })}>{customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select></label><label>สัญญา<select value={documentForm.contractId} onChange={(e) => setDocumentForm({ ...documentForm, contractId: e.target.value })}><option value="">ไม่ผูกสัญญา</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNo}</option>)}</select></label><div className="wf-row"><label>ประเภท<select value={documentForm.type} onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}><option value="CONTRACT">CONTRACT</option><option value="MDM_CONSENT">MDM_CONSENT</option><option value="PRIVACY_NOTICE">PRIVACY_NOTICE</option><option value="ICLOUD_CUSTODY">ICLOUD_CUSTODY</option></select></label><label className="wf-check"><input type="checkbox" checked={documentForm.accepted} onChange={(e) => setDocumentForm({ ...documentForm, accepted: e.target.checked })} /> ลูกค้ายอมรับแล้ว</label></div><label>หัวข้อ<input value={documentForm.title} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} /></label><label>เนื้อหา<textarea value={documentForm.body} onChange={(e) => setDocumentForm({ ...documentForm, body: e.target.value })} /></label><button disabled={saving || !documentForm.customerId} type="submit">สร้าง Consent Snapshot</button></form><section className="wf-card"><div className="wf-card-head"><h2>เอกสารล่าสุด</h2><span className="wf-badge warn">{consents.length}</span></div><div className="wf-stack">{consents.slice(0, 8).map((doc) => <article className="wf-mini" key={doc.id}><span>{doc.type} · {doc.acceptedAt ? "Accepted" : "Draft"}</span><h3>{doc.title}</h3><p>{doc.customer?.fullName ?? "-"} · {dateTH(doc.createdAt)}</p></article>)}</div></section></section>
      )}
    </main>
  );
}
