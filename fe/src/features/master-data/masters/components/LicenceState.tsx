import { fmtD, NOW, Pill } from '@/ds/components';

const daysTo = (d?: string | null) => (d ? Math.ceil((Date.parse(d) - NOW.getTime()) / 86400000) : null);

export function LicenceState({ expiry }: { expiry?: string | null }) {
  const d = daysTo(expiry);
  if (d === null) return <span className="faint">No expiry recorded</span>;
  if (d < 0) return <Pill tone="stop">Expired {-d} day{d === -1 ? '' : 's'} ago</Pill>;
  if (d <= 30) return <Pill tone="wait">Expires in {d} day{d === 1 ? '' : 's'}</Pill>;
  return <span className="small">{fmtD(expiry)}</span>;
}
