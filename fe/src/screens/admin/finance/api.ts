import { api } from '@/api/client';
import { periods as seedPeriods, chargeCodes as seedCharges, taxCodes as seedTaxCodes, paymentChannels as seedChannels, glSettings } from '@/mock/admin';

export const financeApi = {
  getAccountingPeriods: async () => {
    try {
      const res = await api.get<any>('/accounting-periods');
      return res?.items ?? (Array.isArray(res) ? res : seedPeriods);
    } catch {
      return seedPeriods;
    }
  },
  closePeriod: async (periodKey: string, reason?: string) => {
    return api.post<any>(`/accounting-periods/${periodKey}/close`, { reason });
  },
  getChargeCodes: async () => {
    try {
      const res = await api.get<any>('/charge-codes');
      return res?.items ?? (Array.isArray(res) ? res : seedCharges);
    } catch {
      return seedCharges;
    }
  },
  updateCharge: async (id: number, data: any) => {
    return api.patch<any>(`/charge-codes/${id}`, data);
  },
  getTaxCodes: async () => {
    try {
      const res = await api.get<any>('/tax-codes');
      return res?.items ?? (Array.isArray(res) ? res : seedTaxCodes);
    } catch {
      return seedTaxCodes;
    }
  },
  getPaymentChannels: async () => {
    try {
      const res = await api.get<any>('/payment-channels');
      return res?.items ?? (Array.isArray(res) ? res : seedChannels);
    } catch {
      return seedChannels;
    }
  },
  getGlSettings: async () => {
    try {
      const res = await api.get<any>('/gl-settings');
      return res?.items ?? (Array.isArray(res) ? res : glSettings);
    } catch {
      return glSettings;
    }
  },
};
