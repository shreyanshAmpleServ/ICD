import { api } from '@/api/client';
import { allCustomsRefs, exams as seedExams } from '@/mock/cargo';

export const customsApi = {
  getCustoms: async () => {
    try {
      const res = await api.get<any[]>('/customs/refs');
      return res && res.length > 0 ? res : allCustomsRefs;
    } catch {
      return allCustomsRefs;
    }
  },

  getCustomsRefs: async () => {
    try {
      const res = await api.get<any[]>('/customs/refs');
      return res && res.length > 0 ? res : allCustomsRefs;
    } catch {
      return allCustomsRefs;
    }
  },

  getExams: async () => {
    try {
      const res = await api.get<any[]>('/exams');
      return res && res.length > 0 ? res : seedExams;
    } catch {
      return seedExams;
    }
  },

  createCustomsRef: async (body: any) => {
    return api.post<any>('/customs/refs', body);
  },

  completeExam: async (examId: string | number, body?: any) => {
    return api.post<any>(`/exams/${examId}/complete`, body);
  }
};
