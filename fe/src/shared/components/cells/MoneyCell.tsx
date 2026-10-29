import { Money } from '@/ds/components';

export interface MoneyCellProps {
  amount: number | string | null | undefined;
  currency?: string;
  strong?: boolean;
  rate?: number;
  altCurrency?: string;
}

/** Formatted Currency / Amount cell with optional conversion */
export function MoneyCell({
  amount,
  currency = 'USD',
  strong = false,
  rate,
  altCurrency = 'TZS'
}: MoneyCellProps) {
  const num = Number(amount ?? 0);
  const alt = rate ? (currency === 'USD' ? num * rate : num / rate) : null;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <Money amount={num} currency={currency} strong={strong} />
      {alt !== null && (
        <span className="xs faint">
          ≈ {altCurrency} {Math.round(alt).toLocaleString('en-US')}
        </span>
      )}
    </div>
  );
}
