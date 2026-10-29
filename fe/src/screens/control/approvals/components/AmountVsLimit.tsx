import { Money } from '@/ds/components';
import { APPROVAL_LIMITS, type Apr } from '@/mock/cargo';

export function AmountVsLimit({ a }: { a: Apr }) {
  const lim = APPROVAL_LIMITS[a.permissionCode]?.limit;
  const over = lim !== undefined && Number(a.amount) > lim;
  return (
    <span className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
      <Money amount={a.amount} currency={a.amountCurrency} strong />
      {lim !== undefined && (
        <span className="xs" style={{ color: over ? 'var(--wait)' : 'var(--ink-3)' }}>
          {over ? 'Above' : 'Within'} limit {a.amountCurrency} {lim.toLocaleString()}
        </span>
      )}
    </span>
  );
}
