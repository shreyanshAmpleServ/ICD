import { api } from '@/api/client';

export const gateLaneApi = {
  recordCheckpointEvent: async (truckVisitId: number, data: any) => {
    return api.post<any>(`/truck-visits/${truckVisitId}/checkpoint-events`, data);
  },

  requestOverride: async (truckVisitId: number, data: any) => {
    return api.post<any>(`/truck-visits/${truckVisitId}/override-request`, data);
  },

  turnBackTruck: async (truckVisitId: number, reason: string) => {
    return api.post<any>(`/truck-visits/${truckVisitId}/turn-back`, { reason });
  },

  openBarrier: async (laneId: string | number) => {
    return api.post<any>(`/gate/lanes/${laneId}/open-barrier`, {});
  },
};
