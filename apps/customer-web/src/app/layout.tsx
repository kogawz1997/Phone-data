import "./globals.css";
import "./customer-experience.css";
import "./customer-luxury-modern.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "KOGA Customer Portal",
  description: "Phone finance customer portal",
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
