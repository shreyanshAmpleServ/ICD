import type { S } from '@/api/types';

export const TOLERANCE_PCT = 5;
export const WB_LIVE_KG = 37820;

export type TicketStatus = 'OK' | 'OVERRIDE_PENDING' | 'OVERRIDDEN' | 'NO_DECLARED';

export type Ticket = S<'Weighing'> & {
  plateNo: string;
  unitNo?: string;
  operator: string;
  status: TicketStatus;
  approvalNo?: string;
};
