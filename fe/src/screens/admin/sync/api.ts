import { api } from '@/api/client';
import { integrationMessages, outbox as seedOutbox, syncStates as seedSync } from '@/mock/admin';

export const syncApi = {
  getSyncStatus: async () => {
    try {
      const res = await api.get<any>('/sync/status');
      return res?.items ?? (Array.isArray(res) ? res : seedSync);
    } catch {
      return seedSync;
    }
  },
  getOutbox: async () => {
    try {
      const res = await api.get<any>('/sync/outbox');
      return res?.items ?? (Array.isArray(res) ? res : seedOutbox);
    } catch {
      return seedOutbox;
    }
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
      return res?.items ?? (Array.isArray(res) ? res : integrationMessages);
    } catch {
      return integrationMessages;
    }
  },
};
