import { api } from '@/api/client';
import { allExceptions } from '@/mock/cargo';

export const exceptionsApi = {
  getExceptions: async () => {
    try {
      const res = await api.get<any[]>('/exceptions');
      return res && res.length > 0 ? res : allExceptions;
    } catch {
      return allExceptions;
    }
  },

  getExceptionDetail: async (exceptionCaseId: string | number) => {
    try {
      return await api.get<any>(`/exceptions/${exceptionCaseId}`);
    } catch {
      return allExceptions.find((e: any) => String(e.exceptionCaseId) === String(exceptionCaseId));
    }
  },

  assignException: async (id: number | string, data: { assignedTo: string; roleCode?: string }) => {
    return api.post<any>(`/exceptions/${id}:assign`, data);
  },

  resolveException: async (id: number | string, data: { resolutionCode: string; resolutionNote: string }) => {
    return api.post<any>(`/exceptions/${id}:resolve`, data);
  },

  closeException: async (id: number | string) => {
    return api.post<any>(`/exceptions/${id}:close`, {});
  },

  reopenException: async (id: number | string) => {
    return api.post<any>(`/exceptions/${id}:reopen`, {});
  },

  escalateException: async (id: number | string) => {
    return api.post<any>(`/exceptions/${id}:escalate`, {});
  },

  addComment: async (id: number | string, text: string) => {
    return api.post<any>(`/exceptions/${id}/comments`, { text });
  },
};
