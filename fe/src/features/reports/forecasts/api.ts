import { api } from '@/api/client';
import { occupancyForecast, dwellPredictions, suggestionLog, MODEL_VERSIONS } from '@/mock/insight';
import { delay } from '@/api/query';

export const forecastsApi = {
  getOccupancyForecast: async (siteId: number, block: string) => {
    try {
      const res = await api.get<any[]>(`/forecasts/occupancy?siteId=${siteId}&block=${block}`);
      return res && res.length > 0 ? res : occupancyForecast(siteId, block);
    } catch {
      return delay(occupancyForecast(siteId, block));
    }
  },

  getDwellPredictions: async (siteId: number) => {
    try {
      const res = await api.get<any[]>(`/forecasts/dwell?siteId=${siteId}`);
      return res && res.length > 0 ? res : dwellPredictions(siteId);
    } catch {
      return delay(dwellPredictions(siteId));
    }
  },

  getSuggestionLog: async (siteId: number) => {
    try {
      const res = await api.get<any[]>(`/yard/suggestion-log?siteId=${siteId}`);
      return res && res.length > 0 ? res : suggestionLog;
    } catch {
      return delay(suggestionLog);
    }
  },

  getModelVersions: async () => {
    try {
      const res = await api.get<any[]>('/models');
      return res && res.length > 0 ? res : MODEL_VERSIONS;
    } catch {
      return delay(MODEL_VERSIONS);
    }
  },
};
