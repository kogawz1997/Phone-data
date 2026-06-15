"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { baht } from "@repo/shared";

type Installment = { id: string; installmentNo: number; dueDate: string; amount: string; paidAmount: string; status: string };
type Contract = { id: string; contractNo: string; status: string; customer: { fullName: string; phone: string }; device: { brand: string; model: string }; installments: Installment[] };
type PaymentRequest = { id: string; amount: string; status: string; qrImageDataUrl?: string; paymentUrl?: string; submittedSlipUrl?: string; submittedNote?: string; customer: { fullName: string; phone: string }; contract: Contract; installment: Installment; createdAt: string };

function remainingOf(i: Installment) { return Math.max(0, Number(i.amount) - Number(i.paidAmount)); }
function dateTH(value?: string) { return value ? new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-"; }

export default function PaymentRequestsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [contractId, setContractId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [c, r] = await Promise.all([api<Contract[]>("/contracts"), api<PaymentRequest[]>("/payment-requests")]);
      setContracts(c);
      setRequests(r);
      if (!contractId && c[0]) setContractId(c[0].id);
    } catch (e) { setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"); }
  }
  useEffect(() => { load(); }, []);

  const contract = useMemo(() => contracts.find((c) => c.id === contractId), [contracts, contractId]);
  const unpaid = contract?.installments.filter((i) => remainingOf(i) > 0) ?? [];
  const selectedInstallment = unpaid.find((i) => i.id === installmentId) ?? unpaid[0];

  async function createRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedInstallment) return;
    const form = new FormData(e.currentTarget);
    await api(`/installments/${selectedInstallment.id}/payment-request`, { method: "POST", body: JSON.stringify({ amount: Number(form.get("amount") || remainingOf(selectedInstallment)), expiresInDays: Number(form.get("expiresInDays") || 7) }) });
    await load();
  }

  async function confirm(id: string) { await api(`/payment-requests/${id}/confirm`, { method: "POST" }); await load(); }
  async function reject(id: string) { await api(`/payment-requests/${id}/reject`, { method: "POST" }); await load(); }

  return (
    <main className="shell">
      <section className="hero"><div className="topbar"><div><span className="badge good">Customer Payment</span><h1>สร้าง QR งวดให้ลูกค้า</h1><p>ร้านเลือกสัญญา/งวด ระบบสร้าง payment request แยกร้าน พร้อม QR PromptPay/ลิงก์ให้ลูกค้าเปิดใน Portal แล้วแนบสลิปเข้าคิวตรวจ</p></div><a className="btn secondary" href="/">กลับ Dashboard</a></div></section>
      {error && <div className="notice error">{error}</div>}
      <section className="grid cols-2">
        <form className="card form-grid" onSubmit={createRequest}>
          <h2>สร้างคำขอชำระงวด</h2>
          <label>สัญญา<select className="input" value={contractId} onChange={(e) => { setContractId(e.target.value); setInstallmentId(""); }}><option value="">เลือกสัญญา</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNo} - {c.customer.fullName}</option>)}</select></label>
          <label>งวด<select className="input" value={installmentId || selectedInstallment?.id || ""} onChange={(e) => setInstallmentId(e.target.value)}>{unpaid.map((i) => <option key={i.id} value={i.id}>งวด {i.installmentNo} / เหลือ {baht(remainingOf(i))} / {dateTH(i.dueDate)}</option>)}</select></label>
          <div className="grid cols-2"><label>ยอดที่ให้จ่าย<input className="input" name="amount" defaultValue={selectedInstallment ? remainingOf(selectedInstallment) : ""} /></label><label>หมดอายุในกี่วัน<input className="input" name="expiresInDays" defaultValue="7" /></label></div>
          <button className="btn" disabled={!selectedInstallment}>สร้าง QR และลิงก์ชำระ</button>
        </form>
        <div className="card"><h2>วิธีใช้งานร้าน</h2><ol className="small"><li>ตั้งค่า PromptPay ที่หน้า Customer Portal Users</li><li>สร้าง user ลูกค้าแล้วส่งลิงก์ + PIN</li><li>สร้าง payment request สำหรับงวด</li><li>ลูกค้าเปิด portal ดูงวด/QR/แนบสลิป</li><li>ร้านตรวจแล้วกด Confirm</li></ol><p className="notice">ทุก request มี organizationId ของร้านตัวเอง กันข้อมูลปนร้านอื่นตั้งแต่ฐานข้อมูล ไม่ใช่กันด้วยความหวังอันบอบบาง</p></div>
      </section>
      <section className="card"><h2>Payment Requests</h2><div className="table-wrap"><table className="table"><thead><tr><th>ลูกค้า</th><th>สัญญา/งวด</th><th>ยอด</th><th>Status</th><th>QR/Link</th><th>สลิป</th><th>จัดการ</th></tr></thead><tbody>{requests.map((r) => <tr key={r.id}><td><b>{r.customer.fullName}</b><div className="small">{r.customer.phone}</div></td><td>{r.contract.contractNo}<div className="small">งวด {r.installment.installmentNo} / {r.contract.device.brand} {r.contract.device.model}</div></td><td>{baht(r.amount)}</td><td><span className={`badge ${r.status === "CONFIRMED" ? "good" : r.status === "REJECTED" ? "bad" : "warn"}`}>{r.status}</span></td><td>{r.qrImageDataUrl ? <img src={r.qrImageDataUrl} alt="qr" style={{ width: 86, height: 86, background: "#fff", borderRadius: 10 }} /> : <span className="small">ยังไม่ตั้ง PromptPay</span>}<div className="small">{r.paymentUrl ? <code>{r.paymentUrl}</code> : "-"}</div></td><td>{r.submittedSlipUrl ? <a className="badge neutral" href={r.submittedSlipUrl} target="_blank">เปิดสลิป</a> : <span className="small">ยังไม่ส่ง</span>}</td><td>{!["CONFIRMED", "CANCELLED"].includes(r.status) && <div className="pill-list"><button className="btn secondary" onClick={() => confirm(r.id)}>Confirm</button><button className="btn danger" onClick={() => reject(r.id)}>Reject</button></div>}</td></tr>)}</tbody></table></div></section>
    </main>
  );
}
