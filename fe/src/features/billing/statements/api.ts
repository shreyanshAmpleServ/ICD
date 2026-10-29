import { api } from '@/api/client';
import { statement } from '@/mock/money';

export type Statement = ReturnType<typeof statement>;

export const statementsApi = {
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
