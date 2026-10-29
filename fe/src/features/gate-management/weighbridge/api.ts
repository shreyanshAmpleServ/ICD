import { api } from '@/api/client';
import { type Ticket } from './types';

function unwrapList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export const weighbridgeApi = {
  getTickets: async () => {
    const res = await api.get<any>('/weighings');
    return unwrapList<Ticket>(res);
  },

  createTicket: async (ticket: Partial<Ticket>) => {
    return api.post<Ticket>('/weighings', ticket);
  },

  requestOverride: async (ticketId: number, data: { reason: string }) => {
    return api.post<any>(`/weighings/${ticketId}/override-request`, data);
  },

  printTicket: async (ticketId: number) => {
    return api.post<any>(`/weighings/${ticketId}/print`, {});
  },
};
