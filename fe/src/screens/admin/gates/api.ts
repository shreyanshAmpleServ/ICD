import { api } from '@/api/client';
import { checkpoints as seedCheckpoints, gates as seedGates, visitTypes as seedVisitTypes, type Gate } from '@/mock/admin';

export const gatesApi = {
  getGates: async (siteId?: number): Promise<Gate[]> => {
    try {
      const url = siteId ? `/gates?siteId=${siteId}` : '/gates';
      const res = await api.get<any>(url);
      return res?.items ?? (Array.isArray(res) ? res : seedGates);
    } catch {
      return seedGates;
    }
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
      return res?.items ?? (Array.isArray(res) ? res : seedCheckpoints);
    } catch {
      return seedCheckpoints;
    }
  },
  updateCheckpoint: async (id: number, data: any) => {
    return api.patch<any>(`/checkpoints/${id}`, data);
  },
  getVisitTypes: async () => {
    try {
      const res = await api.get<any>('/visit-types');
      return res?.items ?? (Array.isArray(res) ? res : seedVisitTypes);
    } catch {
      return seedVisitTypes;
    }
  },
  updateVisitType: async (id: number, data: any) => {
    return api.patch<any>(`/visit-types/${id}`, data);
  },
};
