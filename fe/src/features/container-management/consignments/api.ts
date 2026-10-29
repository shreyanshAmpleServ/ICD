import { api } from '@/api/client';
import { consignments, consignment } from '@/mock/core';

export const consignmentsApi = {
  getConsignments: async (siteId?: string) => {
    try {
      const res = await api.get<any[]>(siteId ? `/consignments?siteId=${siteId}` : '/consignments');
      return res && res.length > 0 ? res : consignments;
    } catch {
      return consignments;
    }
  },

  getConsignmentDetail: async (consignmentId: string | number) => {
    try {
      const res = await api.get<any>(`/consignments/${consignmentId}`);
      return res || consignment(Number(consignmentId));
    } catch {
      return consignment(Number(consignmentId));
    }
  }
};
