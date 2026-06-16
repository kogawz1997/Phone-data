"use client";

import { useEffect, useMemo, useState } from "react";
import StockFormEnhancer from "./stock-form-enhancer";

type Surface = "admin" | "owner";
type MenuItem = { id: string; label: string; icon: string; run: () => void; active?: boolean; danger?: boolean; group?: string };

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function getSurface(): Surface {
  if (typeof window === "undefined") return "admin";
  return window.location.pathname.startsWith("/platform") ? "owner" : "admin";
}

function isAuthScreen() {
  if (typeof window === "undefined") return true;
  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/auth") || path.startsWith("/forgot")) return true;
  const hasPassword = Boolean(document.querySelector('input[type="password"]'));
  const text = normalize(document.body.innerText || "");
  const hasAppContent = Boolean(document.querySelector(".app-shell .hero, .settingsSafe, .table-wrap, .tab-btn"));
  return hasPassword && (text.includes("เข้าสู่ระบบ") || text.includes("login") || text.includes("sign in")) && !hasAppContent;
}

function clickByText(selector: string, labels: string[]) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const target = nodes.find((node) => labels.some((label) => normalize(node.innerText || node.textContent || "").includes(normalize(label))));
  target?.click();
  return Boolean(target);
}

function scrollToText(labels: string[]) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,.card,.hero,.table-wrap,.safePanel"));
  const target = nodes.find((node) => labels.some((label) => normalize(node.innerText || node.textContent || "").includes(normalize(label))));
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  return false;
}

function goPath(href: string) {
  window.location.href = href;
}

function goTab(label: string) {
  if (window.location.pathname !== "/") {
    window.sessionStorage.setItem("koga_pending_tab", label);
    goPath("/");
    return;
  }
  clickByText(".tab-btn, button", [label]);
}

function goSettingsSection(label: string) {
  if (!window.location.pathname.startsWith("/settings")) {
    window.sessionStorage.setItem("koga_pending_settings_section", label);
    goPath("/settings");
    return;
  }
  clickByText(".settingsSafe .safeSide nav button, .settingsSafe button", [label]);
}

function runPendingActions() {
  const pendingTab = window.sessionStorage.getItem("koga_pending_tab");
  if (pendingTab && clickByText(".tab-btn, button", [pendingTab])) window.sessionStorage.removeItem("koga_pending_tab");

  const pendingSettings = window.sessionStorage.getItem("koga_pending_settings_section");
  if (pendingSettings && window.location.pathname.startsWith("/settings") && clickByText(".settingsSafe .safeSide nav button, .settingsSafe button", [pendingSettings])) {
    window.sessionStorage.removeItem("koga_pending_settings_section");
  }
}

function logout() {
  try {
    Object.keys(window.localStorage).filter((key) => key.startsWith("koga_")).forEach((key) => window.localStorage.removeItem(key));
    Object.keys(window.sessionStorage).filter((key) => key.startsWith("koga_")).forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignored, browser storage is a dramatic little creature sometimes.
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
  if (apiBase) void fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => null);
  window.location.href = "/";
}

function hideDuplicateChrome() {
  document.querySelectorAll<HTMLElement>(".topbar .pill-list .btn.danger, .topbar .pill-list .badge.good, .topbar .pill-list .badge.warn, .topbar .pill-list .badge.neutral").forEach((node) => {
    node.style.display = "none";
    node.setAttribute("aria-hidden", "true");
  });
}

export default function UXEnhancements() {
  const [surface, setSurface] = useState<Surface>("admin");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    const sync = () => {
      setSurface(getSurface());
      setPath(window.location.pathname);
      setReady(!isAuthScreen());
      runPendingActions();
      hideDuplicateChrome();
      if (window.innerWidth > 980) setOpen(true);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(sync, 700);
    const onRoute = () => window.setTimeout(sync, 60);
    window.addEventListener("popstate", onRoute);
    window.addEventListener("hashchange", onRoute);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("popstate", onRoute);
      window.removeEventListener("hashchange", onRoute);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(window.innerWidth > 980);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<MenuItem[]>(() => {
    if (surface === "owner") {
      return [
        { id: "owner-home", label: "Owner", icon: "✦", run: () => window.scrollTo({ top: 0, behavior: "smooth" }), active: path === "/platform" },
        { id: "owner-stores", label: "ร้านค้า", icon: "▦", run: () => scrollToText(["ร้านที่ใช้ระบบ", "ร้าน"]) },
        { id: "owner-billing", label: "บิล", icon: "฿", run: () => scrollToText(["ใบแจ้งหนี้", "invoice"]) },
        { id: "owner-risk", label: "iCloud Risk", icon: "◎", run: () => goPath("/platform/apple-custody-risk"), active: path.includes("apple-custody-risk") },
        { id: "owner-signup", label: "สมัครร้าน", icon: "+", run: () => goPath("/signup") },
        { id: "store", label: "Store", icon: "⌂", run: () => goPath("/") },
        { id: "logout", label: "ออกจากระบบ", icon: "⇱", run: logout, danger: true },
      ];
    }

    const settingsItems: MenuItem[] = path.startsWith("/settings") ? [
      { id: "settings-store", label: "ข้อมูลร้าน", icon: "▣", run: () => goSettingsSection("ข้อมูลร้าน"), group: "ตั้งค่า" },
      { id: "settings-payment", label: "รับเงิน", icon: "฿", run: () => goSettingsSection("รับเงิน"), group: "ตั้งค่า" },
      { id: "settings-portal", label: "Portal", icon: "◎", run: () => goSettingsSection("Portal"), group: "ตั้งค่า" },
      { id: "settings-notify", label: "แจ้งเตือน", icon: "◌", run: () => goSettingsSection("แจ้งเตือน"), group: "ตั้งค่า" },
      { id: "settings-docs", label: "เอกสาร", icon: "▤", run: () => goSettingsSection("เอกสาร"), group: "ตั้งค่า" },
      { id: "settings-integrations", label: "ระบบนอก", icon: "⌁", run: () => goSettingsSection("ระบบนอก"), group: "ตั้งค่า" },
      { id: "settings-security", label: "ปลอดภัย", icon: "◇", run: () => goSettingsSection("ความปลอดภัย"), group: "ตั้งค่า" },
      { id: "settings-system", label: "ระบบ", icon: "⚙", run: () => goSettingsSection("ระบบ"), group: "ตั้งค่า" },
    ] : [];

    return [
      { id: "overview", label: "ภาพรวม", icon: "⌂", run: () => goTab("ภาพรวม"), active: path === "/" },
      { id: "customers", label: "ลูกค้า", icon: "♙", run: () => goTab("ลูกค้า") },
      { id: "stock", label: "สต็อก", icon: "▦", run: () => goTab("สต็อก") },
      { id: "contracts", label: "สัญญา", icon: "▤", run: () => goTab("สัญญา") },
      { id: "payments", label: "ชำระเงิน", icon: "▭", run: () => goTab("ชำระเงิน") },
      { id: "tracking", label: "ติดตาม", icon: "◎", run: () => goTab("ติดตาม") },
      { id: "mdm", label: "สร้าง MDM", icon: "◇", run: () => goTab("MDM") },
      { id: "reports", label: "รายงาน", icon: "▥", run: () => goTab("รายงาน") },
      { id: "settings", label: "โปรไฟล์ร้าน", icon: "▣", run: () => goPath("/settings"), active: path.startsWith("/settings") },
      ...settingsItems,
      { id: "users", label: "ผู้ใช้", icon: "♙", run: () => goPath("/customer-access"), active: path.startsWith("/customer-access") },
      { id: "integrations", label: "Integrations", icon: "⌁", run: () => goPath("/integrations"), active: path.startsWith("/integrations") },
      { id: "owner", label: "Owner", icon: "♛", run: () => goPath("/platform") },
      { id: "logout", label: "ออกจากระบบ", icon: "⇱", run: logout, danger: true },
    ];
  }, [surface, path]);

  const runItem = (item: MenuItem) => {
    if (!open && window.innerWidth <= 980) {
      setOpen(true);
      return;
    }
    item.run();
    if (window.innerWidth <= 980 && !item.danger) setOpen(false);
  };

  if (!ready) return null;

  return <>
    <StockFormEnhancer />
    {open && window.innerWidth <= 980 && <button className="kogaMenuBackdrop" type="button" aria-label="ปิดเมนู" onClick={() => setOpen(false)} />}
    <aside className={`kogaUnifiedMenu ${open ? "open" : "closed"}`} aria-label="เมนูหลัก">
      <button className="kogaUnifiedBrand" type="button" onClick={() => setOpen((value) => !value)} aria-label="เปิดปิดเมนู"><span>K</span><b>{surface === "owner" ? "Owner Console" : "Store Console"}</b></button>
      <nav>{items.map((item) => <button key={item.id} type="button" className={`${item.active ? "active" : ""} ${item.danger ? "danger" : ""}`} onClick={() => runItem(item)} title={item.label}><i>{item.icon}</i><b>{item.label}</b></button>)}</nav>
    </aside>
    <style>{`
      body:has(.kogaUnifiedMenu) .ux-bottom-nav, body:has(.kogaUnifiedMenu) .ux-sheet, body:has(.kogaUnifiedMenu) .ux-sheet-backdrop, body:has(.kogaUnifiedMenu) .ux-smart-search, body:has(.kogaUnifiedMenu) .ux-fab, body:has(.kogaUnifiedMenu) .ux-command-backdrop { display: none !important; }
      body:has(.kogaUnifiedMenu) .topbar .pill-list .btn.danger { display: none !important; }
      body:has(.kogaUnifiedMenu) .app-shell { margin-left: 76px !important; width: calc(100% - 76px) !important; padding-bottom: 32px !important; }
      body:has(.kogaUnifiedMenu) .settingsSafe { display: block !important; padding-left: 76px !important; }
      body:has(.kogaUnifiedMenu) .settingsSafe .safeSide { display: none !important; }
      body:has(.kogaUnifiedMenu) .settingsSafe .safeMain { margin-left: 0 !important; padding-left: 0 !important; }
      .kogaUnifiedMenu{position:fixed;left:8px;top:8px;bottom:8px;z-index:1300;width:60px;border:1px solid rgba(148,163,184,.16);border-radius:22px;background:rgba(3,10,22,.90);backdrop-filter:blur(22px);box-shadow:0 22px 70px rgba(0,0,0,.30);padding:7px;display:flex;flex-direction:column;gap:10px;transition:width .2s ease,box-shadow .2s ease;overflow:hidden}.kogaUnifiedMenu.open{width:min(254px,84vw)}.kogaUnifiedBrand{min-height:48px;border:0;border-radius:16px;background:linear-gradient(135deg,rgba(34,211,238,.24),rgba(139,92,246,.28));color:white;display:flex;align-items:center;justify-content:center;gap:12px;padding:0;cursor:pointer}.kogaUnifiedMenu.open .kogaUnifiedBrand{justify-content:flex-start;padding:0 8px}.kogaUnifiedBrand span{width:40px;height:40px;min-width:40px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#22d3ee,#8b5cf6);font-weight:950}.kogaUnifiedBrand b,.kogaUnifiedMenu nav button b{display:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kogaUnifiedMenu.open .kogaUnifiedBrand b,.kogaUnifiedMenu.open nav button b{display:block}.kogaUnifiedMenu nav{display:grid;gap:7px;overflow:auto;padding-bottom:6px;scrollbar-width:none}.kogaUnifiedMenu nav::-webkit-scrollbar{display:none}.kogaUnifiedMenu nav button{min-height:42px;border:1px solid transparent;border-radius:14px;background:transparent;color:#9fb2ca;display:flex;align-items:center;justify-content:center;gap:11px;padding:0;cursor:pointer;font-weight:820}.kogaUnifiedMenu.open nav button{justify-content:flex-start;padding:0 10px}.kogaUnifiedMenu nav button:hover,.kogaUnifiedMenu nav button.active{color:white;border-color:rgba(34,211,238,.24);background:linear-gradient(135deg,rgba(14,165,233,.18),rgba(139,92,246,.18))}.kogaUnifiedMenu nav button.danger{color:#fecaca;border-color:rgba(248,113,113,.22);margin-top:6px}.kogaUnifiedMenu nav button.danger:hover{background:rgba(127,29,29,.28);border-color:rgba(248,113,113,.38)}.kogaUnifiedMenu nav button i{width:22px;min-width:22px;text-align:center;color:#67e8f9;font-style:normal}.kogaMenuBackdrop{position:fixed;inset:0;z-index:1290;border:0;background:rgba(2,6,23,.46);backdrop-filter:blur(3px)}body:has(.settingsSafe.light) .kogaUnifiedMenu{background:rgba(255,255,255,.9);border-color:rgba(15,23,42,.12);box-shadow:0 22px 70px rgba(15,23,42,.14)}body:has(.settingsSafe.light) .kogaUnifiedMenu nav button{color:#475569}body:has(.settingsSafe.light) .kogaUnifiedMenu nav button:hover,body:has(.settingsSafe.light) .kogaUnifiedMenu nav button.active{color:#0f172a;background:rgba(14,165,233,.12);border-color:rgba(14,165,233,.22)}@media(max-width:980px){body:has(.kogaUnifiedMenu) .app-shell{margin-left:68px!important;width:calc(100% - 68px)!important;padding-left:0!important;padding-right:8px!important}body:has(.kogaUnifiedMenu) .settingsSafe{padding-left:68px!important}.kogaUnifiedMenu{width:54px;left:6px;top:6px;bottom:6px;border-radius:20px;padding:6px}.kogaUnifiedMenu.open{width:min(250px,82vw)}}
    `}</style>
  </>;
}
