import { Pill } from '@/ds/components';
import { fmtAmt } from '../../components/shared';

export function DiffBadge({ v, cur }: { v: number; cur: string }) {
  if (Math.abs(v) < 0.005) return <Pill tone="go">Balanced</Pill>;
  return <Pill tone={v < 0 ? 'stop' : 'wait'}>{v < 0 ? 'Short' : 'Over'} {fmtAmt(Math.abs(v), cur)}</Pill>;
}
