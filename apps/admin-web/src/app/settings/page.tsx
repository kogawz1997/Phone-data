"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type PortalSettings = {
  slug?: string;
  brandColor?: string;
  welcomeText?: string;
  contactLine?: string;
  supportPhone?: string;
  releasePolicy?: string;
};

type Integration = { id: string; provider: string; category: string; displayName: string; status: string; configJson?: Record<string, string> };
type NotificationTemplate = { key: string; channel: string; title: string; body: string };
type Section = "store" | "payment" | "portal" | "notifications" | "documents" | "integrations";
type Theme = "dark" | "light";

const sections: Array<{ id: Section; label: string; icon: string }> = [
  { id: "store", label: "โปรไฟล์ร้าน", icon: "◆" },
  { id: "payment", label: "รับเงิน", icon: "฿" },
  { id: "portal", label: "Portal", icon: "◉" },
  { id: "notifications", label: "แจ้งเตือน", icon: "✦" },
  { id: "documents", label: "เอกสาร", icon: "▣" },
  { id: "integrations", label: "ระบบนอก", icon: "⌁" },
];

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function tone(status?: string) {
  const s = String(status || "").toUpperCase();
  if (["ACTIVE", "CURRENT", "CONNECTED", "READY", "DONE"].includes(s)) return "good";
  if (["FAILED", "ERROR", "SUSPENDED", "BLOCKED"].includes(s)) return "bad";
  return "warn";
}

export default function StoreSettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("store");
  const [theme, setTheme] = useState<Theme>("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [payment, setPayment] = useState<PaymentSetting>({ provider: "PROMPTPAY_MANUAL", displayName: "PromptPay / Bank Transfer", isActive: true });
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [storeForm, setStoreForm] = useState<Record<string, string>>({});
  const [portalForm, setPortalForm] = useState<Record<string, string>>({});
  const [documentForm, setDocumentForm] = useState<Record<string, string>>({ version: "1.0" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const savedTheme = typeof window !== "undefined" ? window.localStorage.getItem("koga_profile_theme") : "";
    const savedSidebar = typeof window !== "undefined" ? window.localStorage.getItem("koga_profile_sidebar") : "";
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    if (savedSidebar === "closed") setSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("koga_profile_theme", theme);
    document.documentElement.dataset.settingsTheme = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("koga_profile_sidebar", sidebarOpen ? "open" : "closed");
  }, [sidebarOpen]);

  async function load() {
    setBusy("load");
    setError("");
    try {
      const [profileRes, payments, templatesRes, integrationRows, portalSettings] = await Promise.all([
        api<StoreProfile>("/store/profile"),
        api<PaymentSetting[]>("/store/payment-settings"),
        api<{ notifications: NotificationTemplate[] }>("/templates"),
        api<Integration[]>("/integrations"),
        api<PortalSettings>("/store/portal-settings"),
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
        slug: text(portalSettings.slug || profileRes.organization.slug),
        brandColor: text(portalSettings.brandColor || "#38bdf8"),
        welcomeText: text(portalSettings.welcomeText || "ตรวจสอบยอด ชำระงวด และดูสัญญาได้จากหน้านี้"),
        contactLine: text(portalSettings.contactLine),
        supportPhone: text(portalSettings.supportPhone || profileRes.organization.phone),
        releasePolicy: text(portalSettings.releasePolicy || "เมื่อชำระครบ ร้านจะตรวจสอบยอดและดำเนินการปลดเครื่องตามขั้นตอน"),
      });
      const activePayment = payments.find((item) => item.isActive) ?? payments[0];
      if (activePayment) setPayment(activePayment);
      setTemplates(templatesRes.notifications ?? []);
      setIntegrations(integrationRows.filter((row) => row.category !== "MDM"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดตั้งค่าไม่สำเร็จ");
    } finally {
      setBusy("");
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

  async function saveStoreProfile(e?: FormEvent) {
    e?.preventDefault();
    setBusy("store"); setError(""); setNotice("");
    try {
      const org = await api<StoreProfile["organization"]>("/store/profile", { method: "PATCH", body: JSON.stringify(storeForm) });
      setProfile((current) => current ? { ...current, organization: org } : current);
      setNotice("บันทึกโปรไฟล์ร้านแล้ว");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกข้อมูลร้านไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function savePayment(e?: FormEvent) {
    e?.preventDefault();
    setBusy("payment"); setError(""); setNotice("");
    try {
      const saved = await api<PaymentSetting>("/store/payment-settings", { method: "PUT", body: JSON.stringify(payment) });
      setPayment(saved);
      setNotice("บันทึกช่องทางรับเงินแล้ว");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกช่องทางรับเงินไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function savePortal(e?: FormEvent) {
    e?.preventDefault();
    setBusy("portal"); setError(""); setNotice("");
    try {
      await api("/store/portal-settings", { method: "PUT", body: JSON.stringify(portalForm) });
      setNotice("บันทึก Portal แล้ว");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึก Portal ไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function saveTemplate(template: NotificationTemplate) {
    setBusy(`template:${template.key}`); setError(""); setNotice("");
    try {
      await api("/templates/notifications", { method: "POST", body: JSON.stringify(template) });
      setNotice("บันทึก Template แล้ว");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึก template ไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  async function saveDocumentTemplate(e?: FormEvent) {
    e?.preventDefault();
    setBusy("document"); setError(""); setNotice("");
    try {
      await api("/templates/documents", { method: "POST", body: JSON.stringify({ type: "CONTRACT", title: documentForm.title || "ข้อความท้ายสัญญา", version: documentForm.version || "1.0", body: documentForm.body || "" }) });
      setNotice("บันทึกเอกสารแล้ว");
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกเอกสารไม่สำเร็จ"); }
    finally { setBusy(""); }
  }

  const setTemplate = (index: number, patch: Partial<NotificationTemplate>) => {
    setTemplates((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const org = profile?.organization;
  const active = sections.find((section) => section.id === activeSection);

  return (
    <main className={`profile-pro ${theme} ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <ProfileStyles />
      <aside className="profile-sidebar">
        <div className="side-head">
          <div className="side-logo">K</div>
          {sidebarOpen && <div><b>{org?.name || "KOGA Store"}</b><span>{org?.plan || "Store"}</span></div>}
        </div>
        <nav className="side-nav">
          {sections.map((section) => (
            <button key={section.id} className={activeSection === section.id ? "active" : ""} onClick={() => setActiveSection(section.id)} title={section.label}>
              <span>{section.icon}</span>{sidebarOpen && <b>{section.label}</b>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Theme"><span>{theme === "dark" ? "☾" : "☀"}</span>{sidebarOpen && <b>{theme === "dark" ? "Dark" : "Light"}</b>}</button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle menu"><span>{sidebarOpen ? "←" : "→"}</span>{sidebarOpen && <b>ย่อเมนู</b>}</button>
        </div>
      </aside>

      <section className="profile-main">
        <header className="profile-top">
          <div>
            <span className={`status ${tone(org?.status)}`}>{org?.status || "checking"}</span>
            <h1>{active?.label || "โปรไฟล์ร้าน"}</h1>
          </div>
          <div className="top-actions">
            <button className="ghost" onClick={load}>{busy === "load" ? "Loading" : "Refresh"}</button>
            <a className="ghost" href="/">Store</a>
          </div>
        </header>

        <section className="profile-hero">
          <div className="hero-card primary">
            <div><span>Setup</span><strong>{setupScore}%</strong></div>
            <div className="bar"><i style={{ width: `${setupScore}%` }} /></div>
          </div>
          <MiniStat label="ลูกค้า" value={profile?.counts.customers ?? 0} />
          <MiniStat label="เครื่อง" value={profile?.counts.devices ?? 0} />
          <MiniStat label="สัญญา" value={profile?.counts.contracts ?? 0} />
        </section>

        {error && <div className="profile-alert bad">{error}</div>}
        {notice && <div className="profile-alert good">{notice}</div>}

        <section className="profile-panel">
          {activeSection === "store" && (
            <form className="profile-form" onSubmit={saveStoreProfile}>
              <SectionTitle title="ข้อมูลร้าน" action={busy === "store" ? "Saving..." : "Save"} />
              <div className="field-grid two"><Field label="ชื่อร้าน" value={storeForm.name} onChange={(v) => setStoreForm({ ...storeForm, name: v })} /><Field label="เจ้าของร้าน" value={storeForm.ownerName} onChange={(v) => setStoreForm({ ...storeForm, ownerName: v })} /><Field label="เบอร์ร้าน" value={storeForm.phone} onChange={(v) => setStoreForm({ ...storeForm, phone: v })} /><Field label="อีเมลรับบิล" value={storeForm.billingEmail} onChange={(v) => setStoreForm({ ...storeForm, billingEmail: v })} /><Field label="เลขภาษี" value={storeForm.taxId} onChange={(v) => setStoreForm({ ...storeForm, taxId: v })} /><Field label="แพ็กเกจ" value={`${org?.plan || ""} / ${org?.status || ""}`} disabled onChange={() => null} /></div>
              <TextArea label="ที่อยู่" value={storeForm.address} onChange={(v) => setStoreForm({ ...storeForm, address: v })} />
              <button className="save" disabled={busy === "store"}>บันทึก</button>
            </form>
          )}

          {activeSection === "payment" && (
            <form className="profile-form" onSubmit={savePayment}>
              <SectionTitle title="รับเงิน" action={busy === "payment" ? "Saving..." : "Save"} />
              <div className="field-grid two"><Field label="ชื่อที่แสดง" value={payment.displayName} onChange={(v) => setPayment({ ...payment, displayName: v })} /><Field label="PromptPay ID" value={payment.promptPayId} onChange={(v) => setPayment({ ...payment, promptPayId: v })} /><Field label="ธนาคาร" value={payment.bankName} onChange={(v) => setPayment({ ...payment, bankName: v })} /><Field label="เลขบัญชี" value={payment.accountNo} onChange={(v) => setPayment({ ...payment, accountNo: v })} /><Field label="ชื่อบัญชี" value={payment.accountName} onChange={(v) => setPayment({ ...payment, accountName: v })} /></div>
              <TextArea label="ข้อความชำระเงิน" value={payment.instructions} onChange={(v) => setPayment({ ...payment, instructions: v })} />
              <button className="save" disabled={busy === "payment"}>บันทึก</button>
            </form>
          )}

          {activeSection === "portal" && (
            <form className="profile-form" onSubmit={savePortal}>
              <SectionTitle title="Customer Portal" action={busy === "portal" ? "Saving..." : "Save"} />
              <div className="field-grid two"><Field label="Slug" value={portalForm.slug} onChange={(v) => setPortalForm({ ...portalForm, slug: v })} /><Field label="สีหลัก" value={portalForm.brandColor} onChange={(v) => setPortalForm({ ...portalForm, brandColor: v })} /><Field label="LINE" value={portalForm.contactLine} onChange={(v) => setPortalForm({ ...portalForm, contactLine: v })} /><Field label="เบอร์ช่วยเหลือ" value={portalForm.supportPhone} onChange={(v) => setPortalForm({ ...portalForm, supportPhone: v })} /></div>
              <TextArea label="ข้อความต้อนรับ" value={portalForm.welcomeText} onChange={(v) => setPortalForm({ ...portalForm, welcomeText: v })} />
              <TextArea label="นโยบายปลดเครื่อง" value={portalForm.releasePolicy} onChange={(v) => setPortalForm({ ...portalForm, releasePolicy: v })} />
              <button className="save" disabled={busy === "portal"}>บันทึก</button>
            </form>
          )}

          {activeSection === "notifications" && (
            <section className="profile-form">
              <SectionTitle title="แจ้งเตือน" />
              <div className="template-grid">{templates.map((template, index) => <article className="template-card" key={`${template.key}-${template.channel}`}><div><span className="status warn">{template.channel}</span><input value={template.title} onChange={(e) => setTemplate(index, { title: e.target.value })} /></div><textarea value={template.body} onChange={(e) => setTemplate(index, { body: e.target.value })} /><button onClick={() => saveTemplate(template)} disabled={busy === `template:${template.key}`}>{busy === `template:${template.key}` ? "Saving" : "Save"}</button></article>)}</div>
            </section>
          )}

          {activeSection === "documents" && (
            <form className="profile-form" onSubmit={saveDocumentTemplate}>
              <SectionTitle title="เอกสาร" action={busy === "document" ? "Saving..." : "Save"} />
              <div className="field-grid two"><Field label="ชื่อเอกสาร" value={documentForm.title} onChange={(v) => setDocumentForm({ ...documentForm, title: v })} /><Field label="เวอร์ชัน" value={documentForm.version || "1.0"} onChange={(v) => setDocumentForm({ ...documentForm, version: v })} /></div>
              <TextArea label="ข้อความ" value={documentForm.body} onChange={(v) => setDocumentForm({ ...documentForm, body: v })} />
              <button className="save" disabled={busy === "document"}>บันทึก</button>
            </form>
          )}

          {activeSection === "integrations" && (
            <section className="profile-form">
              <SectionTitle title="ระบบนอก" />
              <div className="integration-grid">{integrations.map((row) => <a className="integration-card" key={row.id} href="/integrations"><span className={`status ${tone(row.status)}`}>{row.status}</span><b>{row.displayName}</b><small>{row.provider} · {row.category}</small></a>)}</div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="hero-card"><span>{label}</span><strong>{value}</strong></div>;
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <div className="section-title"><h2>{title}</h2>{action && <span>{action}</span>}</div>;
}

function Field({ label, value, onChange, disabled }: { label: string; value?: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return <label className="field full"><span>{label}</span><textarea value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function ProfileStyles() {
  return <style>{`
    .profile-pro{--bg:#071019;--panel:rgba(13,24,38,.82);--panel2:rgba(18,31,47,.78);--line:rgba(148,163,184,.16);--text:#e5edf7;--muted:#8da2b8;--accent:#38bdf8;--accent2:#a78bfa;--good:#22c55e;--warn:#f59e0b;--bad:#ef4444;min-height:100vh;background:radial-gradient(circle at 20% 0%,rgba(56,189,248,.20),transparent 34%),radial-gradient(circle at 90% 10%,rgba(167,139,250,.18),transparent 30%),linear-gradient(135deg,#020617,#071019 45%,#0f172a);color:var(--text);display:grid;grid-template-columns:280px 1fr;gap:0}
    .profile-pro.light{--bg:#f6f8fb;--panel:rgba(255,255,255,.86);--panel2:rgba(255,255,255,.92);--line:rgba(15,23,42,.12);--text:#0f172a;--muted:#64748b;--accent:#0ea5e9;--accent2:#7c3aed;background:linear-gradient(135deg,#f8fafc,#e0f2fe 48%,#eef2ff)}
    .profile-pro.sidebar-closed{grid-template-columns:92px 1fr}.profile-sidebar{position:sticky;top:0;height:100vh;padding:18px;display:flex;flex-direction:column;border-right:1px solid var(--line);background:rgba(2,6,23,.38);backdrop-filter:blur(20px)}.light .profile-sidebar{background:rgba(255,255,255,.45)}
    .side-head{display:flex;align-items:center;gap:12px;min-height:54px}.side-logo{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));font-weight:900;color:white;box-shadow:0 16px 38px rgba(56,189,248,.22)}.side-head b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}.side-head span{display:block;color:var(--muted);font-size:12px;margin-top:3px}
    .side-nav{display:grid;gap:8px;margin-top:24px}.side-nav button,.side-bottom button{border:1px solid transparent;background:transparent;color:var(--muted);border-radius:16px;min-height:48px;display:flex;align-items:center;gap:12px;padding:0 14px;cursor:pointer;text-align:left}.side-nav button:hover,.side-bottom button:hover{background:rgba(148,163,184,.10);color:var(--text)}.side-nav button.active{background:linear-gradient(135deg,rgba(56,189,248,.20),rgba(167,139,250,.18));border-color:rgba(56,189,248,.28);color:var(--text)}.side-nav span,.side-bottom span{width:24px;text-align:center}.side-bottom{margin-top:auto;display:grid;gap:8px}
    .profile-main{padding:22px;min-width:0}.profile-top{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:18px}.profile-top h1{font-size:34px;line-height:1;margin:10px 0 0;letter-spacing:-.04em}.top-actions{display:flex;gap:8px;flex-wrap:wrap}.ghost,.save,.template-card button{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:14px;padding:11px 14px;text-decoration:none;cursor:pointer}.ghost:hover,.save:hover,.template-card button:hover{border-color:rgba(56,189,248,.48)}.save{background:linear-gradient(135deg,var(--accent),var(--accent2));border:0;color:white;font-weight:800;min-width:120px}
    .profile-hero{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:14px;margin-bottom:16px}.hero-card{border:1px solid var(--line);background:var(--panel);backdrop-filter:blur(18px);border-radius:24px;padding:18px;min-height:96px;box-shadow:0 22px 60px rgba(2,6,23,.18)}.hero-card span{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.12em}.hero-card strong{display:block;margin-top:8px;font-size:32px;letter-spacing:-.04em}.hero-card.primary{display:grid;align-content:space-between}.bar{height:8px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:inherit}
    .profile-alert{border-radius:18px;padding:13px 16px;margin-bottom:14px;border:1px solid var(--line);background:var(--panel)}.profile-alert.good{border-color:rgba(34,197,94,.32)}.profile-alert.bad{border-color:rgba(239,68,68,.32)}.status{display:inline-flex;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;border:1px solid var(--line);background:rgba(148,163,184,.10)}.status.good{color:var(--good);border-color:rgba(34,197,94,.28)}.status.warn{color:var(--warn);border-color:rgba(245,158,11,.28)}.status.bad{color:var(--bad);border-color:rgba(239,68,68,.28)}
    .profile-panel{border:1px solid var(--line);background:var(--panel);backdrop-filter:blur(18px);border-radius:28px;padding:22px;box-shadow:0 26px 70px rgba(2,6,23,.22)}.profile-form{display:grid;gap:16px}.section-title{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid var(--line);padding-bottom:14px}.section-title h2{margin:0;font-size:22px;letter-spacing:-.03em}.section-title span{color:var(--muted);font-size:13px}.field-grid{display:grid;gap:14px}.field-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.field{display:grid;gap:7px}.field span{color:var(--muted);font-size:13px}.field input,.field textarea,.template-card input,.template-card textarea{width:100%;border:1px solid var(--line);background:rgba(2,6,23,.22);color:var(--text);border-radius:16px;padding:13px 14px;outline:none}.light .field input,.light .field textarea,.light .template-card input,.light .template-card textarea{background:rgba(255,255,255,.76)}.field textarea,.template-card textarea{min-height:120px;resize:vertical}.field input:focus,.field textarea:focus,.template-card input:focus,.template-card textarea:focus{border-color:rgba(56,189,248,.62);box-shadow:0 0 0 4px rgba(56,189,248,.10)}.full{grid-column:1/-1}
    .template-grid,.integration-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.template-card,.integration-card{border:1px solid var(--line);background:var(--panel2);border-radius:22px;padding:16px;display:grid;gap:12px;text-decoration:none;color:var(--text)}.template-card div{display:flex;gap:10px;align-items:center}.template-card input{font-weight:800}.integration-card b{font-size:17px}.integration-card small{color:var(--muted)}
    @media(max-width:900px){.profile-pro,.profile-pro.sidebar-closed{grid-template-columns:1fr}.profile-sidebar{position:relative;height:auto;border-right:0;border-bottom:1px solid var(--line)}.side-nav{grid-auto-flow:column;overflow:auto}.side-nav button{min-width:54px}.profile-hero{grid-template-columns:1fr 1fr}.field-grid.two,.template-grid,.integration-grid{grid-template-columns:1fr}.profile-top{align-items:flex-start;flex-direction:column}.profile-top h1{font-size:28px}}
  `}</style>;
}
