import { api } from '@/api/client';
import { damageCodes as seedDamageCodes, inspectionTemplates as seedTemplates } from '@/mock/admin';

export const inspectionApi = {
  getInspectionTemplates: async () => {
    try {
      const res = await api.get<any>('/inspection-templates');
      return res?.items ?? (Array.isArray(res) ? res : seedTemplates);
    } catch {
      return seedTemplates;
    }
  },
  saveChecklist: async (data: any) => {
    return api.post<any>('/inspection-templates', data);
  },
  getDamageCodes: async () => {
    try {
      const res = await api.get<any>('/damage-codes');
      return res?.items ?? (Array.isArray(res) ? res : seedDamageCodes);
    } catch {
      return seedDamageCodes;
    }
  },
};
