import { api } from '@/api/client';

export const inspectionApi = {
  getInspectionTemplates: async () => {
    try {
      const res = await api.get<any>('/inspection-templates');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  saveChecklist: async (data: any) => {
    return api.post<any>('/inspection-templates', data);
  },
  getDamageCodes: async () => {
    try {
      const res = await api.get<any>('/damage-codes');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
};
