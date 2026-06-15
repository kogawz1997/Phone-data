import type { ReactNode } from "react";

export function DashboardShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <main className="dashboard-shell">
      <header className="hero">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
      </header>
      {children}
    </main>
  );
}
