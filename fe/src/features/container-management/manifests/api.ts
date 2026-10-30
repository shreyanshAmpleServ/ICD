import { api } from '@/api/client';

export const manifestsApi = {
  getManifests: async () => {
    try {
      const res = await api.get<any>('/manifests');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getManifestLines: async (manifestId: string | number) => {
    try {
      const res = await api.get<any>(`/manifests/${manifestId}/lines`);
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  uploadManifest: async (body: any) => {
    return api.post<any>('/manifests', body);
  },

  applyManifest: async (manifestId: string | number) => {
    return api.post<any>(`/manifests/${manifestId}/apply`);
  }
};
