import { api } from '@/api/client';

export const documentsApi = {
  getNumberSequences: async () => {
    try {
      const res = await api.get<any>('/number-sequences');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  createNumberSequence: async (data: any) => {
    return api.post<any>('/number-sequences', data);
  },
  updateNumberSequence: async (id: number | string, data: any) => {
    return api.patch<any>(`/number-sequences/${id}`, data);
  },
  getDocumentTypes: async () => {
    try {
      const res = await api.get<any>('/document-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  createDocumentType: async (data: any) => {
    return api.post<any>('/document-types', data);
  },
  updateDocumentType: async (id: number | string, data: any) => {
    return api.patch<any>(`/document-types/${id}`, data);
  },
};
