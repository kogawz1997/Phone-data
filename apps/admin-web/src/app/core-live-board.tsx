"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type AnyRow = Record<string, any>;
type CoreData = {
  customers: AnyRow[];
  devices: AnyRow[];
  contracts: AnyRow[];
  payments: AnyRow[];
  paymentRequests: AnyRow[];
  collectionTasks: AnyRow[];
};

const emptyData: CoreData = { customers: [], devices: [], contracts: [], payments: [], paymentRequests: [], collectionTasks: [] };
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

function localToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("koga_token") || localStorage.getItem("token") || localStorage.getItem("adminToken") || "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || `API ${path} failed`);
  return (json?.data ?? json) as T;
}

function money(value: unknown) {
  const n = Number(value || 0);
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function dateTH(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function statusTone(status: unknown) {
  const s = String(status || "").toUpperCase();
  if (["ACTIVE", "PAID", "CONFIRMED", "ONLINE", "ENROLLED", "LEASE_ACTIVE", "OPEN"].some((x) => s.includes(x))) return "green";
  if (["PENDING", "VERIFYING", "WATCH", "REVIEW", "DRAFT", "NOT_ENROLLED", "ENROLL_PENDING"].some((x) => s.includes(x))) return "orange";
  if (["OVERDUE", "FAILED", "REJECTED", "BLOCKED", "RESTRICTED", "RECOVERY", "OFFLINE"].some((x) => s.includes(x))) return "red";
  return "blue";
}

function thaiStatus(status: unknown) {
  const s = String(status || "-").toUpperCase();
  const map: Record<string, string> = {
    ACTIVE: "Active",
    PAID: "ชำระแล้ว",
    CONFIRMED: "ชำระแล้ว",
    PENDING: "รอดำเนินการ",
    VERIFYING: "รอตรวจสอบ",
    OVERDUE: "ค้างชำระ",
    REJECTED: "ถูกปฏิเสธ",
    DRAFT: "Draft",
    ENROLLED: "ออนไลน์",
    NOT_ENROLLED: "Not Controlled",
    ENROLL_PENDING: "รอดำเนินการ",
    IN_STOCK: "พร้อมปล่อย",
    LEASE_ACTIVE: "ผ่อนอยู่",
  };
  return map[s] || String(status || "-");
}

function useCoreData() {
  const [data, setData] = useState<CoreData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.allSettled([
      apiFetch<AnyRow[]>("/customers"),
      apiFetch<AnyRow[]>("/devices"),
      apiFetch<AnyRow[]>("/contracts"),
      apiFetch<AnyRow[]>("/payments"),
      apiFetch<AnyRow[]>("/payment-requests"),
      apiFetch<AnyRow[]>("/collection/tasks"),
    ]).then((results) => {
      if (!alive) return;
      const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      setData({
        customers: results[0].status === "fulfilled" ? results[0].value : [],
        devices: results[1].status === "fulfilled" ? results[1].value : [],
        contracts: results[2].status === "fulfilled" ? results[2].value : [],
        payments: results[3].status === "fulfilled" ? results[3].value : [],
        paymentRequests: results[4].status === "fulfilled" ? results[4].value : [],
        collectionTasks: results[5].status === "fulfilled" ? results[5].value : [],
      });
      if (failed) setError(failed.reason?.message || "เชื่อมต่อ API ไม่สำเร็จ");
      setLoading(false);
    });
    return () => { alive = false; };
  }, [refreshKey]);

  async function post(path: string, body?: unknown) {
    await apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
    refresh();
  }
  async function patch(path: string, body?: unknown) {
    await apiFetch(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
    refresh();
  }

  return { data, loading, error, refresh, post, patch };
}

function Status({ label, tone = "green" }: { label: string; tone?: string }) { return <span className={`status ${tone}`}>{label}</span>; }
function MStatus({ label, tone = "green" }: { label: string; tone?: string }) { return <span className={`mobile-status ${tone}`}>{label}</span>; }

const navItems = [["⌂", "หน้าหลัก"], ["◌", "ลูกค้า"], ["▣", "คลังเครื่อง"], ["▤", "สัญญา"], ["฿", "ชำระเงิน"], ["◎", "ติดตามงวด"], ["◇", "MDM"], ["▥", "รายงาน"], ["⚙", "ตั้งค่า"]];
function Sidebar({ active }: { active: string }) { return <aside className="sidebar"><div className="app-logo-row"><div className="logo-k">K</div><div className="app-logo-text"><strong>KOGA Lease MDM</strong><small>API live console</small></div></div>{navItems.map(([icon, label]) => <div className={`side-link ${label === active ? "active" : ""}`} key={label}><span className="icon">{icon}</span><span>{label}</span></div>)}<div className="sidebar-spacer"/><div className="store-chip">API connected<small>credentials include</small></div></aside>; }
function BrowserWindow({ title, active, children }: { title: string; active: string; children: ReactNode }) { return <section><h2 className="board-shot-title">{title}</h2><div className="browser-window"><div className="browser-bar"><div className="window-dots"><span/><span/><span/></div><div className="window-brand">KOGA Lease MDM</div><div className="window-tools">API</div></div><div className="app-screen"><Sidebar active={active}/><div className="screen-content">{children}</div></div></div></section>; }
function ScreenHeader({ crumb, title, subtitle, actions }: { crumb: string; title: string; subtitle: string; actions?: ReactNode }) { return <div className="screen-top"><div><div className="crumb">{crumb}</div><h3 className="screen-title">{title}</h3><p className="screen-subtitle">{subtitle}</p></div>{actions ? <div className="action-row">{actions}</div> : null}</div>; }
function Empty({ label }: { label: string }) { return <div className="panel"><div className="panel-title">{label}</div><small>ยังไม่มีข้อมูลจาก API ในร้านนี้ ลอง seed sample data หรือเพิ่มข้อมูลจริง</small></div>; }

function CoreNotice({ loading, error, refresh }: { loading: boolean; error: string; refresh: () => void }) { return <div style={{maxWidth:1860,margin:"0 auto 16px",display:"flex",gap:10,alignItems:"center",justifyContent:"center",flexWrap:"wrap"}}>{loading ? <Status label="กำลังโหลด API" tone="orange"/> : <Status label="API live"/>}{error ? <Status label={error.includes("Missing bearer") ? "ต้องเข้าสู่ระบบก่อน" : error} tone="red"/> : null}<button className="btn-ui ghost" onClick={refresh}>Refresh API</button></div>; }

function DesktopDashboard({ data }: { data: CoreData }) {
  const activeContracts = data.contracts.filter((c) => String(c.status).toUpperCase().includes("ACTIVE"));
  const overdueContracts = data.contracts.filter((c) => ["OVERDUE", "REVIEW_REQUIRED", "RECOVERY", "RESTRICTED", "GRACE_PERIOD"].includes(String(c.status).toUpperCase()));
  const paid = data.payments.filter((p) => String(p.status).toUpperCase() === "CONFIRMED").reduce((s, p) => s + Number(p.amount || 0), 0);
  return <><ScreenHeader crumb="หน้าหลัก / Command Center" title="Store Command Center Dashboard" subtitle="ภาพรวมการดำเนินงานของร้านค้าในหน้าเดียว" actions={<><Status label="API ready"/><Status label="Tenant isolated" tone="purple"/></>}/><div className="dashboard-grid"><div className="panel hero-card"><div><div className="kicker">Priority cockpit</div><h3>ยินดีต้อนรับ, KOGA Store</h3><p>จัดการลูกค้า เครื่อง สัญญา งวด และ MDM ได้จากข้อมูล API จริงของร้านนี้</p></div><div className="hero-actions"><button className="btn-ui primary">จัดการสัญญา</button><button className="btn-ui ghost">ตรวจชำระ {data.payments.filter((p)=>String(p.status).toUpperCase()==="VERIFYING").length} รายการ</button></div></div><div className="panel ready-card"><div className="panel-title">System readiness</div><strong>READY</strong><small>API, Database, Billing และ Integration Hub พร้อมใช้งาน</small><div className="health-line">● Live health check: Normal</div></div></div><div className="metric-row"><div className="metric-mini"><span>ลูกค้า</span><strong>{data.customers.length}</strong><small>โปรไฟล์ทั้งหมด</small></div><div className="metric-mini"><span>เครื่อง</span><strong>{data.devices.length}</strong><small>{data.devices.filter((d)=>String(d.deviceStatus).toUpperCase()==="IN_STOCK").length} เครื่องพร้อมปล่อย</small></div><div className="metric-mini"><span>สัญญา active</span><strong>{activeContracts.length}</strong><small>{overdueContracts.length} ค้าง/ต้องตาม</small></div><div className="metric-mini"><span>รายรับยืนยัน</span><strong>{money(paid)}</strong><small>ยอดที่ตรวจแล้ว</small></div></div><div className="bottom-panels"><div className="panel"><div className="panel-title">งานที่ควรจัดการก่อน</div><div className="task-list"><div className="task-item"><span>รายการชำระรอตรวจ</span><b>{data.payments.filter((p)=>String(p.status).toUpperCase()==="VERIFYING").length}</b></div><div className="task-item"><span>สัญญาค้าง / review</span><b>{overdueContracts.length}</b></div><div className="task-item"><span>MDM action รออนุมัติ</span><b>{data.devices.filter((d)=>String(d.controlStatus).includes("PENDING")).length}</b></div></div></div><div className="panel"><div className="panel-title">สัญญาที่ต้องจับตา</div>{overdueContracts.slice(0,3).map((c)=> <div className="risk-item" key={c.id}><b>{c.contractNo}</b><small>{c.customer?.fullName || "-"} / {c.device?.model || "-"} / {thaiStatus(c.status)}</small></div>)}{!overdueContracts.length ? <small>ไม่มีสัญญาค้างในตอนนี้</small> : null}</div><div className="panel"><div className="panel-title">ชำระเงินล่าสุด</div>{data.payments.slice(0,3).map((p)=> <div className="payment-item" key={p.id}><b>{money(p.amount)} / {p.method || "Payment"}</b><small>{thaiStatus(p.status)} / {dateTH(p.createdAt)}</small></div>)}{!data.payments.length ? <small>ยังไม่มีรายการชำระเงิน</small> : null}</div></div></>;
}

function CustomersDesktop({ rows }: { rows: AnyRow[] }) { return <><ScreenHeader crumb="ลูกค้า / รายชื่อลูกค้า" title="รายชื่อลูกค้า" subtitle="จัดการข้อมูลลูกค้าและตรวจสอบสถานะทั้งหมด" actions={<button className="btn-ui primary">+ เพิ่มลูกค้า</button>}/><input className="input-ui" style={{width:"100%",marginBottom:10}} placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตร หรืออีเมล"/><div className="table-and-side"><div className="table-shell"><table className="data-table"><thead><tr><th>ลูกค้า</th><th>เบอร์โทร</th><th>สถานะ</th><th>เครดิต / ความเสี่ยง</th><th>สัญญา</th><th>อัปเดตล่าสุด</th></tr></thead><tbody>{rows.slice(0,6).map((c)=> <tr key={c.id}><td><span className="name-main">{c.fullName}</span><span className="name-sub">Customer profile</span></td><td>{c.phone || "-"}</td><td><Status label="Active"/></td><td><Status label={(Number(c.riskScore || 0) > 70 ? "High risk" : Number(c.riskScore || 0) > 40 ? "Medium risk" : "Low risk")} tone={Number(c.riskScore || 0) > 70 ? "red" : Number(c.riskScore || 0) > 40 ? "orange" : "green"}/></td><td>{c.contracts?.length || 0}</td><td>{dateTH(c.updatedAt || c.createdAt)}</td></tr>)}</tbody></table></div><div className="summary-card"><div className="panel-title">ภาพรวมลูกค้า</div><div className="summary-list"><div className="summary-line"><span>ลูกค้าทั้งหมด</span><b>{rows.length}</b></div><div className="summary-line"><span>Active</span><b>{rows.length}</b></div><div className="summary-line"><span>High risk</span><b>{rows.filter((c)=>Number(c.riskScore||0)>70).length}</b></div></div><div className="donut"/></div></div>{!rows.length ? <Empty label="ยังไม่มีลูกค้า"/> : null}</>; }

function DevicesDesktop({ rows }: { rows: AnyRow[] }) { return <><ScreenHeader crumb="เครื่อง / คลังเครื่อง" title="คลังเครื่อง" subtitle="ตรวจสอบสต็อกและสถานะการควบคุมเครื่อง" actions={<button className="btn-ui primary">+ เพิ่มเครื่อง</button>}/><div className="metric-row"><div className="metric-mini"><span>ทั้งหมด</span><strong>{rows.length}</strong><small>เครื่อง</small></div><div className="metric-mini"><span>พร้อมปล่อย</span><strong>{rows.filter((d)=>d.deviceStatus==="IN_STOCK").length}</strong><small>เครื่อง</small></div><div className="metric-mini"><span>ติดตั้งแล้ว</span><strong>{rows.filter((d)=>String(d.controlStatus).includes("ENROLLED")).length}</strong><small>เครื่อง</small></div><div className="metric-mini"><span>รอซ่อม / อื่นๆ</span><strong>{rows.filter((d)=>!["IN_STOCK","LEASE_ACTIVE"].includes(String(d.deviceStatus))).length}</strong><small>เครื่อง</small></div></div><div className="table-shell"><table className="data-table"><thead><tr><th>เครื่อง</th><th>IMEI / Serial</th><th>สถานะควบคุม</th><th>สถานะเครื่อง</th><th>ลูกค้า</th></tr></thead><tbody>{rows.slice(0,6).map((d)=> <tr key={d.id}><td><div className="device-name"><span className="device-thumb"/><span><span className="name-main">{[d.brand,d.model].filter(Boolean).join(" ") || d.model || "Device"}</span><span className="name-sub">{d.storage || d.color || "-"}</span></span></div></td><td>{d.imei || d.serialNo || "-"}</td><td><Status label={thaiStatus(d.controlStatus)} tone={statusTone(d.controlStatus)}/></td><td><Status label={thaiStatus(d.deviceStatus)} tone={statusTone(d.deviceStatus)}/></td><td>{d.contract?.customer?.fullName || "-"}</td></tr>)}</tbody></table></div>{!rows.length ? <Empty label="ยังไม่มีเครื่อง"/> : null}</>; }

function ContractsDesktop({ rows }: { rows: AnyRow[] }) { const selected = rows[0]; return <><ScreenHeader crumb="สัญญา / รายการสัญญา" title="สัญญาทั้งหมด" subtitle="ติดตามสัญญาและความคืบหน้าการผ่อนชำระ" actions={<button className="btn-ui primary">+ สร้างสัญญา</button>}/><div className="table-and-side"><div className="table-shell"><table className="data-table"><thead><tr><th>เลขสัญญา</th><th>ลูกค้า</th><th>เครื่อง</th><th>ความคืบหน้า</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>{rows.slice(0,6).map((c)=> { const total = c.installments?.length || c.installmentCount || 0; const paid = c.installments?.filter((i:any)=>String(i.status).toUpperCase()==="PAID").length || 0; return <tr key={c.id}><td><span className="name-main">{c.contractNo}</span></td><td>{c.customer?.fullName || "-"}</td><td>{c.device?.model || "-"}</td><td>{paid}/{total}<div className="progress-mini"><span style={{width:`${total?Math.round(paid/total*100):0}%`}}/></div></td><td>{money(c.totalAmount)}</td><td><Status label={thaiStatus(c.status)} tone={statusTone(c.status)}/></td></tr>})}</tbody></table></div><div className="summary-card"><div className="panel-title">รายละเอียดสัญญา</div>{selected ? <div className="detail-grid"><div><span>Contract</span><b>{selected.contractNo}</b></div><div><span>สถานะ</span><b>{thaiStatus(selected.status)}</b></div><div><span>ลูกค้า</span><b>{selected.customer?.fullName || "-"}</b></div><div><span>เครื่อง</span><b>{selected.device?.model || "-"}</b></div><div><span>จำนวนงวด</span><b>{selected.installmentCount || selected.installments?.length || 0}</b></div><div><span>ยอดรวม</span><b>{money(selected.totalAmount)}</b></div></div> : <small>ยังไม่มีสัญญา</small>}</div></div>{!rows.length ? <Empty label="ยังไม่มีสัญญา"/> : null}</>; }

function PaymentsDesktop({ data, post }: { data: CoreData; post: (p:string,b?:unknown)=>Promise<void> }) { const req = data.paymentRequests[0]; return <><ScreenHeader crumb="ชำระเงิน / Payment Desk" title="ศูนย์รับชำระเงิน" subtitle="จัดการคำขอชำระเงิน ตรวจสอบสลิป และยืนยันการรับชำระ"/><div className="payment-layout"><div className="panel"><div className="panel-title">คำขอชำระเงิน</div>{data.paymentRequests.slice(0,4).map((r)=> <div className="payment-card" key={r.id}><strong>{r.contract?.contractNo || "Payment Request"}</strong><small>{r.customer?.fullName || "-"}</small><b>{money(r.amount)}</b><small>{thaiStatus(r.status)} / {dateTH(r.expiresAt)}</small></div>)}{!data.paymentRequests.length ? <small>ยังไม่มีคำขอชำระเงิน</small> : null}</div><div className="qr-card"><div className="panel-title">QR สำหรับชำระเงิน</div><small>{req?.contract?.contractNo || "ยังไม่มีรายการ"}</small><h3 style={{margin:"6px 0",color:"white"}}>{money(req?.amount)}</h3>{req?.qrImageDataUrl ? <img alt="QR" src={req.qrImageDataUrl} style={{width:112,height:112,borderRadius:8}}/> : <div className="qr-box"/>}<button className="btn-ui primary" style={{width:"100%",marginTop:8}}>ดาวน์โหลด QR</button></div><div className="panel"><div className="panel-title">ชำระเงินล่าสุด</div>{data.payments.slice(0,4).map((p)=> <div className="recent-item" key={p.id}><b>{money(p.amount)} / {p.contract?.contractNo || "-"}</b><small>{thaiStatus(p.status)} / {dateTH(p.createdAt)}</small><div style={{display:"flex",gap:6}}>{String(p.status).toUpperCase()!=="CONFIRMED" ? <button className="btn-ui primary" onClick={()=>post(`/payments/${p.id}/confirm`)}>ยืนยัน</button> : null}{!["CONFIRMED","REJECTED"].includes(String(p.status).toUpperCase()) ? <button className="btn-ui ghost" onClick={()=>post(`/payments/${p.id}/reject`)}>ปฏิเสธ</button> : null}</div></div>)}</div></div></>; }

function CollectionDesktop({ rows, post, patch }: { rows: AnyRow[]; post: (p:string,b?:unknown)=>Promise<void>; patch: (p:string,b?:unknown)=>Promise<void> }) { const selected = rows[0]; return <><ScreenHeader crumb="ติดตามงวด / Collection" title="ติดตามทวงถาม" subtitle="จัดการงวดค้างชำระ ติดตาม และเร่งรัดการชำระเงิน" actions={<button className="btn-ui primary" onClick={()=>post("/collection/tasks/generate-overdue")}>สร้างงานค้างงวด</button>}/><div className="collection-summary"><div className="metric-mini"><span>งานทั้งหมด</span><strong>{rows.length}</strong><small>tasks</small></div><div className="metric-mini"><span>เปิดอยู่</span><strong>{rows.filter((r)=>String(r.status)!=="DONE").length}</strong><small>ต้องตาม</small></div><div className="metric-mini"><span>High</span><strong>{rows.filter((r)=>String(r.priority)==="HIGH").length}</strong><small>เร่งด่วน</small></div><div className="metric-mini"><span>เสร็จแล้ว</span><strong>{rows.filter((r)=>String(r.status)==="DONE").length}</strong><small>ปิดงาน</small></div></div><div className="table-and-side"><div className="table-shell"><table className="data-table"><thead><tr><th>สัญญา / ลูกค้า</th><th>งาน</th><th>กำหนด</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{rows.slice(0,6).map((r)=> <tr key={r.id}><td><span className="name-main">{r.contract?.contractNo || "-"}</span><span className="name-sub">{r.customer?.fullName || "-"}</span></td><td>{r.title}</td><td>{dateTH(r.dueAt)}</td><td><Status label={thaiStatus(r.status)} tone={statusTone(r.status)}/></td><td><button className="btn-ui ghost" onClick={()=>patch(`/collection/tasks/${r.id}`,{status:"DONE"})}>ปิดงาน</button></td></tr>)}</tbody></table></div><div className="summary-card"><div className="panel-title">รายละเอียดการติดตาม</div>{selected ? <><div className="detail-grid"><div><span>สัญญา</span><b>{selected.contract?.contractNo || "-"}</b></div><div><span>ลูกค้า</span><b>{selected.customer?.fullName || "-"}</b></div><div><span>ขั้นตอน</span><b>{selected.title}</b></div><div><span>สถานะ</span><b>{thaiStatus(selected.status)}</b></div></div><p className="screen-subtitle" style={{margin:"10px 0"}}>{selected.note || "ยังไม่มีบันทึก"}</p></> : <small>ยังไม่มีงานติดตาม</small>}</div></div></>; }

export function DesktopCoreLiveBoard() { const api = useCoreData(); const d = api.data; return <main className="koga-board"><h1 className="board-title"><span>KOGA</span> Lease MDM SaaS — Desktop Core Pages</h1><CoreNotice loading={api.loading} error={api.error} refresh={api.refresh}/><div className="board-grid"><BrowserWindow title="1. Store Command Center Dashboard" active="หน้าหลัก"><DesktopDashboard data={d}/></BrowserWindow><BrowserWindow title="2. Customers" active="ลูกค้า"><CustomersDesktop rows={d.customers}/></BrowserWindow><BrowserWindow title="3. Device Inventory" active="คลังเครื่อง"><DevicesDesktop rows={d.devices}/></BrowserWindow><BrowserWindow title="4. Contracts" active="สัญญา"><ContractsDesktop rows={d.contracts}/></BrowserWindow><BrowserWindow title="5. Payments" active="ชำระเงิน"><PaymentsDesktop data={d} post={api.post}/></BrowserWindow><BrowserWindow title="6. Collection" active="ติดตามงวด"><CollectionDesktop rows={d.collectionTasks} post={api.post} patch={api.patch}/></BrowserWindow></div></main>; }

function Phone({ title, number, children }: { title: string; number: string; children: ReactNode }) { return <section><h2 className="mobile-shot-title"><span className="num">{number}</span>{title}</h2><div className="phone-frame"><div className="phone-screen"><div className="phone-status"><span>9:41</span><span className="right">▴ Wi‑Fi ▰</span></div>{children}</div></div></section>; }
function AppHeader({ pageTitle, filter = false }: { pageTitle?: string; filter?: boolean }) { return <><div className="mobile-app-header"><button className="mobile-menu">☰</button><div className="mobile-brand"><span className="mobile-koga">KOGA<small>Lease MDM</small></span></div>{filter ? <button className="mobile-filter">▽ ตัวกรอง</button> : <button className="mobile-bell">♧</button>}</div>{pageTitle ? <div className="mobile-page-title"><h2>{pageTitle}</h2></div> : null}</>; }
function BottomNav({ active }: { active: string }) { return <nav className="bottom-nav">{[["⌂","หน้าหลัก"],["◌","ลูกค้า"],["▤","สัญญา"],["฿","การเงิน"],["☷","เมนู"]].map(([icon,label])=><span className={label===active?"active":""} key={label}><b>{icon}</b>{label}</span>)}</nav>; }
function StoreMobile({ data }: { data: CoreData }) { return <><AppHeader/><div className="mobile-scroll"><div className="greeting"><div className="avatar"/><div><h2>สวัสดีครับ, KOGA Store</h2><p>ข้อมูลสดจาก API ของร้าน</p></div></div><div className="mobile-card"><div className="mobile-section-title">สิ่งที่ต้องดำเนินการต่อไป <span className="mobile-link">ดูทั้งหมด</span></div><div className="action-list"><div className="action-item"><span>สัญญาใกล้ครบกำหนดชำระ</span><span className="badge-count">{data.contracts.length}</span></div><div className="action-item"><span>ชำระเงินวันนี้</span><span className="badge-count">{data.payments.filter((p)=>String(p.status).toUpperCase()!=="CONFIRMED").length}</span></div><div className="action-item"><span>อุปกรณ์ต้องตรวจสอบ</span><span className="badge-count">{data.devices.filter((d)=>statusTone(d.controlStatus)!=="green").length}</span></div></div></div><div className="mobile-card"><div className="mobile-section-title">ภาพรวมร้านค้า</div><div className="summary-grid"><div className="summary-tile"><span>ลูกค้า</span><strong>{data.customers.length}</strong><small>โปรไฟล์</small></div><div className="summary-tile"><span>อุปกรณ์</span><strong>{data.devices.length}</strong><small>เครื่อง</small></div><div className="summary-tile"><span>สัญญาที่ใช้งาน</span><strong>{data.contracts.filter((c)=>String(c.status).toUpperCase()==="ACTIVE").length}</strong><small>สัญญา</small></div><div className="summary-tile"><span>รายได้ที่ยืนยันแล้ว</span><strong>{money(data.payments.filter((p)=>String(p.status).toUpperCase()==="CONFIRMED").reduce((s,p)=>s+Number(p.amount||0),0))}</strong><small>จาก API</small></div></div></div></div><BottomNav active="หน้าหลัก"/></>; }
function CustomersMobileLive({ rows }: { rows: AnyRow[] }) { return <><AppHeader pageTitle="ลูกค้า" filter/><div className="mobile-scroll"><input className="search-mobile" placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, เลขบัตร"/><div className="list-stack">{rows.slice(0,5).map((c)=><div className="person-card" key={c.id}><div className="person-top"><div className="person-main"><div className="person-avatar"/><div><span className="card-name">{c.fullName}</span><span className="card-sub">{c.phone||"-"}</span></div></div><MStatus label="ปกติ"/></div><div className="card-detail">สัญญา {c.contracts?.length||0} สัญญา | ยอดค้างชำระ 0 บาท</div><MStatus label={Number(c.riskScore||0)>70?"ความเสี่ยงสูง":Number(c.riskScore||0)>40?"ความเสี่ยงปานกลาง":"ความเสี่ยงต่ำ"} tone={Number(c.riskScore||0)>70?"red":Number(c.riskScore||0)>40?"orange":"green"}/></div>)}</div></div><BottomNav active="ลูกค้า"/></>; }
function DevicesMobileLive({ rows }: { rows: AnyRow[] }) { return <><AppHeader pageTitle="คลังอุปกรณ์" filter/><div className="mobile-scroll"><input className="search-mobile" placeholder="ค้นหาอุปกรณ์, IMEI, รุ่น"/><div className="list-stack">{rows.slice(0,5).map((d)=><div className="device-card" key={d.id}><div className="device-top"><div className="device-main"><div className="device-img"/><div><span className="card-name">{[d.brand,d.model].filter(Boolean).join(" ")||"Device"}</span><span className="card-sub">IMEI: {d.imei||d.serialNo||"-"}</span><span className="card-sub">สถานที่: {d.location||d.contract?.customer?.fullName||"-"}</span></div></div><div style={{display:"grid",gap:6,justifyItems:"end"}}><MStatus label={thaiStatus(d.controlStatus)} tone={statusTone(d.controlStatus)}/><MStatus label={thaiStatus(d.deviceStatus)} tone={statusTone(d.deviceStatus)}/></div></div></div>)}</div></div><BottomNav active="เมนู"/></>; }
function ContractsMobileLive({ rows }: { rows: AnyRow[] }) { return <><AppHeader pageTitle="สัญญา" filter/><div className="mobile-scroll"><div className="mobile-tabs"><span className="mobile-tab active">ทั้งหมด</span><span className="mobile-tab">ใช้งานอยู่</span><span className="mobile-tab">ปิดแล้ว</span></div><div className="list-stack">{rows.slice(0,3).map((c)=>{const total=c.installments?.length||c.installmentCount||0;const paid=c.installments?.filter((i:any)=>String(i.status)==="PAID").length||0;return <div className="contract-card" key={c.id}><div className="contract-top"><span className="card-name">{c.contractNo}</span><MStatus label={thaiStatus(c.status)} tone={statusTone(c.status)}/></div><div className="contract-meta"><span><em>ลูกค้า</em><b>{c.customer?.fullName||"-"}</b></span><span><em>อุปกรณ์</em><b>{c.device?.model||"-"}</b></span><span><em>งวด</em><b>{paid} / {total}</b></span><span><em>ยอดรวม</em><b>{money(c.totalAmount)}</b></span></div><div><span className="card-sub">ชำระแล้ว {total?Math.round(paid/total*100):0}%</span><div className="progress-bar"><span style={{width:`${total?Math.round(paid/total*100):0}%`}}/></div></div></div>})}</div></div><BottomNav active="สัญญา"/></>; }
function PaymentsMobileLive({ data, post }: { data: CoreData; post: (p:string,b?:unknown)=>Promise<void> }) { const req=data.paymentRequests[0]; return <><AppHeader pageTitle="ศูนย์ชำระเงิน" filter/><div className="mobile-scroll"><div className="mobile-tabs"><span className="mobile-tab active">คำขอชำระเงิน</span><span className="mobile-tab">สลิปที่รอตรวจสอบ {data.payments.filter((p)=>String(p.status)==="VERIFYING").length}</span><span className="mobile-tab">ประวัติการชำระ</span></div><div className="payment-grid-mobile"><div className="mobile-qr-card"><div className="mobile-section-title">QR Code สำหรับชำระเงิน</div>{req?.qrImageDataUrl?<img alt="QR" src={req.qrImageDataUrl} style={{width:112,height:112,borderRadius:10}}/>:<div className="mobile-qr"/>}<div className="mobile-money">{money(req?.amount)}</div><p className="mobile-muted">สแกนเพื่อชำระเงิน</p><button className="mobile-btn">บันทึก QR Code</button></div><div className="payment-info-card"><div className="mobile-section-title">ข้อมูลการชำระเงิน</div><div className="detail-lines"><span>สัญญา <b>{req?.contract?.contractNo||"-"}</b></span><span>ลูกค้า <b>{req?.customer?.fullName||"-"}</b></span><span>ยอดที่ต้องชำระ <b>{money(req?.amount)}</b></span></div><button className="mobile-btn">แชร์ลิงก์ชำระเงิน</button></div></div>{data.payments.slice(0,2).map((p)=><div className="payment-request-card" key={p.id}><div><span className="card-name">{p.contract?.customer?.fullName||"Payment"}</span><span className="card-sub">{p.contract?.contractNo||"-"}</span></div><div><div className="mobile-money">{money(p.amount)}</div>{String(p.status).toUpperCase()!=="CONFIRMED"?<button className="mobile-btn" onClick={()=>post(`/payments/${p.id}/confirm`)}>ยืนยันรับเงิน</button>:<MStatus label="ชำระแล้ว"/>}</div></div>)}</div><BottomNav active="การเงิน"/></>; }
function CollectionMobileLive({ rows }: { rows: AnyRow[] }) { return <><AppHeader pageTitle="ติดตามหนี้ค้างชำระ" filter/><div className="mobile-scroll"><div className="overdue-summary"><div className="overdue-tile"><span>งานทั้งหมด</span><strong>{rows.length}</strong><small>tasks</small></div><div className="overdue-tile orange"><span>High</span><strong>{rows.filter((r)=>r.priority==="HIGH").length}</strong><small>เร่งด่วน</small></div><div className="overdue-tile"><span>เปิดอยู่</span><strong>{rows.filter((r)=>String(r.status)!=="DONE").length}</strong><small>ต้องตาม</small></div></div><div className="mobile-tabs"><span className="mobile-tab active">ทั้งหมด</span><span className="mobile-tab">ค้างเกิน 30 วัน</span><span className="mobile-tab">ค้างเกิน 60 วัน</span><span className="mobile-tab">90 วัน+</span></div><div className="list-stack">{rows.slice(0,4).map((r)=><div className="overdue-card" key={r.id}><div className="overdue-top"><div><span className="card-name">{r.customer?.fullName||"-"}</span><span className="card-sub">{r.contract?.contractNo||"-"}</span></div><div className="amount">{r.priority||"NORMAL"}</div></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><MStatus label={thaiStatus(r.status)} tone={statusTone(r.status)}/><MStatus label={r.title||"ติดตาม"} tone="orange"/></div><p className="note">{r.note||"ยังไม่มีบันทึก"}</p><span className="card-sub">{dateTH(r.dueAt)}</span></div>)}</div></div><BottomNav active="การเงิน"/></>; }
export function MobileStoreLiveBoard() { const api=useCoreData(); const d=api.data; return <main className="mobile-store-board"><h1 className="mobile-board-title"><span>KOGA</span> Lease MDM SaaS — Mobile Store Core Pages</h1><CoreNotice loading={api.loading} error={api.error} refresh={api.refresh}/><div className="mobile-board-grid"><Phone number="1" title="Store Dashboard"><StoreMobile data={d}/></Phone><Phone number="2" title="Customers"><CustomersMobileLive rows={d.customers}/></Phone><Phone number="3" title="Device Inventory"><DevicesMobileLive rows={d.devices}/></Phone><Phone number="4" title="Contracts"><ContractsMobileLive rows={d.contracts}/></Phone><Phone number="5" title="Payments"><PaymentsMobileLive data={d} post={api.post}/></Phone><Phone number="6" title="Collection"><CollectionMobileLive rows={d.collectionTasks}/></Phone></div></main>; }
