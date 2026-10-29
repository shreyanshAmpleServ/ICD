import { api } from '@/api/client';
import { tariff, tariffs, type Tariff } from '@/mock/money';

export const tariffsApi = {
  getTariffs: async (): Promise<Tariff[]> => {
    try {
      const r = await api.get<{ items: Tariff[] }>('/tariffs');
      return r.items && r.items.length > 0 ? r.items : tariffs;
    } catch {
      return tariffs;
    }
  },

  getTariff: async (tariffId: number): Promise<Tariff | undefined> => {
    try {
      const r = await api.get<Tariff>(`/tariffs/${tariffId}`);
      return r ?? tariff(tariffId);
    } catch {
      return tariff(tariffId);
    }
  },

  saveTariff: async (data: Partial<Tariff>): Promise<Tariff> => {
    return api.post<Tariff>('/tariffs', data);
  },

  approveTariff: async (tariffId: number): Promise<Tariff> => {
    return api.post<Tariff>(`/tariffs/${tariffId}/approve`, {});
  },
};
