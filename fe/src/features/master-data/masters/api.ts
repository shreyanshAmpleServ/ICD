import { api } from '@/api/client';

export const mastersApi = {
  getTrucks: async () => {
    try {
      const res = await api.get<any>('/trucks');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  updateTruck: async (id: number, data: any) => {
    return api.patch<any>(`/trucks/${id}`, data);
  },
  createTruck: async (data: any) => {
    return api.post<any>('/trucks', data);
  },
  getDrivers: async () => {
    try {
      const res = await api.get<any>('/drivers');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  updateDriver: async (id: number, data: any) => {
    return api.patch<any>(`/drivers/${id}`, data);
  },
  createDriver: async (data: any) => {
    return api.post<any>('/drivers', data);
  },
  getVessels: async () => {
    try {
      const res = await api.get<any>('/vessels');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  updateVessel: async (id: number, data: any) => {
    return api.patch<any>(`/vessels/${id}`, data);
  },
  createVessel: async (data: any) => {
    return api.post<any>('/vessels', data);
  },
  getPorts: async () => {
    try {
      const res = await api.get<any>('/ports');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  createPort: async (data: any) => {
    return api.post<any>('/ports', data);
  },
  updatePort: async (id: number, data: any) => {
    return api.patch<any>(`/ports/${id}`, data);
  },
  getCommodities: async () => {
    try {
      const res = await api.get<any>('/commodities');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  createCommodity: async (data: any) => {
    return api.post<any>('/commodities', data);
  },
  updateCommodity: async (id: number, data: any) => {
    return api.patch<any>(`/commodities/${id}`, data);
  },
  getEquipment: async () => {
    try {
      const res = await api.get<any>('/equipment');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch {
      return [];
    }
  },
  createEquipment: async (data: any) => {
    return api.post<any>('/equipment', data);
  },
  updateEquipment: async (id: number, data: any) => {
    return api.patch<any>(`/equipment/${id}`, data);
  },
  runSync: async (entityKind: string) => {
    return api.post<any>('/sync/run', { entityKind });
  },
};
