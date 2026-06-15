export function StatusPill({ status }: { status?: string }) {
  const text = status || "UNKNOWN";
  const normalized = text.toUpperCase();
  const tone = ["ACTIVE", "PAID", "PAID_OFF", "CONFIRMED", "COMPLETED", "RELEASED", "TRANSFERRED"].includes(normalized)
    ? "var(--good-bg)"
    : ["OVERDUE", "FAILED", "REJECTED", "SUSPENDED", "CANCELLED", "DISPUTED"].includes(normalized)
      ? "var(--bad-bg)"
      : "var(--warn-bg)";
  return <span className="pill" style={{ background: tone }}>{text}</span>;
}
