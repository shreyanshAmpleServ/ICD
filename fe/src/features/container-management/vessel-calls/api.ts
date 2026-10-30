import { api } from '@/api/client';

export const vesselCallsApi = {
  getVesselCalls: async () => {
    try {
      const res = await api.get<any>('/vessel-calls');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  recordDischargeCompleted: async (vesselCallId: string | number, body?: any) => {
    return api.post<any>(`/vessel-calls/${vesselCallId}/discharge-completed`, body);
  }
};
