"use client";

import { useEffect } from "react";

export default function CustomerUX() {
  useEffect(() => {
    const ensureMain = () => {
      const main = document.querySelector<HTMLElement>("main");
      if (main && !main.id) main.id = "main-content";
    };
    ensureMain();
    const observer = new MutationObserver(ensureMain);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
