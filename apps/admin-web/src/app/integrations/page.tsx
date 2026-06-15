"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const categoryOrder = ["PAYMENT", "NOTIFICATION", "STORAGE", "AUTOMATION"];
const hiddenStoreCategories = new Set(["MDM"]);

type StoreField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password" | "url" | "select" | "textarea";
  options?: string[];
  hint?: string;
};

const providerFields: Record<string, StoreField[]> = {
  PROMPTPAY_MANUAL: [
    { key: "promptPayId", label: "PromptPay ID", placeholder: "เบอร์/เลขบัตร/เลขนิติบุคคล" },
    { key: "displayName", label: "ชื่อบัญชี/ชื่อที่แสดง", placeholder: "เช่น ร้าน KOGA Mobile" },
    { key: "instructions", label: "ข้อความแนะนำการชำระ", type: "textarea", placeholder: "เช่น โอนแล้วแนบสลิปใน Portal" },
  ],
  PAYMENT_GATEWAY: [
    { key: "provider", label: "Payment Provider", type: "select", options: ["manual", "stripe", "omise", "gbprimepay", "2c2p", "webhook"] },
    { key: "publicKey", label: "Public Key", placeholder: "ใช้ฝั่งหน้าเว็บ ถ้ามี" },
    { key: "secretKey", label: "Secret Key", type: "password", placeholder: "เก็บเฉพาะหลังบ้าน" },
    { key: "webhookSecret", label: "Webhook Secret", type: "password" },
    { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://..." },
  ],
  SLIP_VERIFICATION: [
    { key: "provider", label: "Slip Provider", type: "select", options: ["manual", "webhook", "bank_api", "slipok", "easy_slip"] },
    { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://..." },
    { key: "secret", label: "API Secret / Token", type: "password" },
    { key: "autoConfirm", label: "Auto Confirm", type: "select", options: ["false", "true"], hint: "เปิด true เฉพาะตอนทดสอบสลิปผ่านแล้ว" },
  ],
  LINE_MESSAGING: [
    { key: "channelAccessToken", label: "LINE Channel Access Token", type: "password" },
    { key: "channelSecret", label: "LINE Channel Secret", type: "password" },
    { key: "liffId", label: "LIFF ID", placeholder: "ถ้ามี" },
    { key: "richMenuId", label: "Rich Menu ID", placeholder: "ถ้ามี" },
  ],
  SMS_GATEWAY: [
    { key: "provider", label: "SMS Provider", type: "select", options: ["manual", "webhook", "thaibulksms", "twilio", "nexmo"] },
    { key: "senderName", label: "Sender Name", placeholder: "เช่น KOGA" },
    { key: "apiKey", label: "API Key", type: "password" },
    { key: "webhookUrl", label: "Webhook URL", type: "url", placeholder: "https://..." },
  ],
  EMAIL_SMTP: [
    { key: "smtpUrl", label: "SMTP URL", type: "password", placeholder: "smtp://user:pass@host:587" },
    { key: "emailFrom", label: "Email From", placeholder: "KOGA <no-reply@example.com>" },
    { key: "replyTo", label: "Reply-To", placeholder: "support@example.com" },
  ],
  STORAGE_S3_R2: [
    { key: "provider", label: "Storage Provider", type: "select", options: ["local", "s3", "r2", "supabase"] },
    { key: "bucket", label: "Bucket" },
    { key: "region", label: "Region", placeholder: "auto / ap-southeast-1" },
    { key: "endpoint", label: "Endpoint", type: "url", placeholder: "https://..." },
    { key: "accessKeyId", label: "Access Key ID", type: "password" },
    { key: "secretAccessKey", label: "Secret Access Key", type: "password" },
  ],
  WEBHOOK: [
    { key: "webhookUrl", label: "Notification Webhook URL", type: "url", placeholder: "https://..." },
    { key: "webhookSecret", label: "Webhook Secret", type: "password" },
    { key: "events", label: "Events", placeholder: "payment_confirmed,overdue_created,device_release_requested" },
  ],
};

function badgeClass(status: string) {
  if (status === "ACTIVE") return "badge good";
  if (status === "FAILED") return "badge bad";
  if (status === "DEGRADED" || status === "CONNECTING") return "badge warn";
  return "badge";
}

function getConfig(row: any) {
  const config = row?.configJson;
  if (!config || typeof config !== "object" || Array.isArray(config)) return {} as Record<string, string>;
  return config as Record<string, string>;
}

function getFields(row: any) {
  return providerFields[String(row.provider)] ?? [];
}

function FieldInput({ field, value, onChange }: { field: StoreField; value: string; onChange: (value: string) => void }) {
  if (field.type === "select") {
    return <select className="input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">เลือก...</option>{field.options?.map((x) => <option key={x} value={x}>{x}</option>)}</select>;
  }
  if (field.type === "textarea") {
    return <textarea className="input" value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input className="input" type={field.type ?? "text"} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export default function IntegrationsPage() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});

  async function load() {
    try {
      const [c, r, ready] = await Promise.all([
        api<any[]>("/integrations/catalog"),
        api<any[]>("/integrations"),
        api<any>("/integrations/readiness"),
      ]);
      const visibleRows = r.filter((x) => !hiddenStoreCategories.has(String(x.category)));
      setCatalog(c.filter((x) => !hiddenStoreCategories.has(String(x.category))));
      setRows(visibleRows);
      setReadiness({ ...ready, results: (ready?.results || []).filter((x: any) => !hiddenStoreCategories.has(String(x.connector?.category))) });
      setDrafts(Object.fromEntries(visibleRows.map((row: any) => [row.id, getConfig(row)])));
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "โหลดไม่ได้");
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredRows = useMemo(() => {
    const list = readiness?.results?.map((x: any) => ({ ...x.connector, test: x.test })) || rows;
    const visible = list.filter((x: any) => !hiddenStoreCategories.has(String(x.category)));
    if (selectedCategory === "ALL") return visible;
    return visible.filter((x: any) => x.category === selectedCategory);
  }, [readiness, rows, selectedCategory]);

  async function testOne(id: string) {
    try {
      setBusy(id);
      const result = await api<any>(`/integrations/${id}/test`, { method: "POST" });
      setPlan({ title: "ผลทดสอบ", ...result });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ทดสอบไม่ได้");
    } finally {
      setBusy("");
    }
  }

  async function testAll() {
    try {
      setBusy("all");
      await api("/integrations/test-all", { method: "POST" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ทดสอบทั้งหมดไม่ได้");
    } finally {
      setBusy("");
    }
  }

  async function showPlan(id: string) {
    try {
      setPlan(await api(`/integrations/${id}/setup-plan`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "เปิดแผนตั้งค่าไม่ได้");
    }
  }

  async function saveConfig(row: any) {
    try {
      setBusy(`save:${row.id}`);
      const configJson = drafts[row.id] ?? {};
      await api(`/integrations/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "CONNECTING",
          configJson,
          displayName: row.displayName,
          lastError: null,
        }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "บันทึกไม่ได้");
    } finally {
      setBusy("");
    }
  }

  const score = readiness?.score ?? 0;

  return <main className="app-shell">
    <section className="hero">
      <div className="kicker">Store Settings</div>
      <h1>ตั้งค่าระบบนอกของร้าน</h1>
      <p className="muted">กรอกค่าที่ร้านต้องต่อเอง เช่น PromptPay, Payment Gateway, LINE, SMS, Email, Storage และ Webhook ส่วน MDM Key ถูกย้ายไปฝั่ง Platform/Owner เพื่อกันร้านกรอกผิดแล้วระบบทั้งบ้านปวดหัวพร้อมกัน</p>
      <div className="hero-actions">
        <button className="btn secondary" onClick={load}>รีเฟรช</button>
        <button className="btn" onClick={testAll} disabled={busy === "all"}>{busy === "all" ? "กำลังทดสอบ..." : "ทดสอบทั้งหมด"}</button>
        <a className="btn secondary" href="/">กลับหน้าร้าน</a>
      </div>
    </section>

    {err && <div className="alert bad">{err}</div>}

    <div className="grid cols-4">
      <section className="card"><div className="kicker">Readiness</div><h2>{score}%</h2><p className="muted">คะแนนพร้อมใช้งานของระบบนอกที่ร้านตั้งเอง</p></section>
      <section className="card"><div className="kicker">Active</div><h2>{readiness?.active ?? 0}</h2><p className="muted">ระบบที่พร้อมใช้งานระดับ configuration</p></section>
      <section className="card"><div className="kicker">Store Managed</div><h2>{rows.length}</h2><p className="muted">รายการที่ร้านกรอกเองได้</p></section>
      <section className="card good"><div className="kicker">MDM Keys</div><h2>Owner</h2><p className="muted">ซ่อนจากร้าน จัดการโดย platform เท่านั้น</p></section>
    </div>

    <section className="card" style={{ marginTop: 16 }}>
      <div className="row between wrap">
        <div>
          <h2>เลือกหมวดตั้งค่า</h2>
          <p className="muted">แสดงเฉพาะระบบที่ร้านควรกรอกเอง ไม่รวม MDM key</p>
        </div>
        <div className="pill-list">
          {["ALL", ...categoryOrder].map(c => <button key={c} className={`btn tiny ${selectedCategory === c ? "" : "secondary"}`} onClick={() => setSelectedCategory(c)}>{c}</button>)}
        </div>
      </div>
    </section>

    <section className="grid cols-2" style={{ marginTop: 16 }}>
      {filteredRows.map((r: any) => {
        const fields = getFields(r);
        const draft = drafts[r.id] ?? {};
        return <section className="card" key={r.id}>
          <div className="row between wrap">
            <div>
              <span className={badgeClass(r.test?.status || r.status)}>{r.test?.status || r.status}</span>
              <h2 style={{ marginTop: 10 }}>{r.displayName}</h2>
              <p className="small">{r.provider} · {r.category}</p>
            </div>
            <div className="pill-list">
              <button className="btn tiny secondary" disabled={busy === r.id} onClick={() => testOne(r.id)}>{busy === r.id ? "ตรวจ..." : "ทดสอบ"}</button>
              <button className="btn tiny secondary" onClick={() => showPlan(r.id)}>วิธีต่อ</button>
            </div>
          </div>

          {r.test?.missing?.length ? <div className="alert bad"><b>ยังขาด:</b> {r.test.missing.join(", ")}</div> : <div className="alert">ไม่พบ env ที่ขาดจากการทดสอบล่าสุด</div>}

          {fields.length ? <div className="form-grid">
            {fields.map((field) => <label key={field.key}>{field.label}
              <FieldInput field={field} value={String(draft[field.key] ?? "")} onChange={(value) => setDrafts((items) => ({ ...items, [r.id]: { ...(items[r.id] ?? {}), [field.key]: value } }))} />
              {field.hint && <span className="small">{field.hint}</span>}
            </label>)}
            <button className="btn" disabled={busy === `save:${r.id}`} onClick={() => saveConfig(r)}>{busy === `save:${r.id}` ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</button>
          </div> : <div className="notice">รายการนี้ไม่มีช่องกรอกสำหรับร้าน ใช้ค่า platform/global หรือดูวิธีต่อ</div>}
        </section>;
      })}
    </section>

    {plan && <section className="card" style={{ marginTop: 16 }}>
      <div className="row between wrap"><h2>{plan.title || plan.connector?.displayName || "Setup Plan"}</h2><button className="btn tiny secondary" onClick={() => setPlan(null)}>ปิด</button></div>
      <div className="grid cols-2">
        <div>
          <h3>ต้องทำต่อ</h3>
          <ol>{(plan.plan || plan.setupNext || []).map((x: string) => <li key={x}>{x}</li>)}</ol>
        </div>
        <div>
          <h3>ไฟล์คู่มือ</h3>
          <ul>{(plan.docs || []).map((x: string) => <li key={x}><code>{x}</code></li>)}</ul>
          {plan.missing?.length ? <><h3>ยังขาด</h3><div className="pill-list">{plan.missing.map((x: string) => <span key={x} className="badge warn">{x}</span>)}</div></> : null}
        </div>
      </div>
    </section>}

    <section className="card" style={{ marginTop: 16 }}>
      <h2>Catalog ที่ร้านต่อได้</h2>
      <div className="grid cols-3">{catalog.map(x => <section key={x.provider} className="mini-card"><h3>{x.displayName}</h3><p className="small">{x.category}</p><p className="muted">{(x.docs || []).join(" / ") || "ดูเอกสารใน docs"}</p></section>)}</div>
    </section>
  </main>;
}