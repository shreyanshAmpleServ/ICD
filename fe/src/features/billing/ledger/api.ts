import { api } from '@/api/client';
import type { GlPost, Period } from '@/mock/money';

export const ledgerApi = {
  getGlPostings: async (): Promise<GlPost[]> => {
    const r = await api.get<{ items: GlPost[] }>('/gl-postings');
    return r.items || [];
  },

  getAccountingPeriods: async (): Promise<Period[]> => {
    const r = await api.get<{ items: Period[] }>('/accounting-periods');
    return r.items || [];
  },

  retryPosting: async (glPostingId: number): Promise<any> => {
    return api.post<any>(`/gl-postings/${glPostingId}:retry`, {});
  },

  closePeriod: async (periodId: number): Promise<any> => {
    return api.post<any>(`/accounting-periods/${periodId}:close`, {});
  },

  reopenPeriod: async (periodId: number, reason: string): Promise<any> => {
    return api.post<any>(`/accounting-periods/${periodId}:reopen`, { reason });
  },
};
