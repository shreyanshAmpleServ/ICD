import { api } from '@/api/client';
import { reefers, type Reefer } from '@/mock/ops';

export const reefersApi = {
  getReeferSessions: async (): Promise<Reefer[]> => {
    try {
      const res = await api.get<Reefer[]>('/reefers');
      return res && res.length > 0 ? res : reefers;
    } catch {
      return reefers;
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
