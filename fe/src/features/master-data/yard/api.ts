import { api } from '@/api/client';
import type { YardNode } from '@/mock/admin';

export const yardApi = {
  getYardLocations: async (siteId?: number): Promise<YardNode[]> => {
    try {
      const url = siteId ? `/yard/locations?siteId=${siteId}` : '/yard/locations';
      const res = await api.get<any>(url);
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createYardLocation: async (data: any) => {
    return api.post<any>('/yard/locations', data);
  },
  updateYardLocation: async (id: number, data: any) => {
    return api.patch<any>(`/yard/locations/${id}`, data);
  },
};
