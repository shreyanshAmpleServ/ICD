import { api } from '@/api/client';
import { type Reefer } from '@/mock/ops';

export const reefersApi = {
  getReeferSessions: async (): Promise<Reefer[]> => {
    try {
      const res = await api.get<Reefer[]>('/reefers');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  recordReading: async (reeferSessionId: number, data: any) => {
    return api.post<any>(`/reefers/${reeferSessionId}/readings`, data);
  },

  plugIn: async (reeferSessionId: number, data: { plugNo: string; setTempC: string }) => {
    return api.post<any>(`/reefers/${reeferSessionId}/plug`, data);
  },

  unplug: async (reeferSessionId: number, data: { meterEndKwh: number; reason: string }) => {
    return api.post<any>(`/reefers/${reeferSessionId}/unplug`, data);
  },
};
