import { api } from '@/api/client';
import { allApprovals } from '@/mock/cargo';

export const approvalsApi = {
  getApprovals: async () => {
    try {
      const res = await api.get<any>('/approvals');
      const items = res?.items || (Array.isArray(res) ? res : null);
      return items && items.length > 0 ? items : allApprovals;
    } catch {
      return allApprovals;
    }
  },

  actOnApproval: async (requestId: string | number, body: any) => {
    return api.post<any>(`/approvals/${requestId}/act`, body);
  },

  getDelegations: async () => {
    try {
      const res = await api.get<any>('/delegations');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },

  createDelegation: async (data: any) => {
    return api.post<any>('/delegations', data);
  },

  revokeDelegation: async (delegationId: string | number) => {
    return api.post<any>(`/delegations/${delegationId}:revoke`, {});
  },
};
