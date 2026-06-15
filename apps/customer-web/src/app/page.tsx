"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { baht } from "@repo/shared";

type Installment = { id: string; installmentNo: number; dueDate: string; amount: string; paidAmount: string; status: string };
type Contract = { id: string; contractNo: string; status: string; legalTitleStatus?: string; totalAmount: string; customer: { fullName: string; phone: string }; device: { brand: string; model: string; imei?: string; controlStatus: string }; installments: Installment[] };
type PaymentRequest = { id: string; amount: string; status: string; qrImageDataUrl?: string; qrPayload?: string; paymentUrl?: string; submittedSlipUrl?: string; submittedNote?: string; contract: Contract; installment: Installment; expiresAt?: string };

function getPortalToken() { if (typeof window === "undefined") return ""; return localStorage.getItem("koga_customer_token") ?? ""; }
function setPortalToken(token: string) { if (typeof window !== "undefined") localStorage.setItem("koga_customer_token", token); }
function clearPortalToken() { if (typeof window !== "undefined") localStorage.removeItem("koga_customer_token"); }
async function portalApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPortalToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "API error");
  return json.data;
}
function remainingOf(i: Installment) { return Math.max(0, Number(i.amount) - Number(i.paidAmount)); }
function dateTH(value?: string) { return value ? new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-"; }
function statusTone(status?: string) { if (!status) return ""; if (["PAID", "PAID_OFF", "CONFIRMED", "ACTIVE", "RELEASED", "TRANSFERRED"].includes(status)) return "good"; if (["OPEN", "SUBMITTED", "DUE_SOON", "PENDING", "VERIFYING", "PARTIAL"].includes(status)) return "warn"; return "bad"; }
function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("อ่านไฟล์ไม่ได้"));
    reader.readAsDataURL(file);
  });
}

export default function CustomerPortal() {
  const [storeSlug, setStoreSlug] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slipUploading, setSlipUploading] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStoreSlug(params.get("store") ?? "");
    setInviteToken(params.get("invite") ?? "");
    const pay = params.get("pay");
    if (pay) sessionStorage.setItem("koga_focus_pay", pay);
    if (getPortalToken()) loadPortal().catch(() => clearPortalToken());
  }, []);

  async function loadPortal() {
    const [me, cs, prs] = await Promise.all([
      portalApi<{ customer: { fullName: string; phone: string }; store: { name: string; slug?: string } }>("/portal/me"),
      portalApi<Contract[]>("/portal/contracts"),
      portalApi<PaymentRequest[]>("/portal/payment-requests"),
    ]);
    setCustomerName(me.customer.fullName);
    setPhone(me.customer.phone);
    setStoreName(me.store.name);
    setContracts(cs);
    setRequests(prs);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await fetch(`${API_BASE_URL}/portal/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug, phone, password, inviteToken }),
      }).then(async (r) => {
        const j = await r.json();
        if (!j.ok) throw new Error(j.error?.message ?? "Login failed");
        return j.data as { token: string; customer: { fullName: string }; store: { name: string } };
      });
      setPortalToken(result.token);
      setCustomerName(result.customer.fullName);
      setStoreName(result.store.name);
      await loadPortal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally { setLoading(false); }
  }

  async function submitSlipFile(req: PaymentRequest, file: File) {
    setError("");
    setSlipUploading(req.id);
    try {
      if (file.size > 8_000_000) throw new Error("ไฟล์ใหญ่เกิน 8MB");
      const contentBase64 = await fileToBase64(file);
      const saved = await portalApi<{ url: string }>("/portal/uploads/base64", { method: "POST", body: JSON.stringify({ filename: file.name, contentBase64, folder: "portal-slips" }) });
      await portalApi(`/portal/payment-requests/${req.id}/submit-slip`, { method: "POST", body: JSON.stringify({ slipUrl: saved.url, note: `อัปโหลดสลิป: ${file.name}` }) });
      await loadPortal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดสลิปไม่สำเร็จ");
    } finally {
      setSlipUploading("");
    }
  }

  const paidPercent = useMemo(() => {
    const all = contracts.flatMap((c) => c.installments);
    const total = all.reduce((s, i) => s + Number(i.amount), 0);
    const paid = all.reduce((s, i) => s + Number(i.paidAmount), 0);
    return total <= 0 ? 0 : Math.min(100, Math.round((paid / total) * 100));
  }, [contracts]);
  const nextDue = useMemo(() => contracts.flatMap((c) => c.installments.map((i) => ({ ...i, contractNo: c.contractNo }))).filter((i) => remainingOf(i) > 0).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0], [contracts]);
  const loggedIn = Boolean(customerName && getPortalToken());

  return (
    <main className="portal customer-shell">
      <header className="portal-topbar">
        <div className="portal-brand"><div className="portal-logo">K</div><div><span>Customer Portal</span><strong>{storeName || "KOGA Portal"}</strong></div></div>
        {loggedIn && <button className="btn secondary" onClick={() => { clearPortalToken(); location.reload(); }}>ออกจากระบบ</button>}
      </header>

      <section className={`hero dashboard-hero ${loggedIn ? "portal-hero-compact" : ""}`}>
        <div className="hero-copy">
          <span className="badge">ชำระงวด · ดูสัญญา · สถานะเครื่อง</span>
          <h1>{loggedIn ? `สวัสดี ${customerName}` : "จัดการงวดและสัญญาได้ง่ายในหน้าเดียว"}</h1>
          <p>{loggedIn ? `ร้าน ${storeName || "-"} · เบอร์/บัญชี ${phone || "-"}` : "เข้าสู่ระบบด้วยรหัสร้าน เบอร์โทร และ PIN เพื่อดูยอดค้าง งวดถัดไป QR ชำระเงิน และสถานะการตรวจสลิป"}</p>
          <div className="hero-metrics" aria-label="ทางลัดสำคัญ">
            <a href="#pay">ชำระเงิน</a>
            <a href="#contracts">สัญญา</a>
            <a href="#help">ช่วยเหลือ</a>
          </div>
        </div>
        <div className="hero-orb" aria-hidden="true">
          <div className="phone-preview">
            <span className="phone-speaker" />
            <div className="phone-screen-card">
              <small>งวดถัดไป</small>
              <strong>{nextDue ? baht(remainingOf(nextDue)) : "ไม่มีงวดค้าง"}</strong>
              <span>{nextDue ? `ครบกำหนด ${dateTH(nextDue.dueDate)}` : "ระบบพร้อมใช้งาน"}</span>
            </div>
            <div className="mini-progress"><span style={{ width: `${paidPercent}%` }} /></div>
          </div>
        </div>

        {!loggedIn && (
          <form className="card login-card portal-login-card" onSubmit={login}>
            <div className="login-intro"><span className="eyebrow">เข้าสู่ระบบลูกค้า</span><h2>ดูยอดค้างและแจ้งชำระ</h2><p className="small">ใช้ข้อมูลที่ร้านส่งให้ หรือเปิดจากลิงก์ invite ได้เลย</p></div>
            <label>รหัสร้าน<input className="input" value={storeSlug} onChange={(e) => setStoreSlug(e.target.value)} placeholder="เช่น koga-store" required /></label>
            <label>เบอร์โทร / Email<input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์ที่ใช้ทำสัญญา" required /></label>
            <label>PIN / Password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสที่ร้านให้" required /></label>
            <button className="btn" disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
          </form>
        )}
      </section>

      {error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}

      {loggedIn && <section className="grid portal-content">
        <div className="grid cols-3 portal-summary">
          <div className="card stat-card accent"><span className="eyebrow">จ่ายแล้วโดยรวม</span><h2>{paidPercent}%</h2><div className="progress"><span style={{ width: `${paidPercent}%` }} /></div><p className="small">รวมทุกสัญญาที่อยู่ในบัญชีนี้</p></div>
          <div className="card stat-card"><span className="eyebrow">งวดถัดไป</span>{nextDue ? <><h2>{baht(remainingOf(nextDue))}</h2><p>สัญญา {nextDue.contractNo}</p><p className="small">ครบกำหนด {dateTH(nextDue.dueDate)}</p></> : <><span className="badge good">ไม่มีงวดค้าง</span><p>เมื่อจ่ายครบ ร้านจะดำเนินการปลด MDM / โอนกรรมสิทธิ์ตามสัญญา</p></>}</div>
          <div className="card stat-card"><span className="eyebrow">รอตรวจ</span><h2>{requests.length}</h2><p className="small">รายการ QR/สลิปที่เปิดให้ชำระหรือรอตรวจ</p></div>
        </div>

        <div id="pay" className="card section-card"><div className="section-heading"><div><span className="eyebrow">ชำระเงิน</span><h2>QR และแจ้งชำระ</h2></div><p className="small">สแกนจ่าย แล้วอัปโหลดรูปสลิปให้ร้านตรวจ</p></div><div className="grid cols-3">{requests.length === 0 && <div className="notice">ยังไม่มีคำขอชำระจากร้าน</div>}{requests.map((r) => <div className="card payment-request-card" key={r.id}><div className="payment-card-head"><span className={`badge ${statusTone(r.status)}`}>{r.status}</span><span className="small">งวด {r.installment.installmentNo}</span></div><h3>{r.contract.contractNo}</h3><p className="small">ครบกำหนด {dateTH(r.installment.dueDate)}</p><p className="amount">{baht(r.amount)}</p>{r.qrImageDataUrl ? <img src={r.qrImageDataUrl} alt="PromptPay QR" className="qr-image" /> : <div className="notice">ร้านยังไม่ได้ตั้ง PromptPay</div>}<input id={`slip-${r.id}`} hidden type="file" accept="image/*,.pdf" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void submitSlipFile(r, file); event.currentTarget.value = ""; }} /><button className="btn" disabled={slipUploading === r.id} onClick={() => document.getElementById(`slip-${r.id}`)?.click()}>{slipUploading === r.id ? "กำลังอัปโหลด..." : "อัปโหลดสลิป / แจ้งชำระ"}</button>{r.submittedSlipUrl && <p className="small">ส่งสลิปแล้ว: {r.submittedSlipUrl}</p>}</div>)}</div></div>

        <div id="contracts" className="card section-card"><div className="section-heading"><div><span className="eyebrow">สัญญา</span><h2>ตารางงวดทั้งหมด</h2></div><p className="small">ดูยอด จ่ายแล้ว คงเหลือ และสถานะทุกงวด</p></div><div className="table-wrap"><table className="table"><thead><tr><th>สัญญา</th><th>เครื่อง</th><th>งวด</th><th>ครบกำหนด</th><th>ยอด</th><th>จ่ายแล้ว</th><th>คงเหลือ</th><th>Status</th></tr></thead><tbody>{contracts.flatMap((c) => c.installments.map((i) => <tr key={i.id}><td><b>{c.contractNo}</b><div className="small">{c.status} / {c.legalTitleStatus}</div></td><td>{c.device.brand} {c.device.model}<div className="small">{c.device.imei ?? "-"}</div></td><td>#{i.installmentNo}</td><td>{dateTH(i.dueDate)}</td><td>{baht(i.amount)}</td><td>{baht(i.paidAmount)}</td><td>{baht(remainingOf(i))}</td><td><span className={`badge ${statusTone(i.status)}`}>{i.status}</span></td></tr>))}</tbody></table></div></div>

        <div id="help" className="card section-card help-card"><span className="eyebrow">ช่วยเหลือ</span><h2>ต้องการให้ร้านช่วย?</h2><p>ถ้ายอดไม่ตรง สลิปไม่ผ่าน หรือเครื่องติดสถานะผิด ให้ติดต่อร้านพร้อมเลขสัญญาและสลิปชำระเงินล่าสุด</p></div>
      </section>}
    </main>
  );
}
