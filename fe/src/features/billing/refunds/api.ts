import { api } from '@/api/client';
import { refunds, type Refund } from '@/mock/money';

export const refundsApi = {
  getRefunds: async (): Promise<Refund[]> => {
    try {
      const r = await api.get<{ items: Refund[]; total?: number }>('/refunds');
      if (r && Array.isArray(r.items) && r.items.length > 0) {
        return r.items;
      }
      if (Array.isArray(r) && r.length > 0) {
        return r as Refund[];
      }
      return refunds;
    } catch (err) {
      console.warn('[refundsApi.getRefunds] Error fetching refunds:', err);
      return refunds;
    }
  },

  createRefund: async (data: {
    paymentId: number;
    amount: string | number;
    currency: string;
    reason: string;
    method?: string;
    refundNo?: string;
  }): Promise<Refund> => {
    return api.post<Refund>('/refunds', data);
  },

  decideRefund: async (
    refundId: number,
    ok: boolean,
    level?: number,
    note?: string
  ): Promise<{ success: boolean; refundId: number; status: string }> => {
    return api.post<{ success: boolean; refundId: number; status: string }>(
      `/refunds/${refundId}/decide`,
      { ok, level, note }
    );
  },

  markPaid: async (
    refundId: number,
    data: { paidReference: string; paidAt?: string }
  ): Promise<{ success: boolean; refundId: number; status: string; paidAt?: string; paidReference?: string }> => {
    return api.post<{ success: boolean; refundId: number; status: string; paidAt?: string; paidReference?: string }>(
      `/refunds/${refundId}/mark-paid`,
      data
    );
  },
};
