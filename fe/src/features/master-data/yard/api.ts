import { api } from '@/api/client';
import type { YardNode } from '@/mock/admin';

const BLOCK_DEFAULT_LAYOUTS: Record<string, { x: string; y: string; w: string; h: string }> = {
  A: { x: '40', y: '40', w: '360', h: '150' },
  B: { x: '440', y: '40', w: '360', h: '150' },
  C: { x: '40', y: '230', w: '300', h: '125' },
  R: { x: '380', y: '225', w: '300', h: '80' },
  EXAM: { x: '380', y: '318', w: '180', h: '50' },
  X: { x: '380', y: '318', w: '180', h: '50' },
  D: { x: '720', y: '230', w: '180', h: '125' },
};

export const yardApi = {
  getYardLocations: async (siteId?: number): Promise<YardNode[]> => {
    try {
      const url = siteId ? `/yard/locations?siteId=${siteId}` : '/yard/locations';
      const res = await api.get<any>(url);
      const rawItems = res?.items ?? (Array.isArray(res) ? res : []);
      return rawItems.map((item: any) => {
        const kind = item.kind || item.locationKind || (item.levelNo === 1 ? 'AREA' : item.levelNo === 2 ? 'BLOCK' : 'SLOT');
        const cleanCode = (item.locationCode || item.code || '').replace('BLOCK-', '');
        const map = item.map || (item.mapX != null && item.mapY != null ? {
          x: String(item.mapX),
          y: String(item.mapY),
          w: String(item.mapW || 160),
          h: String(item.mapH || 120),
        } : (kind === 'BLOCK' ? BLOCK_DEFAULT_LAYOUTS[cleanCode] || { x: '40', y: '40', w: '360', h: '150' } : undefined));

        const rows = item.rows ?? (kind === 'BLOCK' ? (cleanCode === 'R' ? 4 : cleanCode === 'EXAM' ? 2 : 6) : undefined);
        const bays = item.bays ?? (kind === 'BLOCK' ? (cleanCode === 'R' ? 8 : cleanCode === 'EXAM' ? 6 : 12) : undefined);
        const maxTier = item.maxTier ?? (kind === 'BLOCK' ? 4 : 1);

        return {
          ...item,
          kind,
          name: item.name || item.locationName || (kind === 'BLOCK' ? `Block ${cleanCode}` : item.locationCode) || 'Location',
          rows,
          bays,
          maxTier,
          map,
          tags: Array.isArray(item.tags) ? item.tags : [],
        };
      });
    } catch { return []; }
  },
  createYardLocation: async (data: any) => {
    return api.post<any>('/yard/locations', data);
  },
  updateYardLocation: async (id: number, data: any) => {
    return api.patch<any>(`/yard/locations/${id}`, data);
  },
  deleteYardLocation: async (id: number) => {
    return api.delete<any>(`/yard/locations/${id}`);
  },
  generateSlots: async (id: number, data: any) => {
    return api.post<any>(`/yard/locations/${id}/generate`, data);
  },
  blockSlot: async (slotCode: string, reason?: string) => {
    return api.post<any>('/yard/slots/block', { slotCode, reason });
  },
  unblockSlot: async (slotCode: string) => {
    return api.post<any>('/yard/slots/unblock', { slotCode });
  },
};
