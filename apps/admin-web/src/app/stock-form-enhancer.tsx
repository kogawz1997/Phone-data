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
      if (!node.dataset.settingsGuardOriginalDisplay) node.dataset.settingsGuardOriginalDisplay = node.style.display || "__empty__";
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

function ensureSettingsProfileStyle() {
  const onSettings = window.location.pathname.startsWith("/settings");
  const existing = document.getElementById("settings-profile-console-style");
  if (!onSettings) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = "settings-profile-console-style";
  style.textContent = `
    .settingsSafe{--safe-glow:0 24px 80px rgba(0,0,0,.24);background:radial-gradient(circle at 18% 0%,rgba(34,211,238,.14),transparent 30%),radial-gradient(circle at 88% 0%,rgba(139,92,246,.17),transparent 32%),linear-gradient(135deg,#020817,#07111f 48%,#0b1020)!important;}
    .settingsSafe .safeSide{margin:10px 0 10px 10px;height:calc(100vh - 20px);border:1px solid rgba(148,163,184,.16);border-radius:22px;background:rgba(3,10,22,.86);box-shadow:var(--safe-glow);}
    .settingsSafe .safeBrand{min-height:60px;border-radius:18px;background:transparent;border-bottom:1px solid rgba(148,163,184,.12);}
    .settingsSafe .safeBrand span,.settingsSafe .safeBrand img{width:50px;height:50px;min-width:50px;border-radius:18px;box-shadow:0 18px 44px rgba(34,211,238,.16);}
    .settingsSafe .safeSide nav button{min-height:46px;border:1px solid transparent;border-radius:14px;font-weight:850;}
    .settingsSafe .safeSide nav button.active{border-color:rgba(34,211,238,.28);background:linear-gradient(135deg,rgba(14,165,233,.72),rgba(139,92,246,.82));color:white;box-shadow:0 14px 34px rgba(59,130,246,.22);}
    .settingsSafe .safeMain{max-width:1480px;margin:0 auto;padding:18px 20px 28px;}
    .settingsSafe .safeTop{border:1px solid rgba(148,163,184,.12);border-radius:20px;background:rgba(2,8,23,.34);padding:14px 16px;backdrop-filter:blur(18px);}
    .settingsSafe .safeTop h1{font-size:28px;line-height:1;}
    .settingsSafe .safeActions button{min-width:112px;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}
    .settingsSafe .safeActions button:hover,.settingsSafe .safeSavebar button:hover{transform:translateY(-1px);border-color:rgba(34,211,238,.34);box-shadow:0 14px 34px rgba(14,165,233,.12);}
    .settingsSafe .safeHero{position:relative;overflow:hidden;border-radius:26px;padding:22px;grid-template-columns:140px minmax(240px,1fr) minmax(480px,1.4fr);background:linear-gradient(135deg,rgba(11,23,42,.9),rgba(13,25,46,.93))!important;}
    .settingsSafe .safeHero:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(180deg,rgba(0,0,0,.72),transparent 76%);}
    .settingsSafe .safeHero>*{position:relative;z-index:1;}
    .settingsSafe .safeAvatar{width:128px;height:128px;border:2px solid rgba(59,130,246,.9);box-shadow:0 20px 50px rgba(37,99,235,.2);}
    .settingsSafe .safeHero h2{font-size:32px;letter-spacing:-.045em;}
    .settingsSafe .safeStats{align-self:stretch;grid-template-columns:repeat(4,minmax(0,1fr));}
    .settingsSafe .safeStat{display:grid;align-content:center;gap:7px;min-height:88px;border-radius:16px;background:linear-gradient(180deg,rgba(15,29,52,.86),rgba(9,18,34,.9));}
    .settingsSafe .safeStat b{font-size:clamp(23px,3vw,32px);letter-spacing:-.05em;}
    .settingsSafe .safeWorkspace{grid-template-columns:minmax(0,1.04fr) minmax(360px,.96fr);align-items:start;gap:18px;margin-top:18px;}
    .settingsSafe .safePanel,.settingsSafe .safePreviewCard{border-radius:22px;background:linear-gradient(180deg,rgba(13,25,46,.92),rgba(8,16,31,.94));box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 18px 54px rgba(0,0,0,.18);}
    .settingsSafe .safePanel h3,.settingsSafe .safePreviewCard h3{font-size:20px;border-bottom:1px solid rgba(148,163,184,.12);padding-bottom:12px;}
    .settingsSafe .safeField input,.settingsSafe .safeField textarea{background:rgba(3,9,20,.56);min-height:42px;transition:border-color .16s ease,box-shadow .16s ease;}
    .settingsSafe .safeField input:focus,.settingsSafe .safeField textarea:focus{border-color:rgba(34,211,238,.56);box-shadow:0 0 0 4px rgba(34,211,238,.1);}
    .settingsSafe .safePreview{top:14px;gap:18px;}
    .settingsSafe .safeSavebar{max-width:930px;margin:0 auto;z-index:4;border-radius:20px;background:rgba(4,12,26,.86);box-shadow:0 20px 54px rgba(0,0,0,.32);}
    @media(max-width:1200px){.settingsSafe .safeHero{grid-template-columns:128px minmax(180px,1fr)}.settingsSafe .safeStats{grid-column:1/-1}.settingsSafe .safeWorkspace{grid-template-columns:1fr}.settingsSafe .safePreview{position:static;grid-template-columns:1fr 1fr;display:grid}}
    @media(max-width:980px){.settingsSafe,.settingsSafe.collapsed{display:block;min-height:100vh;padding:10px}.settingsSafe .safeSide{position:sticky;top:8px;left:auto;right:auto;bottom:auto;z-index:20;height:auto;width:auto;margin:0 0 12px;padding:10px;border-radius:22px}.settingsSafe .safeBrand{min-height:52px;justify-content:flex-start;padding:0 8px;margin-bottom:8px}.settingsSafe .safeBrand b,.settingsSafe.collapsed .safeBrand b{display:block;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.settingsSafe .safeBrand span,.settingsSafe .safeBrand img{width:42px;height:42px;min-width:42px;border-radius:15px}.settingsSafe .safeSide nav{display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding:2px 0 6px;scrollbar-width:none}.settingsSafe .safeSide nav::-webkit-scrollbar{display:none}.settingsSafe .safeSide nav button,.settingsSafe.collapsed .safeSide nav button{min-width:max-content;min-height:42px;justify-content:center;padding:0 12px;border:1px solid rgba(148,163,184,.12);border-radius:999px;background:rgba(148,163,184,.08)}.settingsSafe .safeSide nav button b,.settingsSafe.collapsed .safeSide nav button b{display:block;font-size:13px}.settingsSafe .safeSide nav button i{width:auto}.settingsSafe .safeSideTools{display:flex;gap:8px;margin-top:6px;padding-top:8px;border-top:1px solid rgba(148,163,184,.12)}.settingsSafe .safeSideTools button,.settingsSafe .safeSideTools a,.settingsSafe.collapsed .safeSideTools button,.settingsSafe.collapsed .safeSideTools a{min-height:38px;justify-content:center;padding:0 12px;border:1px solid rgba(148,163,184,.12);border-radius:999px}.settingsSafe .safeSideTools b,.settingsSafe.collapsed .safeSideTools b{display:block;font-size:12px}.settingsSafe .safeMain{margin-left:0;padding:0 0 18px;width:100%}.settingsSafe .safeTop{align-items:stretch;flex-direction:column;gap:12px;margin-bottom:12px}.settingsSafe .safeTop h1{font-size:24px}.settingsSafe .safeActions{display:grid;grid-template-columns:1fr 1fr;width:100%}.settingsSafe .safeActions button{min-height:46px;width:100%}.settingsSafe .safeHero{grid-template-columns:1fr;gap:14px;padding:16px;border-radius:22px}.settingsSafe .safeAvatar{width:104px;height:104px}.settingsSafe .safeHero h2{font-size:24px}.settingsSafe .safeStats{grid-template-columns:1fr 1fr}.settingsSafe .safeWorkspace{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px}.settingsSafe .safePanel,.settingsSafe .safePreviewCard{border-radius:20px;padding:14px}.settingsSafe .safeGrid{grid-template-columns:1fr}.settingsSafe .safePreview{position:static;display:grid;grid-template-columns:1fr;gap:12px}.settingsSafe .safeSavebar{position:sticky;bottom:8px;grid-template-columns:1fr;padding:10px;border-radius:18px}.settingsSafe .safeSavebar button{min-height:46px}}
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
      ensureSettingsProfileStyle();
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
      document.getElementById("settings-profile-console-style")?.remove();
    };
  }, []);

  return <DeviceStockEnhancer />;
}
