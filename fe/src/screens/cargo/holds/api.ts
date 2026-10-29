import { api } from '@/api/client';
import { holds as seedHolds } from '@/mock/control';

export const holdsApi = {
  getHolds: async () => {
    try {
      const res = await api.get<any[]>('/holds');
      return res && res.length > 0 ? res : seedHolds;
    } catch {
      return seedHolds;
    }
  },

  placeHold: async (body: any) => {
    return api.post<any>('/holds', body);
  },

  liftHold: async (holdId: string | number, body: any) => {
    return api.post<any>(`/holds/${holdId}/lift`, body);
  }
};
