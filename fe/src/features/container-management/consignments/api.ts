import { api } from '@/api/client';

export const consignmentsApi = {
  getConsignments: async (siteId?: string) => {
    try {
      const res = await api.get<any>(siteId ? `/consignments?siteId=${siteId}` : '/consignments');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getConsignmentDetail: async (consignmentId: string | number) => {
    try {
      const res = await api.get<any>(`/consignments/${consignmentId}`);
      return res?.item || res || null;
    } catch {
      return null;
    }
  }
};
