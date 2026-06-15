import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Customer Portal",
  description: "Phone finance customer portal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
