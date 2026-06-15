export function toMoney(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return numeric.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function baht(value: number | string | null | undefined) {
  return `${toMoney(value)} บาท`;
}
