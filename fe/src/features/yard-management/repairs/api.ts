import { api } from '@/api/client';
import { type Estimate } from '@/mock/ops';

export type { Estimate };

export interface RepairCode {
  repairCode: string;
  repairName: string;
  defaultLabourHours: string;
  isActive: boolean;
}

export const repairsApi = {
  getRepairEstimates: async (): Promise<Estimate[]> => {
    try {
      const res = await api.get<Estimate[]>('/repairs');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  getRepairEstimate: async (repairEstimateId: number | string): Promise<Estimate | undefined> => {
    try {
      return await api.get<Estimate>(`/repairs/${repairEstimateId}`);
    } catch {
      return undefined;
    }
  },

  getRepairCodes: async (): Promise<RepairCode[]> => {
    try {
      const res = await api.get<RepairCode[]>('/repair-codes');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
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
