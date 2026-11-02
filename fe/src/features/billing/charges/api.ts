import { api } from '@/api/client';
import { openCharges } from '@/mock/money';

export const chargesApi = {
  getCharges: async (siteId: number) => {
    try {
      const r = await api.get<{ items: any[]; total?: number }>(`/charges?siteId=${siteId}`);
      if (r && Array.isArray(r.items) && r.items.length > 0) {
        return r.items.map((c: any) => ({
          chargeId: c.chargeId,
          key: c.key || `chg-${c.chargeId}`,
          consignmentId: c.consignmentId ?? 101,
          consignmentRef: c.consignmentRef,
          billToPartyId: c.billToPartyId ?? 201,
          partyName: c.partyName,
          unitStayId: c.unitStayId ?? null,
          unitNo: c.unitNo ?? null,
          unitCategory: c.unitCategory,
          chargeCode: c.chargeCode,
          chargeName: c.chargeName || c.description,
          description: c.description || c.chargeName,
          quantity: String(c.quantity ?? 1),
          uom: c.uom || 'UNIT',
          unitRate: String(c.unitRate ?? c.unitPrice ?? 0),
          amount: String(c.amount ?? 0),
          taxCode: c.taxCode || 'VAT18',
          taxPct: c.taxPct !== undefined ? Number(c.taxPct) : 18,
          taxAmount: String(c.taxAmount ?? (Number(c.amount || 0) * 0.18).toFixed(2)),
          tariffCode: c.tariffCode,
          tariffVersion: c.tariffVersion,
          ruleId: c.ruleId,
          kind: c.kind || 'NORMAL',
          status: (c.status === 'UNBILLED' ? 'OPEN' : c.status) as any,
          serviceFrom: c.serviceFrom,
          serviceTo: c.serviceTo,
          ratedAt: c.ratedAt || new Date().toISOString(),
          waiverNote: c.waiverNote,
        }));
      }
      return openCharges(siteId);
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
