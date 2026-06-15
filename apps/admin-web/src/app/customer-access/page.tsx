"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type Customer = { id: string; fullName: string; phone: string; address?: string };
type PortalUser = { id: string; phone: string; email?: string; status: string; lastLoginAt?: string; customer: Customer; invites?: Array<{ shareUrl?: string; expiresAt: string }> };
type PaymentSetting = { id: string; provider: string; displayName: string; promptPayId?: string; bankName?: string; accountNo?: string; accountName?: string; instructions?: string; isActive: boolean };

export default function CustomerAccessPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [lastInvite, setLastInvite] = useState<{ shareUrl: string; temporaryPassword: string } | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [c, u, s] = await Promise.all([
        api<Customer[]>("/customers"),
        api<PortalUser[]>("/customer-users"),
        api<PaymentSetting[]>("/store/payment-settings"),
      ]);
      setCustomers(c);
      setUsers(u);
      setSettings(s);
      if (!selectedCustomerId && c[0]) setSelectedCustomerId(c[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }

  useEffect(() => { load(); }, []);

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === selectedCustomerId), [customers, selectedCustomerId]);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCustomerId) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") || "") || undefined,
      phone: String(form.get("phone") || selectedCustomer?.phone || ""),
      password: String(form.get("password") || "") || undefined,
      expiresInDays: Number(form.get("expiresInDays") || 14),
    };
    const result = await api<{ shareUrl: string; temporaryPassword: string }>(`/customers/${selectedCustomerId}/portal-user`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setLastInvite(result);
    await load();
  }

  async function resetPin(userId: string) {
    const result = await api<{ shareUrl: string; temporaryPassword: string }>(`/customer-users/${userId}/reset-pin`, { method: "POST" });
    setLastInvite(result);
    await load();
  }

  async function disable(user: PortalUser) {
    await api(`/customer-users/${user.id}`, { method: "PATCH", body: JSON.stringify({ status: user.status === "DISABLED" ? "ACTIVE" : "DISABLED" }) });
    await load();
  }

  async function savePaymentSetting(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api("/store/payment-settings", {
      method: "PUT",
      body: JSON.stringify({
        provider: "PROMPTPAY_MANUAL",
        displayName: "PromptPay ร้าน",
        promptPayId: String(form.get("promptPayId") || ""),
        bankName: String(form.get("bankName") || ""),
        accountNo: String(form.get("accountNo") || ""),
        accountName: String(form.get("accountName") || ""),
        instructions: String(form.get("instructions") || ""),
        isActive: true,
      }),
    });
    await load();
  }

  const activeSetting = settings.find((s) => s.isActive) ?? settings[0];

  return (
    <main className="shell">
      <section className="hero">
        <div className="topbar">
          <div>
            <span className="badge good">Tenant Safe</span>
            <h1>จัดการ User ลูกค้าและช่องทางจ่ายเงินของร้าน</h1>
            <p>ร้านสร้างบัญชีให้ลูกค้า ส่งลิงก์ + PIN ให้ลูกค้าเข้าไปดูงวด/QR ของร้านตัวเอง ข้อมูลล็อกด้วย organizationId ไม่ปนร้านอื่น เพราะการหวังว่าข้อมูลจะไม่หลุดเองไม่ใช่ security 😑</p>
          </div>
          <a className="btn secondary" href="/">กลับ Dashboard</a>
        </div>
      </section>

      {error && <div className="notice error">{error}</div>}
      {lastInvite && <div className="notice"><b>ส่งให้ลูกค้า:</b><br />ลิงก์: <code>{lastInvite.shareUrl}</code><br />PIN/รหัส: <code>{lastInvite.temporaryPassword}</code></div>}

      <section className="grid cols-2">
        <form className="card form-grid" onSubmit={createUser}>
          <h2>เปิด User ให้ลูกค้า</h2>
          <label>เลือกลูกค้า<select className="input" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>)}</select></label>
          <div className="grid cols-2">
            <label>เบอร์ Login<input className="input" name="phone" defaultValue={selectedCustomer?.phone ?? ""} /></label>
            <label>Email optional<input className="input" name="email" placeholder="customer@email.com" /></label>
          </div>
          <div className="grid cols-2">
            <label>PIN/Password optional<input className="input" name="password" placeholder="ปล่อยว่างให้ระบบสุ่ม 6 หลัก" /></label>
            <label>ลิงก์หมดอายุในกี่วัน<input className="input" name="expiresInDays" defaultValue="14" /></label>
          </div>
          <button className="btn">สร้าง/รีเซ็ต Customer Portal User</button>
        </form>

        <form className="card form-grid" onSubmit={savePaymentSetting}>
          <h2>ตั้งค่ารับเงินของร้าน</h2>
          <p className="small">ใช้สำหรับสร้าง QR งวดให้ลูกค้าแต่ละร้าน แยกจากร้านอื่น</p>
          <label>PromptPay ID<input className="input" name="promptPayId" defaultValue={activeSetting?.promptPayId ?? ""} placeholder="เบอร์มือถือ/เลขบัตร/Tax ID" /></label>
          <div className="grid cols-2"><label>ธนาคาร<input className="input" name="bankName" defaultValue={activeSetting?.bankName ?? ""} /></label><label>เลขบัญชี<input className="input" name="accountNo" defaultValue={activeSetting?.accountNo ?? ""} /></label></div>
          <label>ชื่อบัญชี<input className="input" name="accountName" defaultValue={activeSetting?.accountName ?? ""} /></label>
          <label>คำแนะนำชำระเงิน<textarea className="input" name="instructions" defaultValue={activeSetting?.instructions ?? "โอนแล้วแนบสลิปในระบบ รอร้านตรวจสอบ"} /></label>
          <button className="btn">บันทึกช่องทางรับเงิน</button>
        </form>
      </section>

      <section className="card">
        <h2>Customer Portal Users</h2>
        <div className="table-wrap"><table className="table"><thead><tr><th>ลูกค้า</th><th>Login</th><th>Status</th><th>ลิงก์ล่าสุด</th><th>จัดการ</th></tr></thead><tbody>{users.map((u) => <tr key={u.id}><td><b>{u.customer.fullName}</b><div className="small">{u.customer.phone}</div></td><td>{u.phone}<div className="small">{u.email ?? "-"}</div></td><td><span className={`badge ${u.status === "ACTIVE" ? "good" : "bad"}`}>{u.status}</span></td><td>{u.invites?.[0]?.shareUrl ? <code>{u.invites[0].shareUrl}</code> : <span className="small">-</span>}</td><td><div className="pill-list"><button className="btn secondary" onClick={() => resetPin(u.id)}>Reset PIN</button><button className="btn danger" onClick={() => disable(u)}>{u.status === "DISABLED" ? "Enable" : "Disable"}</button></div></td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
