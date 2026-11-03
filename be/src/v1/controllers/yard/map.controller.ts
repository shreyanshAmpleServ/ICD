import { Request, Response } from 'express';
import { blocks } from '../../../data/core';
import { yardNodes, blockedSlots } from '../../../data/admin';
import { getPrisma, isDbLive } from '../../../db/prisma';
import { setupService } from '../../../modules/setup/setup.service';

export const yardMapController = {
  getYardMap: async (req: Request, res: Response) => {
    try {
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string, 10) : 1;
      const NON_BLOCK_KINDS = new Set(['AREA', 'KEY_CABINET', 'AISLE']);
      const NON_BLOCK_CODES = new Set(['MAIN', 'KC1', 'AREA', 'GATE', 'WH1', 'VEH']);

      const isRealBlock = (code: string) => {
        const c = (code || '').toUpperCase().replace('BLOCK-', '');
        if (NON_BLOCK_CODES.has(c)) return false;
        if (c.startsWith('AREA') || c.startsWith('KC') || c.startsWith('WH') || c.startsWith('GATE') || c.startsWith('MAIN')) return false;
        return true;
      };

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbLocations = await prisma.m_yard_location.findMany({
            where: siteId ? { site_id: siteId } : {},
            include: {
              unit_stay: {
                include: {
                  unit_stay_cargo_units: true,
                },
              },
            },
            orderBy: { yard_location_id: 'asc' },
          });

          if (dbLocations && dbLocations.length > 0) {
            const mappedLocations = dbLocations
              .filter((l: any) => l.is_slot || l.location_kind === 'SLOT')
              .map((l: any) => {
                const codeParts = (l.location_code || l.full_code || 'A-01-01-1').split('-');
                let blockLetter = l.location_code.startsWith('BLOCK-')
                  ? l.location_code.replace('BLOCK-', '')
                  : codeParts[0] || 'A';
                if (blockLetter === 'REEFER') blockLetter = 'R';
                const bay = parseInt(codeParts[1], 10) || 1;
                const row = parseInt(codeParts[2], 10) || 1;
                const tier = parseInt(codeParts[3], 10) || 1;
                const stays = l.unit_stay;
                const activeStay = stays && stays.length > 0 ? stays[0] : null;

                return {
                  yardLocationId: l.yard_location_id,
                  locationCode: l.location_code,
                  fullCode: l.full_code || l.location_code,
                  blockCode: blockLetter,
                  bay,
                  row,
                  tier,
                  status: activeStay ? 'OCCUPIED' : (l.is_blocked ? 'BLOCKED' : 'AVAILABLE'),
                  isBlocked: l.is_blocked,
                  unitNumber: activeStay?.unit_stay_cargo_units?.unit_no || activeStay?.unit_stay_cargo_units?.unit_number,
                  mapX: l.map_x ? Number(l.map_x) : undefined,
                  mapY: l.map_y ? Number(l.map_y) : undefined,
                  mapW: l.map_w ? Number(l.map_w) : undefined,
                  mapH: l.map_h ? Number(l.map_h) : undefined,
                };
              });

            // Extract blocks cleanly
            const blockMap = new Map<string, any>();

            // 1. Explicit BLOCK kind locations
            dbLocations
              .filter((l: any) => l.location_kind === 'BLOCK' && isRealBlock(l.location_code))
              .forEach((l: any) => {
                let code = l.location_code.replace('BLOCK-', '').toUpperCase();
                if (code === 'REEFER') code = 'R';
                blockMap.set(code, {
                  blockId: l.yard_location_id,
                  blockCode: code,
                  blockName: `Block ${code}`,
                  kind: 'BLOCK',
                  zoneType: code === 'R' ? 'REEFER' : code === 'EXAM' ? 'EXAM' : code.startsWith('V') ? 'VEHICLE' : 'DRY',
                  baysCount: code === 'R' ? 8 : code === 'EXAM' ? 6 : code.startsWith('V') ? 6 : 12,
                  rowsCount: code === 'R' ? 4 : code === 'EXAM' ? 2 : code.startsWith('V') ? 4 : 6,
                  tiersCount: l.max_tier || (code === 'R' ? 3 : code === 'EXAM' ? 2 : code.startsWith('V') ? 1 : 4),
                  totalSlots: (code === 'R' ? 96 : code === 'EXAM' ? 24 : code.startsWith('V') ? 24 : 288),
                  occupiedSlots: 0,
                });
              });

            // 2. Derive from active slots & stays
            dbLocations
              .filter((l: any) => (l.is_slot || l.location_kind === 'SLOT') && isRealBlock(l.location_code))
              .forEach((l: any) => {
                let code = (l.location_code || '').split('-')[0].toUpperCase();
                if (code === 'REEFER') code = 'R';
                if (isRealBlock(code)) {
                  if (!blockMap.has(code)) {
                    blockMap.set(code, {
                      blockId: l.parent_id || l.yard_location_id,
                      blockCode: code,
                      blockName: `Block ${code}`,
                      kind: 'BLOCK',
                      zoneType: code === 'R' ? 'REEFER' : code === 'EXAM' ? 'EXAM' : code.startsWith('V') ? 'VEHICLE' : 'DRY',
                      baysCount: code === 'R' ? 8 : code === 'EXAM' ? 6 : code.startsWith('V') ? 6 : 12,
                      rowsCount: code === 'R' ? 4 : code === 'EXAM' ? 2 : code.startsWith('V') ? 4 : 6,
                      tiersCount: code === 'R' ? 3 : code === 'EXAM' ? 2 : code.startsWith('V') ? 1 : 4,
                      totalSlots: (code === 'R' ? 96 : code === 'EXAM' ? 24 : code.startsWith('V') ? 24 : 288),
                      occupiedSlots: 0,
                    });
                  }
                  const stays = l.unit_stay;
                  if (stays && stays.length > 0 && blockMap.has(code)) {
                    blockMap.get(code).occupiedSlots += stays.length;
                  }
                }
              });

            // Only inject standard codes if no blocks exist on this site yet
            if (blockMap.size === 0) {
              const standardCodes = siteId === 2 ? ['V1', 'V2'] : ['A', 'B', 'C', 'D', 'R'];
              standardCodes.forEach((sc, idx) => {
                blockMap.set(sc, {
                  blockId: idx + 1,
                  blockCode: sc,
                  blockName: `Block ${sc}`,
                  kind: 'BLOCK',
                  zoneType: sc === 'R' ? 'REEFER' : sc.startsWith('V') ? 'VEHICLE' : 'DRY',
                  baysCount: sc === 'R' ? 8 : sc.startsWith('V') ? 6 : 12,
                  rowsCount: sc === 'R' ? 4 : sc.startsWith('V') ? 4 : 6,
                  tiersCount: sc === 'R' ? 3 : sc.startsWith('V') ? 1 : 4,
                  totalSlots: sc === 'R' ? 96 : sc.startsWith('V') ? 24 : 288,
                  occupiedSlots: 0,
                });
              });
            }

            const dbBlocks = Array.from(blockMap.values()).sort((a, b) => a.blockCode.localeCompare(b.blockCode));

            return res.json({
              blocks: dbBlocks,
              locations: mappedLocations,
              totalLocations: mappedLocations.length,
            });
          }
        }
      }

      const siteFallbackBlocks = blocks.filter((b) => b.siteId === siteId);
      const defaultBlocks = siteId === 2
        ? blocks.filter((b) => b.siteId === 2)
        : blocks.filter((b) => b.siteId === 1);
      const effectiveBlocks = siteFallbackBlocks.length > 0 ? siteFallbackBlocks : defaultBlocks;
      res.json({
        blocks: effectiveBlocks,
        nodes: yardNodes.filter((n) => n.siteId === siteId).slice(0, 50),
        totalLocations: 50,
      });
    } catch (err: any) {
      console.error('getYardMap error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getBlocks: async (req: Request, res: Response) => {
    try {
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string, 10) : undefined;
      const NON_BLOCK_CODES = new Set(['MAIN', 'KC1', 'AREA', 'GATE', 'WH1', 'VEH']);
      const isRealBlock = (code: string) => {
        const c = (code || '').toUpperCase().replace('BLOCK-', '');
        if (NON_BLOCK_CODES.has(c)) return false;
        if (c.startsWith('AREA') || c.startsWith('KC') || c.startsWith('WH') || c.startsWith('GATE') || c.startsWith('MAIN')) return false;
        return true;
      };

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbLocations = await prisma.m_yard_location.findMany({
            where: siteId ? { site_id: siteId } : {},
            include: {
              unit_stay: true,
            },
            orderBy: { yard_location_id: 'asc' },
          });

          if (dbLocations && dbLocations.length > 0) {
            const blockMap = new Map<string, any>();
            dbLocations
              .filter((l: any) => isRealBlock(l.location_code))
              .forEach((l: any) => {
                const blockCode = l.location_code.startsWith('BLOCK-')
                  ? l.location_code.replace('BLOCK-', '')
                  : l.location_code.split('-')[0] || 'A';
                if (!blockMap.has(blockCode)) {
                  blockMap.set(blockCode, {
                    blockId: l.yard_location_id,
                    blockCode,
                    blockName: `Block ${blockCode}`,
                    zoneType: blockCode === 'R' ? 'REEFER' : blockCode.startsWith('V') ? 'VEHICLE' : 'DRY',
                    baysCount: blockCode === 'R' ? 8 : blockCode.startsWith('V') ? 6 : 12,
                    rowsCount: blockCode === 'R' ? 4 : blockCode.startsWith('V') ? 4 : 6,
                    tiersCount: blockCode === 'R' ? 3 : blockCode.startsWith('V') ? 1 : 4,
                    totalSlots: blockCode === 'R' ? 96 : blockCode.startsWith('V') ? 24 : 288,
                    occupiedSlots: 0,
                  });
                }
                const stays = l.unit_stay;
                if (stays && stays.length > 0 && blockMap.has(blockCode)) {
                  blockMap.get(blockCode).occupiedSlots += stays.length;
                }
              });

            const items = Array.from(blockMap.values());
            return res.json({ items, total: items.length });
          }
        }
      }

      const siteFallbackBlocks = blocks.filter((b) => !siteId || b.siteId === siteId);
      res.json({ items: siteFallbackBlocks.length > 0 ? siteFallbackBlocks : blocks, total: siteFallbackBlocks.length });
    } catch (err: any) {
      console.error('getBlocks error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getLocations: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbLocs = await prisma.m_yard_location.findMany({
            include: {
              unit_stay: {
                include: {
                  unit_stay_cargo_units: true,
                },
              },
            },
            orderBy: { yard_location_id: 'asc' },
          });

          if (dbLocs && dbLocs.length > 0) {
            const items = dbLocs.map((l: any) => {
              const codeParts = (l.location_code || l.full_code || 'A-01-01-1').split('-');
              const blockLetter = l.location_code.startsWith('BLOCK-')
                ? l.location_code.replace('BLOCK-', '')
                : codeParts[0] || 'A';
              const bay = parseInt(codeParts[1], 10) || 1;
              const row = parseInt(codeParts[2], 10) || 1;
              const tier = parseInt(codeParts[3], 10) || 1;
              const stays = l.unit_stay;
              const activeStay = stays && stays.length > 0 ? stays[0] : null;

              return {
                yardLocationId: l.yard_location_id,
                siteId: l.site_id,
                locationCode: l.location_code,
                fullCode: l.full_code || l.location_code,
                blockCode: blockLetter,
                bay,
                row,
                tier,
                isBlocked: l.is_blocked,
                status: activeStay ? 'OCCUPIED' : (l.is_blocked ? 'BLOCKED' : 'AVAILABLE'),
                unitNumber: activeStay?.unit_stay_cargo_units?.unit_no || activeStay?.unit_stay_cargo_units?.unit_number,
                logInst: l.log_inst || 1,
              };
            });
            return res.json({ items, total: items.length, nextCursor: null });
          }
        }
      }

      const items = yardNodes.slice(0, 100).map((n: any, i: number) => ({
        yardLocationId: i + 1,
        siteId: 1,
        locationCode: n.fullCode || `LOC-${i + 1}`,
        fullCode: n.fullCode || `A-01-${String(i + 1).padStart(2, '0')}-1`,
        blockCode: n.fullCode ? n.fullCode.slice(0, 1) : 'A',
        bay: 1,
        row: 1,
        tier: 1,
        isBlocked: Boolean(blockedSlots[n.fullCode]),
        status: 'ACTIVE',
        logInst: 1,
      }));
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      console.error('getLocations error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getOccupancy: async (_req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const totalUnitsInYard = await prisma.unit_stay.count({
            where: {
              physical_status: { in: ['IN_YARD', 'GATED_IN', 'INSPECTION'] },
            },
          });
          const reeferUnits = await prisma.unit_stay.count({
            where: {
              reefer_set_temp_c: { not: null },
              physical_status: { in: ['IN_YARD', 'GATED_IN', 'INSPECTION'] },
            },
          });
          const dgUnits = await prisma.unit_stay.count({
            where: {
              imo_class: { not: null },
              physical_status: { in: ['IN_YARD', 'GATED_IN', 'INSPECTION'] },
            },
          });

          const totalCapacityTeu = 12500;
          const occupiedTeu = Math.max(totalUnitsInYard * 1.5, 420);
          const occupancyRate = Number(((occupiedTeu / totalCapacityTeu) * 100).toFixed(2));

          return res.json({
            totalCapacityTeu,
            occupiedTeu: Math.round(occupiedTeu),
            occupancyRate,
            reeferOccupancyRate: reeferUnits > 0 ? Number(((reeferUnits / 500) * 100).toFixed(1)) : 42.5,
            dangerousGoodsRate: dgUnits > 0 ? Number(((dgUnits / 200) * 100).toFixed(1)) : 14.2,
            availableSlots: totalCapacityTeu - Math.round(occupiedTeu),
          });
        }
      }

      res.json({
        totalCapacityTeu: 12500,
        occupiedTeu: 8420,
        occupancyRate: 67.36,
        reeferOccupancyRate: 54.2,
        dangerousGoodsRate: 18.4,
        availableSlots: 4080,
      });
    } catch (err: any) {
      console.error('getOccupancy error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  getBlockSlots: async (req: Request, res: Response) => {
    try {
      const blockIdOrCode = req.params.blockId;
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const id = Number(blockIdOrCode);
          let blockLetter = String(blockIdOrCode).toUpperCase();
          if (Number.isFinite(id)) {
            const blockLoc = await prisma.m_yard_location.findUnique({ where: { yard_location_id: id } });
            if (blockLoc) {
              blockLetter = blockLoc.location_code.replace('BLOCK-', '');
            }
          }
          const slots = await prisma.m_yard_location.findMany({
            where: {
              OR: [
                { location_code: { startsWith: blockLetter + '-' } },
                { full_code: { startsWith: blockLetter + '-' } },
                ...(Number.isFinite(id) ? [{ parent_id: id }] : []),
              ],
            },
            include: {
              unit_stay: {
                include: {
                  unit_stay_cargo_units: true,
                },
              },
            },
            orderBy: { location_code: 'asc' },
          });

          const items = slots.map((s: any) => ({
            yardLocationId: s.yard_location_id,
            locationCode: s.location_code,
            fullCode: s.full_code,
            isBlocked: s.is_blocked,
            blockedReason: s.blocked_reason,
            units: (s.unit_stay || []).map((u: any) => ({
              unitStayId: u.unit_stay_id,
              unitNo: u.unit_stay_cargo_units?.unit_no,
              physicalStatus: u.physical_status,
              flow: u.flow,
            })),
          }));

          return res.json({ block: blockLetter, slots: items, total: items.length });
        }
      }
      return res.json({ block: blockIdOrCode, slots: [], total: 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  blockSlot: async (req: Request, res: Response) => {
    try {
      const slotCode = req.params.slotCode || req.body.slotCode || req.body.locationCode;
      const reason = req.body.reason || 'Blocked by user';
      const result = await setupService.blockSlot(slotCode, reason);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  unblockSlot: async (req: Request, res: Response) => {
    try {
      const slotCode = req.params.slotCode || req.body.slotCode || req.body.locationCode;
      const result = await setupService.unblockSlot(slotCode);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
