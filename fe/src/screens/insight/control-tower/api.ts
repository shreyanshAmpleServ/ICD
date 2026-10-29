import { api } from '@/api/client';
import { controlTower } from '@/mock/insight';
import { delay } from '@/api/query';

export const controlTowerApi = {
  getControlTower: async (siteId: number) => {
    try {
      const res = await api.get<any>(`/dashboards/control-tower?siteId=${siteId}`);
      return res || controlTower(siteId);
    } catch {
      return delay(controlTower(siteId));
    }
  },
};
