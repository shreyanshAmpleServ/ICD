import { Pill } from '@/ds/components';
import type { SR } from '@/mock/insight';

export function ReqStatus({ r }: { r: SR }) {
  const map: Record<string, [string, 'go' | 'wait' | 'stop' | 'idle' | 'info']> = {
    SUBMITTED: ['Sent', 'info'],
    PENDING: ['Pending', 'info'],
    IN_REVIEW: ['Being handled', 'wait'],
    NEEDS_INFO: ['We need more from you', 'stop'],
    APPROVED: ['Done', 'go'],
    REJECTED: ['Declined', 'idle'],
    CLOSED: ['Closed', 'idle'],
  };
  const [l, t] = (r.status && map[r.status]) ? map[r.status] : [r.status || 'Pending', 'info' as const];
  return <Pill tone={t}>{l}</Pill>;
}
