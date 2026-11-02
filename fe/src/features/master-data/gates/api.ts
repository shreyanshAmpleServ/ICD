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
  deleteGate: async (id: number) => {
    return api.delete<any>(`/gates/${id}`);
  },

  createLane: async (gateId: number, data: any) => {
    return api.post<any>(`/gates/${gateId}/lanes`, data);
  },
  updateLane: async (laneId: number, data: any) => {
    return api.patch<any>(`/gate-lanes/${laneId}`, data);
  },
  deleteLane: async (laneId: number) => {
    return api.delete<any>(`/gate-lanes/${laneId}`);
  },

  getCheckpoints: async () => {
    try {
      const res = await api.get<any>('/checkpoints');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createCheckpoint: async (data: any) => {
    return api.post<any>('/checkpoints', data);
  },
  updateCheckpoint: async (id: number, data: any) => {
    return api.patch<any>(`/checkpoints/${id}`, data);
  },
  deleteCheckpoint: async (id: number) => {
    return api.delete<any>(`/checkpoints/${id}`);
  },

  getVisitTypes: async () => {
    try {
      const res = await api.get<any>('/visit-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createVisitType: async (data: any) => {
    return api.post<any>('/visit-types', data);
  },
  updateVisitType: async (id: number, data: any) => {
    return api.patch<any>(`/visit-types/${id}`, data);
  },
  deleteVisitType: async (id: number) => {
    return api.delete<any>(`/visit-types/${id}`);
  },
};
