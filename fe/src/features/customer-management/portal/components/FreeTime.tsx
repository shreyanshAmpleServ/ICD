import { fmtD } from '@/ds/components';
import type { Stay } from '@/mock/core';

export function FreeTime({ s }: { s: Stay }) {
  if (!s.freeUntil) return <span className="faint small">—</span>;
  const left = Math.ceil((Date.parse(s.freeUntil) - Date.parse('2026-10-07T07:30:00Z')) / 86400000);
  return (
    <span className="small nowrap">
      {left >= 0 ? `${left} day${left === 1 ? '' : 's'} left` : <span style={{ color: 'var(--wait)' }}>{-left} day{left === -1 ? '' : 's'} of storage</span>}
      <div className="xs faint">until {fmtD(s.freeUntil)}</div>
    </span>
  );
}
