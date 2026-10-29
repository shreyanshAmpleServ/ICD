import { api } from '@/api/client';
import { commodities as seedCommodities, drivers as seedDrivers, equipment as seedEquipment, ports as seedPorts, trucks as seedTrucks, vessels as seedVessels } from '@/mock/admin';

export const mastersApi = {
  getTrucks: async () => {
    try {
      const res = await api.get<any>('/trucks');
      return res?.items ?? (Array.isArray(res) ? res : seedTrucks);
    } catch {
      return seedTrucks;
    }
  },
  updateTruck: async (id: number, data: any) => {
    return api.patch<any>(`/trucks/${id}`, data);
  },
  getDrivers: async () => {
    try {
      const res = await api.get<any>('/drivers');
      return res?.items ?? (Array.isArray(res) ? res : seedDrivers);
    } catch {
      return seedDrivers;
    }
  },
  updateDriver: async (id: number, data: any) => {
    return api.patch<any>(`/drivers/${id}`, data);
  },
  getVessels: async () => {
    try {
      const res = await api.get<any>('/vessels');
      return res?.items ?? (Array.isArray(res) ? res : seedVessels);
    } catch {
      return seedVessels;
    }
  },
  getPorts: async () => {
    try {
      const res = await api.get<any>('/ports');
      return res?.items ?? (Array.isArray(res) ? res : seedPorts);
    } catch {
      return seedPorts;
    }
  },
  getCommodities: async () => {
    try {
      const res = await api.get<any>('/commodities');
      return res?.items ?? (Array.isArray(res) ? res : seedCommodities);
    } catch {
      return seedCommodities;
    }
  },
  getEquipment: async () => {
    try {
      const res = await api.get<any>('/equipment');
      return res?.items ?? (Array.isArray(res) ? res : seedEquipment);
    } catch {
      return seedEquipment;
    }
  },
  runSync: async (entityKind: string) => {
    return api.post<any>('/sync/run', { entityKind });
  },
};
