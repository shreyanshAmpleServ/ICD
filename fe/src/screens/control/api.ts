import { api } from '@/api/client';
import { allApprovals, allExceptions } from '@/mock/cargo';

export const controlApi = {
  getApprovals: async () => {
    try {
      const res = await api.get<any[]>('/approvals');
      return res && res.length > 0 ? res : allApprovals;
    } catch {
      return allApprovals;
    }
  },

  actOnApproval: async (requestId: string | number, body: any) => {
    return api.post<any>(`/approvals/${requestId}/act`, body);
  },

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
  }
};
