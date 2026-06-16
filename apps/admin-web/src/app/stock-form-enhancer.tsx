"use client";

import { useEffect } from "react";
import DeviceStockEnhancer from "./device-stock-enhancer";

const ownerWebUrl = process.env.NEXT_PUBLIC_OWNER_WEB_URL || "";

type KogaWindow = Window & { __kogaSideOutsideBound?: boolean };

function ensureKogaTheme() {
  if (!document.getElementById("koga-design-system-link")) {
    const link = document.createElement("link");
    link.id = "koga-design-system-link";
    link.rel = "stylesheet";
    link.href = "/koga-design-system.css";
    document.head.appendChild(link);
  }
  if (document.getElementById("koga-design-system-fallback")) return;
  const style = document.createElement("style");
  style.id = "koga-design-system-fallback";
  style.textContent = `
    :root{--koga-bg:#050b16;--koga-bg-2:#07111f;--koga-card:rgba(12,22,37,.82);--koga-card-strong:rgba(16,29,48,.94);--koga-line:rgba(148,163,184,.16);--koga-text:#eef6ff;--koga-muted:#93a4ba;--koga-accent:#22d3ee;--koga-accent-2:#8b5cf6;--koga-shadow:0 28px 90px rgba(0,0,0,.28)}
    html,body{background:radial-gradient(circle at 18% 0%,rgba(34,211,238,.16),transparent 34%),radial-gradient(circle at 88% 0%,rgba(139,92,246,.16),transparent 34%),linear-gradient(135deg,var(--koga-bg),var(--koga-bg-2) 46%,#0f172a)!important;color:var(--koga-text)}
    .card,.panel,.metric,.stat,.notice,.alert,.table-wrap,.form-card,.hero-card,.profile-panel,.complete-card,.integration-card,.template-card,.section-card{border:1px solid var(--koga-line)!important;background:var(--koga-card)!important;border-radius:22px!important;box-shadow:var(--koga-shadow);backdrop-filter:blur(18px)}
    .hero,.profile-hero{border:1px solid var(--koga-line)!important;background:linear-gradient(135deg,rgba(34,211,238,.14),rgba(139,92,246,.12)),var(--koga-card)!important;border-radius:28px!important;box-shadow:var(--koga-shadow)}
    h1,h2,h3,h4,.metric-value,.stat b{color:var(--koga-text)!important;letter-spacing:-.035em}p,small,.small,.metric-label,.muted,label span,.field span,.form-help,.table td,.card p{color:var(--koga-muted)!important}
    input,select,textarea{border:1px solid var(--koga-line)!important;background:rgba(2,6,23,.28)!important;color:var(--koga-text)!important;border-radius:15px!important;outline:none!important}input:focus,select:focus,textarea:focus{border-color:rgba(34,211,238,.58)!important;box-shadow:0 0 0 4px rgba(34,211,238,.11)!important}
    button,.button,a.button,.ghost,.save,.primary,.secondary{border-radius:15px!important}button[type="submit"],.save,.primary,.cta,.hero-cta{border:0!important;background:linear-gradient(135deg,var(--koga-accent),var(--koga-accent-2))!important;color:white!important;font-weight:900}
    .badge,.status,.pill,.chip,.channel,.days button,.tab-btn{border:1px solid var(--koga-line)!important;background:rgba(148,163,184,.10)!important;color:var(--koga-muted)!important;border-radius:999px!important}.tab-btn.active,.badge.good,.status.good,.pill.good,.chip.active,.channel.active,.channel.on,.days button.active,.days button.on{border-color:rgba(34,211,238,.34)!important;background:linear-gradient(135deg,rgba(34,211,238,.18),rgba(139,92,246,.16))!important;color:var(--koga-text)!important}
  `;
  document.head.appendChild(style);
}

function textOf(node: Element) {
  return (node.textContent || "").toLowerCase();
}

function hideElement(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

function clickTab(label: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>(".tab-btn, button"));
  const target = buttons.find((button) => (button.innerText || button.textContent || "").toLowerCase().includes(label.toLowerCase()));
  if (target) {
    target.click();
    return true;
  }
  return false;
}

function goTab(label: string) {
  if (clickTab(label)) return;
  window.sessionStorage.setItem("koga_pending_tab", label);
  window.location.href = "/";
}

function runPendingTab() {
  const pending = window.sessionStorage.getItem("koga_pending_tab");
  if (!pending) return;
  if (clickTab(pending)) window.sessionStorage.removeItem("koga_pending_tab");
}

function bindCloseSideMenuOnOutsideClick() {
  const kogaWindow = window as KogaWindow;
  if (kogaWindow.__kogaSideOutsideBound) return;
  kogaWindow.__kogaSideOutsideBound = true;

  document.addEventListener("pointerdown", (event) => {
    const menu = document.querySelector<HTMLElement>(".koga-side-menu.open");
    if (!menu) return;
    const target = event.target as Node | null;
    if (target && menu.contains(target)) return;
    menu.classList.remove("open");
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelector<HTMLElement>(".koga-side-menu.open")?.classList.remove("open");
  });
}

function ensureGlobalSideMenu() {
  const pathname = window.location.pathname;
  const isSettings = pathname.startsWith("/settings");
  const isOwner = pathname.startsWith("/platform");

  if (isSettings) {
    document.documentElement.dataset.kogaSide = "off";
    document.querySelector(".koga-side-menu")?.remove();
    return;
  }

  document.documentElement.dataset.kogaSide = "on";
  bindCloseSideMenuOnOutsideClick();

  if (!document.getElementById("koga-side-menu-style")) {
    const style = document.createElement("style");
    style.id = "koga-side-menu-style";
    style.textContent = `
      html[data-koga-side="on"] .ux-bottom-nav,
      html[data-koga-side="on"] .ux-sheet,
      html[data-koga-side="on"] .ux-sheet-backdrop { display:none!important; }
      html[data-koga-side="on"] .app-shell { margin-left:84px!important; width:calc(100% - 84px)!important; padding-bottom:32px!important; }
      html[data-koga-side="on"] .ux-smart-search { display:none!important; }
      .koga-side-menu { position:fixed; left:10px; top:10px; bottom:10px; width:74px; z-index:1400; border:1px solid rgba(148,163,184,.18); border-radius:24px; background:rgba(2,8,23,.86); backdrop-filter:blur(22px); box-shadow:0 28px 90px rgba(0,0,0,.36); padding:10px; display:flex; flex-direction:column; gap:8px; transition:width .22s ease; overflow:hidden; }
      .koga-side-menu.open { width:min(286px,86vw); }
      .koga-side-brand { min-height:52px; border:0; border-radius:18px; background:linear-gradient(135deg,rgba(56,189,248,.30),rgba(129,140,248,.24)); color:#fff; display:flex; align-items:center; gap:12px; padding:0 8px; cursor:pointer; }
      .koga-side-logo { width:42px; min-width:42px; height:42px; border-radius:16px; display:grid; place-items:center; background:linear-gradient(135deg,#38bdf8,#818cf8); font-weight:900; }
      .koga-side-brand b, .koga-side-menu .text { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .koga-side-menu:not(.open) .text, .koga-side-menu:not(.open) .koga-side-brand b { display:none; }
      .koga-side-nav { display:grid; gap:6px; overflow:auto; padding-right:1px; }
      .koga-side-nav::-webkit-scrollbar { width:0; }
      .koga-side-menu button { font:inherit; }
      .koga-side-item { min-height:44px; border:0; border-radius:16px; background:transparent; color:#94a3b8; display:flex; align-items:center; gap:12px; padding:0 12px; cursor:pointer; text-align:left; }
      .koga-side-item:hover { color:#fff; background:rgba(148,163,184,.13); }
      .koga-side-icon { width:24px; min-width:24px; text-align:center; color:#38bdf8; font-style:normal; }
      .koga-side-tools { margin-top:auto; display:grid; gap:6px; border-top:1px solid rgba(148,163,184,.14); padding-top:8px; }
      .koga-side-menu:not(.open) .koga-side-item { justify-content:center; padding:0; }
      .koga-side-backdrop { display:none; }
      @media(max-width:900px) {
        html[data-koga-side="on"] .app-shell { margin-left:78px!important; width:calc(100% - 78px)!important; padding-left:0!important; padding-right:8px!important; }
        .koga-side-menu { left:8px; top:8px; bottom:8px; width:70px; border-radius:22px; }
        .koga-side-menu.open + .koga-side-backdrop { display:block; position:fixed; inset:0; z-index:1300; background:rgba(2,6,23,.38); backdrop-filter:blur(2px); }
        .koga-side-menu { z-index:1400; }
      }
    `;
    document.head.appendChild(style);
  }

  const menu = document.querySelector<HTMLElement>(".koga-side-menu") ?? document.createElement("aside");
  const oldSurface = menu.dataset.surface;
  if (oldSurface === (isOwner ? "owner" : "admin") && menu.isConnected) return;

  menu.className = "koga-side-menu";
  menu.dataset.surface = isOwner ? "owner" : "admin";

  const items = isOwner
    ? [
        ["Owner", "✦", () => window.scrollTo({ top: 0, behavior: "smooth" })],
        ["ร้านค้า", "▦", () => document.querySelector<HTMLElement>(".table-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" })],
        ["บิล", "฿", () => document.querySelector<HTMLElement>(".card:nth-of-type(3), .table-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" })],
        ["iCloud Risk", "◎", () => { window.location.href = "/platform/apple-custody-risk"; }],
        ["สมัครร้าน", "+", () => { window.location.href = "/signup"; }],
        ["Store", "⌂", () => { window.location.href = "/"; }],
      ]
    : [
        ["ภาพรวม", "⌂", () => goTab("ภาพรวม")],
        ["ลูกค้า", "◉", () => goTab("ลูกค้า")],
        ["สต็อก", "▦", () => goTab("สต็อก")],
        ["สัญญา", "▣", () => goTab("สัญญา")],
        ["ชำระเงิน", "฿", () => goTab("ชำระเงิน")],
        ["ติดตาม", "◇", () => goTab("ติดตาม")],
        ["Actions", "⚡", () => goTab("Device Actions")],
        ["สร้าง MDM", "◆", () => goTab("MDM")],
        ["รายงาน", "▤", () => goTab("รายงาน")],
        ["Audit", "◎", () => goTab("Audit")],
        ["โปรไฟล์ร้าน", "⚙", () => { window.location.href = "/settings"; }],
        ["Users ลูกค้า", "◌", () => { window.location.href = "/customer-access"; }],
        ["Integrations", "⌁", () => { window.location.href = "/integrations"; }],
        ["Owner", "✦", () => { window.location.href = "/platform"; }],
      ];

  menu.innerHTML = `
    <button class="koga-side-brand" type="button"><span class="koga-side-logo">K</span><b>${isOwner ? "Owner" : "Store"}</b></button>
    <nav class="koga-side-nav"></nav>
    <div class="koga-side-tools">
      <button class="koga-side-item koga-side-toggle" type="button"><i class="koga-side-icon">→</i><span class="text">ย่อ/ขยาย</span></button>
    </div>
  `;

  const nav = menu.querySelector(".koga-side-nav")!;
  items.forEach(([label, icon, run]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "koga-side-item";
    button.title = String(label);
    button.innerHTML = `<i class="koga-side-icon">${icon}</i><span class="text">${label}</span>`;
    button.addEventListener("click", () => {
      menu.classList.remove("open");
      (run as () => void)();
    });
    nav.appendChild(button);
  });

  menu.querySelector(".koga-side-brand")?.addEventListener("click", () => menu.classList.toggle("open"));
  menu.querySelector(".koga-side-toggle")?.addEventListener("click", () => menu.classList.toggle("open"));

  const backdrop = document.querySelector(".koga-side-backdrop") ?? document.createElement("div");
  backdrop.className = "koga-side-backdrop";
  backdrop.addEventListener("click", () => menu.classList.remove("open"));

  document.body.appendChild(menu);
  document.body.appendChild(backdrop);
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
      notice.innerHTML = "<b>ตัวสร้าง MDM สำหรับลูกค้า</b><br><span class='small'>หน้านี้เหลือแค่สร้าง Enrollment สำหรับ Android หรือ iOS/iPadOS เพื่อนำไปลงเครื่องลูกค้าที่มีสัญญาและยินยอมแล้ว ส่วน provider account ให้จัดการหลังบ้านโดย Platform Owner เท่านั้น</span>";
    }
    if (text.includes("provider device") || text.includes("ยังไม่ bind")) {
      const lines = notice.querySelectorAll(".small");
      lines.forEach((line) => { if (textOf(line).includes("provider device")) hideElement(line as HTMLElement); });
    }
  });

  document.querySelectorAll<HTMLElement>("form, .card, .timeline-item").forEach((node) => {
    const text = textOf(node);
    const shouldHide =
      text.includes("android enterprise signup") || text.includes("สร้าง android enterprise") || text.includes("bind provider device") || text.includes("providerdevicename") || text.includes("providerenrollmentid") || text.includes("devicetoken") || text.includes("pushmagic") || text.includes("สิ่งที่ต้องสมัคร") || text.includes("service account") || text.includes("apns mdm certificate") || text.includes("ade server token") || text.includes("android management api") || text.includes("apple business") || text.includes("google cloud") || text.includes("callback url") || text.includes("enterprise token") || text.includes("signupurlname");
    if (shouldHide) hideElement(node);
  });

  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const text = textOf(button);
    const shouldHide = text.includes("ตรวจสถานะ provider") || text.includes("publish lease-basic") || text.includes("publish apple profile") || text.includes("sync abm") || text.includes("สร้าง signup url") || text.includes("สร้าง enterprise") || text.includes("บันทึก binding");
    if (shouldHide) hideElement(button);
  });

  document.querySelectorAll<HTMLElement>("h1,h2,h3,p,.small").forEach((node) => {
    const raw = node.textContent || "";
    if (raw.includes("MDM Setup")) node.textContent = raw.replace("MDM Setup", "ตัวสร้าง MDM สำหรับลูกค้า");
    if (raw.includes("Android Management API")) node.textContent = "สร้าง MDM สำหรับ Android";
    if (raw.includes("Apple MDM / ADE")) node.textContent = "สร้าง MDM สำหรับ iOS/iPadOS";
    if (raw.includes("company-owned / fully managed")) node.textContent = "สร้าง enrollment สำหรับเครื่อง Android ก่อนส่งมอบให้ลูกค้า";
    if (raw.includes("Apple Business Manager") || raw.includes("supervised/ADE")) node.textContent = "สร้าง profile สำหรับ iPhone/iPad ก่อนส่งมอบให้ลูกค้า";
    if (raw.includes("key/cert/token")) node.textContent = raw.replace("key/cert/token", "provider account");
  });

  document.querySelectorAll<HTMLElement>(".card").forEach((card) => {
    const text = textOf(card);
    if (text.includes("สร้าง android enrollment") || text.includes("สร้าง apple enrollment profile")) {
      card.classList.add("good");
      if (!card.querySelector(".mdm-customer-only-note")) {
        const note = document.createElement("p");
        note.className = "small mdm-customer-only-note";
        note.textContent = "ใช้สร้างสำหรับติดตั้งให้ลูกค้าเท่านั้น ไม่มีช่องกรอก provider account ในหน้าร้าน";
        card.appendChild(note);
      }
    }
  });

  document.querySelectorAll<HTMLElement>("pre").forEach((pre) => {
    if ((pre.textContent || "").includes("กดปุ่มด้านบนเพื่อเริ่มตั้งค่า")) {
      pre.textContent = "กดสร้าง Android Enrollment หรือ Apple Enrollment Profile เพื่อสร้างข้อมูลติดตั้งให้ลูกค้า";
    }
  });
}

export default function StockFormEnhancer() {
  useEffect(() => {
    const rewrite = () => {
      ensureKogaTheme();
      if (ownerWebUrl) {
        document.querySelectorAll<HTMLAnchorElement>('a[href="/platform"]').forEach((link) => {
          link.href = ownerWebUrl.replace(/\/$/, "") + "/platform";
          link.target = "_self";
        });
      }
      ensureGlobalSideMenu();
      runPendingTab();
      simplifyMdmSetup();
    };
    rewrite();
    const observer = new MutationObserver(rewrite);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(rewrite, 700);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      document.documentElement.dataset.kogaSide = "off";
    };
  }, []);

  return <DeviceStockEnhancer />;
}
