import { api } from '@/api/client';
import { shifts, payments, type Payment, type Shift } from '@/mock/money';

export const cashierApi = {
  getShifts: async () => {
    try {
      const r = await api.get<{ items: Shift[] }>('/cashier-shifts');
      return r.items && r.items.length > 0 ? r.items : shifts;
    } catch {
      return shifts;
    }
  },

  getPayments: async () => {
    try {
      const r = await api.get<{ items: Payment[] }>('/payments');
      return r.items && r.items.length > 0 ? r.items : payments;
    } catch {
      return payments;
    }
  },

  openShift: async (data: any) => {
    return api.post<any>('/cashier-shifts/open', data);
  },

  closeShift: async (shiftId: number, data: any) => {
    return api.post<any>(`/cashier-shifts/${shiftId}/close`, data);
  },

  approveShift: async (shiftId: number, data: any) => {
    return api.post<any>(`/cashier-shifts/${shiftId}/approve`, data);
  },

  recordPayment: async (data: any) => {
    return api.post<any>('/payments', data);
  },
};
