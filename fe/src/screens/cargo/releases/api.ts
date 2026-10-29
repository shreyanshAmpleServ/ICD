import { api } from '@/api/client';
import { allReleaseOrders, releaseOrder } from '@/mock/cargo';

export const releasesApi = {
  getReleases: async () => {
    try {
      const res = await api.get<any[]>('/releases');
      return res && res.length > 0 ? res : allReleaseOrders;
    } catch {
      return allReleaseOrders;
    }
  },

  getReleaseDetail: async (releaseOrderId: string | number) => {
    try {
      const res = await api.get<any>(`/releases/${releaseOrderId}`);
      return res || releaseOrder(Number(releaseOrderId));
    } catch {
      return releaseOrder(Number(releaseOrderId));
    }
  },

  createReleaseOrder: async (body: any) => {
    return api.post<any>('/releases', body);
  },

  revalidateRelease: async (releaseOrderId: string | number, body?: any) => {
    return api.post<any>(`/releases/${releaseOrderId}/revalidate`, body);
  },

  cancelRelease: async (releaseOrderId: string | number, body?: any) => {
    return api.post<any>(`/releases/${releaseOrderId}/cancel`, body);
  }
};
