import { api } from '@/api/client';
import { tariff, tariffs, type Tariff, type Rule } from '@/mock/money';

export const tariffsApi = {
  getTariffs: async (): Promise<Tariff[]> => {
    try {
      const r = await api.get<{ items: Tariff[]; total: number }>('/tariffs');
      return r?.items && r.items.length > 0 ? r.items : tariffs;
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

  getTariffRules: async (tariffId: number): Promise<Rule[]> => {
    try {
      const r = await api.get<{ items: Rule[] }>(`/tariffs/${tariffId}/rules`);
      return r?.items || [];
    } catch {
      const t = tariff(tariffId);
      return t?.rules || [];
    }
  },

  saveTariff: async (data: Partial<Tariff>): Promise<Tariff> => {
    return api.post<Tariff>('/tariffs', data);
  },

  updateTariff: async (tariffId: number, data: Partial<Tariff>): Promise<Tariff> => {
    return api.patch<Tariff>(`/tariffs/${tariffId}`, data);
  },

  submitTariff: async (tariffId: number): Promise<{ success: boolean; tariff: Tariff }> => {
    return api.post<{ success: boolean; tariff: Tariff }>(`/tariffs/${tariffId}:submit`, {});
  },

  newVersion: async (tariffId: number): Promise<Tariff> => {
    return api.post<Tariff>(`/tariffs/${tariffId}:new-version`, {});
  },

  approveTariff: async (tariffId: number): Promise<Tariff> => {
    return api.patch<Tariff>(`/tariffs/${tariffId}`, { status: 'ACTIVE' });
  },
};
