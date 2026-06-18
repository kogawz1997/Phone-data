"use client";

import { useEffect, useMemo, useState } from "react";

type Surface = "admin" | "owner";
type MenuItem = { id: string; label: string; icon: string; run: () => void; active?: boolean; danger?: boolean; group?: string };

function normalize(input: string) {
  return input.toLowerCase().trim();
}

function getSurface(): Surface {
  if (typeof window === "undefined") return "admin";
  const path = window.location.pathname;
  return path.startsWith("/platform") || path.startsWith("/signup") ? "owner" : "admin";
}

function isAuthScreen() {
  if (typeof window === "undefined") return true;
  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/forgot")) return true;
  const hasPassword = Boolean(document.querySelector('input[type="password"]'));
  const text = normalize(document.body.innerText || "");
  const hasAppContent = Boolean(document.querySelector(".app-shell .hero, .settingsSafe, .table-wrap, .tab-btn, form"));
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
  clickByText(".settingsSafe button", [label]);
}

function runPendingActions() {
  const pendingTab = window.sessionStorage.getItem("koga_pending_tab");
  if (pendingTab && clickByText(".tab-btn, button", [pendingTab])) window.sessionStorage.removeItem("koga_pending_tab");

  const pendingSettings = window.sessionStorage.getItem("koga_pending_settings_section");
  if (pendingSettings && window.location.pathname.startsWith("/settings") && clickByText(".settingsSafe button", [pendingSettings])) {
    window.sessionStorage.removeItem("koga_pending_settings_section");
  }
}

function logout() {
  try {
    Object.keys(window.localStorage).filter((key) => key.startsWith("koga_")).forEach((key) => window.localStorage.removeItem(key));
    Object.keys(window.sessionStorage).filter((key) => key.startsWith("koga_")).forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignored, browser storage is still a tiny bureaucrat with feelings.
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

function ensureMainContentTarget() {
  const main = document.querySelector<HTMLElement>("main");
  if (main && !main.id) main.id = "main-content";
}

export default function UXEnhancements() {
  const [surface, setSurface] = useState<Surface>("admin");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    const sync = () => {
      const mobile = window.innerWidth <= 980;
      setIsMobile(mobile);
      setSurface(getSurface());
      setPath(window.location.pathname);
      setReady(!isAuthScreen());
      runPendingActions();
      hideDuplicateChrome();
      ensureMainContentTarget();
      if (!mobile) setOpen(true);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(sync, 700);
    const onRoute = () => window.setTimeout(sync, 60);
    window.addEventListener("resize", sync);
    window.addEventListener("popstate", onRoute);
    window.addEventListener("hashchange", onRoute);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("resize", sync);
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
        { id: "owner-home", label: "Owner", icon: "✦", run: () => goPath("/platform"), active: path === "/platform" },
        { id: "owner-stores", label: "ร้านค้า", icon: "▦", run: () => scrollToText(["ร้านที่ใช้ระบบ", "ร้าน"]) },
        { id: "owner-billing", label: "บิล", icon: "฿", run: () => scrollToText(["ใบแจ้งหนี้", "invoice"]) },
        { id: "owner-risk", label: "iCloud Risk", icon: "◎", run: () => goPath("/platform/apple-custody-risk"), active: path.includes("apple-custody-risk") },
        { id: "owner-signup", label: "สมัครร้าน", icon: "+", run: () => goPath("/signup"), active: path.startsWith("/signup") },
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
      { id: "stock", label: "สต็อกเครื่อง", icon: "▦", run: () => goTab("สต็อกเครื่อง") },
      { id: "contracts", label: "สัญญา", icon: "▤", run: () => goTab("สัญญา") },
      { id: "payments", label: "ชำระเงิน", icon: "▭", run: () => goTab("ชำระเงิน") },
      { id: "tracking", label: "ติดตามงวด", icon: "◎", run: () => goTab("ติดตามงวด") },
      { id: "actions", label: "Device Actions", icon: "◇", run: () => goTab("Device Actions") },
      { id: "mdm", label: "MDM Setup", icon: "▥", run: () => goTab("MDM Setup") },
      { id: "reports", label: "รายงาน", icon: "▥", run: () => goTab("รายงาน") },
      { id: "readiness", label: "หน้างานจริง", icon: "▧", run: () => goTab("หน้างานจริง") },
      { id: "audit", label: "Audit", icon: "◎", run: () => goTab("Audit") },
      { id: "settings", label: "โปรไฟล์ร้าน", icon: "▣", run: () => goPath("/settings"), active: path.startsWith("/settings") },
      ...settingsItems,
      { id: "users", label: "ผู้ใช้", icon: "♙", run: () => goPath("/customer-access"), active: path.startsWith("/customer-access") },
      { id: "integrations", label: "Integrations", icon: "⌁", run: () => goPath("/integrations"), active: path.startsWith("/integrations") },
      { id: "owner", label: "Owner", icon: "♛", run: () => goPath("/platform") },
      { id: "logout", label: "ออกจากระบบ", icon: "⇱", run: logout, danger: true },
    ];
  }, [surface, path]);

  const runItem = (item: MenuItem) => {
    if (!open && isMobile) {
      setOpen(true);
      return;
    }
    item.run();
    if (isMobile && !item.danger) setOpen(false);
  };

  if (!ready) return null;

  return <>
    {open && isMobile && <button className="kogaMenuBackdrop" type="button" aria-label="ปิดเมนู" onClick={() => setOpen(false)} />}
    <aside className={`kogaUnifiedMenu ${open ? "open" : "closed"}`} aria-label="เมนูหลัก">
      <button
        className="kogaUnifiedBrand"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "ย่อเมนูหลัก" : "เปิดเมนูหลัก"}
        aria-expanded={open}
        aria-controls="koga-main-menu"
      >
        <span aria-hidden="true">K</span><b>{surface === "owner" ? "Owner Console" : "Store Console"}</b>
      </button>
      <nav id="koga-main-menu" aria-label="เมนูหลัก">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${item.active ? "active" : ""} ${item.danger ? "danger" : ""}`}
            onClick={() => runItem(item)}
            title={item.label}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
          >
            <i aria-hidden="true">{item.icon}</i><b>{item.label}</b>
          </button>
        ))}
      </nav>
    </aside>
  </>;
}
