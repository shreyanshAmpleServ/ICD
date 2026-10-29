import { api } from '@/api/client';
import { parties } from '@/mock/core';
import { serviceRequests, portalUnits } from '@/mock/insight';

export const customersApi = {
  getParties: async () => {
    try {
      const res = await api.get<any[]>('/parties');
      return res && res.length > 0 ? res : parties;
    } catch {
      return parties;
    }
  },

  getPartyDetail: async (partyId: string | number) => {
    try {
      return await api.get<any>(`/parties/${partyId}`);
    } catch {
      return parties.find((p) => String(p.partyId) === String(partyId));
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
