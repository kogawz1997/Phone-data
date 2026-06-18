"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../lib/api";
import { baht } from "@repo/shared";

type Installment = { id: string; installmentNo: number; dueDate: string; amount: string; paidAmount: string; status: string };
type Contract = { id: string; contractNo: string; status: string; legalTitleStatus?: string; totalAmount: string; customer: { fullName: string; phone: string }; device: { brand: string; model: string; imei?: string; controlStatus: string }; installments: Installment[] };
type PaymentRequest = { id: string; amount: string; status: string; qrImageDataUrl?: string; qrPayload?: string; paymentUrl?: string; submittedSlipUrl?: string; submittedNote?: string; contract: Contract; installment: Installment; expiresAt?: string };
type Payment = { id: string; amount: string; status: string; method: string; paidAt?: string; slipUrl?: string; createdAt: string; contract: Contract; installment?: Installment };
type PortalSettings = { slug?: string; brandColor?: string; welcomeText?: string; contactLine?: string; supportPhone?: string; releasePolicy?: string };

function getSession() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("koga_customer_token") ?? "";
}

function setSession(value: string) {
  localStorage.setItem("koga_customer_token", value);
}

function clearSession() {
  localStorage.removeItem("koga_customer_token");
}

async function portalApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session}` } : {}), ...(options.headers ?? {}) },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? "API error");
  return json.data;
}

function remainingOf(item: Installment) {
  return Math.max(0, Number(item.amount) - Number(item.paidAmount));
}

function dateTH(value?: string) {
  return value ? new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-";
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("อ่านไฟล์ไม่ได้"));
    reader.readAsDataURL(file);
  });
}

export default function CustomerCommandPortal() {
  const [active, setActive] = useState(false);
  const [storeSlug, setStoreSlug] = useState("");
  const [invite, setInvite] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [settings, setSettings] = useState<PortalSettings>({});
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");

  async function loadPortal() {
    const [me, cs, prs, ps] = await Promise.all([
      portalApi<{ customer: { fullName: string; phone: string }; store: { name: string; slug?: string; phone?: string }; portalSettings?: PortalSettings }>("/portal/me"),
      portalApi<Contract[]>("/portal/contracts"),
      portalApi<PaymentRequest[]>("/portal/payment-requests"),
      portalApi<Payment[]>("/portal/payments"),
    ]);
    setCustomerName(me.customer.fullName);
    setPhone(me.customer.phone);
    setStoreName(me.store.name);
    setStoreSlug(me.store.slug || "");
    setSettings(me.portalSettings || {});
    setContracts(cs);
    setRequests(prs);
    setPayments(ps);
  }

  useEffect(() => {
    const isRoot = window.location.pathname === "/";
    setActive(isRoot);
    const params = new URLSearchParams(window.location.search);
    setStoreSlug(params.get("store") ?? "");
    setInvite(params.get("invite") ?? "");
    if (isRoot && getSession()) loadPortal().catch(() => clearSession());
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await fetch(`${API_BASE_URL}/portal/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug, phone, password, inviteToken: invite }),
      }).then(async (res) => {
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message ?? "เข้าสู่ระบบไม่สำเร็จ");
        return json.data as { token: string; customer: { fullName: string }; store: { name: string; slug?: string }; portalSettings?: PortalSettings };
      });
      setSession(result.token);
      setCustomerName(result.customer.fullName);
      setStoreName(result.store.name);
      setStoreSlug(result.store.slug || storeSlug);
      setSettings(result.portalSettings || {});
      await loadPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function submitSlip(req: PaymentRequest, file: File) {
    setUploading(req.id);
    setError("");
    try {
      if (file.size > 8_000_000) throw new Error("ไฟล์ใหญ่เกิน 8MB");
      const contentBase64 = await fileToBase64(file);
      const saved = await portalApi<{ url: string }>("/portal/uploads/base64", { method: "POST", body: JSON.stringify({ filename: file.name, contentBase64, folder: "portal-slips" }) });
      await portalApi(`/portal/payment-requests/${req.id}/submit-slip`, { method: "POST", body: JSON.stringify({ slipUrl: saved.url, note: `อัปโหลดสลิป: ${file.name}` }) });
      await loadPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดสลิปไม่สำเร็จ");
    } finally {
      setUploading("");
    }
  }

  const loggedIn = Boolean(customerName && getSession());
  const allInstallments = useMemo(() => contracts.flatMap((contract) => contract.installments.map((item) => ({ ...item, contractNo: contract.contractNo }))), [contracts]);
  const total = allInstallments.reduce((sum, item) => sum + Number(item.amount), 0);
  const paid = allInstallments.reduce((sum, item) => sum + Number(item.paidAmount), 0);
  const paidPercent = total <= 0 ? 0 : Math.min(100, Math.round((paid / total) * 100));
  const nextDue = allInstallments.filter((item) => remainingOf(item) > 0).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const openRequests = requests.filter((item) => !["CONFIRMED", "REJECTED", "EXPIRED"].includes(item.status));
  const welcome = settings.welcomeText || "ดูยอดค้าง งวดถัดไป QR ชำระเงิน และสถานะสัญญาได้ในที่เดียว";

  if (!active) return null;

  return (
    <main id="main-content" className="kogaCustomerCommand" aria-label="KOGA customer portal">
      <header className="kcpTopbar">
        <div className="kcpBrand"><span>K</span><div><small>Customer portal</small><strong>{storeName || "KOGA Portal"}</strong></div></div>
        {loggedIn && <button type="button" onClick={() => { clearSession(); location.reload(); }}>ออกจากระบบ</button>}
      </header>

      <section className="kcpHero">
        <div className="kcpHeroCopy">
          <span className="kcpEyebrow">Lease status · payment · device care</span>
          <h1>{loggedIn ? `สวัสดี ${customerName}` : "ดูงวด สัญญา และชำระเงินได้ในหน้าเดียว"}</h1>
          <p>{loggedIn ? `${welcome} · ร้าน ${storeName || "-"}` : welcome}</p>
          <nav className="kcpQuickNav" aria-label="ทางลัดลูกค้า">
            <a href="#pay">ชำระเงิน</a>
            <a href="#contracts">สัญญา</a>
            <a href="#history">ประวัติ</a>
            <a href="#help">ช่วยเหลือ</a>
          </nav>
        </div>

        <aside className="kcpDeviceCard">
          <small>งวดถัดไป</small>
          <strong>{nextDue ? baht(remainingOf(nextDue)) : loggedIn ? "ไม่มีงวดค้าง" : "พร้อมใช้งาน"}</strong>
          <span>{nextDue ? `ครบกำหนด ${dateTH(nextDue.dueDate)}` : "ดูรายละเอียดหลังเข้าสู่ระบบ"}</span>
          <div className="kcpProgress"><i style={{ width: `${paidPercent}%` }} /></div>
          <p>จ่ายแล้วรวม {paidPercent}%</p>
        </aside>

        {!loggedIn && (
          <form className="kcpLogin" onSubmit={login}>
            <span className="kcpEyebrow">เข้าสู่ระบบลูกค้า</span>
            <h2>เปิดข้อมูลสัญญาของคุณ</h2>
            <label>รหัสร้าน<input value={storeSlug} onChange={(e) => setStoreSlug(e.target.value)} placeholder="เช่น koga-store" required /></label>
            <label>เบอร์โทร / Email<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์ที่ใช้ทำสัญญา" required /></label>
            <label>PIN / Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="รหัสที่ร้านให้" required /></label>
            <button disabled={loading}>{loading ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}</button>
          </form>
        )}
      </section>

      {error && <section className="kcpNotice" role="alert">{error}</section>}

      {loggedIn && (
        <section className="kcpMainGrid">
          <article className="kcpMetric"><span>สัญญา</span><strong>{contracts.length}</strong><small>รายการในบัญชีนี้</small></article>
          <article className="kcpMetric"><span>รอตรวจ</span><strong>{openRequests.length}</strong><small>รายการชำระ/สลิป</small></article>
          <article className="kcpMetric wide"><span>ยอดจ่ายแล้ว</span><strong>{paidPercent}%</strong><div className="kcpProgress"><i style={{ width: `${paidPercent}%` }} /></div></article>

          <article id="pay" className="kcpPanel pay">
            <div className="kcpPanelHead"><div><span className="kcpEyebrow">Payment desk</span><h2>QR และแจ้งชำระ</h2></div><p>สแกนจ่าย แล้วอัปโหลดสลิปให้ร้านตรวจ</p></div>
            <div className="kcpCards">
              {openRequests.length === 0 && <p className="kcpEmpty">ยังไม่มีคำขอชำระจากร้าน</p>}
              {openRequests.map((req) => (
                <article className="kcpPayment" key={req.id}>
                  <div><span>{req.contract.contractNo}</span><strong>{baht(Number(req.amount))}</strong><small>งวด {req.installment.installmentNo} · {dateTH(req.installment.dueDate)}</small></div>
                  {req.qrImageDataUrl ? <img src={req.qrImageDataUrl} alt={`QR ชำระเงิน ${req.contract.contractNo}`} /> : <code>{req.qrPayload || req.paymentUrl || "รอ QR จากร้าน"}</code>}
                  <label className="kcpUpload">{uploading === req.id ? "กำลังอัปโหลด" : "อัปโหลดสลิป"}<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void submitSlip(req, file); }} /></label>
                </article>
              ))}
            </div>
          </article>

          <article id="contracts" className="kcpPanel">
            <div className="kcpPanelHead"><div><span className="kcpEyebrow">Contracts</span><h2>สัญญาและเครื่อง</h2></div></div>
            <div className="kcpList">
              {contracts.map((contract) => (
                <div key={contract.id}>
                  <strong>{contract.contractNo}</strong>
                  <span>{contract.device.brand} {contract.device.model}</span>
                  <small>{contract.status} · IMEI {contract.device.imei || "-"} · {baht(Number(contract.totalAmount))}</small>
                </div>
              ))}
            </div>
          </article>

          <article id="history" className="kcpPanel">
            <div className="kcpPanelHead"><div><span className="kcpEyebrow">History</span><h2>ประวัติชำระเงิน</h2></div></div>
            <div className="kcpList">
              {payments.slice(0, 8).map((payment) => (
                <div key={payment.id}>
                  <strong>{baht(Number(payment.amount))}</strong>
                  <span>{payment.method} · {payment.status}</span>
                  <small>{dateTH(payment.paidAt || payment.createdAt)} · {payment.contract.contractNo}</small>
                </div>
              ))}
              {payments.length === 0 && <p className="kcpEmpty">ยังไม่มีประวัติชำระเงิน</p>}
            </div>
          </article>

          <article id="help" className="kcpPanel help">
            <div className="kcpPanelHead"><div><span className="kcpEyebrow">Help</span><h2>ติดต่อร้าน</h2></div></div>
            <p>{settings.releasePolicy || "เมื่อจ่ายครบ ร้านจะดำเนินการปลด MDM หรือโอนกรรมสิทธิ์ตามเงื่อนไขสัญญา"}</p>
            <div className="kcpHelpGrid">
              <span>LINE: {settings.contactLine || "ติดต่อร้าน"}</span>
              <span>โทร: {settings.supportPhone || "-"}</span>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
