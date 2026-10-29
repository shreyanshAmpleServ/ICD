import type { ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { Segmented, cx, fmtT, NOW } from '@/ds/components';
import { useSession } from '@/app/session';
import './insight.css';

/* Small pieces shared by the insight and customer screens. Kept local
   because src/ds is shared; candidates for the design system. */

/** "Last updated 10:30 · live", or "offline" when the socket is down. */
export function LiveIndicator({ at = NOW.toISOString() }: { at?: string }) {
  const { offline } = useSession();
  return (
    <span className={cx('live', offline && 'live-off')} role="status" aria-live="polite">
      <span className="live-dot" aria-hidden />
      Last updated {fmtT(at)} · {offline ? 'reconnecting' : 'live'}
    </span>
  );
}

export type ViewMode = 'chart' | 'table';
/** Chart / table switch: every chart where the numbers matter has a table view. */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <Segmented<ViewMode> label="Show as" value={value} onChange={onChange} options={[
      { id: 'chart', label: <span className="row" style={{ gap: 6 }}><BarChart3 size={15} />Chart</span> },
      { id: 'table', label: <span className="row" style={{ gap: 6 }}><Table2 size={15} />Table</span> },
    ]} />
  );
}

/** A labelled number in a compact cell. */
export function Stat({ label, value, note, tone }: { label: ReactNode; value: ReactNode; note?: ReactNode; tone?: 'stop' | 'wait' }) {
  return (
    <div className="ct-cell">
      <span className="small muted">{label}</span>
      <span className="ct-big" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</span>
      {note && <span className="xs muted">{note}</span>}
    </div>
  );
}

export const shortDate = (iso: string) => new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Africa/Dar_es_Salaam' });
