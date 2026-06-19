"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type PageKey = "dashboard" | "customers" | "devices" | "contracts" | "payments" | "collection";
type Row = Record<string, any>;
type DataSet = { customers: Row[]; devices: Row[]; contracts: Row[]; payments: Row[]; paymentRequests: Row[]; collectionTasks: Row[] };

const emptyData: DataSet = { customers: [], devices: [], contracts: [], payments: [], paymentRequests: [], collectionTasks: [] };
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
const nav: Array<{ key: PageKey; href: string; label: string; icon: string }> = [
  { key: "dashboard", href: "/", label: "หน้าหลัก", icon: "⌂" },
  { key: "customers", href: "/customers", label: "ลูกค้า", icon: "◌" },
  { key: "devices", href: "/devices", label: "คลังเครื่อง", icon: "▣" },
  { key: "contracts", href: "/contracts", label: "สัญญา", icon: "▤" },
  { key: "payments", href: "/payments", label: "ชำระเงิน", icon: "฿" },
  { key: "collection", href: "/collection", label: "ติดตามงวด", icon: "◎" },
];

function token() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("koga_token") || localStorage.getItem("token") || localStorage.getItem("adminToken") || "";
}

function logout() {
  if (typeof window === "undefined") return;
  ["koga_token", "token", "adminToken", "koga_admin", "koga_store"].forEach((key) => localStorage.removeItem(key));
  window.location.assign("/login");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const t = token();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init?.headers || {}) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || `API ${path} failed`);
  return (json?.data ?? json) as T;
}

function useKogaData() {
  const [data, setData] = useState<DataSet>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.allSettled([
      api<Row[]>("/customers"),
      api<Row[]>("/devices"),
      api<Row[]>("/contracts"),
      api<Row[]>("/payments"),
      api<Row[]>("/payment-requests"),
      api<Row[]>("/collection/tasks"),
    ]).then((r) => {
      if (!alive) return;
      setData({
        customers: r[0].status === "fulfilled" ? r[0].value : [],
        devices: r[1].status === "fulfilled" ? r[1].value : [],
        contracts: r[2].status === "fulfilled" ? r[2].value : [],
        payments: r[3].status === "fulfilled" ? r[3].value : [],
        paymentRequests: r[4].status === "fulfilled" ? r[4].value : [],
        collectionTasks: r[5].status === "fulfilled" ? r[5].value : [],
      });
      const failed = r.find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
      if (failed) setError(failed.reason?.message || "เชื่อมต่อ API ไม่สำเร็จ");
      setLoading(false);
    });
    return () => { alive = false; };
  }, [tick]);

  const mutate = useCallback(async (path: string, method = "POST", body?: unknown) => {
    await api(path, { method, body: body ? JSON.stringify(body) : undefined });
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh, mutate };
}

function baht(v: unknown) { return `฿${Number(v || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`; }
function d(v: unknown) { const x = v ? new Date(String(v)) : null; return x && !Number.isNaN(x.getTime()) ? x.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }) : "-"; }
function tone(v: unknown) { const s = String(v || "").toUpperCase(); if (["ACTIVE", "PAID", "CONFIRMED", "ENROLLED", "OPEN", "IN_STOCK", "LEASE_ACTIVE"].some((x) => s.includes(x))) return "good"; if (["PENDING", "VERIFYING", "WATCH", "DRAFT", "NOT_ENROLLED", "ENROLL"].some((x) => s.includes(x))) return "warn"; if (["OVERDUE", "FAILED", "REJECT", "BLOCK", "RECOVERY", "OFFLINE"].some((x) => s.includes(x))) return "bad"; return "info"; }
function label(v: unknown) { const s = String(v || "-").toUpperCase(); return ({ ACTIVE: "Active", PAID: "ชำระแล้ว", CONFIRMED: "ชำระแล้ว", VERIFYING: "รอตรวจสอบ", PENDING: "รอดำเนินการ", OVERDUE: "ค้างชำระ", REJECTED: "ถูกปฏิเสธ", DRAFT: "Draft", ENROLLED: "ออนไลน์", NOT_ENROLLED: "Not Controlled", ENROLL_PENDING: "รอติดตั้ง", IN_STOCK: "พร้อมปล่อย", LEASE_ACTIVE: "ผ่อนอยู่", OPEN: "เปิดอยู่", DONE: "เสร็จสิ้น" } as Record<string, string>)[s] || String(v || "-"); }
function Chip({ children, type = "info" }: { children: ReactNode; type?: string }) { return <span className={`live-chip ${type}`}>{children}</span>; }
function Field({ name, label, type = "text", placeholder, defaultValue, required }: { name: string; label: string; type?: string; placeholder?: string; defaultValue?: string | number; required?: boolean }) { return <label className="live-field"><span>{label}</span><input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} required={required} /></label>; }
function SelectField({ name, label, children, required }: { name: string; label: string; children: ReactNode; required?: boolean }) { return <label className="live-field"><span>{label}</span><select name={name} required={required}>{children}</select></label>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="live-empty"><b>{title}</b><span>{text}</span></div>; }
function SubmitButton({ children }: { children: ReactNode }) { return <button className="live-btn primary" type="submit">{children}</button>; }

function Shell({ page, children, loading, error, refresh }: { page: PageKey; children: ReactNode; loading: boolean; error: string; refresh: () => void }) {
  const current = nav.find((n) => n.key === page)!;
  return <main className="live-app"><aside className="live-sidebar"><div className="live-brand"><div className="live-logo">K</div><div><b>KOGA Lease MDM</b><span>Production console</span></div></div><nav>{nav.map((n) => <Link key={n.key} href={n.href} className={n.key === page ? "active" : ""}><i>{n.icon}</i><span>{n.label}</span></Link>)}</nav><div className="live-side-bottom"><Chip type={error ? "bad" : "good"}>{error ? "API error" : "API live"}</Chip><small>{API_BASE}</small><button className="live-btn danger" onClick={logout}>ออกจากระบบ</button></div></aside><section className="live-main"><header className="live-top"><div><p>Store workspace</p><h1>{current.label}</h1></div><div className="live-top-actions">{loading ? <Chip type="warn">กำลังโหลด</Chip> : <Chip type="good">ข้อมูลสด</Chip>}<button className="live-btn" onClick={refresh}>รีเฟรช</button><Link className="live-btn" href="/mobile-store">Mobile</Link><button className="live-btn danger" onClick={logout}>ออกจากระบบ</button></div></header>{error ? <div className="live-alert bad"><b>ยังใช้งาน API ไม่ได้</b><span>{error.includes("Missing bearer") ? "ต้องเข้าสู่ระบบก่อน หรือ token ไม่อยู่ใน localStorage" : error}</span></div> : null}<div className="live-content">{children}</div></section></main>;
}

function Stat({ title, value, note, type = "info" }: { title: string; value: ReactNode; note?: string; type?: string }) { return <div className={`live-stat ${type}`}><span>{title}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</div>; }

function Dashboard({ data }: { data: DataSet }) {
  const active = data.contracts.filter((c) => String(c.status).toUpperCase() === "ACTIVE").length;
  const paid = data.payments.filter((p) => String(p.status).toUpperCase() === "CONFIRMED").reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingPay = data.payments.filter((p) => !["CONFIRMED", "REJECTED"].includes(String(p.status).toUpperCase())).length;
  return <div className="live-stack"><section className="live-hero"><div><Chip type="good">Production mode</Chip><h2>ยินดีต้อนรับ, KOGA Store</h2><p>หน้านี้ใช้ข้อมูลจริงจาก API ไม่ใช่ mockup และทุกปุ่มสำคัญจะยิงเข้าระบบจริง</p><div className="live-actions"><Link className="live-btn primary" href="/contracts">จัดการสัญญา</Link><Link className="live-btn" href="/payments">ตรวจชำระ {pendingPay} รายการ</Link></div></div><div className="live-readiness"><span>System readiness</span><b>READY</b><small>API, Database, Billing และ Integration Hub พร้อมใช้งาน</small></div></section><section className="live-stats-grid"><Stat title="ลูกค้า" value={data.customers.length} note="โปรไฟล์ทั้งหมด"/><Stat title="เครื่อง" value={data.devices.length} note="อุปกรณ์ในระบบ"/><Stat title="สัญญา Active" value={active} note="กำลังผ่อน"/><Stat title="รายรับยืนยัน" value={baht(paid)} note="ยอดตรวจแล้ว" type="good"/></section><section className="live-grid-3"><Panel title="งานที่ควรจัดการก่อน"> <Task label="รายการชำระรอตรวจ" value={pendingPay}/><Task label="งานติดตามงวด" value={data.collectionTasks.filter((x) => x.status !== "DONE").length}/><Task label="เครื่องยังไม่ controlled" value={data.devices.filter((x) => tone(x.controlStatus) !== "good").length}/></Panel><Panel title="สัญญาที่ต้องจับตา">{data.contracts.filter((x) => tone(x.status) !== "good").slice(0, 4).map((c) => <MiniRow key={c.id} title={c.contractNo} sub={`${c.customer?.fullName || "-"} / ${label(c.status)}`} chip={<Chip type={tone(c.status)}>{label(c.status)}</Chip>}/>)}</Panel><Panel title="ชำระเงินล่าสุด">{data.payments.slice(0, 4).map((p) => <MiniRow key={p.id} title={`${baht(p.amount)} / ${p.method || "-"}`} sub={`${p.contract?.customer?.fullName || "-"} / ${d(p.createdAt)}`} chip={<Chip type={tone(p.status)}>{label(p.status)}</Chip>}/>)}</Panel></section></div>;
}
function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <section className="live-panel"><div className="live-panel-head"><h2>{title}</h2>{action}</div>{children}</section>; }
function Task({ label, value }: { label: string; value: ReactNode }) { return <div className="live-task"><span>{label}</span><b>{value}</b></div>; }
function MiniRow({ title, sub, chip }: { title: string; sub: string; chip?: ReactNode }) { return <div className="live-mini-row"><div><b>{title}</b><span>{sub}</span></div>{chip}</div>; }

function Customers({ data, mutate }: { data: DataSet; mutate: ReturnType<typeof useKogaData>["mutate"] }) {
  const [q, setQ] = useState("");
  const rows = data.customers.filter((c) => `${c.fullName} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  async function submit(form: FormData) { await mutate("/customers", "POST", { fullName: form.get("fullName"), phone: form.get("phone"), address: form.get("address"), riskScore: Number(form.get("riskScore") || 0) }); }
  return <div className="live-two-col"><Panel title="เพิ่มลูกค้า" action={<Chip type="info">POST /customers</Chip>}><form className="live-form" action={submit}><Field name="fullName" label="ชื่อ-นามสกุล" required/><Field name="phone" label="เบอร์โทร" required/><Field name="address" label="ที่อยู่"/><Field name="riskScore" label="Risk score" type="number" defaultValue={0}/><SubmitButton>บันทึกลูกค้า</SubmitButton></form></Panel><Panel title="รายชื่อลูกค้า" action={<input className="live-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาลูกค้า"/>}>{rows.length ? <table className="live-table"><thead><tr><th>ลูกค้า</th><th>เบอร์โทร</th><th>ความเสี่ยง</th><th>สัญญา</th><th>อัปเดต</th></tr></thead><tbody>{rows.map((c) => <tr key={c.id}><td><b>{c.fullName}</b><small>{c.address || "-"}</small></td><td>{c.phone}</td><td><Chip type={Number(c.riskScore || 0) > 70 ? "bad" : Number(c.riskScore || 0) > 40 ? "warn" : "good"}>{Number(c.riskScore || 0)} / 100</Chip></td><td>{c.contracts?.length || 0}</td><td>{d(c.updatedAt || c.createdAt)}</td></tr>)}</tbody></table> : <Empty title="ยังไม่มีลูกค้า" text="เพิ่มลูกค้าคนแรกจากฟอร์มด้านซ้าย"/>}</Panel></div>;
}

function Devices({ data, mutate }: { data: DataSet; mutate: ReturnType<typeof useKogaData>["mutate"] }) {
  async function submit(form: FormData) { await mutate("/devices", "POST", { brand: form.get("brand"), model: form.get("model"), imei: form.get("imei"), serialNumber: form.get("serialNumber"), storage: form.get("storage"), color: form.get("color"), platform: form.get("platform"), controlMode: form.get("controlMode") }); }
  return <div className="live-two-col"><Panel title="เพิ่มเครื่อง" action={<Chip type="info">POST /devices</Chip>}><form className="live-form" action={submit}><Field name="brand" label="แบรนด์" placeholder="Apple" required/><Field name="model" label="รุ่น" placeholder="iPhone 15 Pro" required/><Field name="imei" label="IMEI"/><Field name="serialNumber" label="Serial"/><Field name="storage" label="ความจุ"/><Field name="color" label="สี"/><SelectField name="platform" label="Platform" required><option value="IOS">iOS</option><option value="ANDROID">Android</option><option value="IPADOS">iPadOS</option><option value="MACOS">macOS</option></SelectField><SelectField name="controlMode" label="โหมดควบคุม"><option value="NONE">NONE</option><option value="ANDROID_ENTERPRISE">Android Enterprise</option><option value="APPLE_MDM_ADE">Apple MDM ADE</option><option value="ICLOUD_CUSTODY">iCloud Custody</option></SelectField><SubmitButton>บันทึกเครื่อง</SubmitButton></form></Panel><Panel title="คลังเครื่อง" action={<Chip>{data.devices.length} เครื่อง</Chip>}><table className="live-table"><thead><tr><th>เครื่อง</th><th>IMEI / Serial</th><th>ควบคุม</th><th>สถานะ</th><th>ลูกค้า</th></tr></thead><tbody>{data.devices.map((x) => <tr key={x.id}><td><b>{[x.brand, x.model].filter(Boolean).join(" ")}</b><small>{[x.storage, x.color].filter(Boolean).join(" / ")}</small></td><td>{x.imei || x.serialNumber || "-"}</td><td><Chip type={tone(x.controlStatus)}>{label(x.controlStatus)}</Chip></td><td><Chip type={tone(x.deviceStatus)}>{label(x.deviceStatus)}</Chip></td><td>{x.contract?.customer?.fullName || "-"}</td></tr>)}</tbody></table></Panel></div>;
}

function Contracts({ data, mutate }: { data: DataSet; mutate: ReturnType<typeof useKogaData>["mutate"] }) {
  const availableDevices = data.devices.filter((x) => String(x.deviceStatus || "IN_STOCK") === "IN_STOCK" || !x.contract);
  async function submit(form: FormData) { await mutate("/contracts", "POST", { customerId: form.get("customerId"), deviceId: form.get("deviceId"), salePrice: Number(form.get("salePrice")), downPayment: Number(form.get("downPayment") || 0), interestAmount: Number(form.get("interestAmount") || 0), installmentCount: Number(form.get("installmentCount") || 12), firstDueDate: form.get("firstDueDate"), agreementType: "LEASE_TO_OWN" }); }
  return <div className="live-two-col"><Panel title="สร้างสัญญา" action={<Chip type="info">POST /contracts</Chip>}><form className="live-form" action={submit}><SelectField name="customerId" label="ลูกค้า" required><option value="">เลือกลูกค้า</option>{data.customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</SelectField><SelectField name="deviceId" label="เครื่อง" required><option value="">เลือกเครื่องพร้อมปล่อย</option>{availableDevices.map((x) => <option key={x.id} value={x.id}>{x.brand} {x.model}</option>)}</SelectField><Field name="salePrice" label="ราคาเครื่อง" type="number" required/><Field name="downPayment" label="เงินดาวน์" type="number" defaultValue={0}/><Field name="interestAmount" label="ดอก/ค่าธรรมเนียม" type="number" defaultValue={0}/><Field name="installmentCount" label="จำนวนงวด" type="number" defaultValue={12}/><Field name="firstDueDate" label="วันครบกำหนดงวดแรก" type="date" required/><SubmitButton>สร้างสัญญา</SubmitButton></form></Panel><Panel title="สัญญาทั้งหมด"><table className="live-table"><thead><tr><th>เลขสัญญา</th><th>ลูกค้า</th><th>เครื่อง</th><th>งวด</th><th>ยอดรวม</th><th>สถานะ</th><th></th></tr></thead><tbody>{data.contracts.map((c) => { const total = c.installments?.length || c.installmentCount || 0; const paid = c.installments?.filter((i: Row) => String(i.status).toUpperCase() === "PAID").length || 0; return <tr key={c.id}><td><b>{c.contractNo}</b></td><td>{c.customer?.fullName || "-"}</td><td>{c.device?.model || "-"}</td><td>{paid}/{total}</td><td>{baht(c.totalAmount)}</td><td><Chip type={tone(c.status)}>{label(c.status)}</Chip></td><td>{String(c.status).toUpperCase() === "DRAFT" ? <button className="live-btn small" onClick={() => mutate(`/contracts/${c.id}/sign`)}>เซ็นสัญญา</button> : null}</td></tr>; })}</tbody></table></Panel></div>;
}

function Payments({ data, mutate }: { data: DataSet; mutate: ReturnType<typeof useKogaData>["mutate"] }) {
  const unpaidInstallments = data.contracts.flatMap((c) => (c.installments || []).filter((i: Row) => String(i.status).toUpperCase() !== "PAID").map((i: Row) => ({ ...i, contract: c })));
  async function submit(form: FormData) { await mutate("/payments", "POST", { contractId: form.get("contractId"), installmentId: form.get("installmentId") || undefined, amount: Number(form.get("amount")), method: form.get("method"), slipUrl: form.get("slipUrl"), note: form.get("note") }); }
  return <div className="live-stack"><div className="live-two-col"><Panel title="บันทึกรับชำระ" action={<Chip type="info">POST /payments</Chip>}><form className="live-form" action={submit}><SelectField name="contractId" label="สัญญา" required><option value="">เลือกสัญญา</option>{data.contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNo} / {c.customer?.fullName}</option>)}</SelectField><SelectField name="installmentId" label="งวด"><option value="">ไม่ระบุงวด</option>{unpaidInstallments.map((i) => <option key={i.id} value={i.id}>{i.contract.contractNo} / งวด {i.installmentNo} / {baht(i.amount)}</option>)}</SelectField><Field name="amount" label="ยอดเงิน" type="number" required/><SelectField name="method" label="วิธีชำระ"><option value="BANK_TRANSFER">Bank Transfer</option><option value="PROMPTPAY">PromptPay</option><option value="CASH">Cash</option></SelectField><Field name="slipUrl" label="Slip URL"/><Field name="note" label="หมายเหตุ"/><SubmitButton>บันทึกชำระเงิน</SubmitButton></form></Panel><Panel title="สร้าง QR/ลิงก์ชำระเงิน" action={<Chip type="info">POST /installments/:id/payment-request</Chip>}>{unpaidInstallments.length ? unpaidInstallments.slice(0, 8).map((i) => <MiniRow key={i.id} title={`${i.contract.contractNo} / งวด ${i.installmentNo}`} sub={`${i.contract.customer?.fullName || "-"} / ${baht(Number(i.amount || 0) - Number(i.paidAmount || 0))}`} chip={<button className="live-btn small" onClick={() => mutate(`/installments/${i.id}/payment-request`, "POST", { amount: Number(i.amount || 0) - Number(i.paidAmount || 0), expiresInDays: 7 })}>สร้าง QR</button>}/>) : <Empty title="ไม่มีงวดค้าง" text="เมื่อลูกค้ามีงวดรอชำระ จะสร้าง QR ได้จากตรงนี้"/>}</Panel></div><Panel title="รายการชำระเงิน"><table className="live-table"><thead><tr><th>สัญญา</th><th>ลูกค้า</th><th>ยอด</th><th>วิธี</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{data.payments.map((p) => <tr key={p.id}><td>{p.contract?.contractNo || "-"}</td><td>{p.contract?.customer?.fullName || "-"}</td><td>{baht(p.amount)}</td><td>{p.method}</td><td><Chip type={tone(p.status)}>{label(p.status)}</Chip></td><td><div className="live-row-actions">{String(p.status).toUpperCase() !== "CONFIRMED" ? <button className="live-btn small primary" onClick={() => mutate(`/payments/${p.id}/confirm`)}>ยืนยัน</button> : null}{!["CONFIRMED", "REJECTED"].includes(String(p.status).toUpperCase()) ? <button className="live-btn small danger" onClick={() => mutate(`/payments/${p.id}/reject`)}>ปฏิเสธ</button> : null}</div></td></tr>)}</tbody></table></Panel><Panel title="คำขอชำระเงิน / QR"><table className="live-table"><thead><tr><th>สัญญา</th><th>ลูกค้า</th><th>ยอด</th><th>สถานะ</th><th>ลิงก์</th><th>จัดการ</th></tr></thead><tbody>{data.paymentRequests.map((r) => <tr key={r.id}><td>{r.contract?.contractNo || "-"}</td><td>{r.customer?.fullName || "-"}</td><td>{baht(r.amount)}</td><td><Chip type={tone(r.status)}>{label(r.status)}</Chip></td><td>{r.paymentUrl ? <a href={r.paymentUrl} target="_blank">เปิด</a> : "-"}</td><td><div className="live-row-actions">{!["CONFIRMED", "REJECTED", "CANCELLED"].includes(String(r.status).toUpperCase()) ? <><button className="live-btn small primary" onClick={() => mutate(`/payment-requests/${r.id}/confirm`)}>ยืนยัน</button><button className="live-btn small danger" onClick={() => mutate(`/payment-requests/${r.id}/reject`)}>ปฏิเสธ</button></> : null}</div></td></tr>)}</tbody></table></Panel></div>;
}

function Collection({ data, mutate }: { data: DataSet; mutate: ReturnType<typeof useKogaData>["mutate"] }) {
  return <div className="live-stack"><section className="live-stats-grid"><Stat title="งานทั้งหมด" value={data.collectionTasks.length}/><Stat title="เปิดอยู่" value={data.collectionTasks.filter((x) => x.status !== "DONE").length} type="warn"/><Stat title="เร่งด่วน" value={data.collectionTasks.filter((x) => x.priority === "HIGH").length} type="bad"/><Stat title="เสร็จแล้ว" value={data.collectionTasks.filter((x) => x.status === "DONE").length} type="good"/></section><Panel title="งานติดตามงวด" action={<button className="live-btn primary" onClick={() => mutate("/collection/tasks/generate-overdue")}>สร้างงานจากงวดค้าง</button>}><table className="live-table"><thead><tr><th>สัญญา / ลูกค้า</th><th>งาน</th><th>Priority</th><th>กำหนด</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{data.collectionTasks.map((r) => <tr key={r.id}><td><b>{r.contract?.contractNo || "-"}</b><small>{r.customer?.fullName || "-"}</small></td><td>{r.title}<small>{r.note || "-"}</small></td><td><Chip type={r.priority === "HIGH" ? "bad" : "warn"}>{r.priority || "NORMAL"}</Chip></td><td>{d(r.dueAt)}</td><td><Chip type={tone(r.status)}>{label(r.status)}</Chip></td><td>{r.status !== "DONE" ? <button className="live-btn small" onClick={() => mutate(`/collection/tasks/${r.id}`, "PATCH", { status: "DONE" })}>ปิดงาน</button> : null}</td></tr>)}</tbody></table></Panel></div>;
}

function Content({ page, data, mutate }: { page: PageKey; data: DataSet; mutate: ReturnType<typeof useKogaData>["mutate"] }) {
  if (page === "customers") return <Customers data={data} mutate={mutate}/>;
  if (page === "devices") return <Devices data={data} mutate={mutate}/>;
  if (page === "contracts") return <Contracts data={data} mutate={mutate}/>;
  if (page === "payments") return <Payments data={data} mutate={mutate}/>;
  if (page === "collection") return <Collection data={data} mutate={mutate}/>;
  return <Dashboard data={data}/>;
}

export function LiveKogaApp({ page = "dashboard" }: { page?: PageKey }) {
  const state = useKogaData();
  return <Shell page={page} loading={state.loading} error={state.error} refresh={state.refresh}><Content page={page} data={state.data} mutate={state.mutate}/></Shell>;
}

export function LiveMobileStoreApp() {
  const state = useKogaData();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const current = nav.find((n) => n.key === page)!;
  const go = (key: PageKey) => { setPage(key); setMenuOpen(false); };
  return <main className={`live-mobile ${menuOpen ? "menu-open" : ""}`}><header className="live-mobile-head"><div className="live-mobile-brand"><button aria-label="เปิดเมนู" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>☰</button><b><span>KOGA</span> Lease MDM</b></div><button aria-label="รีเฟรชข้อมูล" onClick={state.refresh}>รีเฟรช</button></header>{menuOpen ? <button className="live-mobile-backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} /> : null}<aside className={`live-mobile-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}><div className="live-mobile-drawer-head"><div className="live-logo">K</div><div><b>KOGA Lease MDM</b><span>Store console</span></div><button aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)}>×</button></div><nav>{nav.map((n) => <button key={n.key} className={n.key === page ? "active" : ""} onClick={() => go(n.key)}><i>{n.icon}</i><span>{n.label}</span></button>)}</nav><div className="live-mobile-drawer-actions"><Chip type={state.error ? "bad" : "good"}>{state.error ? "API error" : "API live"}</Chip><button className="live-btn danger" onClick={logout}>ออกจากระบบ</button></div></aside><section className="live-mobile-title"><p>Mobile store console</p><h1>{current.label}</h1>{state.error ? <div className="live-alert bad"><b>API error</b><span>{state.error.includes("Missing bearer") ? "ต้องเข้าสู่ระบบก่อน หรือ token ไม่อยู่ใน localStorage" : state.error}</span></div> : null}</section><section className="live-mobile-content"><Content page={page} data={state.data} mutate={state.mutate}/></section></main>;
}
