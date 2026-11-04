import { api } from '@/api/client';

export const financeApi = {
  getAccountingPeriods: async () => {
    try {
      const res = await api.get<any>('/accounting-periods');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createPeriod: async (data: any) => {
    return api.post<any>('/accounting-periods', data);
  },
  updatePeriod: async (periodKey: string, data: any) => {
    return api.patch<any>(`/accounting-periods/${periodKey}`, data);
  },
  closePeriod: async (periodKey: string, reason?: string) => {
    return api.post<any>(`/accounting-periods/${periodKey}/close`, { reason });
  },
  reopenPeriod: async (periodKey: string, reason?: string) => {
    return api.post<any>(`/accounting-periods/${periodKey}/reopen`, { reason });
  },

  getChargeCodes: async () => {
    try {
      const res = await api.get<any>('/charge-codes');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createChargeCode: async (data: any) => {
    return api.post<any>('/charge-codes', data);
  },
  updateCharge: async (id: number | string, data: any) => {
    return api.patch<any>(`/charge-codes/${id}`, data);
  },

  getTaxCodes: async () => {
    try {
      const res = await api.get<any>('/tax-codes');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createTaxCode: async (data: any) => {
    return api.post<any>('/tax-codes', data);
  },
  updateTaxCode: async (id: number | string, data: any) => {
    return api.patch<any>(`/tax-codes/${id}`, data);
  },

  getPaymentChannels: async () => {
    try {
      const res = await api.get<any>('/payment-channels');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createPaymentChannel: async (data: any) => {
    return api.post<any>('/payment-channels', data);
  },
  updatePaymentChannel: async (id: number | string, data: any) => {
    return api.patch<any>(`/payment-channels/${id}`, data);
  },

  getGlSettings: async () => {
    try {
      const res = await api.get<any>('/gl-settings');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  createGlSetting: async (data: any) => {
    return api.post<any>('/gl-settings', data);
  },
  updateGlSetting: async (id: string, data: any) => {
    return api.patch<any>(`/gl-settings/${id}`, data);
  },
};
