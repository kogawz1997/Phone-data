"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/api";

type StoreProfile = {
  organization: {
    id: string;
    name: string;
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

type StoreSettings = Record<string, string | undefined>;
type Integration = { id: string; provider: string; category: string; displayName: string; status: string };
type Template = { key: string; channel: string; title: string; body: string };
type Section = "store" | "payment" | "portal" | "notify" | "docs" | "integrations" | "security" | "system";
type Theme = "dark" | "light";

const sections: Array<{ id: Section; label: string; icon: string }> = [
  { id: "store", label: "ข้อมูลร้าน", icon: "▣" },
  { id: "payment", label: "รับเงิน", icon: "฿" },
  { id: "portal", label: "Portal", icon: "◎" },
  { id: "notify", label: "แจ้งเตือน", icon: "◌" },
  { id: "docs", label: "เอกสาร", icon: "▤" },
  { id: "integrations", label: "ระบบนอก", icon: "⌁" },
  { id: "security", label: "ความปลอดภัย", icon: "◇" },
  { id: "system", label: "ระบบ", icon: "⚙" },
];

const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];

function isOn(value?: string) {
  return value === "true" || value === "1" || value === "on";
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function statusTone(status?: string) {
  const value = String(status || "").toUpperCase();
  if (["ACTIVE", "READY", "CURRENT", "CONNECTED"].includes(value)) return "good";
  if (["FAILED", "ERROR", "SUSPENDED", "CANCELLED"].includes(value)) return "bad";
  return "warn";
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function StoreSettingsPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState<Section>("store");
  const [theme, setTheme] = useState<Theme>("dark");
  const [collapsed, setCollapsed] = useState(false);
  const [origin, setOrigin] = useState("");
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [payment, setPayment] = useState<PaymentSetting>({ provider: "PROMPTPAY_MANUAL", displayName: "PromptPay / Bank Transfer", isActive: true });
  const [settings, setSettings] = useState<StoreSettings>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("koga_profile_theme");
    const savedMenu = window.localStorage.getItem("koga_profile_menu");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    if (savedMenu === "collapsed") setCollapsed(true);
    setOrigin(window.location.origin);
    void load();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("koga_profile_theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("koga_profile_menu", collapsed ? "collapsed" : "open");
  }, [collapsed]);

  async function load() {
    setBusy("load");
    setError("");
    try {
      const [profileRes, paymentRows, settingsRes, templateRes, integrationRows] = await Promise.all([
        api<StoreProfile>("/store/profile"),
        api<PaymentSetting[]>("/store/payment-settings"),
        api<StoreSettings>("/store/portal-settings"),
        api<{ notifications: Template[] }>("/templates"),
        api<Integration[]>("/integrations"),
      ]);
      setProfile(profileRes);
      setSettings(settingsRes);
      setPayment(paymentRows.find((row) => row.isActive) ?? paymentRows[0] ?? { provider: "PROMPTPAY_MANUAL", displayName: "PromptPay / Bank Transfer", isActive: true });
      setTemplates(templateRes.notifications ?? []);
      setIntegrations(integrationRows.filter((row) => row.category !== "MDM"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  const org = profile?.organization;
  const logo = text(settings.logoDataUrl);
  const slug = text(settings.slug || org?.name || "store").toLowerCase().replace(/[^a-z0-9ก-๙-]+/gi, "-").replace(/^-+|-+$/g, "") || "store";
  const portalUrl = `${origin}/portal/${slug}`;
  const openDays = text(settings.openDays || "จันทร์,อังคาร,พุธ,พฤหัส,ศุกร์,เสาร์").split(",").map((day) => day.trim()).filter(Boolean);

  const checklist = useMemo(() => [
    { label: "ข้อมูลร้าน", done: Boolean(org?.name && org.phone && org.ownerName) },
    { label: "โลโก้ร้าน", done: Boolean(settings.logoDataUrl) },
    { label: "รับเงิน", done: Boolean(payment.promptPayId || payment.accountNo) },
    { label: "Portal", done: Boolean(settings.slug && (settings.contactLine || settings.supportPhone)) },
    { label: "เอกสาร", done: Boolean(settings.contractFooter || settings.privacyNote) },
    { label: "ความปลอดภัย", done: isOn(settings.loginAlerts) || isOn(settings.sessionControl) },
    { label: "ระบบนอก", done: integrations.length > 0 },
  ], [org, settings, payment, integrations]);

  const setupScore = Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100);

  function updateOrg(key: keyof StoreProfile["organization"], value: string) {
    setProfile((current) => current ? { ...current, organization: { ...current.organization, [key]: value } } : current);
  }

  function updateSetting(key: string, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleSetting(key: string) {
    setSettings((current) => ({ ...current, [key]: isOn(current[key]) ? "false" : "true" }));
  }

  function toggleDay(day: string) {
    const next = openDays.includes(day) ? openDays.filter((item) => item !== day) : [...openDays, day];
    updateSetting("openDays", next.join(","));
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy("logo");
    setError("");
    try {
      if (file.size > 1_100_000) throw new Error("รูปใหญ่เกินไป ใช้ไฟล์ไม่เกินประมาณ 1MB");
      const logoDataUrl = await readAsDataUrl(file);
      const saved = await api<{ logoDataUrl: string }>("/store/profile-logo", { method: "POST", body: JSON.stringify({ logoDataUrl }) });
      updateSetting("logoDataUrl", saved.logoDataUrl);
      setNotice("อัปเดตรูปโปรไฟล์ร้านแล้ว");
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveAll(event?: FormEvent) {
    event?.preventDefault();
    setBusy("save");
    setNotice("");
    setError("");
    try {
      if (org) {
        await api("/store/profile", {
          method: "PATCH",
          body: JSON.stringify({
            name: org.name,
            ownerName: org.ownerName,
            phone: org.phone,
            taxId: org.taxId,
            address: org.address,
            billingEmail: org.billingEmail,
          }),
        });
      }
      await api("/store/payment-settings", { method: "PUT", body: JSON.stringify(payment) });
      await api("/store/portal-settings", { method: "PUT", body: JSON.stringify({ ...settings, systemTheme: theme }) });
      setNotice("บันทึกโปรไฟล์ร้านแล้ว");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function copyPortal() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setNotice("คัดลอกลิงก์ Portal แล้ว");
    } catch {
      setNotice(portalUrl);
    }
  }

  function renderPanel() {
    switch (active) {
      case "store":
        return <Panel title="ข้อมูลร้าน" icon="▣"><Grid><Field label="ชื่อร้าน" value={org?.name} onChange={(value) => updateOrg("name", value)} /><Field label="เจ้าของร้าน" value={org?.ownerName} onChange={(value) => updateOrg("ownerName", value)} /><Field label="เบอร์โทร" value={org?.phone} onChange={(value) => updateOrg("phone", value)} /><Field label="อีเมลรับบิล" value={org?.billingEmail || org?.email} onChange={(value) => updateOrg("billingEmail", value)} /><Field label="เลขภาษี" value={org?.taxId} onChange={(value) => updateOrg("taxId", value)} /><Field label="เว็บไซต์" value={settings.website} onChange={(value) => updateSetting("website", value)} /></Grid><Field textarea label="ที่อยู่" value={org?.address} onChange={(value) => updateOrg("address", value)} /><LogoBox logo={logo} busy={busy === "logo"} onUpload={() => fileRef.current?.click()} onRemove={() => updateSetting("logoDataUrl", "")} /><Field label="เวลาทำการ" value={settings.businessHours} onChange={(value) => updateSetting("businessHours", value)} /><div className="safeChips">{days.map((day) => <button type="button" key={day} className={openDays.includes(day) ? "isOn" : ""} onClick={() => toggleDay(day)}>{day}</button>)}</div></Panel>;
      case "payment":
        return <Panel title="รับเงิน" icon="฿"><Grid><Field label="ชื่อที่แสดง" value={payment.displayName} onChange={(value) => setPayment({ ...payment, displayName: value })} /><Field label="PromptPay" value={payment.promptPayId} onChange={(value) => setPayment({ ...payment, promptPayId: value })} /><Field label="ธนาคาร" value={payment.bankName} onChange={(value) => setPayment({ ...payment, bankName: value })} /><Field label="เลขบัญชี" value={payment.accountNo} onChange={(value) => setPayment({ ...payment, accountNo: value })} /><Field label="ชื่อบัญชี" value={payment.accountName} onChange={(value) => setPayment({ ...payment, accountName: value })} /></Grid><Toggle label="เปิด QR Payment" checked={isOn(settings.qrPaymentEnabled)} onChange={() => toggleSetting("qrPaymentEnabled")} /><Toggle label="ต้องแนบสลิปก่อนตรวจ" checked={isOn(settings.requireSlipBeforeReview)} onChange={() => toggleSetting("requireSlipBeforeReview")} /><Field textarea label="ข้อความท้ายบิล" value={settings.invoiceFooter || payment.instructions} onChange={(value) => { updateSetting("invoiceFooter", value); setPayment({ ...payment, instructions: value }); }} /></Panel>;
      case "portal":
        return <Panel title="Customer Portal" icon="◎"><Grid><Field label="Slug" value={settings.slug} onChange={(value) => updateSetting("slug", value)} /><Field label="สีหลัก" value={settings.brandColor} onChange={(value) => updateSetting("brandColor", value)} /><Field label="LINE Support" value={settings.contactLine} onChange={(value) => updateSetting("contactLine", value)} /><Field label="เบอร์ช่วยเหลือ" value={settings.supportPhone} onChange={(value) => updateSetting("supportPhone", value)} /><Field label="SEO Title" value={settings.portalSeoTitle} onChange={(value) => updateSetting("portalSeoTitle", value)} /></Grid><Field textarea label="ข้อความต้อนรับ" value={settings.welcomeText} onChange={(value) => updateSetting("welcomeText", value)} /><Field textarea label="นโยบายปลดเครื่อง" value={settings.releasePolicy} onChange={(value) => updateSetting("releasePolicy", value)} /><button className="safeSecondary" type="button" onClick={copyPortal}>คัดลอกลิงก์ Portal</button></Panel>;
      case "notify":
        return <Panel title="แจ้งเตือน" icon="◌"><div className="safeChannels"><Channel label="LINE" active={isOn(settings.notifyLine)} onClick={() => toggleSetting("notifyLine")} /><Channel label="SMS" active={isOn(settings.notifySms)} onClick={() => toggleSetting("notifySms")} /><Channel label="Email" active={isOn(settings.notifyEmail)} onClick={() => toggleSetting("notifyEmail")} /></div><div className="safeList">{templates.slice(0, 5).map((template) => <div key={`${template.key}-${template.channel}`}><b>{template.title}</b><span>{template.channel}</span></div>)}</div><Field textarea label="นโยบายแจ้งเตือน" value={settings.supportPolicy} onChange={(value) => updateSetting("supportPolicy", value)} /></Panel>;
      case "docs":
        return <Panel title="เอกสาร" icon="▤"><Grid><Field label="Document Version" value={settings.documentVersion} onChange={(value) => updateSetting("documentVersion", value)} /><Field label="Data Retention Days" value={settings.dataRetentionDays} onChange={(value) => updateSetting("dataRetentionDays", value)} /></Grid><Toggle label="สร้างใบเสร็จอัตโนมัติ" checked={isOn(settings.autoGenerateReceipt)} onChange={() => toggleSetting("autoGenerateReceipt")} /><Field textarea label="ข้อความท้ายสัญญา" value={settings.contractFooter} onChange={(value) => updateSetting("contractFooter", value)} /><Field textarea label="เทมเพลตเงื่อนไข" value={settings.termsTemplate} onChange={(value) => updateSetting("termsTemplate", value)} /><Field textarea label="Privacy note / PDPA" value={settings.privacyNote} onChange={(value) => updateSetting("privacyNote", value)} /></Panel>;
      case "integrations":
        return <Panel title="ระบบนอก" icon="⌁"><div className="safeList integrations">{integrations.length ? integrations.map((item) => <a href="/integrations" key={item.id}><b>{item.displayName}</b><span>{item.provider} · {item.status}</span></a>) : <div className="safeEmpty">ยังไม่มี Integration</div>}</div></Panel>;
      case "security":
        return <Panel title="ความปลอดภัย" icon="◇"><Toggle label="2FA" checked={isOn(settings.twoFactorEnabled)} onChange={() => toggleSetting("twoFactorEnabled")} /><Toggle label="Login Alerts" checked={isOn(settings.loginAlerts)} onChange={() => toggleSetting("loginAlerts")} /><Toggle label="Session Control" checked={isOn(settings.sessionControl)} onChange={() => toggleSetting("sessionControl")} /><Grid><Field label="Role Preset" value={settings.rolePreset} onChange={(value) => updateSetting("rolePreset", value)} /><Field label="Profile Visibility" value={settings.profileVisibility} onChange={(value) => updateSetting("profileVisibility", value)} /></Grid></Panel>;
      case "system":
        return <Panel title="ระบบโปรไฟล์" icon="⚙"><Grid><Field label="ชื่อระบบโปรไฟล์" value={settings.systemProfileName || org?.name} onChange={(value) => updateSetting("systemProfileName", value)} /><Field label="Accent" value={settings.systemAccent || "cyan-violet"} onChange={(value) => updateSetting("systemAccent", value)} /></Grid><Toggle label="Dark เป็นค่าเริ่มต้น" checked={theme === "dark"} onChange={() => setTheme(theme === "dark" ? "light" : "dark")} /></Panel>;
    }
  }

  return <main className={`settingsSafe ${theme} ${collapsed ? "collapsed" : "expanded"}`}>
    <SafeCss />
    <aside className="safeSide">
      <button className="safeBrand" type="button" onClick={() => setCollapsed(!collapsed)}>{logo ? <img src={logo} alt="logo" /> : <span>K</span>}<b>{org?.name || "Store"}</b></button>
      <nav>{sections.map((item) => <button key={item.id} type="button" className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}><i>{item.icon}</i><b>{item.label}</b></button>)}</nav>
      <div className="safeSideTools"><button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><i>{theme === "dark" ? "☾" : "☀"}</i><b>{theme === "dark" ? "Dark" : "Light"}</b></button><a href="/"><i>⌂</i><b>Store</b></a></div>
    </aside>
    <section className="safeMain">
      <header className="safeTop"><div><span className="safePill ready">API ready</span><h1>Store Profile</h1></div><div className="safeActions"><button type="button" onClick={load}>{busy === "load" ? "Loading" : "Refresh"}</button><button type="button" className="primary" onClick={saveAll}>{busy === "save" ? "Saving" : "Save"}</button></div></header>
      <section className="safeHero"><button type="button" className="safeAvatar" onClick={() => fileRef.current?.click()}>{logo ? <img src={logo} alt="logo" /> : <span>K</span>}<small>📷</small></button><input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} /><div><h2>{org?.name || "Koga Mobile Store"}</h2><p>{org?.ownerName || "Owner"}</p><div className="safeBadges"><span className="safePill pro">{org?.plan || "PRO"}</span><span className={`safePill ${statusTone(org?.status)}`}>{org?.status || "ACTIVE"}</span></div></div><div className="safeStats"><Stat label="ลูกค้า" value={profile?.counts.customers ?? 0} /><Stat label="อุปกรณ์" value={profile?.counts.devices ?? 0} /><Stat label="สัญญา" value={profile?.counts.contracts ?? 0} /><Stat label="Setup" value={`${setupScore}%`} /></div></section>
      {notice && <div className="safeAlert good">{notice}</div>}{error && <div className="safeAlert bad">{error}</div>}
      <form className="safeWorkspace" onSubmit={saveAll}><section className="safeActivePanel">{renderPanel()}</section><aside className="safePreview"><Preview logo={logo} org={org} settings={settings} payment={payment} portalUrl={portalUrl} /><Checklist items={checklist} /></aside><footer className="safeSavebar"><button type="button" onClick={load}>ยกเลิก</button><button type="submit" className="primary" disabled={busy === "save"}>{busy === "save" ? "กำลังบันทึก..." : "บันทึกทั้งหมด"}</button><button type="button" onClick={copyPortal}>คัดลอก Portal</button></footer></form>
    </section>
  </main>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="safeStat"><b>{value}</b><span>{label}</span></div>; }
function Panel({ title, icon, children }: { title: string; icon: string; children: ReactNode }) { return <section className="safePanel"><h3><i>{icon}</i>{title}</h3>{children}</section>; }
function Grid({ children }: { children: ReactNode }) { return <div className="safeGrid">{children}</div>; }
function Field({ label, value, textarea, onChange }: { label: string; value?: string; textarea?: boolean; onChange: (value: string) => void }) { return <label className="safeField"><span>{label}</span>{textarea ? <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} /> : <input value={value || ""} onChange={(event) => onChange(event.target.value)} />}</label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) { return <label className="safeToggle"><span>{label}</span><button type="button" className={checked ? "on" : ""} onClick={onChange}><i /></button></label>; }
function Channel({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button type="button" className={`safeChannel ${active ? "on" : ""}`} onClick={onClick}>{label}<span>{active ? "✓" : "+"}</span></button>; }
function LogoBox({ logo, busy, onUpload, onRemove }: { logo: string; busy: boolean; onUpload: () => void; onRemove: () => void }) { return <div className="safeLogoBox"><div>{logo ? <img src={logo} alt="logo" /> : <span>K</span>}</div><section><b>โลโก้ร้าน</b><p>PNG, JPG, WEBP ไม่เกิน 1MB</p><button type="button" onClick={onUpload}>{busy ? "Uploading..." : "เปลี่ยนโลโก้"}</button><button type="button" onClick={onRemove}>ลบรูป</button></section></div>; }
function Preview({ logo, org, settings, payment, portalUrl }: { logo: string; org?: StoreProfile["organization"]; settings: StoreSettings; payment: PaymentSetting; portalUrl: string }) { return <section className="safePreviewCard"><h3>Live Preview</h3><div className="safeMiniStore">{logo ? <img src={logo} alt="logo" /> : <span>K</span>}<div><b>{org?.name || "Koga Mobile Store"}</b><small>{settings.website || "store website"}</small></div></div><p>{settings.welcomeText || "ข้อความต้อนรับลูกค้า"}</p><dl><dt>Portal</dt><dd>{portalUrl}</dd><dt>รับเงิน</dt><dd>{payment.promptPayId || payment.accountNo || "ยังไม่ตั้งค่า"}</dd><dt>Support</dt><dd>{settings.contactLine || settings.supportPhone || "ยังไม่ตั้งค่า"}</dd></dl></section>; }
function Checklist({ items }: { items: Array<{ label: string; done: boolean }> }) { return <section className="safePreviewCard"><h3>Checklist</h3>{items.map((item) => <div className="safeCheck" key={item.label}><span className={item.done ? "done" : ""}>{item.done ? "✓" : "•"}</span><b>{item.label}</b></div>)}</section>; }

function SafeCss() { return <style>{`
.settingsSafe{--panel:rgba(12,22,37,.84);--panel2:rgba(16,29,48,.96);--line:rgba(148,163,184,.16);--text:#eef6ff;--muted:#91a4bb;--accent:#22d3ee;--accent2:#8b5cf6;min-height:100vh;background:radial-gradient(circle at 16% 0,rgba(34,211,238,.18),transparent 36%),radial-gradient(circle at 86% 0,rgba(139,92,246,.20),transparent 34%),linear-gradient(135deg,#020617,#07111f 45%,#0f172a);color:var(--text);display:grid;grid-template-columns:280px 1fr;font-family:Inter,ui-sans-serif,system-ui}.settingsSafe.light{--panel:rgba(255,255,255,.88);--panel2:rgba(255,255,255,.96);--line:rgba(15,23,42,.12);--text:#0f172a;--muted:#64748b;--accent:#0284c7;--accent2:#7c3aed;background:linear-gradient(135deg,#f8fafc,#e0f2fe 46%,#eef2ff)}.settingsSafe.collapsed{grid-template-columns:88px 1fr}.safeSide{position:sticky;top:0;height:100vh;padding:14px;border-right:1px solid var(--line);background:rgba(2,6,23,.44);backdrop-filter:blur(24px);display:flex;flex-direction:column;gap:14px}.settingsSafe.light .safeSide{background:rgba(255,255,255,.58)}.safeBrand{border:0;border-radius:22px;min-height:60px;background:linear-gradient(135deg,rgba(34,211,238,.24),rgba(139,92,246,.22));color:var(--text);display:flex;align-items:center;gap:12px;padding:0 10px;cursor:pointer}.safeBrand span,.safeBrand img{width:46px;height:46px;min-width:46px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;font-weight:900;object-fit:cover}.safeSide nav{display:grid;gap:8px;overflow:auto}.safeSide nav button,.safeSideTools button,.safeSideTools a{border:0;border-radius:17px;min-height:48px;background:transparent;color:var(--muted);display:flex;align-items:center;gap:12px;padding:0 12px;text-decoration:none;cursor:pointer}.safeSide nav button:hover,.safeSideTools button:hover,.safeSideTools a:hover,.safeSide nav button.active{background:linear-gradient(135deg,rgba(34,211,238,.16),rgba(139,92,246,.15));color:var(--text)}.safeSide i,.safeSideTools i{font-style:normal;width:24px;text-align:center;color:var(--accent)}.safeSideTools{margin-top:auto;display:grid;gap:8px}.settingsSafe.collapsed .safeSide b{display:none}.settingsSafe.collapsed .safeSide nav button,.settingsSafe.collapsed .safeSideTools button,.settingsSafe.collapsed .safeSideTools a,.settingsSafe.collapsed .safeBrand{justify-content:center;padding:0}.safeMain{padding:18px;min-width:0}.safeTop{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}.safeTop h1{font-size:30px;margin:8px 0 0;letter-spacing:-.04em}.safeActions{display:flex;gap:8px}.safeActions button,.safeSavebar button,.safeSecondary,.safeLogoBox button{border:1px solid var(--line);border-radius:14px;background:var(--panel2);color:var(--text);padding:10px 14px;cursor:pointer}.primary{border:0!important;background:linear-gradient(135deg,var(--accent),var(--accent2))!important;color:white!important;font-weight:900}.safePill{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:7px 11px;font-weight:900;font-size:12px}.ready,.safePill.good{color:#86efac;border-color:rgba(34,197,94,.28);background:rgba(34,197,94,.12)}.safePill.warn{color:#facc15}.safePill.bad{color:#fca5a5}.safePill.pro{background:linear-gradient(135deg,rgba(139,92,246,.8),rgba(59,130,246,.6));color:white}.safeHero{border:1px solid var(--line);border-radius:30px;background:var(--panel);box-shadow:0 28px 90px rgba(0,0,0,.22);padding:20px;display:grid;grid-template-columns:auto minmax(180px,1fr) 2.3fr;gap:22px;align-items:center}.safeAvatar{position:relative;border:1px solid rgba(34,211,238,.5);width:120px;height:120px;border-radius:50%;background:#020617;cursor:pointer;overflow:hidden}.safeAvatar img{width:100%;height:100%;object-fit:cover}.safeAvatar span{font-size:58px;width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));font-weight:900;color:white}.safeAvatar small{position:absolute;right:8px;bottom:8px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--panel2)}.safeHero h2{font-size:30px;margin:0 0 6px}.safeHero p{margin:0 0 12px;color:var(--muted)}.safeBadges{display:flex;gap:8px;flex-wrap:wrap}.safeStats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.safeStat{border:1px solid var(--line);border-radius:18px;background:rgba(15,23,42,.35);padding:15px;min-height:90px}.settingsSafe.light .safeStat{background:rgba(255,255,255,.55)}.safeStat b{display:block;font-size:24px}.safeStat span{color:var(--muted);font-size:13px}.safeAlert{border:1px solid var(--line);border-radius:18px;padding:13px 16px;margin:14px 0}.safeAlert.good{border-color:rgba(34,197,94,.35);color:#86efac}.safeAlert.bad{border-color:rgba(239,68,68,.35);color:#fca5a5}.safeWorkspace{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:16px;margin-top:16px}.safePanel,.safePreviewCard{border:1px solid var(--line);border-radius:26px;background:var(--panel);padding:18px;display:grid;gap:14px;box-shadow:0 22px 70px rgba(0,0,0,.18)}.safePanel h3,.safePreviewCard h3{margin:0;display:flex;align-items:center;gap:10px;font-size:21px}.safePanel h3 i{font-style:normal;color:var(--accent)}.safeGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.safeField{display:grid;gap:7px}.safeField span{color:var(--muted);font-size:13px}.safeField input,.safeField textarea{border:1px solid var(--line);border-radius:14px;background:rgba(2,6,23,.25);color:var(--text);padding:12px 13px;outline:none}.settingsSafe.light .safeField input,.settingsSafe.light .safeField textarea{background:rgba(255,255,255,.75)}.safeField textarea{min-height:104px;resize:vertical}.safeLogoBox{border:1px solid var(--line);border-radius:20px;padding:12px;display:flex;gap:14px;align-items:center}.safeLogoBox>div{width:88px;height:88px;border-radius:20px;background:#020617;display:grid;place-items:center;overflow:hidden}.safeLogoBox img,.safeMiniStore img{width:100%;height:100%;object-fit:cover}.safeLogoBox span{font-size:38px;font-weight:900;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;color:transparent}.safeLogoBox p{margin:4px 0 10px;color:var(--muted);font-size:13px}.safeChips,.safeChannels{display:flex;flex-wrap:wrap;gap:8px}.safeChips button,.safeChannel{border:1px solid var(--line);border-radius:13px;background:rgba(148,163,184,.1);color:var(--muted);padding:8px 12px;cursor:pointer}.safeChips button.isOn,.safeChannel.on{background:linear-gradient(135deg,rgba(34,211,238,.22),rgba(139,92,246,.20));color:var(--text);border-color:rgba(34,211,238,.35)}.safeChannel span{margin-left:8px}.safeToggle{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--line);border-radius:16px;padding:12px}.safeToggle button{width:50px;height:28px;border:0;border-radius:999px;background:rgba(148,163,184,.25);padding:3px;cursor:pointer}.safeToggle button i{display:block;width:22px;height:22px;border-radius:50%;background:white;transition:transform .18s}.safeToggle button.on{background:linear-gradient(135deg,#2563eb,#8b5cf6)}.safeToggle button.on i{transform:translateX(22px)}.safeList{display:grid;gap:9px}.safeList div,.safeList a{border:1px solid var(--line);border-radius:14px;padding:11px 12px;display:flex;justify-content:space-between;gap:12px;color:var(--text);text-decoration:none}.safeList span{color:#86efac;font-size:13px}.safeEmpty{border:1px dashed var(--line);border-radius:16px;padding:18px;color:var(--muted);text-align:center}.safePreview{display:grid;gap:16px;align-self:start;position:sticky;top:16px}.safeMiniStore{display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:18px;padding:12px}.safeMiniStore img,.safeMiniStore>span{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;font-weight:900}.safeMiniStore small,.safePreviewCard p,.safePreviewCard dt{color:var(--muted)}.safePreviewCard dl{display:grid;gap:8px;margin:0}.safePreviewCard dt{font-size:12px}.safePreviewCard dd{margin:0;word-break:break-all}.safeCheck{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:14px;padding:10px}.safeCheck span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(148,163,184,.14);color:var(--muted)}.safeCheck span.done{background:rgba(34,197,94,.18);color:#86efac}.safeSavebar{position:sticky;bottom:12px;grid-column:1/-1;display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:12px;border:1px solid var(--line);background:rgba(2,8,23,.82);backdrop-filter:blur(24px);border-radius:22px;padding:12px}.settingsSafe.light .safeSavebar{background:rgba(255,255,255,.84)}@media(max-width:980px){.settingsSafe,.settingsSafe.collapsed{grid-template-columns:78px 1fr}.safeSide{position:fixed;left:0;top:0;bottom:0;z-index:100;padding:8px}.safeSide b{display:none}.safeSide nav button,.safeSideTools button,.safeSideTools a,.safeBrand{justify-content:center;padding:0}.safeMain{margin-left:78px;padding:10px}.safeTop{align-items:flex-start;flex-direction:column}.safeTop h1{font-size:25px}.safeHero{grid-template-columns:1fr}.safeStats{grid-template-columns:1fr 1fr}.safeWorkspace{grid-template-columns:1fr}.safePreview{position:static}.safeGrid{grid-template-columns:1fr}.safeSavebar{grid-template-columns:1fr}.safeAvatar{width:110px;height:110px}}
  `}</style>; }
