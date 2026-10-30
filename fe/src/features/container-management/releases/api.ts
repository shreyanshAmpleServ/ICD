import { api } from '@/api/client';

export const releasesApi = {
  getReleases: async () => {
    try {
      const res = await api.get<any>('/releases');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getReleaseDetail: async (releaseOrderId: string | number) => {
    try {
      const res = await api.get<any>(`/releases/${releaseOrderId}`);
      return res?.item || res || null;
    } catch {
      return null;
    }
  },

  createReleaseOrder: async (body: any) => {
    return api.post<any>('/releases', body);
  },

  revalidateRelease: async (releaseOrderId: string | number, body?: any) => {
    return api.post<any>(`/releases/${releaseOrderId}:revalidate`, body);
  },

  cancelRelease: async (releaseOrderId: string | number, body?: any) => {
    return api.post<any>(`/releases/${releaseOrderId}:cancel`, body);
  }
};
