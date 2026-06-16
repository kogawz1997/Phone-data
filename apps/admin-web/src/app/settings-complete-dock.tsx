"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, getToken } from "@/lib/api";

type SettingsMap = Record<string, string>;

function headers() {
  const token = getToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function findField(label: string) {
  const fields = Array.from(document.querySelectorAll<HTMLLabelElement>(".field"));
  const field = fields.find((item) => (item.textContent || "").includes(label));
  return (field?.querySelector("input,textarea") as HTMLInputElement | HTMLTextAreaElement | null)?.value || "";
}

function hasLogo() {
  return Boolean(document.querySelector(".avatar img, .logo-preview img"));
}

export default function SettingsCompleteDock() {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    const sync = () => setEnabled(window.location.pathname.startsWith("/settings"));
    sync();
    const timer = window.setInterval(sync, 700);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void fetch(`${API_BASE_URL}/store/portal-settings`, { credentials: "include", headers: headers() })
      .then((res) => res.json())
      .then((json) => { if (json?.ok) setSettings(json.data || {}); })
      .catch(() => null);
  }, [enabled]);

  if (!enabled) return null;

  const storeName = document.querySelector(".hero-info h2, .profile-main h2, .main h2")?.textContent?.trim() || "Koga Mobile Store";
  const slug = findField("Slug") || settings.slug || "store";
  const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${slug}`;
  const checks = [
    ["โลโก้ร้าน", hasLogo()],
    ["ข้อมูลร้าน", Boolean(findField("ชื่อร้าน") && findField("เบอร์โทร"))],
    ["รับเงิน", Boolean(findField("PromptPay") || findField("เลขบัญชี"))],
    ["Portal", Boolean(slug)],
    ["เอกสาร", Boolean(settings.contractFooter || settings.privacyNote)],
    ["ความปลอดภัย", settings.loginAlerts === "true" || settings.sessionControl === "true"],
  ] as const;
  const score = Math.round((checks.filter(([, done]) => done).length / checks.length) * 100);

  async function saveExtra() {
    setStatus("กำลังบันทึก...");
    const payload = {
      contractFooter: (document.querySelector("[name='contractFooterExtra']") as HTMLTextAreaElement | null)?.value || settings.contractFooter || "",
      termsTemplate: (document.querySelector("[name='termsTemplateExtra']") as HTMLTextAreaElement | null)?.value || settings.termsTemplate || "",
      privacyNote: (document.querySelector("[name='privacyNoteExtra']") as HTMLTextAreaElement | null)?.value || settings.privacyNote || "",
      documentVersion: (document.querySelector("[name='documentVersionExtra']") as HTMLInputElement | null)?.value || settings.documentVersion || "1.0",
      dataRetentionDays: (document.querySelector("[name='dataRetentionDaysExtra']") as HTMLInputElement | null)?.value || settings.dataRetentionDays || "365",
    };
    try {
      const res = await fetch(`${API_BASE_URL}/store/portal-settings`, { method: "PUT", credentials: "include", headers: headers(), body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error?.message || "Save failed");
      setSettings((current) => ({ ...current, ...payload }));
      setStatus("บันทึกส่วนเสริมแล้ว");
    } catch {
      setStatus("บันทึกไม่สำเร็จ");
    }
  }

  return <section className="complete-dock">
    <style>{`
      .complete-dock{margin:18px 18px 120px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.complete-card{border:1px solid rgba(148,163,184,.18);border-radius:24px;background:rgba(8,18,32,.84);backdrop-filter:blur(18px);box-shadow:0 22px 70px rgba(0,0,0,.22);padding:16px;color:#eef6ff}.complete-card h3{margin:0 0 12px}.complete-card input,.complete-card textarea{width:100%;border:1px solid rgba(148,163,184,.18);border-radius:14px;background:rgba(2,6,23,.28);color:#eef6ff;padding:11px 12px;margin:6px 0 10px}.complete-card textarea{min-height:82px;resize:vertical}.complete-card button{border:0;border-radius:14px;background:linear-gradient(135deg,#22d3ee,#8b5cf6);color:white;font-weight:800;padding:10px 14px}.complete-check{display:flex;gap:10px;align-items:center;border:1px solid rgba(148,163,184,.14);border-radius:14px;padding:9px;margin:7px 0}.complete-check span{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:rgba(148,163,184,.14);color:#94a3b8}.complete-check.done span{background:rgba(34,197,94,.18);color:#86efac}.complete-progress{height:10px;border-radius:999px;background:rgba(148,163,184,.16);overflow:hidden;margin:10px 0}.complete-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#22d3ee,#8b5cf6)}.complete-preview small{color:#93a4ba;word-break:break-all}@media(max-width:900px){.complete-dock{grid-template-columns:1fr;margin:14px 10px 120px}.complete-card{border-radius:20px}}
    `}</style>
    <article className="complete-card complete-preview"><h3>Preview + Checklist</h3><b>{storeName}</b><br/><small>{portalUrl}</small><div className="complete-progress"><i style={{ width: `${score}%` }} /></div>{checks.map(([label, done]) => <div key={label} className={`complete-check ${done ? "done" : ""}`}><span>{done ? "✓" : "•"}</span><b>{label}</b></div>)}<button type="button" onClick={() => navigator.clipboard?.writeText(portalUrl)}>คัดลอก Portal</button></article>
    <article className="complete-card"><h3>เอกสารและระบบเพิ่มเติม</h3><input name="documentVersionExtra" defaultValue={settings.documentVersion || "1.0"} placeholder="Document Version"/><textarea name="contractFooterExtra" defaultValue={settings.contractFooter || ""} placeholder="ข้อความท้ายสัญญา"/><textarea name="termsTemplateExtra" defaultValue={settings.termsTemplate || ""} placeholder="เทมเพลตเงื่อนไข"/><textarea name="privacyNoteExtra" defaultValue={settings.privacyNote || ""} placeholder="Privacy note / PDPA"/><input name="dataRetentionDaysExtra" defaultValue={settings.dataRetentionDays || "365"} placeholder="Data retention days"/><button type="button" onClick={saveExtra}>บันทึกส่วนเสริม</button>{status && <p>{status}</p>}</article>
  </section>;
}
