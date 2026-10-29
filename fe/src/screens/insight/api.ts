import { api } from '@/api/client';
import {
  controlTower, kpiTiles, kpiSeries, occupancyForecast, auditLog
} from '@/mock/insight';

export const insightApi = {
  getControlTower: async () => {
    try {
      const res = await api.get<any>('/control-tower');
      return res || controlTower;
    } catch {
      return controlTower;
    }
  },

  getKpis: async () => {
    try {
      const res = await api.get<any[]>('/kpis');
      return res && res.length > 0 ? res : kpiTiles;
    } catch {
      return kpiTiles;
    }
  },

  getKpiSeries: async () => {
    try {
      const res = await api.get<any[]>('/kpis/series');
      return res && res.length > 0 ? res : kpiSeries;
    } catch {
      return kpiSeries;
    }
  },

  getForecasts: async () => {
    try {
      const res = await api.get<any[]>('/forecasts');
      return res && res.length > 0 ? res : occupancyForecast;
    } catch {
      return occupancyForecast;
    }
  },

  getAuditLog: async () => {
    try {
      const res = await api.get<any[]>('/audit');
      return res && res.length > 0 ? res : auditLog;
    } catch {
      return auditLog;
    }
  }
};
