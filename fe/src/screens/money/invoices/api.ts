import { api } from '@/api/client';
import { invoices, invoice } from '@/mock/money';
import { delay } from '@/api/query';

export const invoicesApi = {
  getInvoices: async (siteId?: number) => {
    try {
      const res = await api.get<any[]>('/invoices');
      if (res && res.length > 0) return res;
      return siteId ? invoices.filter((i) => i.siteId === siteId) : invoices;
    } catch {
      return delay(siteId ? invoices.filter((i) => i.siteId === siteId) : invoices);
    }
  },

  getInvoiceDetail: async (invoiceId: number) => {
    try {
      const res = await api.get<any>(`/invoices/${invoiceId}`);
      return res || invoice(invoiceId);
    } catch {
      return delay(invoice(invoiceId));
    }
  },

  createInvoice: async (data: any) => {
    return api.post<any>('/invoices', data);
  },

  postInvoice: async (invoiceId: number) => {
    return api.post<any>(`/invoices/${invoiceId}/post`, {});
  },

  convertProforma: async (invoiceId: number) => {
    return api.post<any>(`/invoices/${invoiceId}/convert`, {});
  },

  issueFiscalReceipt: async (invoiceId: number) => {
    return api.post<any>(`/invoices/${invoiceId}/fiscalise`, {});
  },

  issueCreditNote: async (invoiceId: number, data: any) => {
    return api.post<any>(`/invoices/${invoiceId}/credit-note`, data);
  },
};
