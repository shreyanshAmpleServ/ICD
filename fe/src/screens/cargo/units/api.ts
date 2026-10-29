import { api } from '@/api/client';
import { staysAt, stay } from '@/mock/core';

export const unitsApi = {
  getUnits: async (siteId?: string | number) => {
    const sId = Number(siteId) || 1;
    try {
      const res = await api.get<any[]>(siteId ? `/units?siteId=${siteId}` : '/units');
      return res && res.length > 0 ? res : staysAt(sId);
    } catch {
      return staysAt(sId);
    }
  },

  getUnitDetail: async (unitStayId: string | number) => {
    try {
      const res = await api.get<any>(`/units/${unitStayId}`);
      return res || stay(Number(unitStayId));
    } catch {
      return stay(Number(unitStayId));
    }
  }
};
