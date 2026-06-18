import "./globals.css";
import "./login-clean.css";
import "./admin-compact-header.css";
import "./admin-professional-polish.css";
import type { ReactNode } from "react";
import UXEnhancements from "./ux-enhancements";

export const metadata = {
  title: "KOGA Lease MDM SaaS",
  description: "Multi-tenant lease-to-own MDM SaaS for rental shops",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        <a className="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a>
        {children}
        <UXEnhancements />
      </body>
    </html>
  );
}
