import "./globals.css";
import "./login-clean.css";
import "./sign-in.css";
import "./live-app.css";
import "./live-app-polish.css";
import "./live-mobile-drawer.css";
import "./dashboard-reference.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "KOGA Lease MDM SaaS",
  description: "Multi-tenant lease-to-own MDM SaaS for rental shops",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
