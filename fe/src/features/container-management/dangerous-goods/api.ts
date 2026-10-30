import { api } from '@/api/client';

export const dangerousGoodsApi = {
  getDgLines: async () => {
    try {
      const res = await api.get<any>('/dg-lines');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getUnitDgLines: async (unitStayId: string | number) => {
    try {
      const res = await api.get<any>(`/units/${unitStayId}/dg-lines`);
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  updateUnitDgLines: async (unitStayId: string | number, body: any) => {
    return api.put<any>(`/units/${unitStayId}/dg-lines`, body);
  }
};
