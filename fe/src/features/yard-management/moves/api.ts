import { api } from '@/api/client';
import { moveOrders, type Move } from '@/mock/ops';

export const movesApi = {
  getMoveOrders: async (): Promise<Move[]> => {
    try {
      const res = await api.get<Move[]>('/moves');
      return res && res.length > 0 ? res : moveOrders;
    } catch {
      return moveOrders;
    }
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
