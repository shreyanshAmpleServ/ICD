import { api } from '@/api/client';
import {
  charges, invoices, disbursements, tariffs, rates, glPostings, refunds
} from '@/mock/money';

export const moneyApi = {
  getCharges: async () => {
    try {
      const res = await api.get<any[]>('/charges');
      return res && res.length > 0 ? res : charges;
    } catch {
      return charges;
    }
  },

  getInvoices: async () => {
    try {
      const res = await api.get<any[]>('/invoices');
      return res && res.length > 0 ? res : invoices;
    } catch {
      return invoices;
    }
  },

  getInvoiceDetail: async (invoiceId: string | number) => {
    try {
      return await api.get<any>(`/invoices/${invoiceId}`);
    } catch {
      return invoices.find((inv) => String(inv.invoiceId) === String(invoiceId));
    }
  },

  createInvoice: async (body: any) => {
    return api.post<any>('/invoices', body);
  },

  recordPayment: async (body: any) => {
    return api.post<any>('/payments', body);
  },

  getRefunds: async () => {
    try {
      const res = await api.get<any[]>('/refunds');
      return res && res.length > 0 ? res : refunds;
    } catch {
      return refunds;
    }
  },

  createRefund: async (body: any) => {
    return api.post<any>('/refunds', body);
  },

  getDisbursements: async () => {
    try {
      const res = await api.get<any[]>('/disbursements');
      return res && res.length > 0 ? res : disbursements;
    } catch {
      return disbursements;
    }
  },

  createDisbursement: async (body: any) => {
    return api.post<any>('/disbursements', body);
  },

  getStatements: async (partyId?: string | number) => {
    try {
      const res = await api.get<any[]>(partyId ? `/statements?partyId=${partyId}` : '/statements');
      return res && res.length > 0 ? res : [];
    } catch {
      return [];
    }
  },

  getTariffs: async () => {
    try {
      const res = await api.get<any[]>('/tariffs');
      return res && res.length > 0 ? res : tariffs;
    } catch {
      return tariffs;
    }
  },

  getTariffDetail: async (tariffId: string | number) => {
    try {
      return await api.get<any>(`/tariffs/${tariffId}`);
    } catch {
      return tariffs.find((t) => String(t.tariffId) === String(tariffId));
    }
  },

  getExchangeRates: async () => {
    try {
      const res = await api.get<any[]>('/exchange-rates');
      return res && res.length > 0 ? res : rates;
    } catch {
      return rates;
    }
  },

  getLedger: async () => {
    try {
      const res = await api.get<any[]>('/ledger');
      return res && res.length > 0 ? res : glPostings;
    } catch {
      return glPostings;
    }
  }
};
