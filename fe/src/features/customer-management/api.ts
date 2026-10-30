import { api } from '@/api/client';
import { serviceRequests, portalUnits } from '@/mock/insight';

export const customersApi = {
  getParties: async () => {
    try {
      const res = await api.get<any>('/parties');
      return Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
    } catch {
      return [];
    }
  },

  getPartyDetail: async (partyId: string | number) => {
    try {
      return await api.get<any>(`/parties/${partyId}`);
    } catch {
      return null;
    }
  },

  getServiceRequests: async () => {
    try {
      const res = await api.get<any[]>('/service-requests');
      return res && res.length > 0 ? res : serviceRequests;
    } catch {
      return serviceRequests;
    }
  },

  createServiceRequest: async (body: any) => {
    return api.post<any>('/service-requests', body);
  },

  getPortalData: async () => {
    try {
      const res = await api.get<any>('/portal/units');
      return res || portalUnits;
    } catch {
      return portalUnits;
    }
  }
};
