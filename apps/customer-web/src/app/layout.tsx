import "./globals.css";
import "./koga-design-system.css";
import "./customer-experience.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "KOGA Customer Portal",
  description: "Phone finance customer portal",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
