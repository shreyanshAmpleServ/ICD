import { api } from '@/api/client';
import { openCharges } from '@/mock/money';

export const chargesApi = {
  getCharges: async (siteId: number) => {
    try {
      const r = await api.get<{ items: any[] }>('/charges');
      const fallback = openCharges(siteId);
      if (r.items && r.items.length > 0) {
        const mapped = r.items.map((c) => ({
          chargeId: c.chargeId,
          consignmentId: c.consignmentId || 101,
          billToPartyId: c.billToPartyId || 201,
          unitStayId: c.unitStayId,
          unitNo: c.unitNo,
          chargeCode: c.chargeCode || 'STORAGE_IMPORT',
          description: c.chargeName || c.description || 'Import container dwell storage',
          quantity: String(c.quantity || 1),
          uom: c.uom || 'DAY',
          unitRate: String(c.unitPrice || 14.0),
          amount: String(c.amount || 42.0),
          taxCode: 'VAT18',
          taxPct: '18',
          taxAmount: String((Number(c.amount || 42.0) * 0.18).toFixed(2)),
          status: (c.status === 'UNBILLED' ? 'OPEN' : c.status) as any,
          serviceFrom: '2026-10-04',
          serviceTo: '2026-10-07',
        }));
        const existingIds = new Set(mapped.map((m) => m.chargeId));
        return [...mapped, ...fallback.filter((f) => !existingIds.has(f.chargeId))];
      }
      return fallback;
    } catch {
      return openCharges(siteId);
    }
  },

  waiveCharges: async (data: any) => {
    return api.post<any>('/charges/waiver', data);
  },

  addManualCharge: async (data: any) => {
    return api.post<any>('/charges/manual', data);
  },

  createDocument: async (data: any) => {
    return api.post<any>('/invoices', data);
  },
};
