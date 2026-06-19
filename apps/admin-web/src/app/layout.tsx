import "./globals.css";
import "./login-clean.css";
import type { ReactNode } from "react";

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
      <body>{children}</body>
    </html>
  );
}
