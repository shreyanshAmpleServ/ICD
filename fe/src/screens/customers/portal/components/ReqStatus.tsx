import { Pill } from '@/ds/components';
import type { SR } from '@/mock/insight';

export function ReqStatus({ r }: { r: SR }) {
  const map: Record<string, [string, 'go' | 'wait' | 'stop' | 'idle' | 'info']> = {
    SUBMITTED: ['Sent', 'info'],
    IN_REVIEW: ['Being handled', 'wait'],
    NEEDS_INFO: ['We need more from you', 'stop'],
    APPROVED: ['Done', 'go'],
    REJECTED: ['Declined', 'idle'],
    CLOSED: ['Closed', 'idle'],
  };
  const [l, t] = map[r.status!];
  return <Pill tone={t}>{l}</Pill>;
}
