import { api } from '@/api/client';

export const unitsApi = {
  getUnits: async (siteId?: string | number) => {
    try {
      const res = await api.get<any>(siteId ? `/units?siteId=${siteId}` : '/units');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getUnitDetail: async (unitStayId: string | number) => {
    try {
      const res = await api.get<any>(`/units/${unitStayId}`);
      return res?.item || res || null;
    } catch {
      return null;
    }
  }
};
