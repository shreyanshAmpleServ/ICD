import { api } from '@/api/client';
import { documentTypes as seedDocs, numberSequences as seedSeq } from '@/mock/admin';

export const documentsApi = {
  getNumberSequences: async () => {
    try {
      const res = await api.get<any>('/number-sequences');
      return res?.items ?? (Array.isArray(res) ? res : seedSeq);
    } catch {
      return seedSeq;
    }
  },
  updateNumberSequence: async (id: number, data: any) => {
    return api.patch<any>(`/number-sequences/${id}`, data);
  },
  getDocumentTypes: async () => {
    try {
      const res = await api.get<any>('/document-types');
      return res?.items ?? (Array.isArray(res) ? res : seedDocs);
    } catch {
      return seedDocs;
    }
  },
  createDocumentType: async (data: any) => {
    return api.post<any>('/document-types', data);
  },
  updateDocumentType: async (id: number, data: any) => {
    return api.patch<any>(`/document-types/${id}`, data);
  },
};
