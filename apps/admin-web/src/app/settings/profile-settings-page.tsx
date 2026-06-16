"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
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

type PortalSettings = Record<string, string> & {
  slug?: string;
  brandColor?: string;
  welcomeText?: string;
  contactLine?: string;
  supportPhone?: string;
  releasePolicy?: string;
  website?: string;
  logoDataUrl?: string;
  businessHours?: string;
  openDays?: string;
  systemProfileName?: string;
  systemTheme?: string;
  systemAccent?: string;
  invoiceFooter?: string;
  qrPaymentEnabled?: string;
  notifyLine?: string;
  notifySms?: string;
  notifyEmail?: string;
  twoFactorEnabled?: string;
  loginAlerts?: string;
  sessionControl?: string;
  rolePreset?: string;
};

type Integration = { id: string; provider: string; category: string; displayName: string; status: string };
type NotificationTemplate = { key: string; channel: string; title: string; body: string };
type Section = "store" | "payment" | "portal" | "notifications" | "documents" | "integrations" | "security" | "system";
type Theme = "dark" | "light";

const sections: Array<{ id: Section; label: string; icon: string }> = [
  { id: "store", label: "ข้อมูลร้าน", icon: "▣" },
  { id: "payment", label: "รับเงิน", icon: "฿" },
  { id: "portal", label: "Portal", icon: "◉" },
  { id: "notifications", label: "แจ้งเตือน", icon: "✦" },
  { id: "documents", label: "เอกสาร", icon: "▤" },
  { id: "integrations", label: "ระบบนอก", icon: "⌁" },
  { id: "security", label: "ความปลอดภัย", icon: "◇" },
  { id: "system", label: "ระบบ", icon: "⚙" },
];

const dayList = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];

function value(v: unknown) {
  return v === undefined || v === null ? "" : String(v);
}

function asBool(v?: string) {
  return v === "true" || v === "1" || v === "yes";
}

function setBool(v: boolean) {
  return v ? "true" : "false";
}

function tone(status?: string) {
  const s = String(status || "").toUpperCase();
  if (["ACTIVE", "CURRENT", "CONNECTED", "READY", "DONE", "TRIAL"].includes(s)) return "good";
  if (["FAILED", "ERROR", "SUSPENDED", "BLOCKED"].includes(s)) return "bad";
  return "warn";
}

function initials(name?: string) {
  const clean = (name || "KOGA").trim();
  return clean.slice(0, 1).toUpperCase();
}

export default function ProfileSettingsPage() {
  const [active, setActive] = useState<Section>("store");
  const [theme, setTheme] = useState<Theme>("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [storeForm, setStoreForm] = useState<Record<string, string>>({});
  const [portal, setPortal] = useState<PortalSettings>({});
  const [payment, setPayment] = useState<PaymentSetting>({ provider: "PROMPTPAY_MANUAL", displayName: "PromptPay / Bank Transfer", isActive: true });
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [docForm, setDocForm] = useState<Record<string, string>>({ title: "ข้อความท้ายสัญญา", version: "1.0", body: "" });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("koga_profile_theme");
    const savedSidebar = window.localStorage.getItem("koga_profile_sidebar");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (savedSidebar === "closed") setSidebarOpen(false);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("koga_profile_theme", theme);
    window.localStorage.setItem("koga_profile_sidebar", sidebarOpen ? "open" : "closed");
  }, [theme, sidebarOpen]);

  async function load() {
    setBusy("load");
    setError("");
    try {
      const [profileRes, payments, templateRes, integrationRows, portalRes] = await Promise.all([
        api<StoreProfile>("/store/profile"),
        api<PaymentSetting[]>("/store/payment-settings"),
        api<{ notifications: NotificationTemplate[] }>("/templates"),
        api<Integration[]>("/integrations"),
        api<PortalSettings>("/store/portal-settings"),
      ]);
      setProfile(profileRes);
      setStoreForm({
        name: value(profileRes.organization.name),
        ownerName: value(profileRes.organization.ownerName),
        phone: value(profileRes.organization.phone),
        billingEmail: value(profileRes.organization.billingEmail || profileRes.organization.email),
        taxId: value(profileRes.organization.taxId),
        address: value(profileRes.organization.address),
      });
      setPortal({
        slug: value(portalRes.slug || profileRes.organization.slug),
        brandColor: value(portalRes.brandColor || "#38bdf8"),
        welcomeText: value(portalRes.welcomeText || "ยินดีต้อนรับสู่ร้านของเรา"),
        contactLine: value(portalRes.contactLine),
        supportPhone: value(portalRes.supportPhone || profileRes.organization.phone),
        releasePolicy: value(portalRes.releasePolicy || "เมื่อชำระครบ ร้านจะตรวจสอบและดำเนินการปลดเครื่องตามขั้นตอน"),
        website: value(portalRes.website),
        logoDataUrl: value(portalRes.logoDataUrl),
        businessHours: value(portalRes.businessHours || "10:00 - 20:00"),
        openDays: value(portalRes.openDays || "จันทร์,อังคาร,พุธ,พฤหัส,ศุกร์,เสาร์"),
        systemProfileName: value(portalRes.systemProfileName || profileRes.organization.name),
        systemTheme: value(portalRes.systemTheme || "dark"),
        systemAccent: value(portalRes.systemAccent || "cyan-violet"),
        invoiceFooter: value(portalRes.invoiceFooter || "ขอบคุณที่ใช้บริการ"),
        qrPaymentEnabled: value(portalRes.qrPaymentEnabled || "true"),
        notifyLine: value(portalRes.notifyLine || "true"),
        notifySms: value(portalRes.notifySms || "false"),
        notifyEmail: value(portalRes.notifyEmail || "true"),
        twoFactorEnabled: value(portalRes.twoFactorEnabled || "false"),
        loginAlerts: value(portalRes.loginAlerts || "true"),
        sessionControl: value(portalRes.sessionControl || "true"),
        rolePreset: value(portalRes.rolePreset || "owner-admin-staff"),
      });
      const activePayment = payments.find((row) => row.isActive) ?? payments[0];
      if (activePayment) setPayment(activePayment);
      setTemplates(templateRes.notifications ?? []);
      setIntegrations(integrationRows.filter((row) => row.category !== "MDM"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => { void load(); }, []);

  const org = profile?.organization;
  const setupScore = useMemo(() => {
    const checks = [
      Boolean(storeForm.name && storeForm.phone && storeForm.billingEmail),
      Boolean(payment.promptPayId || payment.accountNo),
      Boolean(portal.slug && portal.welcomeText),
      Boolean(portal.logoDataUrl),
      Boolean(integrations.some((item) => item.status === "ACTIVE" || item.status === "CONNECTING")),
      asBool(portal.loginAlerts),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [storeForm, payment, portal, integrations]);

  function updateStore(key: string, v: string) { setStoreForm((s) => ({ ...s, [key]: v })); }
  function updatePortal(key: string, v: string) { setPortal((s) => ({ ...s, [key]: v })); }

  function toggleDay(day: string) {
    const current = new Set((portal.openDays || "").split(",").filter(Boolean));
    if (current.has(day)) current.delete(day); else current.add(day);
    updatePortal("openDays", Array.from(current).join(","));
  }

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("ไฟล์โลโก้ต้องเป็นรูปภาพ"); return; }
    if (file.size > 700_000) { setError("ไฟล์โลโก้ควรต่ำกว่า 700KB เพื่อให้โหลดเร็ว"); return; }
    const reader = new FileReader();
    reader.onload = () => updatePortal("logoDataUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function saveStore(e?: FormEvent) {
    e?.preventDefault();
    setBusy("save-store"); setError(""); setNotice("");
    try {
      const savedOrg = await api<StoreProfile["organization"]>("/store/profile", { method: "PATCH", body: JSON.stringify(storeForm) });
      await api<PortalSettings>("/store/portal-settings", { method: "PUT", body: JSON.stringify(portal) });
      setProfile((current) => current ? { ...current, organization: savedOrg } : current);
      setNotice("บันทึกโปรไฟล์ร้านและระบบแล้ว");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกโปรไฟล์ไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function savePayment(e?: FormEvent) {
    e?.preventDefault();
    setBusy("save-payment"); setError(""); setNotice("");
    try {
      const saved = await api<PaymentSetting>("/store/payment-settings", { method: "PUT", body: JSON.stringify(payment) });
      setPayment(saved);
      await api<PortalSettings>("/store/portal-settings", { method: "PUT", body: JSON.stringify(portal) });
      setNotice("บันทึกการรับเงินแล้ว");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกการรับเงินไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function savePortal(e?: FormEvent) {
    e?.preventDefault();
    setBusy("save-portal"); setError(""); setNotice("");
    try {
      await api<PortalSettings>("/store/portal-settings", { method: "PUT", body: JSON.stringify(portal) });
      setNotice("บันทึก Portal และ System Profile แล้ว");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึก Portal ไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function saveTemplate(template: NotificationTemplate) {
    setBusy(`template:${template.key}`); setError(""); setNotice("");
    try {
      await api("/templates/notifications", { method: "POST", body: JSON.stringify(template) });
      setNotice("บันทึกเทมเพลตแล้ว");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกเทมเพลตไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function saveDocument(e?: FormEvent) {
    e?.preventDefault();
    setBusy("save-doc"); setError(""); setNotice("");
    try {
      await api("/templates/documents", { method: "POST", body: JSON.stringify({ type: "CONTRACT", title: docForm.title, version: docForm.version || "1.0", body: docForm.body || "" }) });
      setNotice("บันทึกเอกสารแล้ว");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกเอกสารไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  const currentSection = sections.find((section) => section.id === active);
  const portalUrl = portal.slug ? `https://${portal.slug}.portal.app` : "ยังไม่ได้ตั้งค่า";
  const activeDays = new Set((portal.openDays || "").split(",").filter(Boolean));

  return (
    <main className={`profile-suite ${theme}`}>
      <ProfileStyles />
      <aside className={`profile-side ${sidebarOpen ? "open" : "closed"}`}>
        <button className="brand" type="button" onClick={() => setSidebarOpen(!sidebarOpen)}><span>K</span>{sidebarOpen && <b>Store Console</b>}</button>
        <nav>{sections.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)} title={item.label}><i>{item.icon}</i>{sidebarOpen && <b>{item.label}</b>}</button>)}</nav>
        <div className="side-tools"><button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><i>{theme === "dark" ? "☾" : "☀"}</i>{sidebarOpen && <b>{theme === "dark" ? "Dark" : "Light"}</b>}</button><a href="/"><i>⌂</i>{sidebarOpen && <b>Store</b>}</a></div>
      </aside>

      <section className="profile-content">
        <header className="topbar"><div><span className={`pill ${tone(org?.status)}`}>{org?.status || "checking"}</span><h1>{currentSection?.label || "โปรไฟล์ร้าน"}</h1></div><div className="top-actions"><button onClick={load}>{busy === "load" ? "Loading" : "Refresh"}</button><button className="danger" onClick={() => location.href = "/"}>ออก</button></div></header>

        <section className="profile-head-card">
          <div className="avatar-wrap"><div className="avatar">{portal.logoDataUrl ? <img src={portal.logoDataUrl} alt="store logo" /> : <span>{initials(org?.name)}</span>}</div><label className="camera"><input type="file" accept="image/*" onChange={onLogoChange} />📷</label></div>
          <div className="profile-title"><h2>{storeForm.name || org?.name || "KOGA Store"}</h2><p>{storeForm.ownerName || org?.ownerName || "Owner"}</p><div className="badges"><span>PRO</span><span className="green">ACTIVE</span></div></div>
          <Stat label="ลูกค้า" value={profile?.counts.customers ?? 0} accent="blue" />
          <Stat label="เครื่อง" value={profile?.counts.devices ?? 0} accent="violet" />
          <Stat label="สัญญา" value={profile?.counts.contracts ?? 0} accent="cyan" />
          <div className="progress"><b>{setupScore}%</b><span>ตั้งค่าเสร็จ</span><i style={{ width: `${setupScore}%` }} /></div>
        </section>

        <section className="theme-card"><button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>☾ Dark</button><button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>☀ Light</button><input type="color" value={portal.brandColor || "#38bdf8"} onChange={(e) => updatePortal("brandColor", e.target.value)} /><span>{portal.brandColor || "#38bdf8"}</span></section>

        {notice && <div className="alert good">{notice}</div>}{error && <div className="alert bad">{error}</div>}

        <section className="tabbar">{sections.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}>{item.icon} {item.label}</button>)}</section>

        <section className="grid-main">
          <div className="panel large">
            {active === "store" && <form onSubmit={saveStore} className="form"><PanelTitle title="ข้อมูลร้าน + รูปโปรไฟล์" /><div className="form-grid"><Field label="ชื่อร้าน" value={storeForm.name} onChange={(v) => updateStore("name", v)} /><Field label="เจ้าของร้าน" value={storeForm.ownerName} onChange={(v) => updateStore("ownerName", v)} /><Field label="เบอร์โทร" value={storeForm.phone} onChange={(v) => updateStore("phone", v)} /><Field label="อีเมลรับบิล" value={storeForm.billingEmail} onChange={(v) => updateStore("billingEmail", v)} /><Field label="เลขภาษี" value={storeForm.taxId} onChange={(v) => updateStore("taxId", v)} /><Field label="เว็บไซต์" value={portal.website} onChange={(v) => updatePortal("website", v)} /></div><TextArea label="ที่อยู่" value={storeForm.address} onChange={(v) => updateStore("address", v)} /><Field label="เวลาทำการ" value={portal.businessHours} onChange={(v) => updatePortal("businessHours", v)} /><div className="chips">{dayList.map((day) => <button key={day} type="button" className={activeDays.has(day) ? "on" : ""} onClick={() => toggleDay(day)}>{day}</button>)}</div><button className="save" disabled={busy === "save-store"}>{busy === "save-store" ? "Saving..." : "บันทึก"}</button></form>}
            {active === "payment" && <form onSubmit={savePayment} className="form"><PanelTitle title="รับเงิน" /><div className="form-grid"><Field label="ชื่อที่แสดง" value={payment.displayName} onChange={(v) => setPayment({ ...payment, displayName: v })} /><Field label="PromptPay ID" value={payment.promptPayId} onChange={(v) => setPayment({ ...payment, promptPayId: v })} /><Field label="ธนาคาร" value={payment.bankName} onChange={(v) => setPayment({ ...payment, bankName: v })} /><Field label="เลขบัญชี" value={payment.accountNo} onChange={(v) => setPayment({ ...payment, accountNo: v })} /><Field label="ชื่อบัญชี" value={payment.accountName} onChange={(v) => setPayment({ ...payment, accountName: v })} /></div><Toggle label="เปิด QR Payment" value={asBool(portal.qrPaymentEnabled)} onChange={(v) => updatePortal("qrPaymentEnabled", setBool(v))} /><TextArea label="ข้อความท้ายบิล" value={portal.invoiceFooter || payment.instructions} onChange={(v) => { updatePortal("invoiceFooter", v); setPayment({ ...payment, instructions: v }); }} /><button className="save" disabled={busy === "save-payment"}>บันทึก</button></form>}
            {active === "portal" && <form onSubmit={savePortal} className="form"><PanelTitle title="Customer Portal" /><div className="form-grid"><Field label="Slug URL" value={portal.slug} onChange={(v) => updatePortal("slug", v)} /><Field label="สีหลัก" value={portal.brandColor} onChange={(v) => updatePortal("brandColor", v)} /><Field label="LINE Support" value={portal.contactLine} onChange={(v) => updatePortal("contactLine", v)} /><Field label="เบอร์ช่วยเหลือ" value={portal.supportPhone} onChange={(v) => updatePortal("supportPhone", v)} /></div><TextArea label="ข้อความต้อนรับ" value={portal.welcomeText} onChange={(v) => updatePortal("welcomeText", v)} /><TextArea label="นโยบายปลดเครื่อง" value={portal.releasePolicy} onChange={(v) => updatePortal("releasePolicy", v)} /><button className="save" disabled={busy === "save-portal"}>บันทึก</button></form>}
            {active === "notifications" && <div className="form"><PanelTitle title="แจ้งเตือน" /><div className="notify-row"><Toggle label="LINE" value={asBool(portal.notifyLine)} onChange={(v) => updatePortal("notifyLine", setBool(v))} /><Toggle label="SMS" value={asBool(portal.notifySms)} onChange={(v) => updatePortal("notifySms", setBool(v))} /><Toggle label="Email" value={asBool(portal.notifyEmail)} onChange={(v) => updatePortal("notifyEmail", setBool(v))} /></div><div className="templates">{templates.map((tpl, index) => <article key={`${tpl.key}-${tpl.channel}`}><span>{tpl.channel}</span><input value={tpl.title} onChange={(e) => setTemplates((rows) => rows.map((row, i) => i === index ? { ...row, title: e.target.value } : row))} /><textarea value={tpl.body} onChange={(e) => setTemplates((rows) => rows.map((row, i) => i === index ? { ...row, body: e.target.value } : row))} /><button onClick={() => saveTemplate(tpl)}>{busy === `template:${tpl.key}` ? "Saving" : "บันทึก"}</button></article>)}</div></div>}
            {active === "documents" && <form onSubmit={saveDocument} className="form"><PanelTitle title="เอกสาร" /><div className="form-grid"><Field label="ชื่อเอกสาร" value={docForm.title} onChange={(v) => setDocForm({ ...docForm, title: v })} /><Field label="เวอร์ชัน" value={docForm.version} onChange={(v) => setDocForm({ ...docForm, version: v })} /></div><TextArea label="ข้อความเอกสาร" value={docForm.body} onChange={(v) => setDocForm({ ...docForm, body: v })} /><button className="save" disabled={busy === "save-doc"}>บันทึก</button></form>}
            {active === "integrations" && <div className="form"><PanelTitle title="ระบบนอก" /><div className="integrations">{integrations.map((row) => <a href="/integrations" key={row.id}><b>{row.displayName}</b><span className={tone(row.status)}>{row.status}</span><small>{row.provider} · {row.category}</small></a>)}</div></div>}
            {active === "security" && <form onSubmit={savePortal} className="form"><PanelTitle title="ความปลอดภัย" /><Toggle label="ยืนยันตัวตน 2 ขั้นตอน (2FA)" value={asBool(portal.twoFactorEnabled)} onChange={(v) => updatePortal("twoFactorEnabled", setBool(v))} /><Toggle label="แจ้งเตือนการเข้าสู่ระบบ" value={asBool(portal.loginAlerts)} onChange={(v) => updatePortal("loginAlerts", setBool(v))} /><Toggle label="ควบคุมเซสชัน" value={asBool(portal.sessionControl)} onChange={(v) => updatePortal("sessionControl", setBool(v))} /><Field label="Role preset" value={portal.rolePreset} onChange={(v) => updatePortal("rolePreset", v)} /><button className="save">บันทึก</button></form>}
            {active === "system" && <form onSubmit={savePortal} className="form"><PanelTitle title="System Profile" /><div className="form-grid"><Field label="ชื่อระบบ" value={portal.systemProfileName} onChange={(v) => updatePortal("systemProfileName", v)} /><Field label="Theme" value={portal.systemTheme} onChange={(v) => { updatePortal("systemTheme", v); if (v === "dark" || v === "light") setTheme(v); }} /><Field label="Accent" value={portal.systemAccent} onChange={(v) => updatePortal("systemAccent", v)} /><Field label="Brand color" value={portal.brandColor} onChange={(v) => updatePortal("brandColor", v)} /></div><button className="save">บันทึก</button></form>}
          </div>

          <aside className="preview-stack">
            <PreviewCard title="รับเงิน" rows={[["PromptPay", payment.promptPayId || "ยังไม่ตั้งค่า"], ["ธนาคาร", payment.bankName || "-"], ["บัญชี", payment.accountNo || "-"], ["QR Payment", asBool(portal.qrPaymentEnabled) ? "เปิดใช้งาน" : "ปิด"]]} />
            <PreviewCard title="Portal" rows={[["URL", portalUrl], ["สีหลัก", portal.brandColor || "#38bdf8"], ["LINE", portal.contactLine || "-"], ["Policy", portal.releasePolicy || "-"]]} />
            <PreviewCard title="ระบบ" rows={[["Theme", theme], ["Accent", portal.systemAccent || "cyan-violet"], ["2FA", asBool(portal.twoFactorEnabled) ? "เปิด" : "ปิด"], ["Login alerts", asBool(portal.loginAlerts) ? "เปิด" : "ปิด"]]} />
          </aside>
        </section>

        <footer className="sticky-actions"><button onClick={() => void load()}>ยกเลิก</button><button className="save" onClick={() => active === "payment" ? void savePayment() : active === "store" ? void saveStore() : active === "documents" ? void saveDocument() : void savePortal()}>บันทึก</button><button onClick={() => setActive("portal")}>ดูตัวอย่าง</button></footer>
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) { return <div className={`stat ${accent}`}><span>{label}</span><b>{value}</b></div>; }
function PanelTitle({ title }: { title: string }) { return <div className="panel-title"><h2>{title}</h2><span>พร้อมใช้งาน</span></div>; }
function Field({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <label className="field"><span>{label}</span><input value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>; }
function TextArea({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <label className="field full"><span>{label}</span><textarea value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>; }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <button type="button" className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)}><span>{label}</span><i /></button>; }
function PreviewCard({ title, rows }: { title: string; rows: Array<[string, string]> }) { return <article className="preview"><h3>{title}</h3>{rows.map(([k, v]) => <p key={k}><span>{k}</span><b>{v}</b></p>)}</article>; }

function ProfileStyles() {
  return <style>{`
    .profile-suite{--bg:#020617;--panel:rgba(15,23,42,.82);--panel2:rgba(15,23,42,.62);--line:rgba(148,163,184,.16);--text:#e5edf7;--muted:#91a4bc;--accent:#38bdf8;--accent2:#8b5cf6;min-height:100vh;display:grid;grid-template-columns:280px 1fr;background:radial-gradient(circle at 20% 0%,rgba(56,189,248,.20),transparent 32%),radial-gradient(circle at 88% 4%,rgba(139,92,246,.20),transparent 30%),linear-gradient(135deg,#020617,#07111f 58%,#0f172a);color:var(--text)}.profile-suite.light{--bg:#f8fafc;--panel:rgba(255,255,255,.88);--panel2:rgba(255,255,255,.70);--line:rgba(15,23,42,.12);--text:#0f172a;--muted:#64748b;--accent:#0ea5e9;--accent2:#7c3aed;background:linear-gradient(135deg,#f8fafc,#e0f2fe,#eef2ff)}.profile-side{position:sticky;top:0;height:100vh;padding:14px;display:flex;flex-direction:column;border-right:1px solid var(--line);background:rgba(2,6,23,.42);backdrop-filter:blur(22px)}.profile-suite.light .profile-side{background:rgba(255,255,255,.56)}.profile-side.closed{width:88px}.brand{height:58px;border:0;border-radius:20px;background:transparent;color:var(--text);display:flex;align-items:center;gap:12px;cursor:pointer}.brand span{width:46px;height:46px;border-radius:16px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:grid;place-items:center;color:white;font-weight:900}.profile-side nav{display:grid;gap:8px;margin-top:20px}.profile-side nav button,.side-tools button,.side-tools a{height:48px;border:1px solid transparent;border-radius:16px;background:transparent;color:var(--muted);display:flex;align-items:center;gap:12px;padding:0 14px;text-decoration:none;cursor:pointer}.profile-side nav button.active,.profile-side nav button:hover,.side-tools button:hover,.side-tools a:hover{background:linear-gradient(135deg,rgba(56,189,248,.18),rgba(139,92,246,.14));border-color:rgba(56,189,248,.26);color:var(--text)}.profile-side i{width:24px;text-align:center;font-style:normal;color:var(--accent)}.side-tools{margin-top:auto;display:grid;gap:8px}.profile-content{min-width:0;padding:22px 24px 100px}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:16px}.topbar h1{font-size:34px;margin:8px 0 0;letter-spacing:-.04em}.top-actions{display:flex;gap:8px}.top-actions button,.sticky-actions button,.theme-card button{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:14px;padding:11px 14px;cursor:pointer}.top-actions .danger{color:#fca5a5;border-color:rgba(248,113,113,.35)}.pill,.badges span{display:inline-flex;align-items:center;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900;border:1px solid var(--line)}.pill.good,.green{color:#22c55e;border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.1)}.pill.warn{color:#f59e0b}.pill.bad{color:#ef4444}.profile-head-card{display:grid;grid-template-columns:auto minmax(210px,1fr) repeat(3,minmax(130px,.75fr)) minmax(150px,.8fr);gap:14px;align-items:center;border:1px solid var(--line);background:var(--panel);border-radius:28px;padding:18px;box-shadow:0 26px 80px rgba(0,0,0,.22)}.avatar-wrap{position:relative}.avatar{width:124px;height:124px;border-radius:34px;overflow:hidden;border:1px solid rgba(56,189,248,.42);display:grid;place-items:center;background:#020617}.avatar img{width:100%;height:100%;object-fit:cover}.avatar span{font-size:58px;font-weight:900;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;color:transparent}.camera{position:absolute;right:-8px;bottom:-8px;width:38px;height:38px;border-radius:14px;background:var(--panel);border:1px solid var(--line);display:grid;place-items:center;cursor:pointer}.camera input{display:none}.profile-title h2{font-size:30px;margin:0 0 6px}.profile-title p{color:var(--muted);margin:0 0 12px}.badges{display:flex;gap:8px}.stat,.progress{border:1px solid var(--line);background:var(--panel2);border-radius:20px;padding:15px}.stat span,.progress span{display:block;color:var(--muted);font-size:12px}.stat b,.progress b{display:block;font-size:28px;margin-top:6px}.stat.blue b{color:#60a5fa}.stat.violet b{color:#a78bfa}.stat.cyan b{color:#22d3ee}.progress i{display:block;height:7px;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:999px;margin-top:14px}.theme-card,.tabbar{display:flex;gap:10px;align-items:center;overflow:auto;border:1px solid var(--line);background:var(--panel2);border-radius:22px;padding:10px;margin-top:16px}.theme-card button.active,.tabbar button.active{background:linear-gradient(135deg,rgba(56,189,248,.24),rgba(139,92,246,.18));color:var(--text);border-color:rgba(56,189,248,.35)}.theme-card input{width:44px;height:38px;border:0;background:transparent}.tabbar button{border:0;background:transparent;color:var(--muted);padding:11px 14px;border-radius:14px;white-space:nowrap;cursor:pointer}.alert{border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin-top:14px}.alert.good{border-color:rgba(34,197,94,.3);color:#86efac}.alert.bad{border-color:rgba(239,68,68,.3);color:#fca5a5}.grid-main{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,.75fr);gap:16px;margin-top:16px}.panel,.preview{border:1px solid var(--line);background:var(--panel);border-radius:26px;padding:18px}.panel-title{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px}.panel-title h2{margin:0;font-size:22px}.panel-title span{color:var(--muted);font-size:13px}.form{display:grid;gap:15px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.field{display:grid;gap:7px}.field span{color:var(--muted);font-size:13px}.field input,.field textarea,.templates input,.templates textarea{width:100%;border:1px solid var(--line);background:rgba(2,6,23,.20);color:var(--text);border-radius:15px;padding:13px;outline:none}.profile-suite.light .field input,.profile-suite.light .field textarea,.profile-suite.light .templates input,.profile-suite.light .templates textarea{background:rgba(255,255,255,.82)}.field textarea,.templates textarea{min-height:112px;resize:vertical}.field.full{grid-column:1/-1}.chips,.notify-row{display:flex;gap:8px;flex-wrap:wrap}.chips button{border:1px solid var(--line);background:var(--panel2);color:var(--muted);border-radius:12px;padding:9px 11px}.chips button.on{background:#2563eb;color:white}.toggle{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:16px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:20px;text-align:left;cursor:pointer}.toggle i{width:46px;height:26px;border-radius:999px;background:#334155;position:relative}.toggle i:after{content:"";position:absolute;width:20px;height:20px;border-radius:50%;background:white;left:3px;top:3px;transition:.2s}.toggle.on i{background:linear-gradient(90deg,var(--accent),var(--accent2))}.toggle.on i:after{left:23px}.save{background:linear-gradient(135deg,var(--accent),var(--accent2))!important;color:white!important;border:0!important;font-weight:900}.templates{display:grid;gap:12px}.templates article,.integrations a{border:1px solid var(--line);background:var(--panel2);border-radius:18px;padding:14px;display:grid;gap:10px;color:var(--text);text-decoration:none}.templates span{color:var(--accent);font-weight:900}.integrations{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.integrations span.good{color:#22c55e}.integrations span.warn{color:#f59e0b}.integrations span.bad{color:#ef4444}.integrations small{color:var(--muted)}.preview-stack{display:grid;gap:14px;align-content:start}.preview h3{margin:0 0 12px}.preview p{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding-top:10px}.preview span{color:var(--muted)}.preview b{text-align:right}.sticky-actions{position:sticky;bottom:12px;margin-top:16px;border:1px solid var(--line);background:rgba(2,6,23,.76);backdrop-filter:blur(20px);border-radius:22px;padding:12px;display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:10px}.profile-suite.light .sticky-actions{background:rgba(255,255,255,.76)}@media(max-width:1100px){.profile-suite{grid-template-columns:88px 1fr}.profile-side:not(.open) b{display:none}.profile-head-card{grid-template-columns:auto 1fr 1fr}.progress{grid-column:1/-1}.grid-main{grid-template-columns:1fr}.preview-stack{grid-template-columns:1fr 1fr 1fr}}@media(max-width:760px){.profile-suite{display:block}.profile-side{position:fixed;left:8px;top:8px;bottom:8px;width:72px;z-index:80;border-radius:22px}.profile-side.open{width:min(282px,86vw)}.profile-side.closed b{display:none}.profile-content{margin-left:78px;padding:12px 10px 96px}.topbar{flex-direction:column}.topbar h1{font-size:28px}.profile-head-card{grid-template-columns:1fr;align-items:start}.avatar{width:104px;height:104px;border-radius:28px}.form-grid,.integrations,.preview-stack{grid-template-columns:1fr}.sticky-actions{grid-template-columns:1fr}.tabbar{margin-right:-10px;border-radius:18px}.theme-card{flex-wrap:wrap}}
  `}</style>;
}
