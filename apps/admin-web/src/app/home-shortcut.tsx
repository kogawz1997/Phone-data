"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HomeShortcut() {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;

  return (
    <Link className="kogaHomeShortcut" href="/" aria-label="กลับหน้าหลัก" title="กลับหน้าหลัก">
      <span aria-hidden="true">⌂</span>
      <b>หน้าหลัก</b>
    </Link>
  );
}
