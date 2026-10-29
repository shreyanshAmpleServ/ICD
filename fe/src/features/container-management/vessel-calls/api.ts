import { api } from '@/api/client';
import { vesselCalls } from '@/mock/core';

export const vesselCallsApi = {
  getVesselCalls: async () => {
    try {
      const res = await api.get<any[]>('/vessel-calls');
      return res && res.length > 0 ? res : vesselCalls;
    } catch {
      return vesselCalls;
    }
  },

  recordDischargeCompleted: async (vesselCallId: string | number, body?: any) => {
    return api.post<any>(`/vessel-calls/${vesselCallId}/discharge-completed`, body);
  }
};
