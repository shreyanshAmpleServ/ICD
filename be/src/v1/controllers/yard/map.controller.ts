import { Request, Response } from 'express';
import { blocks } from '../../../data/core';
import { yardNodes, blockedSlots } from '../../../data/admin';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const yardMapController = {
  getYardMap: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
            const dbLocations = await prisma.m_yard_location.findMany({
              include: {
                unit_stay_yard_locations: {
                  include: {
                    unit_stay_cargo_units: true,
                  },
                },
              },
              orderBy: { yard_location_id: 'asc' },
            });

            if(dbLocations && dbLocations.length > 0) {
                  const mappedLocations = dbLocations.map((l: any) => {
                    const codeParts = (l.location_code || l.full_code || 'A-01-01-1').split('-');
                    const blockLetter = l.location_code.startsWith('BLOCK-')
                      ? l.location_code.replace('BLOCK-', '')
                      : codeParts[0] || 'A';
                    const bay = parseInt(codeParts[1], 10) || 1;
                    const row = parseInt(codeParts[2], 10) || 1;
                    const tier = parseInt(codeParts[3], 10) || 1;
                    const stays = l.unit_stay_yard_locations;
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
                  unitNumber: activeStay?.unit_stay_cargo_units?.unit_number,
                  mapX: l.map_x ? Number(l.map_x) : undefined,
                  mapY: l.map_y ? Number(l.map_y) : undefined,
                  mapW: l.map_w ? Number(l.map_w) : undefined,
                  mapH: l.map_h ? Number(l.map_h) : undefined,
              };
});

// Extract blocks
const blockMap = new Map<string, any>();
dbLocations.forEach((l: any) => {
  const blockCode = l.location_code.startsWith('BLOCK-')
    ? l.location_code.replace('BLOCK-', '')
    : l.location_code.split('-')[0] || 'A';
  if (!blockMap.has(blockCode)) {
    blockMap.set(blockCode, {
      blockId: l.yard_location_id,
      blockCode,
      blockName: `Block ${blockCode}`,
      zoneType: blockCode === 'R' ? 'REEFER' : 'DRY',
      baysCount: 12,
      rowsCount: 6,
      tiersCount: 4,
      totalSlots: 288,
      occupiedSlots: 0,
    });
  }
  const stays = l.unit_stay_yard_locations;
  if (stays && stays.length > 0) {
    blockMap.get(blockCode).occupiedSlots += stays.length;
  }
});

const dbBlocks = Array.from(blockMap.values());

return res.json({
  blocks: dbBlocks.length > 0 ? dbBlocks : blocks,
  locations: mappedLocations,
  totalLocations: mappedLocations.length,
});
          }
        }
      }

res.json({
  blocks: blocks,
  nodes: yardNodes.slice(0, 50),
  totalLocations: 50,
});
    } catch (err: any) {
  console.error('getYardMap error:', err);
  res.status(500).json({ error: err.message });
}
  },

getBlocks: async (req: Request, res: Response) => {
  try {
    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
          const dbLocations = await prisma.m_yard_location.findMany({
            include: {
              unit_stay_yard_locations: true,
            },
            orderBy: { yard_location_id: 'asc' },
          });

        if (dbLocations && dbLocations.length > 0) {
          const blockMap = new Map<string, any>();
          dbLocations.forEach((l: any) => {
            const blockCode = l.location_code.startsWith('BLOCK-')
              ? l.location_code.replace('BLOCK-', '')
              : l.location_code.split('-')[0] || 'A';
            if (!blockMap.has(blockCode)) {
              blockMap.set(blockCode, {
                blockId: l.yard_location_id,
                blockCode,
                blockName: `Block ${blockCode}`,
                zoneType: blockCode === 'R' ? 'REEFER' : 'DRY',
                baysCount: 12,
                rowsCount: 6,
                tiersCount: 4,
                totalSlots: 288,
                occupiedSlots: 0,
              });
            }
            const stays = l.unit_stay_yard_locations;
            if (stays && stays.length > 0) {
              blockMap.get(blockCode).occupiedSlots += stays.length;
            }
          });

          const items = Array.from(blockMap.values());
          return res.json({ items, total: items.length });
        }
      }
    }

    res.json({ items: blocks, total: blocks.length });
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
                unit_stay_yard_locations: {
                  include: {
                    unit_stay_cargo_units: true,
                  },
                },
              },
              orderBy: { yard_location_id: 'asc' },
            });

            if(dbLocs && dbLocs.length > 0) {
          const items = dbLocs.map((l: any) => {
            const codeParts = (l.location_code || l.full_code || 'A-01-01-1').split('-');
            const blockLetter = l.location_code.startsWith('BLOCK-')
              ? l.location_code.replace('BLOCK-', '')
              : codeParts[0] || 'A';
            const bay = parseInt(codeParts[1], 10) || 1;
            const row = parseInt(codeParts[2], 10) || 1;
            const tier = parseInt(codeParts[3], 10) || 1;
            const stays = l.unit_stay_yard_locations;
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
              unitNumber: activeStay?.unit_stay_cargo_units?.unit_number,
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
};
