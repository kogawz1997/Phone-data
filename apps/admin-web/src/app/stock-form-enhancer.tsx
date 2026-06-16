"use client";

import { useEffect } from "react";
import DeviceStockEnhancer from "./device-stock-enhancer";

const ownerWebUrl = process.env.NEXT_PUBLIC_OWNER_WEB_URL || "";

function textOf(node: Element) {
  return (node.textContent || "").toLowerCase();
}

function hideElement(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

function cleanupInjectedUi() {
  document.documentElement.dataset.kogaSide = "off";
  document.querySelector(".koga-side-menu")?.remove();
  document.querySelector(".koga-side-backdrop")?.remove();
  document.querySelector("#koga-side-menu-style")?.remove();
  document.querySelector("#koga-design-system-link")?.remove();
  document.querySelector("#koga-design-system-fallback")?.remove();
  const shell = document.querySelector<HTMLElement>(".app-shell");
  if (shell) {
    shell.style.marginLeft = "";
    shell.style.width = "";
    shell.style.paddingLeft = "";
    shell.style.paddingRight = "";
  }
}

function guardSettingsRouteChrome() {
  const onSettings = window.location.pathname.startsWith("/settings");
  const selectors = [".ux-bottom-nav", ".ux-sheet", ".ux-sheet-backdrop", ".ux-smart-search"];
  selectors.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      if (!node.dataset.settingsGuardOriginalDisplay) {
        node.dataset.settingsGuardOriginalDisplay = node.style.display || "__empty__";
      }
      if (onSettings) {
        node.style.display = "none";
        node.setAttribute("aria-hidden", "true");
      } else {
        const original = node.dataset.settingsGuardOriginalDisplay;
        node.style.display = original && original !== "__empty__" ? original : "";
        node.removeAttribute("aria-hidden");
      }
    });
  });
}

function ensureSettingsMobileSafeStyle() {
  const onSettings = window.location.pathname.startsWith("/settings");
  const existing = document.getElementById("settings-mobile-safe-style");
  if (!onSettings) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = "settings-mobile-safe-style";
  style.textContent = `
    @media (max-width: 980px) {
      .settingsSafe,.settingsSafe.collapsed{display:block;min-height:100vh;padding:10px;}
      .settingsSafe .safeSide{position:sticky;top:8px;left:auto;right:auto;bottom:auto;z-index:20;height:auto;width:auto;margin:0 0 12px;padding:10px;border:1px solid rgba(148,163,184,.16);border-radius:22px;background:rgba(2,8,23,.82);backdrop-filter:blur(20px);}
      .settingsSafe.light .safeSide{background:rgba(255,255,255,.78);}
      .settingsSafe .safeBrand{min-height:52px;justify-content:flex-start;padding:0 8px;margin-bottom:8px;}
      .settingsSafe .safeBrand b,.settingsSafe.collapsed .safeBrand b{display:block;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .settingsSafe .safeBrand span,.settingsSafe .safeBrand img{width:42px;height:42px;min-width:42px;border-radius:15px;}
      .settingsSafe .safeSide nav{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding:2px 0 6px;scrollbar-width:none;}
      .settingsSafe .safeSide nav::-webkit-scrollbar{display:none;}
      .settingsSafe .safeSide nav button,.settingsSafe.collapsed .safeSide nav button{min-width:max-content;min-height:42px;justify-content:center;padding:0 12px;border:1px solid rgba(148,163,184,.12);border-radius:999px;background:rgba(148,163,184,.08);}
      .settingsSafe .safeSide nav button b,.settingsSafe.collapsed .safeSide nav button b{display:block;font-size:13px;}
      .settingsSafe .safeSide nav button i{width:auto;}
      .settingsSafe .safeSideTools{display:flex;gap:8px;margin-top:6px;padding-top:8px;border-top:1px solid rgba(148,163,184,.12);}
      .settingsSafe .safeSideTools button,.settingsSafe .safeSideTools a,.settingsSafe.collapsed .safeSideTools button,.settingsSafe.collapsed .safeSideTools a{min-height:38px;justify-content:center;padding:0 12px;border:1px solid rgba(148,163,184,.12);border-radius:999px;}
      .settingsSafe .safeSideTools b,.settingsSafe.collapsed .safeSideTools b{display:block;font-size:12px;}
      .settingsSafe .safeMain{margin-left:0;padding:0 0 18px;width:100%;}
      .settingsSafe .safeTop{align-items:stretch;flex-direction:column;gap:12px;margin-bottom:12px;}
      .settingsSafe .safeTop h1{font-size:24px;}
      .settingsSafe .safeActions{display:grid;grid-template-columns:1fr 1fr;width:100%;}
      .settingsSafe .safeActions button{min-height:46px;width:100%;}
      .settingsSafe .safeHero{grid-template-columns:1fr;gap:14px;padding:16px;border-radius:22px;}
      .settingsSafe .safeAvatar{width:104px;height:104px;}
      .settingsSafe .safeHero h2{font-size:24px;}
      .settingsSafe .safeStats{grid-template-columns:1fr 1fr;}
      .settingsSafe .safeWorkspace{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px;}
      .settingsSafe .safePanel,.settingsSafe .safePreviewCard{border-radius:20px;padding:14px;}
      .settingsSafe .safeGrid{grid-template-columns:1fr;}
      .settingsSafe .safePreview{position:static;display:grid;grid-template-columns:1fr;gap:12px;}
      .settingsSafe .safeSavebar{position:sticky;bottom:8px;grid-template-columns:1fr;padding:10px;border-radius:18px;}
      .settingsSafe .safeSavebar button{min-height:46px;}
    }
  `;
  document.head.appendChild(style);
}

function simplifyMdmSetup() {
  const isMdmPage = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,.tab-btn,.notice")).some((node) => {
    const text = textOf(node);
    return text.includes("mdm setup") || text.includes("android management api") || text.includes("apple mdm") || text.includes("สร้าง mdm");
  });
  if (!isMdmPage) return;

  document.querySelectorAll<HTMLButtonElement>("button.tab-btn, .tab-btn").forEach((button) => {
    const raw = button.textContent || "";
    if (raw.includes("MDM Setup")) button.textContent = raw.replace("MDM Setup", "สร้าง MDM").replace("Android + iOS", "ติดตั้งลูกค้า");
  });

  document.querySelectorAll<HTMLElement>(".notice").forEach((notice) => {
    const text = textOf(notice);
    if (text.includes("mdm setup") || text.includes("บัญชี/cert/token") || text.includes("device-control")) {
      notice.innerHTML = "<b>ตัวสร้าง MDM สำหรับลูกค้า</b><br><span class='small'>สร้าง Enrollment สำหรับ Android หรือ iOS/iPadOS เพื่อนำไปลงเครื่องลูกค้าที่มีสัญญาและยินยอมแล้ว</span>";
    }
  });

  document.querySelectorAll<HTMLElement>("form, .card, .timeline-item").forEach((node) => {
    const text = textOf(node);
    const shouldHide =
      text.includes("android enterprise signup") ||
      text.includes("สร้าง android enterprise") ||
      text.includes("bind provider device") ||
      text.includes("providerdevicename") ||
      text.includes("providerenrollmentid") ||
      text.includes("devicetoken") ||
      text.includes("pushmagic") ||
      text.includes("service account") ||
      text.includes("apns mdm certificate") ||
      text.includes("ade server token") ||
      text.includes("callback url") ||
      text.includes("enterprise token") ||
      text.includes("signupurlname");
    if (shouldHide) hideElement(node);
  });

  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const text = textOf(button);
    const shouldHide =
      text.includes("ตรวจสถานะ provider") ||
      text.includes("publish lease-basic") ||
      text.includes("publish apple profile") ||
      text.includes("sync abm") ||
      text.includes("สร้าง signup url") ||
      text.includes("สร้าง enterprise") ||
      text.includes("บันทึก binding");
    if (shouldHide) hideElement(button);
  });
}

export default function StockFormEnhancer() {
  useEffect(() => {
    const rewrite = () => {
      cleanupInjectedUi();
      guardSettingsRouteChrome();
      ensureSettingsMobileSafeStyle();
      if (ownerWebUrl) {
        document.querySelectorAll<HTMLAnchorElement>('a[href="/platform"]').forEach((link) => {
          link.href = ownerWebUrl.replace(/\/$/, "") + "/platform";
          link.target = "_self";
        });
      }
      simplifyMdmSetup();
    };
    rewrite();
    const observer = new MutationObserver(rewrite);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(rewrite, 1000);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      cleanupInjectedUi();
      document.getElementById("settings-mobile-safe-style")?.remove();
    };
  }, []);

  return <DeviceStockEnhancer />;
}
