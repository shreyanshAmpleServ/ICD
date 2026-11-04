import { api } from '@/api/client';

export const devicesApi = {
  getDevices: async () => {
    try {
      const res = await api.get<any>('/devices');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  registerDevice: async (data: any) => {
    return api.post<any>('/devices', data);
  },
  revokeDevice: async (id: number | string, reason?: string) => {
    try {
      return await api.post<any>(`/devices/${id}/revoke`, { reason });
    } catch {
      return api.post<any>(`/devices/${id}:revoke`, { reason });
    }
  },
  getIntegrations: async () => {
    try {
      const res = await api.get<any>('/device-integrations');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
};
