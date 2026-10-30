import { api } from '@/api/client';

export const financeApi = {
  getAccountingPeriods: async () => {
    try {
      const res = await api.get<any>('/accounting-periods');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  closePeriod: async (periodKey: string, reason?: string) => {
    return api.post<any>(`/accounting-periods/${periodKey}/close`, { reason });
  },
  getChargeCodes: async () => {
    try {
      const res = await api.get<any>('/charge-codes');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  updateCharge: async (id: number, data: any) => {
    return api.patch<any>(`/charge-codes/${id}`, data);
  },
  getTaxCodes: async () => {
    try {
      const res = await api.get<any>('/tax-codes');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  getPaymentChannels: async () => {
    try {
      const res = await api.get<any>('/payment-channels');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
  getGlSettings: async () => {
    try {
      const res = await api.get<any>('/gl-settings');
      return res?.items ?? (Array.isArray(res) ? res : []);
    } catch { return []; }
  },
};
