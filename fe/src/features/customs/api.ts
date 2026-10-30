import { api } from '@/api/client';

export const customsApi = {
  getCustoms: async () => {
    try {
      const res = await api.get<any>('/customs/refs');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getCustomsRefs: async () => {
    try {
      const res = await api.get<any>('/customs/refs');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  getExams: async () => {
    try {
      const res = await api.get<any>('/exams');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  createCustomsRef: async (body: any) => {
    return api.post<any>('/customs/refs', body);
  },

  completeExam: async (examId: string | number, body?: any) => {
    return api.post<any>(`/exams/${examId}/complete`, body);
  }
};
