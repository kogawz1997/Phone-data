export function MetricCard({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <div className="card metric-card">
      <div className="muted">{title}</div>
      <strong className="metric-value">{value}</strong>
      {hint ? <p className="muted small">{hint}</p> : null}
    </div>
  );
}
