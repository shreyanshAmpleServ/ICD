import { api } from '@/api/client';
import { invoicesOf, portalUnits, portalDocs, appointments as fallbackAppts, serviceRequests } from '@/mock/insight';

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

  getPortalDocuments: async (partyId: number) => {
    try {
      const res = await api.get<any>(`/portal/documents?partyId=${partyId}`);
      return res?.items ?? (Array.isArray(res) ? res : portalDocs);
    } catch {
      return portalDocs;
    }
  },

  getPortalAppointments: async (partyId: number) => {
    try {
      const res = await api.get<any>(`/portal/appointments?partyId=${partyId}`);
      return res?.items ?? (Array.isArray(res) ? res : fallbackAppts);
    } catch {
      return fallbackAppts;
    }
  },

  getPortalRequests: async (partyId: number) => {
    try {
      const res = await api.get<any>(`/portal/requests?partyId=${partyId}`);
      return res?.items ?? (Array.isArray(res) ? res : serviceRequests.filter(s => s.partyId === partyId));
    } catch {
      return serviceRequests.filter(s => s.partyId === partyId);
    }
  },

  getPortalSummary: async (partyId: number) => {
    try {
      const res = await api.get<any>(`/portal/summary?partyId=${partyId}`);
      return res;
    } catch {
      return null;
    }
  },

  bookAppointment: async (body: any) => {
    return api.post<any>('/portal/appointments', body);
  },

  submitRequest: async (body: any) => {
    return api.post<any>('/portal/requests', body);
  },

  payInvoice: async (invoiceId: number, body: any) => {
    return api.post<any>(`/portal/invoices/${invoiceId}/pay`, body);
  },
};
