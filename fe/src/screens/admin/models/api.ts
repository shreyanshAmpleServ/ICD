import { api } from '@/api/client';
import { models as seedModels } from '@/mock/admin';

export const modelsApi = {
  getModels: async () => {
    try {
      const res = await api.get<any>('/models');
      return res?.items ?? (Array.isArray(res) ? res : seedModels);
    } catch {
      return seedModels;
    }
  },
  activateModel: async (modelVersionId: number, reason?: string) => {
    return api.post<any>(`/models/${modelVersionId}:activate`, { reason });
  },
};
