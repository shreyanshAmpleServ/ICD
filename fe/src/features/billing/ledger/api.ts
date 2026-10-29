import { api } from '@/api/client';
import { glPostings, periods, type GlPost, type Period } from '@/mock/money';

export const ledgerApi = {
  getGlPostings: async (): Promise<GlPost[]> => {
    try {
      const r = await api.get<{ items: GlPost[] }>('/gl-postings');
      return r.items && r.items.length > 0 ? r.items : glPostings;
    } catch {
      return glPostings;
    }
  },

  getAccountingPeriods: async (): Promise<Period[]> => {
    try {
      const r = await api.get<{ items: Period[] }>('/accounting-periods');
      return r.items && r.items.length > 0 ? r.items : periods;
    } catch {
      return periods;
    }
  },

  retryPosting: async (glPostingId: number): Promise<any> => {
    return api.post<any>(`/gl-postings/${glPostingId}/retry`, {});
  },

  closePeriod: async (periodId: number): Promise<any> => {
    return api.post<any>(`/accounting-periods/${periodId}/close`, {});
  },

  reopenPeriod: async (periodId: number, reason: string): Promise<any> => {
    return api.post<any>(`/accounting-periods/${periodId}/reopen`, { reason });
  },
};
