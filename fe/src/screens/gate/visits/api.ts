import { api } from '@/api/client';

export const truckVisitsApi = {
  getTruckVisit: async (id: number | string) => {
    return api.get<any>(`/gate/visits/${id}`);
  },

  checkin: async (id: number | string) => {
    return api.post<any>(`/truck-visits/${id}:checkin`, {});
  },

  checkout: async (id: number | string) => {
    return api.post<any>(`/truck-visits/${id}:checkout`, {});
  },

  cancelVisit: async (id: number | string, data?: { reason: string; note?: string }) => {
    return api.post<any>(`/truck-visits/${id}:cancel`, data || {});
  },

  addUnit: async (id: number | string, data: any) => {
    return api.post<any>(`/truck-visits/${id}/units`, data);
  },

  removeUnit: async (id: number | string, visitUnitId: number | string) => {
    return api.delete<any>(`/truck-visits/${id}/units/${visitUnitId}`);
  },

  completeUnit: async (id: number | string, visitUnitId: number | string) => {
    return api.post<any>(`/truck-visits/${id}/units/${visitUnitId}:complete`, {});
  },

  approveOverride: async (id: number | string, data?: any) => {
    return api.post<any>(`/truck-visits/${id}:override-checkout`, data || {});
  },

  printGatePass: async (id: number | string) => {
    return api.post<any>(`/truck-visits/${id}/gate-pass:print`, {});
  },

  updateDriver: async (id: number | string, data: { driverId?: number; driverName?: string; licenceNo?: string; phone?: string }) => {
    return api.post<any>(`/truck-visits/${id}/driver`, data);
  },

  patchVisit: async (id: number | string, data: any) => {
    return api.patch<any>(`/truck-visits/${id}`, data);
  },
};

