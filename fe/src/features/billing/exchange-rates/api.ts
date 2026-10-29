import { api } from '@/api/client';
import { rateOn, rates, type Rate } from '@/mock/money';

export const exchangeRatesApi = {
  getRates: async (): Promise<Rate[]> => {
    try {
      const r = await api.get<{ items: Rate[] }>('/exchange-rates');
      return r.items && r.items.length > 0 ? r.items : rates;
    } catch {
      return rates;
    }
  },

  getEffectiveRate: async (date: string) => {
    try {
      const r = await api.get<any>(`/exchange-rates/effective?date=${date}`);
      return r ?? rateOn(date);
    } catch {
      return rateOn(date);
    }
  },

  saveRate: async (data: Partial<Rate>): Promise<Rate> => {
    return api.post<Rate>('/exchange-rates', data);
  },
};
