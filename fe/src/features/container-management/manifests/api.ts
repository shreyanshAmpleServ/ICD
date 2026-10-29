import { api } from '@/api/client';
import { manifests, sampleManifestLines } from '@/mock/cargo';

export const manifestsApi = {
  getManifests: async () => {
    try {
      const res = await api.get<any[]>('/manifests');
      return res && res.length > 0 ? res : manifests;
    } catch {
      return manifests;
    }
  },

  getManifestLines: async (manifestId: string | number) => {
    try {
      const res = await api.get<any[]>(`/manifests/${manifestId}/lines`);
      return res && res.length > 0 ? res : sampleManifestLines;
    } catch {
      return sampleManifestLines;
    }
  },

  uploadManifest: async (body: any) => {
    return api.post<any>('/manifests', body);
  },

  applyManifest: async (manifestId: string | number) => {
    return api.post<any>(`/manifests/${manifestId}/apply`);
  }
};
