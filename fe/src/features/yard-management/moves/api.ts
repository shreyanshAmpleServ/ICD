import { api } from '@/api/client';
import { moveOrders, type Move } from '@/mock/ops';

function unwrapList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export const movesApi = {
  getMoveOrders: async (): Promise<Move[]> => {
    try {
      const res = await api.get<any>('/moves');
      const items = unwrapList<Move>(res);
      return items && items.length > 0 ? items : moveOrders;
    } catch {
      return moveOrders;
    }
  },

  createMoveOrder: async (body: any) => {
    return api.post<any>('/moves', body);
  },

  startMove: async (moveOrderId: number) => {
    return api.post<any>(`/moves/${moveOrderId}/start`, {});
  },

  completeMove: async (moveOrderId: number, data: { toCode: string; rank?: number | null; reason?: string }) => {
    return api.post<any>(`/moves/${moveOrderId}/complete`, data);
  },

  assignMove: async (moveOrderId: number, data: { assignedEquipmentId?: number; assignedOperatorSub?: string }) => {
    return api.post<any>(`/moves/${moveOrderId}/assign`, data);
  },
};
