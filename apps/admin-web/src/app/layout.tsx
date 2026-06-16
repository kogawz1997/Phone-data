import "./globals.css";
import "./production-compact.css";
import "./mobile-premium.css";
import "./motion-professional.css";
import "./ux-enhancements.css";
import "./login-clean.css";
import "./admin-compact-header.css";
import "./admin-professional-polish.css";
import type { ReactNode } from "react";
import UXEnhancements from "./ux-enhancements";

export const metadata = {
  title: "KOGA Lease MDM SaaS",
  description: "Multi-tenant lease-to-own MDM SaaS for rental shops",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>
        {children}
        <UXEnhancements />
      </body>
    </html>
  );
}
