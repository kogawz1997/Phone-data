"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type StoreProfile = {
  organization: {
    id: string;
    name: string;
    slug?: string;
    ownerName?: string;
    email?: string;
    billingEmail?: string;
    taxId?: string;
    phone?: string;
    address?: string;
    status: string;
    plan: string;
  };
  counts: { customers: number; devices: number; contracts: number; pendingPayments: number };
  onboarding: Array<{ stepKey: string; title: string; status: string }>;
};

type PaymentSetting = {
  id?: string;
  provider: string;
  displayName: string;
  promptPayId?: string;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  instructions?: string;
  isActive: boolean;
};

type Integration = { id: string; provider: string; category: string; displayName: string; status: string; configJson?: Record<string, string> };
type NotificationTemplate = { key: string; channel: string; title: string; body: string };

type Tab = "store" | "payment" | "portal" | "notifications" | "documents" | "integrations";

const tabs: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "store", label: "ข้อมูลร้าน", hint: "ชื่อร้าน ภาษี เบอร์ติดต่อ" },
  { id: "payment", label: "ชำระเงิน", hint: "PromptPay / ธนาคาร" },
  { id: "portal", label: "Portal ลูกค้า", hint: "slug สี ข้อความต้อนรับ" },
  { id: "notifications", label: "แจ้งเตือน", hint: "LINE/SMS/Email templates" },
  { id: "documents", label: "เอกสาร", hint: "ข้อความท้ายสัญญา/ใบเสร็จ" },
  { id: "integrations", label: "ระบบนอก", hint: "ต่อ service ภายนอก" },
];

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

export default function StoreSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("store");
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [payment, setPayment] = useState<PaymentSetting>({ provider: "PROMPTPAY_MANUAL", displayName: "PromptPay / Bank Transfer", isActive: true });
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [storeForm, setStoreForm] = useState<Record<string, string>>({});
  const [portalForm, setPortalForm] = useState<Record<string, string>>({});
  const [documentForm, setDocumentForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    setError("");
    try {
      const [profileRes, payments, templatesRes, integrationRows] = await Promise.all([
        api<StoreProfile>("/store/profile"),
        api<PaymentSetting[]>("/store/payment-settings"),
        api<{ notifications: NotificationTemplate[] }>("/templates"),
        api<Integration[]>("/integrations"),
      ]);
      setProfile(profileRes);
      setStoreForm({
        name: text(profileRes.organization.name),
        ownerName: text(profileRes.organization.ownerName),
        phone: text(profileRes.organization.phone),
        billingEmail: text(profileRes.organization.billingEmail || profileRes.organization.email),
        taxId: text(profileRes.organization.taxId),
        address: text(profileRes.organization.address),
      });
      setPortalForm({
        slug: text(profileRes.organization.slug),
        brandColor: "#38bdf8",
        welcomeText: "ตรวจสอบยอด ชำระงวด และดูสัญญาได้จากหน้านี้",
        contactLine: "",
        supportPhone: text(profileRes.organization.phone),
        releasePolicy: "เมื่อชำระครบ ร้านจะตรวจสอบยอดและดำเนินการปลดเครื่องตามขั้นตอน",
      });
      const activePayment = payments.find((item) => item.isActive) ?? payments[0];
      if (activePayment) setPayment(activePayment);
      setTemplates(templatesRes.notifications ?? []);
      setIntegrations(integrationRows.filter((row) => row.category !== "MDM"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดตั้งค่าไม่สำเร็จ");
    }
  }

  useEffect(() => { void load(); }, []);

  const setupScore = useMemo(() => {
    const checks = [
      Boolean(storeForm.name && storeForm.phone),
      Boolean(payment.promptPayId || payment.accountNo),
      Boolean(portalForm.slug),
      templates.length > 0,
      integrations.some((x) => x.status === "ACTIVE" || x.status === "CONNECTING"),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [storeForm, payment, portalForm, templates, integrations]);

  async function saveStoreProfile() {
    setBusy("store"); setError(""); setNotice("");
    try {
      const org = await api<StoreProfile["organization"]>("/store/profile", { method: "PATCH", body: JSON.stringify(storeForm) });
      setProfile((current) => current ? { ...current, organization: org } : current);
      setNotice("บันทึกข้อมูลร้านแล้ว");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกข้อมูลร้านไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function savePayment() {
    setBusy("payment"); setError(""); setNotice("");
    try {
      const saved = await api<PaymentSetting>("/store/payment-settings", { method: "PUT", body: JSON.stringify(payment) });
      setPayment(saved);
      setNotice("บันทึกช่องทางรับเงินแล้ว");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกช่องทางรับเงินไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function savePortal() {
    setBusy("portal"); setError(""); setNotice("");
    try {
      const connector = integrations.find((x) => x.provider === "WEBHOOK") || integrations[0];
      if (connector) {
        await api(`/integrations/${connector.id}`, { method: "PATCH", body: JSON.stringify({ configJson: { ...(connector.configJson ?? {}), portalSettings: JSON.stringify(portalForm) }, status: "CONNECTING" }) });
      }
      setNotice("บันทึก Portal settings แล้ว");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึก Portal settings ไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function saveTemplate(template: NotificationTemplate) {
    setBusy(`template:${template.key}`); setError(""); setNotice("");
    try {
      await api("/templates/notifications", { method: "POST", body: JSON.stringify(template) });
      setNotice(`บันทึก template ${template.title} แล้ว`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึก template ไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function saveDocumentTemplate() {
    setBusy("document"); setError(""); setNotice("");
    try {
      await api("/templates/documents", { method: "POST", body: JSON.stringify({ type: "CONTRACT", title: documentForm.title || "ข้อความท้ายสัญญา", version: documentForm.version || "1.0", body: documentForm.body || "" }) });
      setNotice("บันทึกเอกสาร/ข้อความท้ายสัญญาแล้ว");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกเอกสารไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  const setTemplate = (index: number, patch: Partial<NotificationTemplate>) => {
    setTemplates((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="brand"><div className="logo">K</div><div><div className="kicker">Store Settings</div><h2>ตั้งค่าร้าน</h2></div></div>
        <div className="pill-list"><a className="btn secondary" href="/">กลับหน้าร้าน</a><a className="btn secondary" href="/integrations">ระบบนอก</a></div>
      </section>

      <section className="hero hero-grid">
        <div>
          <span className="badge good">Setup {setupScore}%</span>
          <h1>ตั้งค่าร้านให้พร้อมใช้งานจริง</h1>
          <p className="muted">รวมข้อมูลร้าน ช่องทางรับเงิน Customer Portal แจ้งเตือน เอกสาร และระบบนอกไว้หน้าเดียว ร้านไม่ต้องเข้า Railway ไม่ต้องจำ env และไม่ต้องเปิดแท็บเยอะเหมือนกำลังขับยานอวกาศราคาประหยัด</p>
          <div className="hero-actions"><button className="btn" onClick={load}>รีเฟรช</button><a className="btn secondary" href="/customer-access">Users ลูกค้า</a></div>
        </div>
        <div className="grid">
          <div className="card good"><h3>ใช้งานเร็ว</h3><p className="small">กรอกข้อมูลจำเป็นก่อน: ร้าน, รับเงิน, Portal, แจ้งเตือน</p></div>
          <div className="card"><h3>ความปลอดภัย</h3><p className="small">Secret ของระบบนอกถูก mask/encrypt ใน API แล้ว</p></div>
        </div>
      </section>

      {error && <div className="alert bad">{error}</div>}
      {notice && <div className="alert">{notice}</div>}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="pill-list">{tabs.map((tab) => <button key={tab.id} className={`btn tiny ${activeTab === tab.id ? "" : "secondary"}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>
        <p className="small" style={{ marginTop: 10 }}>{tabs.find((tab) => tab.id === activeTab)?.hint}</p>
      </section>

      {activeTab === "store" && <section className="card"><h2>ข้อมูลร้าน</h2><div className="form-grid"><div className="form-row"><label>ชื่อร้าน<input className="input" value={storeForm.name || ""} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} /></label><label>เจ้าของร้าน<input className="input" value={storeForm.ownerName || ""} onChange={(e) => setStoreForm({ ...storeForm, ownerName: e.target.value })} /></label></div><div className="form-row"><label>เบอร์ร้าน<input className="input" value={storeForm.phone || ""} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} /></label><label>อีเมลรับบิล<input className="input" value={storeForm.billingEmail || ""} onChange={(e) => setStoreForm({ ...storeForm, billingEmail: e.target.value })} /></label></div><div className="form-row"><label>เลขภาษี<input className="input" value={storeForm.taxId || ""} onChange={(e) => setStoreForm({ ...storeForm, taxId: e.target.value })} /></label><label>สถานะแพ็กเกจ<input className="input" value={`${profile?.organization.plan || ""} / ${profile?.organization.status || ""}`} disabled /></label></div><label>ที่อยู่<textarea className="input" value={storeForm.address || ""} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} /></label><button className="btn" disabled={busy === "store"} onClick={saveStoreProfile}>{busy === "store" ? "กำลังบันทึก..." : "บันทึกข้อมูลร้าน"}</button></div></section>}

      {activeTab === "payment" && <section className="card"><h2>ช่องทางชำระเงิน</h2><div className="form-grid"><div className="form-row"><label>ชื่อที่แสดง<input className="input" value={payment.displayName || ""} onChange={(e) => setPayment({ ...payment, displayName: e.target.value })} /></label><label>PromptPay ID<input className="input" value={payment.promptPayId || ""} onChange={(e) => setPayment({ ...payment, promptPayId: e.target.value })} /></label></div><div className="form-row"><label>ธนาคาร<input className="input" value={payment.bankName || ""} onChange={(e) => setPayment({ ...payment, bankName: e.target.value })} /></label><label>เลขบัญชี<input className="input" value={payment.accountNo || ""} onChange={(e) => setPayment({ ...payment, accountNo: e.target.value })} /></label></div><label>ชื่อบัญชี<input className="input" value={payment.accountName || ""} onChange={(e) => setPayment({ ...payment, accountName: e.target.value })} /></label><label>คำแนะนำให้ลูกค้า<textarea className="input" value={payment.instructions || ""} onChange={(e) => setPayment({ ...payment, instructions: e.target.value })} /></label><button className="btn" disabled={busy === "payment"} onClick={savePayment}>{busy === "payment" ? "กำลังบันทึก..." : "บันทึกช่องทางรับเงิน"}</button></div></section>}

      {activeTab === "portal" && <section className="card"><h2>Customer Portal</h2><div className="form-grid"><div className="form-row"><label>Slug ร้าน<input className="input" value={portalForm.slug || ""} onChange={(e) => setPortalForm({ ...portalForm, slug: e.target.value })} /></label><label>สีหลัก<input className="input" value={portalForm.brandColor || ""} onChange={(e) => setPortalForm({ ...portalForm, brandColor: e.target.value })} /></label></div><div className="form-row"><label>LINE ร้าน<input className="input" value={portalForm.contactLine || ""} onChange={(e) => setPortalForm({ ...portalForm, contactLine: e.target.value })} /></label><label>เบอร์ช่วยเหลือ<input className="input" value={portalForm.supportPhone || ""} onChange={(e) => setPortalForm({ ...portalForm, supportPhone: e.target.value })} /></label></div><label>ข้อความต้อนรับ<textarea className="input" value={portalForm.welcomeText || ""} onChange={(e) => setPortalForm({ ...portalForm, welcomeText: e.target.value })} /></label><label>นโยบายปลดเครื่อง<textarea className="input" value={portalForm.releasePolicy || ""} onChange={(e) => setPortalForm({ ...portalForm, releasePolicy: e.target.value })} /></label><button className="btn" disabled={busy === "portal"} onClick={savePortal}>{busy === "portal" ? "กำลังบันทึก..." : "บันทึก Portal"}</button></div></section>}

      {activeTab === "notifications" && <section className="card"><h2>Template แจ้งเตือน</h2><div className="grid cols-2">{templates.map((template, index) => <div className="card" key={`${template.key}-${template.channel}`}><span className="badge neutral">{template.channel}</span><label>ชื่อ template<input className="input" value={template.title} onChange={(e) => setTemplate(index, { title: e.target.value })} /></label><label>ข้อความ<textarea className="input" value={template.body} onChange={(e) => setTemplate(index, { body: e.target.value })} /></label><button className="btn tiny" disabled={busy === `template:${template.key}`} onClick={() => saveTemplate(template)}>{busy === `template:${template.key}` ? "บันทึก..." : "บันทึก"}</button></div>)}</div></section>}

      {activeTab === "documents" && <section className="card"><h2>เอกสารและข้อความท้ายสัญญา</h2><div className="form-grid"><div className="form-row"><label>ชื่อเอกสาร<input className="input" value={documentForm.title || ""} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} placeholder="เช่น ข้อความท้ายสัญญา" /></label><label>เวอร์ชัน<input className="input" value={documentForm.version || "1.0"} onChange={(e) => setDocumentForm({ ...documentForm, version: e.target.value })} /></label></div><label>ข้อความ<textarea className="input" value={documentForm.body || ""} onChange={(e) => setDocumentForm({ ...documentForm, body: e.target.value })} placeholder="เงื่อนไข คำเตือน หรือข้อความท้ายเอกสาร" /></label><button className="btn" disabled={busy === "document"} onClick={saveDocumentTemplate}>{busy === "document" ? "กำลังบันทึก..." : "บันทึกเอกสาร"}</button></div></section>}

      {activeTab === "integrations" && <section className="card"><h2>ระบบนอกที่ร้านต่อเอง</h2><p className="muted">ดูและกรอก key จริงที่หน้า Integrations ส่วน MDM key อยู่ฝั่ง Owner เท่านั้น</p><div className="grid cols-3">{integrations.map((row) => <a className="card" key={row.id} href="/integrations"><span className={`badge ${row.status === "ACTIVE" ? "good" : row.status === "FAILED" ? "bad" : "warn"}`}>{row.status}</span><h3>{row.displayName}</h3><p className="small">{row.provider} · {row.category}</p></a>)}</div></section>}
    </main>
  );
}
