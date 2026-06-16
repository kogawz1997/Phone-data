"use client";

import { useEffect, useMemo, useState } from "react";
import StockFormEnhancer from "./stock-form-enhancer";

type ToastTone = "success" | "error" | "info" | "warning";
type Toast = { id: number; tone: ToastTone; message: string };
type Sheet = "none" | "more" | "quick";

type Command = {
  id: string;
  label: string;
  hint: string;
  group: string;
  run: () => void;
};

const navItems = [
  { label: "ภาพรวม", tab: "ภาพรวม" },
  { label: "ลูกค้า", tab: "ลูกค้า" },
  { label: "สัญญา", tab: "สัญญา" },
] as const;

const statusRules = [
  { className: "ux-status-good", words: ["ACTIVE", "CONFIRMED", "COMPLETED", "PAID", "READY", "ENROLLED", "RELEASED"] },
  { className: "ux-status-warn", words: ["PENDING", "QUEUED", "REVIEW", "DUE_SOON", "PARTIAL", "SETUP_REQUIRED"] },
  { className: "ux-status-bad", words: ["OVERDUE", "REJECTED", "FAILED", "RESTRICTED", "RECOVERY", "CANCELLED", "ERROR"] },
] as const;

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function clickByText(selector: string, labels: string[]) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const target = nodes.find((node) => labels.some((label) => normalize(node.innerText || node.textContent || "").includes(normalize(label))));
  target?.click();
  return Boolean(target);
}

function toastMessageFor(pathname: string, method: string) {
  if (pathname.includes("payment")) return method === "POST" ? "บันทึกรายการชำระเงินแล้ว" : "อัปเดตการชำระเงินแล้ว";
  if (pathname.includes("customer")) return method === "POST" ? "เพิ่มข้อมูลลูกค้าแล้ว" : "อัปเดตข้อมูลลูกค้าแล้ว";
  if (pathname.includes("contract")) return method === "POST" ? "สร้างสัญญาแล้ว" : "อัปเดตสัญญาแล้ว";
  if (pathname.includes("device")) return method === "POST" ? "เพิ่มเครื่องในระบบแล้ว" : "อัปเดตข้อมูลเครื่องแล้ว";
  if (pathname.includes("mdm") || pathname.includes("action")) return "ส่งคำสั่งเข้าระบบแล้ว";
  if (pathname.includes("setting") || pathname.includes("profile") || pathname.includes("template")) return "บันทึกการตั้งค่าแล้ว";
  return "บันทึกรายการเรียบร้อย";
}

function needsConfirm(text: string) {
  const value = normalize(text);
  return ["ลบ", "delete", "ยกเลิก", "cancel", "reject", "ปลด", "release", "restrict", "lock", "อนุมัติ", "approve"].some((word) => value.includes(word));
}

function getConfirmMessage(text: string) {
  const value = text.trim() || "ดำเนินการ";
  if (normalize(value).includes("ลบ") || normalize(value).includes("delete")) return "ยืนยันการลบรายการนี้?";
  if (normalize(value).includes("ปลด") || normalize(value).includes("release")) return "ยืนยันการปลด/ส่งคำสั่งกับเครื่องนี้?";
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [filterResult, setFilterResult] = useState({ total: 0, visible: 0 });
  const [confirmAction, setConfirmAction] = useState<{ message: string; target: HTMLElement } | null>(null);

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

  const commands = useMemo<Command[]>(() => [
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
  ], []);

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
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาในหน้านี้" aria-label="ค้นหาในหน้านี้" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="ตัวกรองสถานะ">
          <option value="all">ทุกสถานะ</option><option value="active">Active</option><option value="pending">Pending</option><option value="overdue">Overdue</option><option value="confirmed">Confirmed</option>
        </select>
        {filterResult.total > 0 && <span>{filterResult.visible}/{filterResult.total}</span>}
      </section>
      <div className="ux-toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`ux-toast ${toast.tone}`}>{toast.message}</div>)}</div>
      <nav className="ux-bottom-nav" aria-label="เมนูหลักบนมือถือ">
        {navItems.map((item) => <button key={item.label} type="button" onClick={() => goTab(item.tab)}>{item.label}</button>)}
        <button type="button" onClick={() => setSheet(sheet === "more" ? "none" : "more")}>เพิ่มเติม</button>
      </nav>
      {sheet !== "none" && <div className="ux-sheet-backdrop" onClick={() => setSheet("none")} />}
      {sheet === "quick" && <aside className="ux-sheet"><div className="ux-sheet-handle" /><h3>Quick Actions</h3><button type="button" onClick={() => goTab("ลูกค้า")}>เพิ่มลูกค้า</button><button type="button" onClick={() => goTab("สต็อก")}>เพิ่มเครื่อง</button><button type="button" onClick={() => goTab("สัญญา")}>สร้างสัญญา</button><button type="button" onClick={() => goTab("ชำระเงิน")}>บันทึกชำระเงิน</button></aside>}
      {sheet === "more" && <aside className="ux-sheet"><div className="ux-sheet-handle" /><h3>เมนูเพิ่มเติม</h3><button type="button" onClick={() => setCommandOpen(true)}>ค้นหา / คำสั่ง</button><button type="button" onClick={() => goPath("/settings")}>ตั้งค่าร้าน</button><button type="button" onClick={() => goTab("ชำระเงิน")}>ชำระเงิน</button><button type="button" onClick={() => goPath("/platform")}>Owner / Platform</button><button type="button" onClick={() => goPath("/customer-access")}>Users ลูกค้า</button><button type="button" onClick={() => goPath("/integrations")}>Integrations</button><button type="button" onClick={() => goTab("สต็อก")}>สต็อกเครื่อง</button><button type="button" onClick={() => goTab("ติดตาม")}>ติดตามงวด</button><button type="button" onClick={() => goTab("MDM")}>MDM</button><button type="button" onClick={() => goTab("รายงาน")}>รายงาน</button><button type="button" onClick={() => goTab("Audit")}>Audit</button></aside>}
      {commandOpen && <div className="ux-command-backdrop" onMouseDown={() => setCommandOpen(false)}><div className="ux-command" onMouseDown={(event) => event.stopPropagation()}><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเมนู คำสั่ง หรือข้อมูล" /><div className="ux-command-list">{filteredCommands.slice(0, 12).map((command) => <button key={command.id} type="button" onClick={command.run}><strong>{command.label}</strong><span>{command.group} · {command.hint}</span></button>)}{filteredCommands.length === 0 && <div className="ux-command-empty">ไม่พบคำสั่งที่ตรงกัน</div>}</div></div></div>}
      {confirmAction && <div className="ux-confirm-backdrop" onMouseDown={() => setConfirmAction(null)}><div className="ux-confirm" onMouseDown={(event) => event.stopPropagation()}><h3>ยืนยันรายการ</h3><p>{confirmAction.message}</p><div><button type="button" className="secondary" onClick={() => setConfirmAction(null)}>ยกเลิก</button><button type="button" onClick={confirmNow}>ยืนยัน</button></div></div></div>}
    </>
  );
}
