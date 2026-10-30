import { api } from '@/api/client';

export const partiesApi = {
  getParties: async (params?: { role?: string; q?: string; syncStatus?: string; creditStatus?: string }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.role && params.role !== 'all') queryParams.append('role', params.role);
      if (params?.q) queryParams.append('q', params.q);
      if (params?.syncStatus) queryParams.append('syncStatus', params.syncStatus);
      if (params?.creditStatus) queryParams.append('creditStatus', params.creditStatus);

      const qs = queryParams.toString();
      const endpoint = qs ? `/parties?${qs}` : '/parties';
      const res = await api.get<any>(endpoint);
      return Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
    } catch (err) {
      console.error('[partiesApi.getParties] Error fetching parties from DB:', err);
      return [];
    }
  },

  getPartyDetail: async (partyId: string | number) => {
    try {
      return await api.get<any>(`/parties/${partyId}`);
    } catch (err) {
      console.error('[partiesApi.getPartyDetail] Error fetching party detail from DB:', err);
      return null;
    }
  },

  createParty: async (data: any) => {
    return api.post<any>('/parties', data);
  },

  createProvisional: async (data: any) => {
    return api.post<any>('/parties:provisional', data);
  },

  matchParty: async (partyId: string | number, ngRefId: string) => {
    return api.post<any>(`/parties/${partyId}/match`, { ngRefId });
  },

  getContacts: async (partyId: string | number) => {
    const res = await api.get<any>(`/parties/${partyId}/contacts`);
    return Array.isArray(res) ? res : (res?.items ?? []);
  },

  updateContacts: async (partyId: string | number, data: any) => {
    return api.put<any>(`/parties/${partyId}/contacts`, data);
  },

  updateContact: async (partyId: string | number, contactId: string | number, data: any) => {
    return api.patch<any>(`/parties/${partyId}/contacts/${contactId}`, data);
  },
};
