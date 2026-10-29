import { api } from '@/api/client';
import { devices as seedDevices, integrations as seedInt } from '@/mock/admin';

export const devicesApi = {
  getDevices: async () => {
    try {
      const res = await api.get<any>('/devices');
      return res?.items ?? (Array.isArray(res) ? res : seedDevices);
    } catch {
      return seedDevices;
    }
  },
  registerDevice: async (data: any) => {
    return api.post<any>('/devices', data);
  },
  revokeDevice: async (id: number, reason?: string) => {
    return api.post<any>(`/devices/${id}:revoke`, { reason });
  },
  getIntegrations: async () => {
    try {
      const res = await api.get<any>('/device-integrations');
      return res?.items ?? (Array.isArray(res) ? res : seedInt);
    } catch {
      return seedInt;
    }
  },
};
