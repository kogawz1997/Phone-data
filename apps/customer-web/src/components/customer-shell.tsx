import type { ReactNode } from "react";

export function CustomerShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="customer-shell">
      <header className="hero"><h1>{title}</h1></header>
      {children}
    </main>
  );
}
