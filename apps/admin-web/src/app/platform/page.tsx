"use client";

import { useEffect, useMemo, useState } from "react";
import { api, clearToken, downloadCsv } from "@/lib/api";
import { baht } from "@repo/shared";

type PlatformSummary = {
  stores: number;
  activeStores: number;
  trialStores: number;
  suspendedStores: number;
  users: number;
  devices: number;
  contracts: number;
  pendingPayments: number;
  overdueContracts: number;
  openInvoices: number;
  paidInvoiceRevenue: number;
  monthlyRecurringRevenue: number;
};

type Store = {
  id: string;
  name: string;
  slug?: string;
  storeCode?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  status: string;
  plan: string;
  billingStatus: string;
  monthlyFee: string | number;
  trialEndsAt?: string;
  nextBillingAt?: string;
  platformNotes?: string;
  createdAt: string;
  _count: { customers: number; devices: number; contracts: number };
  users: Array<{ id: string; email: string; name: string; role: string }>;
  integrationConnectors: Array<{ id: string; provider: string; category: string; status: string }>;
  platformInvoices: Array<{ id: string; invoiceNo: string; periodLabel: string; amount: string; status: string; dueDate: string }>;
};

type Invoice = {
  id: string;
  invoiceNo: string;
  periodLabel: string;
  amount: string;
  status: string;
  dueDate: string;
  paidAt?: string;
  organization: { id: string; name: string; storeCode?: string };
};

function tone(status?: string) {
  if (["ACTIVE", "CURRENT", "PAID"].includes(String(status))) return "good";
  if (["TRIAL", "TRIALING", "DRAFT", "ISSUED"].includes(String(status))) return "warn";
  if (["SUSPENDED", "OVERDUE", "CANCELLED", "FAILED"].includes(String(status))) return "bad";
  return "neutral";
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${tone(value)}`}>{value}</span>;
}

function Metric({ label, value, note, toneClass = "" }: { label: string; value: string | number; note: string; toneClass?: string }) {
  return <div className={`card metric ${toneClass}`}><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>;
}

export default function PlatformOwnerPage() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, st, inv] = await Promise.all([
        api<PlatformSummary>("/platform/summary"),
        api<Store[]>("/platform/stores"),
        api<Invoice[]>("/platform/invoices"),
      ]);
      setSummary(s); setStores(st); setInvoices(inv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูล owner dashboard ไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => stores.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchText = !q || [s.name, s.ownerName, s.email, s.phone, s.storeCode].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter || s.billingStatus === statusFilter;
    const matchPlan = planFilter === "ALL" || s.plan === planFilter;
    return matchText && matchStatus && matchPlan;
  }), [stores, search, statusFilter, planFilter]);

  async function updateStore(id: string, body: Record<string, unknown>) {
    await api(`/platform/stores/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    await load();
  }

  async function createInvoice(store: Store) {
    await api(`/platform/stores/${store.id}/invoices`, { method: "POST", body: JSON.stringify({ amount: Number(store.monthlyFee), periodLabel: new Date().toISOString().slice(0, 7), status: "ISSUED" }) });
    await load();
  }

  async function markPaid(invoice: Invoice) {
    await api(`/platform/invoices/${invoice.id}`, { method: "PATCH", body: JSON.stringify({ status: "PAID", paymentRef: `manual-${Date.now()}` }) });
    await load();
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="logo">K</div><div><div className="kicker">Platform Owner</div><h2 style={{ margin: 0 }}>KOGA Lease MDM SaaS</h2></div></div>
      <div className="pill-list"><a className="btn secondary" href="/">ไปร้านของฉัน</a><a className="btn secondary" href="/signup">หน้าสมัครร้าน</a><a className="btn secondary" href="/platform/apple-custody-risk">iCloud Risk</a><button className="btn secondary" onClick={load}>{loading ? "กำลังโหลด..." : "รีเฟรช"}</button><button className="btn danger" onClick={() => { clearToken(); location.href = "/"; }}>ออกจากระบบ</button></div>
    </header>

    <section className="hero hero-grid">
      <div><div className="kicker">Owner Dashboard</div><h1>ดูแลร้านที่มาใช้ระบบ ค่าบริการ และการเชื่อมต่อทั้งหมดในจอเดียว</h1><p className="muted">หน้านี้สำหรับเจ้าของแพลตฟอร์ม ไม่ใช่ร้านเช่าแต่ละร้าน ร้านจะเห็นเฉพาะข้อมูลตัวเอง ส่วนเราดูภาพรวมรายได้ MRR ร้านค้างจ่าย integration ที่ยังไม่พร้อม และสถานะ MDM/payment/notification ได้ครบ ไม่ต้องนั่งเดาเหมือนอ่าน log ตอนตีสาม</p><div className="hero-actions"><button className="btn" onClick={() => downloadCsv("/platform/reports/stores.csv", "stores.csv")}>Export Stores CSV</button><a className="btn secondary" href="/signup">เปิดหน้าสมัครร้าน</a><a className="btn secondary" href="/platform/apple-custody-risk">ดู iCloud Custody Risk</a></div></div>
      <div className="card strong"><h2>งานที่ควรไล่วันนี้</h2><div className="timeline"><div className="timeline-item"><span className="dot"/><div><b>{summary?.openInvoices ?? 0} ใบแจ้งหนี้ยังไม่ปิด</b><div className="small">ค่าบริการระบบของเรา ไม่ใช่ charity SaaS แบบมี server ฟรีในจินตนาการ</div></div></div><div className="timeline-item"><span className="dot"/><div><b>{summary?.suspendedStores ?? 0} ร้านถูกระงับ</b><div className="small">ตรวจว่าเป็นค้างจ่ายหรือ setup ไม่ครบ</div></div></div><div className="timeline-item"><span className="dot"/><div><b>{summary?.pendingPayments ?? 0} payment ร้านลูกค้ารอตรวจ</b><div className="small">ช่วยดู health ของร้านที่ใช้ระบบเรา</div></div></div></div></div>
    </section>

    {error && <div className="notice error" style={{ marginBottom: 16 }}>{error}</div>}

    <section className="grid cols-4" style={{ marginBottom: 16 }}>
      <Metric label="ร้านทั้งหมด" value={summary?.stores ?? 0} note={`${summary?.activeStores ?? 0} active / ${summary?.trialStores ?? 0} trial`} />
      <Metric label="MRR โดยประมาณ" value={baht(summary?.monthlyRecurringRevenue ?? 0)} note="คิดจากร้าน active+trial" toneClass="good" />
      <Metric label="รายรับค่าระบบ" value={baht(summary?.paidInvoiceRevenue ?? 0)} note="ใบแจ้งหนี้ที่ paid" toneClass="good" />
      <Metric label="อุปกรณ์ในระบบ" value={summary?.devices ?? 0} note={`${summary?.contracts ?? 0} contracts`} />
    </section>

    <section className="card" style={{ marginBottom: 16 }}>
      <div className="topbar" style={{ marginBottom: 12 }}><div><h2>ร้านที่ใช้ระบบ</h2><p className="small">กรองตามสถานะ แพ็กเกจ หรือชื่อร้าน แล้วจัดการค่าบริการได้ทันที</p></div><div className="pill-list"><input className="input" style={{ width: 260 }} placeholder="ค้นหาร้าน/เจ้าของ/เบอร์" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>ALL</option><option>TRIAL</option><option>ACTIVE</option><option>SUSPENDED</option><option>TRIALING</option><option>CURRENT</option><option>OVERDUE</option></select><select className="input" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}><option>ALL</option><option>STARTER</option><option>STANDARD</option><option>PRO</option><option>ENTERPRISE</option></select></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>ร้าน</th><th>สถานะ</th><th>แพ็กเกจ</th><th>การใช้งาน</th><th>ระบบนอก</th><th>ค่าบริการ</th><th>จัดการ</th></tr></thead><tbody>{filtered.map((s) => <tr key={s.id}><td><b>{s.name}</b><div className="small">{s.storeCode} · {s.ownerName ?? "-"}</div><div className="small">{s.email ?? "-"} · {s.phone ?? "-"}</div></td><td><Badge value={s.status}/><br/><Badge value={s.billingStatus}/></td><td><Badge value={s.plan}/><div className="small">{baht(Number(s.monthlyFee))}/เดือน</div></td><td><div className="pill-list"><span className="badge neutral">ลูกค้า {s._count.customers}</span><span className="badge neutral">เครื่อง {s._count.devices}</span><span className="badge neutral">สัญญา {s._count.contracts}</span></div></td><td><div className="pill-list">{s.integrationConnectors.slice(0,5).map((i) => <span key={i.id} className={`badge ${tone(i.status)}`}>{i.provider.replaceAll("_", " ")}</span>)}</div></td><td>{s.nextBillingAt ? dateTH(s.nextBillingAt) : "-"}<div className="small">next billing</div></td><td><div className="pill-list"><button className="btn secondary" onClick={() => createInvoice(s)}>ออกบิล</button><button className="btn secondary" onClick={() => updateStore(s.id, { status: "ACTIVE", billingStatus: "CURRENT" })}>เปิดใช้</button><button className="btn danger" onClick={() => updateStore(s.id, { status: "SUSPENDED", billingStatus: "SUSPENDED" })}>ระงับ</button></div></td></tr>)}</tbody></table></div>
    </section>

    <section className="card">
      <h2>ใบแจ้งหนี้ค่าระบบล่าสุด</h2>
      <div className="table-wrap"><table className="table"><thead><tr><th>เลขบิล</th><th>ร้าน</th><th>รอบ</th><th>ยอด</th><th>สถานะ</th><th>ครบกำหนด</th><th></th></tr></thead><tbody>{invoices.map((i) => <tr key={i.id}><td>{i.invoiceNo}</td><td>{i.organization.name}<div className="small">{i.organization.storeCode}</div></td><td>{i.periodLabel}</td><td>{baht(Number(i.amount))}</td><td><Badge value={i.status}/></td><td>{dateTH(i.dueDate)}</td><td>{i.status !== "PAID" && <button className="btn secondary" onClick={() => markPaid(i)}>mark paid</button>}</td></tr>)}</tbody></table></div>
    </section>
  </main>;
}

function dateTH(v?: string) { return v ? new Date(v).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-"; }
