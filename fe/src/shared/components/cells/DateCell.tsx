import { fmtD, fmtDT, ago } from '@/ds/components';

export interface DateCellProps {
  value: string | Date | null | undefined;
  withTime?: boolean;
  relative?: boolean;
}

/** Localized and relative Date/Time cell */
export function DateCell({
  value,
  withTime = false,
  relative = false
}: DateCellProps) {
  if (!value) return <span className="small muted">—</span>;
  const iso = typeof value === 'string' ? value : value.toISOString();

  return (
    <div className="small" title={fmtDT(iso)}>
      {relative ? ago(iso) : withTime ? fmtDT(iso) : fmtD(iso)}
    </div>
  );
}
