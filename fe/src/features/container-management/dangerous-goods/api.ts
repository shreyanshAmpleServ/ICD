import { api } from '@/api/client';
import { dgLines as seed, type DgRow } from '@/mock/cargo';

export const dangerousGoodsApi = {
  getDgLines: async () => {
    try {
      const res = await api.get<{ items: DgRow[] }>('/dg-lines');
      return res?.items && res.items.length > 0 ? res.items : seed;
    } catch {
      return seed;
    }
  },

  getUnitDgLines: async (unitStayId: string | number) => {
    try {
      const res = await api.get<any>(`/units/${unitStayId}/dg-lines`);
      return res || [];
    } catch {
      return [];
    }
  },

  updateUnitDgLines: async (unitStayId: string | number, body: any) => {
    return api.put<any>(`/units/${unitStayId}/dg-lines`, body);
  }
};
