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
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) } });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "API error");
  return json.data;
}
function remainingOf(i: Installment) { return Math.max(0, Number(i.amount) - Number(i.paidAmount)); }
function dateTH(value?: string) { return value ? new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-"; }
function statusTone(status?: string) { if (!status) return ""; if (["PAID", "PAID_OFF", "CONFIRMED", "ACTIVE", "RELEASED", "TRANSFERRED"].includes(status)) return "good"; if (["OPEN", "SUBMITTED", "DUE_SOON", "PENDING", "VERIFYING", "PARTIAL"].includes(status)) return "warn"; return "bad"; }

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
      const result = await fetch(`${API_BASE_URL}/portal/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeSlug, phone, password, inviteToken }) }).then(async (r) => {
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

  async function submitSlip(req: PaymentRequest) {
    const slipUrl = window.prompt("ใส่ลิงก์สลิปหรือรูปสลิปที่ร้านให้ส่ง", req.submittedSlipUrl ?? "");
    if (!slipUrl) return;
    const note = window.prompt("หมายเหตุเพิ่มเติม", "โอนแล้ว รอตรวจสอบ") ?? "";
    await portalApi(`/portal/payment-requests/${req.id}/submit-slip`, { method: "POST", body: JSON.stringify({ slipUrl, note }) });
    await loadPortal();
  }

  const paidPercent = useMemo(() => {
    const all = contracts.flatMap((c) => c.installments);
    const total = all.reduce((s, i) => s + Number(i.amount), 0);
    const paid = all.reduce((s, i) => s + Number(i.paidAmount), 0);
    return total <= 0 ? 0 : Math.round((paid / total) * 100);
  }, [contracts]);
  const nextDue = useMemo(() => contracts.flatMap((c) => c.installments.map((i) => ({ ...i, contractNo: c.contractNo }))).filter((i) => remainingOf(i) > 0).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0], [contracts]);
  const loggedIn = Boolean(customerName && getPortalToken());

  return (
    <main className="portal">
      <section className="hero" style={{ marginBottom: 18 }}>
        <span className="badge">Customer Portal</span>
        <h1>ดูงวดและชำระเงินของร้าน</h1>
        <p style={{ maxWidth: 820 }}>ลูกค้าแต่ละร้านเข้า Portal แยกกันด้วย Store + เบอร์ + PIN เห็นเฉพาะสัญญา งวด และ QR ของร้านตัวเอง ไม่ใช่เอาข้อมูลทุกคนไปปั่นรวมเหมือนหม้อสุกี้ฐานข้อมูล 🫠</p>
        {!loggedIn && <form className="card grid cols-4" onSubmit={login} style={{ marginTop: 18, alignItems: "end" }}><label>รหัสร้าน / Store<input className="input" value={storeSlug} onChange={(e) => setStoreSlug(e.target.value)} placeholder="store-slug" required /></label><label>เบอร์โทร<input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label><label>PIN / Password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button className="btn" disabled={loading}>{loading ? "กำลังเข้า..." : "เข้าสู่ระบบ"}</button></form>}
        {loggedIn && <div className="card topbar" style={{ marginTop: 18 }}><div><h2>{customerName}</h2><p className="small">ร้าน: {storeName} / เบอร์: {phone}</p></div><button className="btn secondary" onClick={() => { clearPortalToken(); location.reload(); }}>ออกจากระบบ</button></div>}
      </section>

      {error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}

      {loggedIn && <section className="grid">
        <div className="grid cols-3"><div className="card"><h2>ความคืบหน้ารวม</h2><div style={{ fontSize: 44, fontWeight: 1000 }}>{paidPercent}%</div><div className="progress"><span style={{ width: `${paidPercent}%` }} /></div></div><div className="card"><h2>งวดถัดไป</h2>{nextDue ? <><div style={{ fontSize: 24, fontWeight: 900 }}>สัญญา {nextDue.contractNo}</div><p>ครบกำหนด {dateTH(nextDue.dueDate)}</p><p>ยอดคงเหลือ <b style={{ color: "#fff" }}>{baht(remainingOf(nextDue))}</b></p></> : <><span className="badge good">ไม่มีงวดค้าง</span><p>ถ้าจ่ายครบ ร้านจะดำเนินการปลด MDM / โอนกรรมสิทธิ์ตามสัญญา</p></>}</div><div className="card"><h2>คำขอชำระ</h2><div style={{ fontSize: 44, fontWeight: 1000 }}>{requests.length}</div><p className="small">รายการ QR/สลิปที่รอตรวจหรือเปิดให้จ่าย</p></div></div>

        <div className="card"><h2>QR ชำระงวด</h2><div className="grid cols-3">{requests.length === 0 && <p className="small">ยังไม่มีคำขอชำระจากร้าน</p>}{requests.map((r) => <div className="card" key={r.id} style={{ background: "rgba(255,255,255,.04)" }}><span className={`badge ${statusTone(r.status)}`}>{r.status}</span><h3>{r.contract.contractNo}</h3><p>งวด {r.installment.installmentNo} / {dateTH(r.installment.dueDate)}</p><p style={{ fontSize: 26, fontWeight: 1000 }}>{baht(r.amount)}</p>{r.qrImageDataUrl ? <img src={r.qrImageDataUrl} alt="PromptPay QR" style={{ width: "100%", maxWidth: 260, background: "#fff", borderRadius: 16, padding: 8 }} /> : <div className="notice">ร้านยังไม่ได้ตั้ง PromptPay</div>}<button className="btn" style={{ marginTop: 12 }} onClick={() => submitSlip(r)}>แนบสลิป / แจ้งชำระ</button>{r.submittedSlipUrl && <p className="small">ส่งสลิปแล้ว: {r.submittedSlipUrl}</p>}</div>)}</div></div>

        <div className="card"><h2>สัญญาและตารางงวด</h2><div className="table-wrap"><table className="table"><thead><tr><th>สัญญา</th><th>เครื่อง</th><th>งวด</th><th>ครบกำหนด</th><th>ยอด</th><th>จ่ายแล้ว</th><th>คงเหลือ</th><th>Status</th></tr></thead><tbody>{contracts.flatMap((c) => c.installments.map((i) => <tr key={i.id}><td><b>{c.contractNo}</b><div className="small">{c.status} / {c.legalTitleStatus}</div></td><td>{c.device.brand} {c.device.model}<div className="small">{c.device.imei ?? "-"}</div></td><td>#{i.installmentNo}</td><td>{dateTH(i.dueDate)}</td><td>{baht(i.amount)}</td><td>{baht(i.paidAmount)}</td><td>{baht(remainingOf(i))}</td><td><span className={`badge ${statusTone(i.status)}`}>{i.status}</span></td></tr>))}</tbody></table></div></div>
      </section>}
    </main>
  );
}
