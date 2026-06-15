export type InstallmentDraft = {
  installmentNo: number;
  dueDate: Date;
  amount: number;
};

export function generateContractNo(prefix = "CT") {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
  return `${prefix}-${year}${month}-${random}`;
}

export function calculateInstallments(input: {
  totalAmount: number;
  installmentCount: number;
  firstDueDate: string | Date;
}): InstallmentDraft[] {
  if (input.totalAmount <= 0) throw new Error("totalAmount must be positive");
  if (input.installmentCount <= 0) throw new Error("installmentCount must be positive");

  const base = Math.floor(input.totalAmount / input.installmentCount);
  const remainder = input.totalAmount - base * input.installmentCount;
  const firstDue = new Date(input.firstDueDate);

  return Array.from({ length: input.installmentCount }).map((_, index) => {
    const dueDate = new Date(firstDue);
    dueDate.setMonth(firstDue.getMonth() + index);
    return {
      installmentNo: index + 1,
      dueDate,
      amount: index === input.installmentCount - 1 ? base + remainder : base,
    };
  });
}

export function getOverdueLevel(daysOverdue: number) {
  if (daysOverdue <= 0) return "NONE";
  if (daysOverdue <= 3) return "OVERDUE";
  if (daysOverdue <= 7) return "GRACE_PERIOD";
  if (daysOverdue <= 14) return "REVIEW_REQUIRED";
  return "RECOVERY";
}
