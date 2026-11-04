import { api } from '@/api/client';
import { statement, customers } from '@/mock/money';

export type Statement = ReturnType<typeof statement>;

export const statementsApi = {
  getStatements: async (): Promise<Array<{ c: any; s: any }>> => {
    try {
      const r = await api.get<{ items: Array<{ c: any; s: any }> }>('/statements');
      return r?.items && r.items.length > 0 ? r.items : customers.map((c) => ({ c, s: statement(c.partyId!) }));
    } catch {
      return customers.map((c) => ({ c, s: statement(c.partyId!) }));
    }
  },

  getCustomerStatement: async (partyId: number, from?: string, to?: string): Promise<Statement> => {
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      const qs = q.toString() ? `?${q.toString()}` : '';
      const r = await api.get<Statement>(`/statements/${partyId}${qs}`);
      return r ?? statement(partyId, from, to);
    } catch {
      return statement(partyId, from, to);
    }
  },
};
