import { api } from '@/api/client';
import { company as seedCompany, type CountryPack, type Site } from '@/mock/admin';

export type Company = typeof seedCompany;

export const sitesApi = {
  getCompany: async (id = 1): Promise<Company | null> => {
    try {
      const res = await api.get<any>(`/companies/${id}`);
      return res || null;
    } catch { return null; }
  },
  updateCompany: async (id: number, data: any) => {
    return api.patch<any>(`/companies/${id}`, data);
  },
  getSites: async (): Promise<Site[]> => {
    try {
      const res = await api.get<any>('/sites');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createSite: async (data: any) => {
    return api.post<any>('/sites', data);
  },
  updateSite: async (id: string | number, data: any) => {
    return api.patch<any>(`/sites/${id}`, data);
  },
  deleteSite: async (id: string | number) => {
    return api.delete<any>(`/sites/${id}`);
  },
  getPacks: async (): Promise<CountryPack[]> => {
    try {
      const res = await api.get<any>('/country-packs');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
};
