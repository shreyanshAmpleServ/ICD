import { api } from '@/api/client';
import { parties } from '@/mock/core';

export const partiesApi = {
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

  matchParty: async (partyId: string | number, ngRefId: string) => {
    return api.post<any>(`/parties/${partyId}/match`, { ngRefId });
  },

  updateContact: async (partyId: string | number, contactId: string | number, data: any) => {
    return api.patch<any>(`/parties/${partyId}/contacts/${contactId}`, data);
  },
};
