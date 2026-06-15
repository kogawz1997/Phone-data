import "./globals.css";
import "./production-compact.css";
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
