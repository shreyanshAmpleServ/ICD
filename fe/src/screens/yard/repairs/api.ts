import { api } from '@/api/client';
import { estimates, type Estimate } from '@/mock/ops';

export type { Estimate };

export const repairsApi = {
  getRepairEstimates: async (): Promise<Estimate[]> => {
    try {
      const res = await api.get<Estimate[]>('/repairs');
      return res && res.length > 0 ? res : estimates;
    } catch {
      return estimates;
    }
  },

  getRepairEstimate: async (repairEstimateId: number | string): Promise<Estimate | undefined> => {
    try {
      return await api.get<Estimate>(`/repairs/${repairEstimateId}`);
    } catch {
      return estimates.find((e) => String(e.repairEstimateId) === String(repairEstimateId));
    }
  },

  createEstimate: async (body: any) => {
    return api.post<any>('/repairs', body);
  },

  sendToLine: async (repairEstimateId: number | string) => {
    return api.post<any>(`/repairs/${repairEstimateId}/send`);
  },

  recordDecision: async (
    repairEstimateId: number | string,
    data: { decisions: Record<number, 'APPROVED' | 'REJECTED'>; ref: string }
  ) => {
    return api.post<any>(`/repairs/${repairEstimateId}/decide`, data);
  },

  markRepairsDone: async (repairEstimateId: number | string) => {
    return api.post<any>(`/repairs/${repairEstimateId}/complete`);
  },
};
