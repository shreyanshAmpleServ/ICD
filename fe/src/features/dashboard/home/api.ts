import { api } from '@/api/client';

export const homeApi = {
  getHomeSummary: async (siteId?: string | number) => {
    try {
      const res = await api.get<any>(siteId ? `/today/summary?siteId=${siteId}` : '/today/summary');
      return res || null;
    } catch {
      return null;
    }
  },
};
