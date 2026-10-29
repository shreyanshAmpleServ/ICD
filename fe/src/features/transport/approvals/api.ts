import { api } from '@/api/client';
import { allApprovals } from '@/mock/cargo';

export const approvalsApi = {
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
};
