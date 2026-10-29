// Pure Currency Formatting Helpers for DCC NG ICD

export function formatCurrency(
  amount?: number | string | null,
  currency: string = 'USD',
  decimals: number = 2
): string {
  if (amount === undefined || amount === null || amount === '') return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return String(amount);

  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${formatted} ${currency}`;
}

export function formatNumber(value?: number | string | null): string {
  if (value === undefined || value === null || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString();
}
