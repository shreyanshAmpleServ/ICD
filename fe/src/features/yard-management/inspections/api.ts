import { api } from '@/api/client';
import { type Insp } from '@/mock/ops';

export const inspectionsApi = {
  getInspections: async (siteId?: number): Promise<Insp[]> => {
    try {
      const res = await api.get<Insp[]>('/inspections');
      const list = Array.isArray(res) ? res : [];
      return siteId ? list.filter((i) => i.siteId === siteId) : list;
    } catch {
      return [];
    }
  },

  getInspection: async (inspectionId: number): Promise<Insp | undefined> => {
    try {
      return await api.get<Insp>(`/inspections/${inspectionId}`);
    } catch {
      return undefined;
    }
  },

    startInspection: async (data: Partial<Insp>): Promise<Insp> => {
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
