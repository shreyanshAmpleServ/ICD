import { api } from '@/api/client';
import { disbursements, type Disb } from '@/mock/money';

export const disbursementsApi = {
  getDisbursements: async () => {
    try {
      const r = await api.get<{ items: Disb[] }>('/disbursements');
      return r.items && r.items.length > 0 ? r.items : disbursements;
    } catch {
      return disbursements;
    }
  },

  recordDisbursement: async (data: Partial<Disb>) => {
    return api.post<Disb>('/disbursements', data);
  },

  requestWriteOff: async (disbursementId: number, reason: string) => {
    return api.post<any>(`/disbursements/${disbursementId}/write-off`, { reason });
  },
};
