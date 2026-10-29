import { api } from '@/api/client';
import {
  moveOrders, inspections, keys, jobs, reefers, estimates
} from '@/mock/ops';

export const yardApi = {
  getYardMap: async (siteId?: string | number) => {
    try {
      const res = await api.get<any>(siteId ? `/yard/map?siteId=${siteId}` : '/yard/map');
      return res || null;
    } catch {
      return null;
    }
  },

  getMoveOrders: async () => {
    try {
      const res = await api.get<any[]>('/moves');
      return res && res.length > 0 ? res : moveOrders;
    } catch {
      return moveOrders;
    }
  },

  createMoveOrder: async (body: any) => {
    return api.post<any>('/moves', body);
  },

  getInspections: async () => {
    try {
      const res = await api.get<any[]>('/inspections');
      return res && res.length > 0 ? res : inspections;
    } catch {
      return inspections;
    }
  },

  getInspectionDetail: async (inspectionId: string | number) => {
    try {
      return await api.get<any>(`/inspections/${inspectionId}`);
    } catch {
      return inspections.find((i: any) => String(i.inspectionId) === String(inspectionId));
    }
  },

  getKeys: async () => {
    try {
      const res = await api.get<any[]>('/keys');
      return res && res.length > 0 ? res : keys;
    } catch {
      return keys;
    }
  },

  getCfsJobs: async () => {
    try {
      const res = await api.get<any[]>('/cfs/jobs');
      return res && res.length > 0 ? res : jobs;
    } catch {
      return jobs;
    }
  },

  getCfsJobDetail: async (handlingJobId: string | number) => {
    try {
      return await api.get<any>(`/cfs/jobs/${handlingJobId}`);
    } catch {
      return jobs.find((j: any) => String(j.handlingJobId) === String(handlingJobId));
    }
  },

  getReefers: async () => {
    try {
      const res = await api.get<any[]>('/reefers');
      return res && res.length > 0 ? res : reefers;
    } catch {
      return reefers;
    }
  },

  getRepairs: async () => {
    try {
      const res = await api.get<any[]>('/repairs');
      return res && res.length > 0 ? res : estimates;
    } catch {
      return estimates;
    }
  },

  getRepairEstimate: async (repairEstimateId: string | number) => {
    try {
      return await api.get<any>(`/repairs/${repairEstimateId}`);
    } catch {
      return estimates.find((e: any) => String(e.repairEstimateId) === String(repairEstimateId));
    }
  }
};
