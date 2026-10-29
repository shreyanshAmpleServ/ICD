import { api } from '@/api/client';

export const mapApi = {
  getYardMap: async (siteId?: string | number) => {
    try {
      const res = await api.get<any>(siteId ? `/yard/map?siteId=${siteId}` : '/yard/map');
      return res || null;
    } catch {
      return null;
    }
  },

  getBlockSlots: async (blockId: number) => {
    try {
      const res = await api.get<any>(`/yard/blocks/${blockId}/slots`);
      return res || null;
    } catch {
      return null;
    }
  },
};
