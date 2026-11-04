import { api } from '@/api/client';
import type { Rate } from '@/mock/money';

export const exchangeRatesApi = {
  getRates: async (): Promise<Rate[]> => {
    const r = await api.get<{ items: Rate[] }>('/exchange-rates');
    return r.items || [];
  },

  getEffectiveRate: async (date: string): Promise<{ rate: Rate; note: string }> => {
    return api.get<{ rate: Rate; note: string }>(`/exchange-rates/effective?date=${date}`);
  },

  saveRate: async (data: Partial<Rate>): Promise<Rate> => {
    if (data.exchangeRateId && data.exchangeRateId < 900) {
      return api.patch<Rate>(`/exchange-rates/${data.exchangeRateId}`, data);
    }
    return api.post<Rate>('/exchange-rates', data);
  },
};
