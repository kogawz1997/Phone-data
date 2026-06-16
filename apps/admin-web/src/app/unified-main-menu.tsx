"use client";

import { useEffect, useMemo, useState } from "react";

type Surface = "admin" | "owner";
type MenuItem = { label: string; icon: string; run: () => void; active?: boolean; group?: string };

function norm(value: string) {
  return value.toLowerCase().trim();
}

function isAuthScreen() {
  const path = window.location.pathname;
  if (path.startsWith("/signup") || path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/forgot")) return true;
  const hasPassword = Boolean(document.querySelector('input[type="password"]'));
  const bodyText = norm(document.body.innerText || "");
  const saysLogin = bodyText.includes("เข้าสู่ระบบ") || bodyText.includes("login") || bodyText.includes("sign in");
  const hasAppContent = Boolean(document.querySelector(".app-shell .hero, .settingsSafe, .table-wrap, .tab-btn, .ux-smart-search"));
  return hasPassword && saysLogin && !hasAppContent;
}

function getSurface(): Surface {
  return window.location.pathname.startsWith("/platform") ? "owner" : "admin";
}

function clickText(selector: string, labels: string[]) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const target = nodes.find((node) => labels.some((label) => norm(node.innerText || node.textContent || "").includes(norm(label))));
  if (target) {
    target.click();
    return true;
  }
  return false;
}

function scrollText(labels: string[]) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,.card,.hero,.table-wrap"));
  const target = nodes.find((node) => labels.some((label) => norm(node.innerText || node.textContent || "").includes(norm(label))));
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  return false;
}

function goPath(href: string) {
  window.location.href = href;
}

function goStoreTab(label: string) {
  if (window.location.pathname !== "/") {
    window.sessionStorage.setItem("koga_pending_tab", label);
    goPath("/");
    return;
  }
  clickText(".tab-btn, button", [label]);
}

function runPendingTab() {
  const pending = window.sessionStorage.getItem("koga_pending_tab");
  if (!pending) return;
  if (clickText(".tab-btn, button", [pending])) window.sessionStorage.removeItem("koga_pending_tab");
}

function clickSettingSection(label: string) {
  if (window.location.pathname !== "/settings") {
    goPath("/settings");
    return;
  }
  clickText(".settingsSafe .safeSide nav button, .settingsSafe button", [label]);
}

export default function UnifiedMainMenu() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState<Surface>("admin");
  const [path, setPath] = useState("");

  useEffect(() => {
    const sync = () => {
      setReady(!isAuthScreen());
      setSurface(getSurface());
      setPath(window.location.pathname);
      runPendingTab();
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(sync, 700);
    const onPop = () => sync();
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<MenuItem[]>(() => {
    if (surface === "owner") {
      return [
        { label: "Owner", icon: "✦", run: () => window.scrollTo({ top: 0, behavior: "smooth" }), active: path === "/platform" },
        { label: "ร้านค้า", icon: "▦", run: () => scrollText(["ร้านที่ใช้ระบบ", "ร้าน"]), group: "Owner" },
        { label: "บิล", icon: "฿", run: () => scrollText(["ใบแจ้งหนี้", "invoice"]), group: "Owner" },
        { label: "iCloud Risk", icon: "◎", run: () => goPath("/platform/apple-custody-risk"), active: path.includes("apple-custody-risk") },
        { label: "สมัครร้าน", icon: "+", run: () => goPath("/signup") },
        { label: "Store", icon: "⌂", run: () => goPath("/") },
      ];
    }

    const settingsItems: MenuItem[] = path.startsWith("/settings") ? [
      { label: "ข้อมูลร้าน", icon: "▣", run: () => clickSettingSection("ข้อมูลร้าน"), group: "ตั้งค่า" },
      { label: "รับเงิน", icon: "฿", run: () => clickSettingSection("รับเงิน"), group: "ตั้งค่า" },
      { label: "Portal", icon: "◎", run: () => clickSettingSection("Portal"), group: "ตั้งค่า" },
      { label: "แจ้งเตือน", icon: "◌", run: () => clickSettingSection("แจ้งเตือน"), group: "ตั้งค่า" },
      { label: "เอกสาร", icon: "▤", run: () => clickSettingSection("เอกสาร"), group: "ตั้งค่า" },
      { label: "ระบบนอก", icon: "⌁", run: () => clickSettingSection("ระบบนอก"), group: "ตั้งค่า" },
      { label: "ความปลอดภัย", icon: "◇", run: () => clickSettingSection("ความปลอดภัย"), group: "ตั้งค่า" },
    ] : [];

    return [
      { label: "ภาพรวม", icon: "⌂", run: () => goStoreTab("ภาพรวม"), active: path === "/" },
      { label: "ลูกค้า", icon: "♙", run: () => goStoreTab("ลูกค้า") },
      { label: "สต็อก", icon: "▦", run: () => goStoreTab("สต็อก") },
      { label: "สัญญา", icon: "▤", run: () => goStoreTab("สัญญา") },
      { label: "ชำระเงิน", icon: "▭", run: () => goStoreTab("ชำระเงิน") },
      { label: "ติดตาม", icon: "◎", run: () => goStoreTab("ติดตาม") },
      { label: "สร้าง MDM", icon: "◇", run: () => goStoreTab("MDM") },
      { label: "รายงาน", icon: "▥", run: () => goStoreTab("รายงาน") },
      { label: "โปรไฟล์ร้าน", icon: "▣", run: () => goPath("/settings"), active: path.startsWith("/settings") },
      ...settingsItems,
      { label: "ผู้ใช้", icon: "♙", run: () => goPath("/customer-access"), active: path.startsWith("/customer-access") },
      { label: "Integrations", icon: "⌁", run: () => goPath("/integrations"), active: path.startsWith("/integrations") },
      { label: "Owner", icon: "♛", run: () => goPath("/platform") },
    ];
  }, [surface, path]);

  if (!ready) return null;

  const runItem = (item: MenuItem) => {
    if (!open) {
      setOpen(true);
      return;
    }
    item.run();
    if (window.innerWidth <= 980) setOpen(false);
  };

  return <>
    {open && <button className="kogaMainBackdrop" type="button" aria-label="ปิดเมนู" onClick={() => setOpen(false)} />}
    <aside className={`kogaMainNav ${open ? "open" : "closed"}`} aria-label="เมนูหลัก">
      <button className="kogaMainBrand" type="button" onClick={() => setOpen((value) => !value)}><span>K</span><b>{surface === "owner" ? "Owner Console" : "Store Console"}</b></button>
      <nav>
        {items.map((item) => <button key={`${item.group || "main"}-${item.label}`} type="button" className={item.active ? "active" : ""} onClick={() => runItem(item)} title={item.label}><i>{item.icon}</i><b>{item.label}</b></button>)}
      </nav>
    </aside>
    <style>{`
      body:has(.kogaMainNav) .ux-bottom-nav,
      body:has(.kogaMainNav) .ux-sheet,
      body:has(.kogaMainNav) .ux-sheet-backdrop,
      body:has(.kogaMainNav) .ux-fab { display: none !important; }
      body:has(.kogaMainNav) .app-shell { margin-left: 78px !important; width: calc(100% - 78px) !important; padding-bottom: 32px !important; }
      body:has(.kogaMainNav) .settingsSafe { display: block !important; padding-left: 78px !important; }
      body:has(.kogaMainNav) .settingsSafe .safeSide { display: none !important; }
      body:has(.kogaMainNav) .settingsSafe .safeMain { margin-left: 0 !important; padding-left: 0 !important; }
      .kogaMainNav { position: fixed; left: 8px; top: 8px; bottom: 8px; z-index: 1200; width: 62px; border: 1px solid rgba(148,163,184,.16); border-radius: 22px; background: rgba(3,10,22,.88); backdrop-filter: blur(22px); box-shadow: 0 22px 70px rgba(0,0,0,.30); padding: 7px; display: flex; flex-direction: column; gap: 10px; transition: width .2s ease; overflow: hidden; }
      .kogaMainNav.open { width: min(252px, 84vw); }
      .kogaMainBrand { min-height: 50px; border: 0; border-radius: 17px; background: linear-gradient(135deg, rgba(34,211,238,.22), rgba(139,92,246,.24)); color: #fff; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 0; cursor: pointer; }
      .kogaMainNav.open .kogaMainBrand { justify-content: flex-start; padding: 0 9px; }
      .kogaMainBrand span { width: 42px; height: 42px; min-width: 42px; border-radius: 15px; display: grid; place-items: center; background: linear-gradient(135deg, #22d3ee, #8b5cf6); font-weight: 950; color: #fff; }
      .kogaMainBrand b, .kogaMainNav nav button b { display: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .kogaMainNav.open .kogaMainBrand b, .kogaMainNav.open nav button b { display: block; }
      .kogaMainNav nav { display: grid; gap: 7px; overflow: auto; padding-bottom: 6px; scrollbar-width: none; }
      .kogaMainNav nav::-webkit-scrollbar { display: none; }
      .kogaMainNav nav button { min-height: 43px; border: 1px solid transparent; border-radius: 14px; background: transparent; color: #9fb2ca; display: flex; align-items: center; justify-content: center; gap: 11px; padding: 0; cursor: pointer; font-weight: 820; }
      .kogaMainNav.open nav button { justify-content: flex-start; padding: 0 11px; }
      .kogaMainNav nav button:hover, .kogaMainNav nav button.active { color: #fff; border-color: rgba(34,211,238,.24); background: linear-gradient(135deg, rgba(14,165,233,.18), rgba(139,92,246,.18)); }
      .kogaMainNav nav button i { width: 22px; min-width: 22px; text-align: center; color: #67e8f9; font-style: normal; }
      .kogaMainBackdrop { display: none; }
      body:has(.settingsSafe.light) .kogaMainNav { background: rgba(255,255,255,.88); border-color: rgba(15,23,42,.12); box-shadow: 0 22px 70px rgba(15,23,42,.14); }
      body:has(.settingsSafe.light) .kogaMainNav nav button { color: #475569; }
      body:has(.settingsSafe.light) .kogaMainNav nav button:hover, body:has(.settingsSafe.light) .kogaMainNav nav button.active { color: #0f172a; background: rgba(14,165,233,.12); border-color: rgba(14,165,233,.22); }
      @media (max-width: 980px) {
        body:has(.kogaMainNav) .app-shell { margin-left: 68px !important; width: calc(100% - 68px) !important; padding-left: 0 !important; padding-right: 8px !important; }
        body:has(.kogaMainNav) .settingsSafe { padding-left: 68px !important; }
        .kogaMainNav { width: 56px; left: 6px; top: 6px; bottom: 6px; border-radius: 20px; }
        .kogaMainNav.open { width: min(250px, 82vw); }
        .kogaMainNav.open + .kogaMainBackdrop, .kogaMainBackdrop { position: fixed; inset: 0; z-index: 1190; background: rgba(2,6,23,.46); backdrop-filter: blur(3px); }
      }
    `}</style>
  </>;
}
