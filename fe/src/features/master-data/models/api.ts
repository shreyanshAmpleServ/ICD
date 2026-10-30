import { api } from '@/api/client';

export const modelsApi = {
  getModels: async () => {
    try {
      const res = await api.get<any>('/models');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  activateModel: async (modelVersionId: number, reason?: string) => {
    return api.post<any>(`/models/${modelVersionId}:activate`, { reason });
  },
};
