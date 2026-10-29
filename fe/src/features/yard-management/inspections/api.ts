import { api } from '@/api/client';
import { inspections, type Insp } from '@/mock/ops';

export const inspectionsApi = {
  getInspections: async (siteId?: number): Promise<Insp[]> => {
    try {
      const res = await api.get<Insp[]>('/inspections');
      const list = res && res.length > 0 ? res : inspections;
      return siteId ? list.filter((i) => i.siteId === siteId) : list;
    } catch {
      return siteId ? inspections.filter((i) => i.siteId === siteId) : inspections;
    }
  },

  getInspection: async (inspectionId: number): Promise<Insp | undefined> => {
    try {
      const res = await api.get<Insp>(`/inspections/${inspectionId}`);
      return res || inspections.find((i) => i.inspectionId === inspectionId);
    } catch {
      return inspections.find((i) => i.inspectionId === inspectionId);
    }
  },

  startInspection: async (data: Partial<Insp>) => {
    return api.post<Insp>('/inspections', data);
  },

  saveResults: async (inspectionId: number, data: any) => {
    return api.put<any>(`/inspections/${inspectionId}/results`, data);
  },

  completeInspection: async (inspectionId: number, data: any) => {
    return api.post<any>(`/inspections/${inspectionId}/complete`, data);
  },

  approveInspection: async (inspectionId: number) => {
    return api.post<any>(`/inspections/${inspectionId}/approve`, {});
  },
};
