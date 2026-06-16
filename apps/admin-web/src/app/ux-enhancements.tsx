"use client";

import { useEffect, useMemo, useState } from "react";
import StockFormEnhancer from "./stock-form-enhancer";

type ToastTone = "success" | "error" | "info" | "warning";
type Toast = { id: number; tone: ToastTone; message: string };
type Sheet = "none" | "more" | "quick";
type Surface = "admin" | "owner";

type Command = {
  id: string;
  label: string;
  hint: string;
  group: string;
  run: () => void;
};

type NavItem = {
  label: string;
  run: () => void;
};

const statusRules = [
  { className: "ux-status-good", words: ["ACTIVE", "CONFIRMED", "COMPLETED", "PAID", "READY", "ENROLLED", "RELEASED", "CURRENT"] },
  { className: "ux-status-warn", words: ["PENDING", "QUEUED", "REVIEW", "DUE_SOON", "PARTIAL", "SETUP_REQUIRED", "TRIAL", "ISSUED"] },
  { className: "ux-status-bad", words: ["OVERDUE", "REJECTED", "FAILED", "RESTRICTED", "RECOVERY", "CANCELLED", "ERROR", "SUSPENDED"] },
] as const;

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function getSurface(): Surface {
  if (typeof window === "undefined") return "admin";
  return window.location.pathname.startsWith("/platform") ? "owner" : "admin";
}

function clickByText(selector: string, labels: string[]) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const target = nodes.find((node) => labels.some((label) => normalize(node.innerText || node.textContent || "").includes(normalize(label))));
  target?.click();
  return Boolean(target);
}

function scrollToText(labels: string[]) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,.card,.hero,.table-wrap"));
  const target = nodes.find((node) => labels.some((label) => normalize(node.innerText || node.textContent || "").includes(normalize(label))));
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  return false;
}

function toastMessageFor(pathname: string, method: string) {
  if (pathname.includes("payment")) return method === "POST" ? "บันทึกรายการชำระเงินแล้ว" : "อัปเดตการชำระเงินแล้ว";
  if (pathname.includes("customer")) return method === "POST" ? "เพิ่มข้อมูลลูกค้าแล้ว" : "อัปเดตข้อมูลลูกค้าแล้ว";
  if (pathname.includes("contract")) return method === "POST" ? "สร้างสัญญาแล้ว" : "อัปเดตสัญญาแล้ว";
  if (pathname.includes("device")) return method === "POST" ? "เพิ่มเครื่องในระบบแล้ว" : "อัปเดตข้อมูลเครื่องแล้ว";
  if (pathname.includes("platform")) return "อัปเดตข้อมูล Owner Console แล้ว";
  if (pathname.includes("mdm") || pathname.includes("action")) return "ส่งคำสั่งเข้าระบบแล้ว";
  if (pathname.includes("setting") || pathname.includes("profile") || pathname.includes("template")) return "บันทึกการตั้งค่าแล้ว";
  return "บันทึกรายการเรียบร้อย";
}

function needsConfirm(text: string) {
  const value = normalize(text);
  return ["ลบ", "delete", "ยกเลิก", "cancel", "reject", "ปลด", "release", "restrict", "lock", "อนุมัติ", "approve", "ระงับ", "mark paid", "เปิดใช้"].some((word) => value.includes(word));
}

function getConfirmMessage(text: string) {
  const value = text.trim() || "ดำเนินการ";
  if (normalize(value).includes("ลบ") || normalize(value).includes("delete")) return "ยืนยันการลบรายการนี้?";
  if (normalize(value).includes("ปลด") || normalize(value).includes("release")) return "ยืนยันการปลด/ส่งคำสั่งกับเครื่องนี้?";
  if (normalize(value).includes("ระงับ")) return "ยืนยันการระงับร้านนี้?";
  if (normalize(value).includes("เปิดใช้")) return "ยืนยันการเปิดใช้ร้านนี้?";
  if (normalize(value).includes("mark paid")) return "ยืนยันการปิดบิลนี้เป็นชำระแล้ว?";
  if (normalize(value).includes("ยกเลิก") || normalize(value).includes("cancel")) return "ยืนยันการยกเลิกรายการนี้?";
  return `ยืนยันการทำรายการ: ${value}`;
}

function applyStatusClasses() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(".badge, .table td, .metric-label, .notice, .alert"));
  for (const el of candidates) {
    el.classList.remove("ux-status-good", "ux-status-warn", "ux-status-bad");
    const text = (el.textContent || "").toUpperCase();
    const rule = statusRules.find((item) => item.words.some((word) => text.includes(word)));
    if (rule) el.classList.add(rule.className);
  }
}

function decorateEmptyStates() {
  const wraps = Array.from(document.querySelectorAll<HTMLElement>(".table-wrap"));
  for (const wrap of wraps) {
    const table = wrap.querySelector("table");
    const body = table?.querySelector("tbody");
    const rows = Array.from(body?.querySelectorAll("tr") ?? []).filter((row) => (row.textContent || "").trim());
    const existing = wrap.querySelector(".ux-empty-state");
    if (!table || rows.length > 0) {
      existing?.remove();
      wrap.classList.remove("ux-table-empty");
      continue;
    }
    wrap.classList.add("ux-table-empty");
    if (!existing) {
      const empty = document.createElement("div");
      empty.className = "ux-empty-state";
      empty.innerHTML = `<div class="ux-empty-icon">∅</div><strong>ยังไม่มีข้อมูล</strong><span>เริ่มสร้างรายการแรก หรือปรับตัวกรองการค้นหา</span>`;
      wrap.appendChild(empty);
    }
  }
}

function buildInsights() {
  const hero = document.querySelector<HTMLElement>(".app-shell .hero");
  if (!hero || document.querySelector(".ux-insight-strip")) return;
  const metrics = Array.from(document.querySelectorAll<HTMLElement>(".metric")).slice(0, 4);
  if (metrics.length === 0) return;
  const strip = document.createElement("section");
  strip.className = "ux-insight-strip";
  strip.innerHTML = metrics.map((metric) => {
    const label = metric.querySelector(".metric-label")?.textContent?.trim() || "ข้อมูล";
    const value = metric.querySelector(".metric-value")?.textContent?.trim() || "0";
    return `<div class="ux-insight-card"><span>${label}</span><strong>${value}</strong></div>`;
  }).join("");
  hero.insertAdjacentElement("afterend", strip);
}

function filterPage(query: string, status: string) {
  const q = normalize(query);
  const statusQ = normalize(status);
  const rows = Array.from(document.querySelectorAll<HTMLElement>(".table tbody tr"));
  let visible = 0;
  for (const row of rows) {
    const text = normalize(row.innerText || row.textContent || "");
    const matchesSearch = !q || text.includes(q);
    const matchesStatus = statusQ === "all" || text.includes(statusQ);
    const show = matchesSearch && matchesStatus;
    row.style.display = show ? "" : "none";
    if (show) visible += 1;
  }
  document.documentElement.dataset.uxFiltered = q || statusQ !== "all" ? "true" : "false";
  return { total: rows.length, visible };
}

function credentialedInit(init?: RequestInit): RequestInit {
  return { ...(init ?? {}), credentials: init?.credentials ?? "include" };
}

export default function UXEnhancements() {
  const [surface, setSurface] = useState<Surface>("admin");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [filterResult, setFilterResult] = useState({ total: 0, visible: 0 });
  const [confirmAction, setConfirmAction] = useState<{ message: string; target: HTMLElement } | null>(null);

  useEffect(() => {
    const syncSurface = () => {
      const next = getSurface();
      setSurface(next);
      document.documentElement.dataset.appSurface = next;
    };
    syncSurface();
    window.addEventListener("popstate", syncSurface);
    window.addEventListener("hashchange", syncSurface);
    const timer = window.setInterval(syncSurface, 500);
    return () => {
      window.removeEventListener("popstate", syncSurface);
      window.removeEventListener("hashchange", syncSurface);
      window.clearInterval(timer);
    };
  }, []);

  const addToast = (tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-3), { id, tone, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  };

  const goPath = (href: string) => {
    setSheet("none");
    setCommandOpen(false);
    window.location.href = href;
  };

  const goTop = () => {
    setSheet("none");
    setCommandOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goSection = (labels: string[]) => {
    setSheet("none");
    setCommandOpen(false);
    if (!scrollToText(labels)) addToast("info", "ยังไม่พบส่วนนี้ในหน้า Owner");
  };

  const goTab = (label: string) => {
    const ok = clickByText(".tab-btn", [label]);
    setSheet("none");
    setCommandOpen(false);
    if (!ok) {
      window.setTimeout(() => {
        const retryOk = clickByText(".tab-btn", [label]);
        if (!retryOk) addToast("info", "เมนูยังไม่พร้อม ลองออกจากระบบแล้วเข้าใหม่");
      }, 160);
    }
  };

  const navItems = useMemo<NavItem[]>(() => surface === "owner" ? [
    { label: "Owner", run: goTop },
    { label: "ร้านค้า", run: () => goSection(["ร้านที่ใช้ระบบ", "ร้าน"]) },
    { label: "บิล", run: () => goSection(["ใบแจ้งหนี้", "invoice"]) },
  ] : [
    { label: "ภาพรวม", run: () => goTab("ภาพรวม") },
    { label: "ลูกค้า", run: () => goTab("ลูกค้า") },
    { label: "สัญญา", run: () => goTab("สัญญา") },
  ], [surface]);

  const commands = useMemo<Command[]>(() => surface === "owner" ? [
    { id: "owner-home", label: "ไปหน้า Owner", hint: "Top of Owner Console", group: "Owner", run: goTop },
    { id: "owner-stores", label: "ดูร้านทั้งหมด", hint: "Stores table", group: "Owner", run: () => goSection(["ร้านที่ใช้ระบบ", "ร้าน"]) },
    { id: "owner-invoices", label: "ดูใบแจ้งหนี้", hint: "Billing table", group: "Owner", run: () => goSection(["ใบแจ้งหนี้", "invoice"]) },
    { id: "owner-risk", label: "ดู iCloud Risk", hint: "Owner risk page", group: "Owner", run: () => goPath("/platform/apple-custody-risk") },
    { id: "owner-signup", label: "เปิดหน้าสมัครร้าน", hint: "Store signup", group: "Owner", run: () => goPath("/signup") },
    { id: "store-console", label: "กลับ Store Console", hint: "Admin store app", group: "Switch", run: () => goPath("/") },
    { id: "refresh", label: "รีเฟรชข้อมูล", hint: "Reload owner data", group: "คำสั่ง", run: () => clickByText("button", ["รีเฟรช", "กำลังโหลด"]) },
  ] : [
    { id: "overview", label: "ไปหน้าภาพรวม", hint: "Dashboard", group: "เมนู", run: () => goTab("ภาพรวม") },
    { id: "customers", label: "ไปหน้าลูกค้า", hint: "Customers", group: "เมนู", run: () => goTab("ลูกค้า") },
    { id: "contracts", label: "ไปหน้าสัญญา", hint: "Contracts", group: "เมนู", run: () => goTab("สัญญา") },
    { id: "payments", label: "ไปหน้าชำระเงิน", hint: "Payments", group: "เมนู", run: () => goTab("ชำระเงิน") },
    { id: "devices", label: "ไปหน้าสต็อกเครื่อง", hint: "Devices", group: "เมนู", run: () => goTab("สต็อก") },
    { id: "settings", label: "ไปหน้าตั้งค่าร้าน", hint: "Store settings", group: "ระบบ", run: () => goPath("/settings") },
    { id: "audit", label: "ไปหน้า Audit", hint: "Logs", group: "เมนู", run: () => goTab("Audit") },
    { id: "owner", label: "ไปหน้า Owner", hint: "Platform owner", group: "ระบบ", run: () => goPath("/platform") },
    { id: "users", label: "ไปหน้า Users ลูกค้า", hint: "Customer access", group: "ระบบ", run: () => goPath("/customer-access") },
    { id: "integrations", label: "ไปหน้า Integrations", hint: "Provider setup", group: "ระบบ", run: () => goPath("/integrations") },
    { id: "refresh", label: "รีเฟรชข้อมูล", hint: "Reload current data", group: "คำสั่ง", run: () => clickByText("button", ["รีเฟรช", "กำลังโหลด"]) },
    { id: "add-customer", label: "เพิ่มลูกค้า", hint: "เปิดหน้าลูกค้า", group: "Quick action", run: () => goTab("ลูกค้า") },
    { id: "add-device", label: "เพิ่มเครื่อง", hint: "เปิดหน้าสต็อก", group: "Quick action", run: () => goTab("สต็อก") },
    { id: "new-contract", label: "สร้างสัญญา", hint: "เปิดหน้าสัญญา", group: "Quick action", run: () => goTab("สัญญา") },
  ], [surface]);

  const filteredCommands = commands.filter((command) => {
    const q = normalize(query);
    if (!q) return true;
    return normalize(`${command.label} ${command.hint} ${command.group}`).includes(q);
  });

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const nextInit = credentialedInit(init);
      const method = String(nextInit?.method || "GET").toUpperCase();
      const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);
      if (isMutation) document.documentElement.classList.add("ux-busy");
      try {
        const response = await originalFetch(input, nextInit);
        if (isMutation) {
          const pathname = typeof input === "string" ? input : input instanceof Request ? input.url : "";
          if (response.ok) addToast("success", toastMessageFor(pathname, method));
          else addToast("error", "ทำรายการไม่สำเร็จ กรุณาตรวจสอบอีกครั้ง");
        }
        return response;
      } catch (error) {
        if (isMutation) addToast("error", "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่");
        throw error;
      } finally {
        if (isMutation) window.setTimeout(() => document.documentElement.classList.remove("ux-busy"), 450);
      }
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        setSheet("none");
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setSheet("none");
        setConfirmAction(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("button, a");
      if (!target || target.dataset.uxConfirmed === "true") return;
      const text = target.innerText || target.textContent || "";
      if (!needsConfirm(text)) return;
      event.preventDefault();
      event.stopPropagation();
      setConfirmAction({ message: getConfirmMessage(text), target });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  useEffect(() => {
    const refreshDecorations = () => {
      applyStatusClasses();
      decorateEmptyStates();
      buildInsights();
    };
    refreshDecorations();
    const observer = new MutationObserver(refreshDecorations);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setFilterResult(filterPage(query, status)); }, [query, status]);

  const confirmNow = () => {
    const target = confirmAction?.target;
    setConfirmAction(null);
    if (!target) return;
    target.dataset.uxConfirmed = "true";
    target.click();
    window.setTimeout(() => delete target.dataset.uxConfirmed, 0);
  };

  return (
    <>
      <StockFormEnhancer />
      <div className="ux-loading-bar" />
      <section className="ux-smart-search" aria-label="ค้นหาและตัวกรอง">
        <button className="ux-command-trigger" type="button" onClick={() => setCommandOpen(true)}>⌘K</button>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={surface === "owner" ? "ค้นหาร้าน บิล หรือคำสั่ง Owner" : "ค้นหาในหน้านี้"} aria-label="ค้นหาในหน้านี้" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="ตัวกรองสถานะ">
          <option value="all">ทุกสถานะ</option><option value="active">Active</option><option value="pending">Pending</option><option value="overdue">Overdue</option><option value="confirmed">Confirmed</option><option value="trial">Trial</option><option value="suspended">Suspended</option>
        </select>
        {filterResult.total > 0 && <span>{filterResult.visible}/{filterResult.total}</span>}
      </section>
      <div className="ux-toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`ux-toast ${toast.tone}`}>{toast.message}</div>)}</div>
      <nav className="ux-bottom-nav" aria-label={surface === "owner" ? "เมนู Owner บนมือถือ" : "เมนูหลักบนมือถือ"}>
        {navItems.map((item) => <button key={item.label} type="button" onClick={item.run}>{item.label}</button>)}
        <button type="button" onClick={() => setSheet(sheet === "more" ? "none" : "more")}>เพิ่มเติม</button>
      </nav>
      {sheet !== "none" && <div className="ux-sheet-backdrop" onClick={() => setSheet("none")} />}
      {sheet === "quick" && surface !== "owner" && <aside className="ux-sheet"><div className="ux-sheet-handle" /><h3>Quick Actions</h3><button type="button" onClick={() => goTab("ลูกค้า")}>เพิ่มลูกค้า</button><button type="button" onClick={() => goTab("สต็อก")}>เพิ่มเครื่อง</button><button type="button" onClick={() => goTab("สัญญา")}>สร้างสัญญา</button><button type="button" onClick={() => goTab("ชำระเงิน")}>บันทึกชำระเงิน</button></aside>}
      {sheet === "more" && surface === "owner" && <aside className="ux-sheet"><div className="ux-sheet-handle" /><h3>Owner Menu</h3><button type="button" onClick={goTop}>ภาพรวม Owner</button><button type="button" onClick={() => goSection(["ร้านที่ใช้ระบบ", "ร้าน"])}>ร้านที่ใช้ระบบ</button><button type="button" onClick={() => goSection(["ใบแจ้งหนี้", "invoice"])}>ใบแจ้งหนี้ค่าระบบ</button><button type="button" onClick={() => goPath("/platform/apple-custody-risk")}>iCloud Risk</button><button type="button" onClick={() => goPath("/signup")}>หน้าสมัครร้าน</button><button type="button" onClick={() => setCommandOpen(true)}>ค้นหา / คำสั่ง Owner</button><button type="button" onClick={() => goPath("/")}>กลับ Store Console</button></aside>}
      {sheet === "more" && surface !== "owner" && <aside className="ux-sheet"><div className="ux-sheet-handle" /><h3>เมนูเพิ่มเติม</h3><button type="button" onClick={() => setCommandOpen(true)}>ค้นหา / คำสั่ง</button><button type="button" onClick={() => goPath("/settings")}>ตั้งค่าร้าน</button><button type="button" onClick={() => goTab("ชำระเงิน")}>ชำระเงิน</button><button type="button" onClick={() => goPath("/platform")}>Owner / Platform</button><button type="button" onClick={() => goPath("/customer-access")}>Users ลูกค้า</button><button type="button" onClick={() => goPath("/integrations")}>Integrations</button><button type="button" onClick={() => goTab("สต็อก")}>สต็อกเครื่อง</button><button type="button" onClick={() => goTab("ติดตาม")}>ติดตามงวด</button><button type="button" onClick={() => goTab("MDM")}>MDM</button><button type="button" onClick={() => goTab("รายงาน")}>รายงาน</button><button type="button" onClick={() => goTab("Audit")}>Audit</button></aside>}
      {commandOpen && <div className="ux-command-backdrop" onMouseDown={() => setCommandOpen(false)}><div className="ux-command" onMouseDown={(event) => event.stopPropagation()}><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={surface === "owner" ? "ค้นหาเมนู Owner ร้าน หรือบิล" : "ค้นหาเมนู คำสั่ง หรือข้อมูล"} /><div className="ux-command-list">{filteredCommands.slice(0, 12).map((command) => <button key={command.id} type="button" onClick={command.run}><strong>{command.label}</strong><span>{command.group} · {command.hint}</span></button>)}{filteredCommands.length === 0 && <div className="ux-command-empty">ไม่พบคำสั่งที่ตรงกัน</div>}</div></div></div>}
      {confirmAction && <div className="ux-confirm-backdrop" onMouseDown={() => setConfirmAction(null)}><div className="ux-confirm" onMouseDown={(event) => event.stopPropagation()}><h3>ยืนยันรายการ</h3><p>{confirmAction.message}</p><div><button type="button" className="secondary" onClick={() => setConfirmAction(null)}>ยกเลิก</button><button type="button" onClick={confirmNow}>ยืนยัน</button></div></div></div>}
    </>
  );
}
