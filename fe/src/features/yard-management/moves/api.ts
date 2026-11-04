import { api } from '@/api/client';
import { type Move } from '@/mock/ops';

function unwrapList<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

export interface EquipmentItem {
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  capacityKg?: number | null;
  isActive?: boolean;
  siteId?: number;
}

export interface YardLocationItem {
  locationId: number;
  yardLocationId: number;
  locationCode: string;
  fullCode: string;
  locationKind: string;
  isSlot?: boolean;
  siteId?: number;
}

export interface OperatorItem {
  userId: number;
  userSub: string;
  name: string;
  email?: string;
  phone?: string;
}

export const movesApi = {
    getMoveOrders: async (siteId?: number): Promise<Move[]> => {
      try {
        const q = siteId ? `?siteId=${siteId}` : '';
        const res = await api.get<any>(`/moves${q}`);
        return unwrapList<Move>(res);
      } catch (err) {
        console.error('Failed to fetch moves from backend:', err);
        return [];
      }
    },

      getEquipment: async (siteId?: number): Promise<EquipmentItem[]> => {
        try {
          const q = siteId ? `?siteId=${siteId}` : '';
          const res = await api.get<any>(`/yard/equipment${q}`);
          return unwrapList<EquipmentItem>(res);
        } catch (err) {
          console.error('Failed to fetch equipment:', err);
          return [];
        }
      },

        getLocations: async (siteId?: number): Promise<YardLocationItem[]> => {
          try {
            const q = siteId ? `?siteId=${siteId}` : '';
            const res = await api.get<any>(`/yard/locations${q}`);
            return unwrapList<YardLocationItem>(res);
          } catch (err) {
            console.error('Failed to fetch locations:', err);
            return [];
          }
        },

          getOperators: async (): Promise<OperatorItem[]> => {
            try {
              const res = await api.get<any>('/yard/operators');
              return unwrapList<OperatorItem>(res);
            } catch (err) {
              console.error('Failed to fetch operators:', err);
              return [];
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
