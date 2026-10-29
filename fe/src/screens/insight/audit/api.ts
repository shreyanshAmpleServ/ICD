import { api } from '@/api/client';
import { auditLog } from '@/mock/insight';
import { delay } from '@/api/query';

export const auditApi = {
  getAuditLog: async (queryString?: string) => {
    try {
      const url = queryString ? `/audit?${queryString}` : '/audit';
      const res = await api.get<any[]>(url);
      return res && res.length > 0 ? res : auditLog;
    } catch {
      return delay(auditLog);
    }
  },

  exportAuditLog: async (params?: Record<string, any>) => {
    return api.post<any>('/audit/export', params);
  },
};
