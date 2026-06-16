"use client";

import { useEffect } from "react";
import DeviceStockEnhancer from "./device-stock-enhancer";

const ownerWebUrl = process.env.NEXT_PUBLIC_OWNER_WEB_URL || "";

export default function StockFormEnhancer() {
  useEffect(() => {
    if (!ownerWebUrl) return;
    const rewrite = () => {
      document.querySelectorAll<HTMLAnchorElement>('a[href="/platform"]').forEach((link) => {
        link.href = ownerWebUrl.replace(/\/$/, "") + "/platform";
        link.target = "_self";
      });
    };
    rewrite();
    const observer = new MutationObserver(rewrite);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <DeviceStockEnhancer />;
}
