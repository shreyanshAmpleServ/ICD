import { api } from '@/api/client';
import { holdTypesSeed, releaseRules as seedRules, approvalPolicies as seedPolicies, exceptionTypes as seedExc } from '@/mock/admin';

export const rulesApi = {
  getHoldTypes: async () => {
    try {
      const res = await api.get<any>('/hold-types');
      return res?.items ?? (Array.isArray(res) ? res : holdTypesSeed);
    } catch {
      return holdTypesSeed;
    }
  },
  createHoldType: async (data: any) => {
    return api.post<any>('/hold-types', data);
  },
  getReleaseRules: async () => {
    try {
      const res = await api.get<any>('/release-rules');
      return res?.items ?? (Array.isArray(res) ? res : seedRules);
    } catch {
      return seedRules;
    }
  },
  updateReleaseRule: async (id: number, data: any) => {
    return api.patch<any>(`/release-rules/${id}`, data);
  },
  getApprovalPolicies: async () => {
    try {
      const res = await api.get<any>('/approval-policies');
      return res?.items ?? (Array.isArray(res) ? res : seedPolicies);
    } catch {
      return seedPolicies;
    }
  },
  updateApprovalPolicy: async (id: number, data: any) => {
    return api.patch<any>(`/approval-policies/${id}`, data);
  },
  getExceptionTypes: async () => {
    try {
      const res = await api.get<any>('/exception-types');
      return res?.items ?? (Array.isArray(res) ? res : seedExc);
    } catch {
      return seedExc;
    }
  },
  updateExceptionType: async (id: number, data: any) => {
    return api.patch<any>(`/exception-types/${id}`, data);
  },
};
