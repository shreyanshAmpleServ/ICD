import { api } from '@/api/client';
import { keys, type Key } from '@/mock/ops';

export const keysApi = {
  getKeys: async (): Promise<Key[]> => {
    try {
      const res = await api.get<Key[]>('/keys');
      return res && res.length > 0 ? res : keys;
    } catch {
      return keys;
    }
  },

  recordMovement: async (keyCustodyId: number, data: any) => {
    return api.post<any>(`/keys/${keyCustodyId}/movements`, data);
  },
};
