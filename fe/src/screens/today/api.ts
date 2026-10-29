import { api } from '@/api/client';

export const todayApi = {
  getHomeSummary: async (siteId?: string) => {
    try {
      const res = await api.get<any>(siteId ? `/today/summary?siteId=${siteId}` : '/today/summary');
      return res || null;
    } catch {
      return null;
    }
  },

  getInboxTasks: async () => {
    try {
      const res = await api.get<any[]>('/inbox');
      return res || [];
    } catch {
      return [];
    }
  }
};
