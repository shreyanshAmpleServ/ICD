import { api } from '@/api/client';
import { jobs, lotBalances, type Job, type Lot } from '@/mock/ops';

export const cfsApi = {
  getHandlingJobs: async (): Promise<Job[]> => {
    try {
      const res = await api.get<Job[]>('/handling-jobs');
      return res && res.length > 0 ? res : jobs;
    } catch {
      return jobs;
    }
  },

  getHandlingJob: async (handlingJobId: number): Promise<Job | undefined> => {
    try {
      const res = await api.get<Job>(`/handling-jobs/${handlingJobId}`);
      return res || jobs.find((j) => j.handlingJobId === handlingJobId);
    } catch {
      return jobs.find((j) => j.handlingJobId === handlingJobId);
    }
  },

  getLotBalances: async (): Promise<Lot[]> => {
    try {
      const res = await api.get<Lot[]>('/lots/balances');
      return res && res.length > 0 ? res : lotBalances;
    } catch {
      return lotBalances;
    }
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
