import { api } from '@/api/client';

export const unitTypesApi = {
  getUnitTypes: async () => {
    try {
      const res = await api.get<any>('/unit-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateUnitType: async (code: string, data: any) => {
    return api.patch<any>(`/unit-types/${code}`, data);
  },
  getIdentityRules: async () => {
    try {
      const res = await api.get<any>('/identity-rules');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  getCargoRegimes: async () => {
    try {
      const res = await api.get<any>('/cargo-regimes');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
};
