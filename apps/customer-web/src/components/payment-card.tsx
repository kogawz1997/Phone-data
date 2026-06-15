export function PaymentCard({ amount, dueDate, status }: { amount: string | number; dueDate?: string; status: string }) {
  return (
    <article className="card payment-card">
      <p className="muted">ยอดที่ต้องชำระ</p>
      <strong>{amount}</strong>
      <p>ครบกำหนด: {dueDate ? new Date(dueDate).toLocaleDateString("th-TH") : "-"}</p>
      <span className="pill">{status}</span>
    </article>
  );
}
