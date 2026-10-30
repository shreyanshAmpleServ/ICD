import { api } from '@/api/client';
import { type Gate } from '@/mock/admin';

export const gatesApi = {
  getGates: async (siteId?: number): Promise<Gate[]> => {
    try {
      const url = siteId ? `/gates?siteId=${siteId}` : '/gates';
      const res = await api.get<any>(url);
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createGate: async (data: any) => {
    return api.post<any>('/gates', data);
  },
  updateGate: async (id: number, data: any) => {
    return api.patch<any>(`/gates/${id}`, data);
  },
  getCheckpoints: async () => {
    try {
      const res = await api.get<any>('/checkpoints');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateCheckpoint: async (id: number, data: any) => {
    return api.patch<any>(`/checkpoints/${id}`, data);
  },
  getVisitTypes: async () => {
    try {
      const res = await api.get<any>('/visit-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateVisitType: async (id: number, data: any) => {
    return api.patch<any>(`/visit-types/${id}`, data);
  },
};
