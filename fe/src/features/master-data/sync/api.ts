import { api } from '@/api/client';

export const syncApi = {
  getSyncStatus: async () => {
    try {
      const res = await api.get<any>('/sync/status');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  getOutbox: async () => {
    try {
      const res = await api.get<any>('/sync/outbox');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  runSync: async (entityName: string) => {
    return api.post<any>(`/sync/${entityName}:run`, {});
  },
  retryOutbox: async (id: number) => {
    return api.post<any>(`/sync/outbox/${id}:retry`, {});
  },
  getEdiMessages: async () => {
    try {
      const res = await api.get<any>('/integration-messages');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
};
