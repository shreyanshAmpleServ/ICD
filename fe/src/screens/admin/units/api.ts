import { api } from '@/api/client';
import { unitTypes as seedUnitTypes, identityRules as seedRules, cargoRegimes as seedRegimes } from '@/mock/admin';

export const unitTypesApi = {
  getUnitTypes: async () => {
    try {
      const res = await api.get<any>('/unit-types');
      return res?.items ?? (Array.isArray(res) ? res : seedUnitTypes);
    } catch {
      return seedUnitTypes;
    }
  },
  updateUnitType: async (code: string, data: any) => {
    return api.patch<any>(`/unit-types/${code}`, data);
  },
  getIdentityRules: async () => {
    try {
      const res = await api.get<any>('/identity-rules');
      return res?.items ?? (Array.isArray(res) ? res : seedRules);
    } catch {
      return seedRules;
    }
  },
  getCargoRegimes: async () => {
    try {
      const res = await api.get<any>('/cargo-regimes');
      return res?.items ?? (Array.isArray(res) ? res : seedRegimes);
    } catch {
      return seedRegimes;
    }
  },
};
