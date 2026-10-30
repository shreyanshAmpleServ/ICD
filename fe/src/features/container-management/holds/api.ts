import { api } from '@/api/client';

export const holdsApi = {
  getHolds: async () => {
    try {
      const res = await api.get<any>('/holds');
      return Array.isArray(res) ? res : (res?.items || []);
    } catch {
      return [];
    }
  },

  placeHold: async (body: any) => {
    return api.post<any>('/holds', body);
  },

  liftHold: async (holdId: string | number, body: any) => {
    return api.post<any>(`/holds/${holdId}:lift`, body);
  }
};
