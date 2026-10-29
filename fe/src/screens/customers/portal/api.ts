import { api } from '@/api/client';
import { invoicesOf, portalUnits } from '@/mock/insight';

export const portalApi = {
  getPortalUnits: async (partyId: number) => {
    try {
      const res = await api.get<any>(`/portal/units?partyId=${partyId}`);
      return res?.items ?? (Array.isArray(res) ? res : portalUnits(partyId));
    } catch {
      return portalUnits(partyId);
    }
  },

  getPortalInvoices: async (partyId: number) => {
    try {
      const res = await api.get<any>(`/portal/invoices?partyId=${partyId}`);
      return res?.items ?? (Array.isArray(res) ? res : invoicesOf(partyId));
    } catch {
      return invoicesOf(partyId);
    }
  },

  bookAppointment: async (body: any) => {
    return api.post<any>('/appointments', body);
  },

  submitRequest: async (body: any) => {
    return api.post<any>('/portal/requests', body);
  },

  payInvoice: async (invoiceId: number, body: any) => {
    return api.post<any>(`/invoices/${invoiceId}:pay`, body);
  },
};
