"use client";

import { useEffect } from "react";

function onSettingsPage() {
  return window.location.pathname.startsWith("/settings");
}

function hideNode(node: HTMLElement) {
  if (!node.dataset.settingsFixOriginalDisplay) {
    node.dataset.settingsFixOriginalDisplay = node.style.display || "__empty__";
  }
  node.style.display = "none";
  node.setAttribute("aria-hidden", "true");
}

function restoreNode(node: HTMLElement) {
  const original = node.dataset.settingsFixOriginalDisplay;
  if (original) node.style.display = original === "__empty__" ? "" : original;
  node.removeAttribute("aria-hidden");
}

function normalizeTokenError() {
  if (!onSettingsPage()) return;
  document.querySelectorAll<HTMLElement>(".safeAlert.bad, .alert.bad, [class*='Alert'][class*='bad']").forEach((node) => {
    const text = (node.textContent || "").toLowerCase();
    if (!text.includes("missing bearer token") && !text.includes("bearer token")) return;
    node.classList.add("settingsSessionBox");
    node.innerHTML = `
      <b>เซสชันหมดอายุ</b>
      <span>กรุณาเข้าสู่ระบบใหม่เพื่อโหลดข้อมูลร้านและบันทึกการตั้งค่า</span>
      <a href="/">กลับไปเข้าสู่ระบบ</a>
    `;
  });
}

function hideBottomChrome() {
  const selectors = [
    ".ux-bottom-nav",
    ".mobile-bottom-nav",
    ".app-bottom-nav",
    ".bottom-nav",
    ".bottomNav",
    ".floating-bottom-nav",
    "[data-mobile-nav]",
    "[data-bottom-nav]",
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      if (onSettingsPage()) hideNode(node);
      else restoreNode(node);
    });
  });

  if (!onSettingsPage()) return;
  document.querySelectorAll<HTMLElement>("nav, div").forEach((node) => {
    if (node.closest(".settingsSafe")) return;
    const text = node.innerText || "";
    const looksLikeOldBottomNav = text.includes("ภาพรวม") && text.includes("ลูกค้า") && text.includes("สัญญา") && text.includes("เพิ่มเติม");
    if (!looksLikeOldBottomNav) return;
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    const nearBottom = rect.bottom > window.innerHeight - 180;
    if ((style.position === "fixed" || style.position === "sticky") && nearBottom) hideNode(node);
  });
}

function mountStyle() {
  if (!onSettingsPage()) {
    document.getElementById("settings-runtime-fix-style")?.remove();
    return;
  }
  if (document.getElementById("settings-runtime-fix-style")) return;
  const style = document.createElement("style");
  style.id = "settings-runtime-fix-style";
  style.textContent = `
    .settingsSafe .settingsSessionBox,
    .settingsSafe .safeAlert.bad.settingsSessionBox {
      border-color: rgba(251, 113, 133, 0.35) !important;
      background: rgba(127, 29, 29, 0.16) !important;
      color: #fecaca !important;
      display: grid !important;
      gap: 8px !important;
      line-height: 1.45 !important;
    }
    .settingsSafe .settingsSessionBox b { font-size: 18px; color: #fecaca; }
    .settingsSafe .settingsSessionBox span { color: #fca5a5; }
    .settingsSafe .settingsSessionBox a {
      width: max-content;
      border-radius: 12px;
      background: linear-gradient(135deg, #22d3ee, #8b5cf6);
      color: white;
      text-decoration: none;
      padding: 10px 14px;
      font-weight: 900;
    }
    @media (max-width: 980px) {
      .settingsSafe .safeWorkspace { padding-bottom: 14px !important; }
      .settingsSafe .safeSavebar {
        position: static !important;
        bottom: auto !important;
        margin-top: 12px !important;
        transform: none !important;
        box-shadow: none !important;
      }
      .settingsSafe .safeSavebar button { min-height: 48px !important; }
      .settingsSafe .safePanel { overflow: visible !important; }
      .settingsSafe .safeField input,
      .settingsSafe .safeField textarea { font-size: 16px !important; }
    }
  `;
  document.head.appendChild(style);
}

export default function SettingsRuntimeFix() {
  useEffect(() => {
    const run = () => {
      mountStyle();
      normalizeTokenError();
      hideBottomChrome();
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(run, 600);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      document.getElementById("settings-runtime-fix-style")?.remove();
    };
  }, []);

  return null;
}
