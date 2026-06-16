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
    };
  }, []);

  return <DeviceStockEnhancer />;
}
