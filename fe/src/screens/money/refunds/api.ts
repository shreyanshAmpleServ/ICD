import { api } from '@/api/client';
import { refunds, type Refund } from '@/mock/money';

export const refundsApi = {
  getRefunds: async () => {
    try {
      const r = await api.get<{ items: Refund[] }>('/refunds');
      return r.items && r.items.length > 0 ? r.items : refunds;
    } catch {
      return refunds;
    }
  },

  createRefund: async (data: Partial<Refund>) => {
    return api.post<Refund>('/refunds', data);
  },

  decideRefund: async (refundId: number, ok: boolean, level: number) => {
    return api.post<Refund>(`/refunds/${refundId}/decide`, { ok, level });
  },

  markPaid: async (refundId: number, data: { paidReference: string; paidAt?: string }) => {
    return api.post<Refund>(`/refunds/${refundId}/mark-paid`, data);
  },
};
