import { api } from '@/api/client';

export const rulesApi = {
  getHoldTypes: async () => {
    try {
      const res = await api.get<any>('/hold-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  createHoldType: async (data: any) => {
    return api.post<any>('/hold-types', data);
  },
  getReleaseRules: async () => {
    try {
      const res = await api.get<any>('/release-rules');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateReleaseRule: async (id: number, data: any) => {
    return api.patch<any>(`/release-rules/${id}`, data);
  },
  getApprovalPolicies: async () => {
    try {
      const res = await api.get<any>('/approval-policies');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateApprovalPolicy: async (id: number, data: any) => {
    return api.patch<any>(`/approval-policies/${id}`, data);
  },
  getExceptionTypes: async () => {
    try {
      const res = await api.get<any>('/exception-types');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateExceptionType: async (id: number, data: any) => {
    return api.patch<any>(`/exception-types/${id}`, data);
  },
};
