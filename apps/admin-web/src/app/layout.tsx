import "./globals.css";
import "./login-clean.css";
import "./admin-compact-header.css";
import "./admin-professional-polish.css";
import "./admin-luxury-modern-v2.css";
import "./admin-command-center.css";
import "./admin-shortcuts.css";
import type { ReactNode } from "react";
import UXEnhancements from "./ux-enhancements";
import HomeShortcut from "./home-shortcut";
import AdminCommandCenter from "./admin-command-center";

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
        <HomeShortcut />
        <AdminCommandCenter />
        {children}
        <UXEnhancements />
      </body>
    </html>
  );
}
