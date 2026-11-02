import { api } from '@/api/client';
import { type Job, type Lot } from '@/mock/ops';

export interface LabourContractor {
  labourContractorId: number;
  contractorName: string;
}

export const cfsApi = {
  getHandlingJobs: async (): Promise<Job[]> => {
    try {
      const res = await api.get<Job[]>('/handling-jobs');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  getHandlingJob: async (handlingJobId: number): Promise<Job | undefined> => {
    try {
      return await api.get<Job>(`/handling-jobs/${handlingJobId}`);
    } catch {
      return undefined;
    }
  },

  getLotBalances: async (): Promise<Lot[]> => {
    try {
      const res = await api.get<Lot[]>('/lots/balances');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  createJob: async (data: any): Promise<Job> => {
    return api.post<Job>('/handling-jobs', data);
  },

  recordLotDelivery: async (lotStayId: number, data: { qty: number; releaseOrderNo: string }) => {
    return api.post<any>(`/lots/${lotStayId}/deliveries`, data);
  },

  startJob: async (handlingJobId: number) => {
    return api.post<any>(`/handling-jobs/${handlingJobId}/start`, {});
  },

  completeJob: async (handlingJobId: number, data: any) => {
    return api.post<any>(`/handling-jobs/${handlingJobId}/complete`, data);
  },

  approveJob: async (handlingJobId: number) => {
    return api.post<any>(`/handling-jobs/${handlingJobId}/approve`, {});
  },
};
