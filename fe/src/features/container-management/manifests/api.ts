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

  evaluateManifest: async (body: any) => {
    return api.post<any>('/manifests/evaluate', body);
  },

  uploadManifest: async (body: any) => {
    return api.post<any>('/manifests', body);
  },

  applyManifest: async (manifestId: string | number) => {
    return api.post<any>(`/manifests/${manifestId}/apply`);
  },

  getParties: async (role?: string) => {
    try {
      const url = role ? `/parties?role=${role}` : '/parties';
      const res = await api.get<any>(url);
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getUnitTypes: async () => {
    try {
      const res = await api.get<any>('/unit-types');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getVesselCalls: async () => {
    try {
      const res = await api.get<any>('/vessel-calls');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },
};
