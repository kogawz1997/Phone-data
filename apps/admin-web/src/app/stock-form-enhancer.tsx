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

function simplifyMdmSetup() {
  const isMdmPage = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,.tab-btn,.notice")).some((node) => {
    const text = textOf(node);
    return text.includes("mdm setup") || text.includes("android management api") || text.includes("apple mdm");
  });
  if (!isMdmPage) return;

  document.querySelectorAll<HTMLElement>(".notice").forEach((notice) => {
    const text = textOf(notice);
    if (text.includes("mdm setup") || text.includes("บัญชี/cert/token") || text.includes("device-control")) {
      notice.innerHTML = "<b>ตัวสร้าง MDM สำหรับลูกค้า</b><br><span class='small'>หน้านี้เหลือแค่สร้าง Enrollment สำหรับ Android หรือ iOS/iPadOS เพื่อนำไปลงเครื่องลูกค้าที่มีสัญญาและยินยอมแล้ว ส่วน key, cert, token และ provider account ให้จัดการหลังบ้านโดย Platform Owner เท่านั้น</span>";
    }
    if (text.includes("provider device") || text.includes("ยังไม่ bind")) {
      const lines = notice.querySelectorAll(".small");
      lines.forEach((line) => {
        if (textOf(line).includes("provider device")) hideElement(line as HTMLElement);
      });
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
      text.includes("สิ่งที่ต้องสมัคร") ||
      text.includes("service account") ||
      text.includes("apns mdm certificate") ||
      text.includes("ade server token") ||
      text.includes("android management api") ||
      text.includes("apple business") ||
      text.includes("google cloud");
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

  document.querySelectorAll<HTMLElement>("h2,h3,p,.small").forEach((node) => {
    const raw = node.textContent || "";
    if (raw.includes("Android Management API")) node.textContent = "สร้าง MDM สำหรับ Android";
    if (raw.includes("Apple MDM / ADE")) node.textContent = "สร้าง MDM สำหรับ iOS/iPadOS";
    if (raw.includes("company-owned / fully managed")) node.textContent = "สร้าง enrollment สำหรับเครื่อง Android ก่อนส่งมอบให้ลูกค้า";
    if (raw.includes("Apple Business Manager") || raw.includes("supervised/ADE")) node.textContent = "สร้าง profile สำหรับ iPhone/iPad ก่อนส่งมอบให้ลูกค้า";
  });

  document.querySelectorAll<HTMLElement>('.card').forEach((card) => {
    const text = textOf(card);
    if (text.includes("สร้าง android enrollment") || text.includes("สร้าง apple enrollment profile")) {
      card.classList.add("good");
      if (!card.querySelector(".mdm-customer-only-note")) {
        const note = document.createElement("p");
        note.className = "small mdm-customer-only-note";
        note.textContent = "ใช้สร้างสำหรับติดตั้งให้ลูกค้าเท่านั้น ไม่มีช่องกรอก key/cert/token ในหน้าร้าน";
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
    const timer = window.setInterval(rewrite, 700);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return <DeviceStockEnhancer />;
}
