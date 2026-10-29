import { api } from '@/api/client';
import { kpiTiles, kpiSeries } from '@/mock/insight';
import { delay } from '@/api/query';

export const kpisApi = {
  getKpis: async (siteId?: number) => {
    try {
      const res = await api.get<any[]>(`/kpis${siteId ? `?siteId=${siteId}` : ''}`);
      return res && res.length > 0 ? res : kpiTiles;
    } catch {
      return delay(kpiTiles);
    }
  },

  getKpiSeries: async () => {
    try {
      const res = await api.get<any[]>('/kpis/series');
      return res && res.length > 0 ? res : kpiSeries;
    } catch {
      return delay(kpiSeries);
    }
  },
};
