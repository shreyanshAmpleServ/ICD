import { api } from '@/api/client';

function unwrapList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export const gateApi = {
  getGateQueue: async (params?: { status?: string; plateNo?: string; visitTypeCode?: string }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.plateNo) qp.set('plateNo', params.plateNo);
    if (params?.visitTypeCode) qp.set('visitTypeCode', params.visitTypeCode);
    const query = qp.toString() ? `?${qp.toString()}` : '';
    const res = await api.get<any>(`/gate/visits${query}`);
    return unwrapList(res);
  },

  getTruckVisits: async (params?: { status?: string; plateNo?: string; visitTypeCode?: string }) => {
    const qp = new URLSearchParams();
    if (params?.status) qp.set('status', params.status);
    if (params?.plateNo) qp.set('plateNo', params.plateNo);
    if (params?.visitTypeCode) qp.set('visitTypeCode', params.visitTypeCode);
    const query = qp.toString() ? `?${qp.toString()}` : '';
    const res = await api.get<any>(`/gate/visits${query}`);
    return unwrapList(res);
  },

  getTruckVisitDetail: async (truckVisitId: string | number) => {
    return api.get<any>(`/gate/visits/${truckVisitId}`);
  },

  getAppointments: async () => {
    const res = await api.get<any>('/appointments');
    return unwrapList(res);
  },

  getWeighbridgeTickets: async () => {
    const res = await api.get<any>('/weighbridge/tickets');
    return unwrapList(res);
  },

  recordWeighing: async (body: any) => {
    return api.post<any>('/weighbridge/tickets', body);
  },

  checkInTruck: async (body: any) => {
    return api.post<any>('/truck-visits', body);
  },
};
