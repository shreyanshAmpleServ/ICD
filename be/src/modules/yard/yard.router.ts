import { Router } from 'express';
import { requireSite } from '../../middleware/siteScope';
import { requirePermission } from '../../middleware/permission';
import { yardNodes, locationTags, blockedSlots } from '../../data/admin';
import { moveOrders, equipmentForMoves } from '../../data/ops';
import { blocks, allStays } from '../../data/core';
import { getPrisma, isDbLive } from '../../db/prisma';

const router = Router();

// In-memory yard levels
let yardLevels = [
  { yardLevelId: 1, levelNo: 1, levelName: 'Ground (Tier 1)', heightMaxMm: 2900, allowLoaded: true, allowEmpty: true, logInst: 1 },
  { yardLevelId: 2, levelNo: 2, levelName: 'Tier 2', heightMaxMm: 5800, allowLoaded: true, allowEmpty: true, logInst: 1 },
  { yardLevelId: 3, levelNo: 3, levelName: 'Tier 3', heightMaxMm: 8700, allowLoaded: true, allowEmpty: true, logInst: 1 },
  { yardLevelId: 4, levelNo: 4, levelName: 'Tier 4', heightMaxMm: 11600, allowLoaded: false, allowEmpty: true, logInst: 1 },
  { yardLevelId: 5, levelNo: 5, levelName: 'Tier 5', heightMaxMm: 14500, allowLoaded: false, allowEmpty: true, logInst: 1 }
];

// In-memory yard locations
let yardLocations = yardNodes.slice(0, 100).map((n, i) => ({
  yardLocationId: i + 1,
  siteId: 1,
  locationCode: (n as any).fullCode || `LOC-${i + 1}`,
  fullCode: (n as any).fullCode || `A-01-${String(i + 1).padStart(2, '0')}-1`,
  blockCode: (n as any).fullCode ? (n as any).fullCode.slice(0, 1) : 'A',
  bay: 1,
  row: 1,
  tier: 1,
  isBlocked: Boolean(blockedSlots[(n as any).fullCode]),
  status: 'ACTIVE',
  logInst: 1
}));

// In-memory moves log
const yardMovesLog = [
  { yardMoveId: 1, unitStayId: 5001, unitNo: 'MSKU 882014 9', fromLocation: 'IN_GATE', toLocation: 'A-01-01-1', equipmentCode: 'RS-01', operatorName: 'Ibrahim N.', completedAt: new Date(Date.now() - 3600000).toISOString() },
  { yardMoveId: 2, unitStayId: 5002, unitNo: 'BMLU 402117 3', fromLocation: 'A-01-01-1', toLocation: 'B-02-04-2', equipmentCode: 'RS-02', operatorName: 'Kassim O.', completedAt: new Date(Date.now() - 1800000).toISOString() }
];

// ------------------------------------------------------------------ Yard Design (Site-scoped)
router.get('/yard/levels', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  res.json({ items: yardLevels, total: yardLevels.length, nextCursor: null });
});

router.post('/yard/levels', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const newLevel = {
    yardLevelId: yardLevels.length + 1,
    levelNo: req.body.levelNo || (yardLevels.length + 1),
    levelName: req.body.levelName || `Tier ${yardLevels.length + 1}`,
    heightMaxMm: req.body.heightMaxMm || 2900,
    allowLoaded: req.body.allowLoaded !== false,
    allowEmpty: req.body.allowEmpty !== false,
    logInst: 1,
    ...req.body
  };
  yardLevels.push(newLevel);
  res.status(201).json(newLevel);
});

router.get('/yard/levels/:yardLevelId', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  const lvl = yardLevels.find(l => String(l.yardLevelId) === req.params.yardLevelId);
  if (!lvl) return res.status(404).json({ error: 'Yard level not found' });
  res.json(lvl);
});

router.patch('/yard/levels/:yardLevelId', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const lvl = yardLevels.find(l => String(l.yardLevelId) === req.params.yardLevelId);
  if (!lvl) return res.status(404).json({ error: 'Yard level not found' });
  Object.assign(lvl, req.body, { logInst: lvl.logInst + 1 });
  res.json(lvl);
});

router.get('/yard/locations', requireSite(false), requirePermission('yard.map.view'), async (req, res) => {
  const { block, fullCode } = req.query;
  let items = yardLocations;

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbLocs = await prisma.yard_locations.findMany({
          include: { yard_blocks: true },
          orderBy: { yard_location_id: 'asc' }
        });
        if (dbLocs && dbLocs.length > 0) {
          const mapped = dbLocs.map(l => ({
            yardLocationId: l.yard_location_id,
            siteId: l.site_id,
            locationCode: l.location_code,
            fullCode: l.full_code,
            blockCode: l.yard_blocks?.block_code || l.full_code.slice(0, 1),
            bay: 1,
            row: 1,
            tier: 1,
            isBlocked: l.is_blocked ?? false,
            status: 'ACTIVE',
            logInst: 1
          }));
          const dbCodes = new Set(mapped.map(m => m.fullCode));
          items = [...mapped, ...yardLocations.filter(loc => !dbCodes.has(loc.fullCode))];
        }
      } catch (err) {
        console.warn('[YardRouter] DB query error on yard/locations:', err);
      }
    }
  }

  if (block) {
    items = items.filter(l => l.blockCode === String(block).toUpperCase());
  }
  if (fullCode) {
    items = items.filter(l => l.fullCode.includes(String(fullCode).toUpperCase()));
  }
  res.json({ items, total: items.length, nextCursor: null });
});

router.post('/yard/locations', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const newLoc = {
    yardLocationId: yardLocations.length + 1,
    siteId: 1,
    locationCode: req.body.locationCode || `LOC-${yardLocations.length + 1}`,
    fullCode: req.body.fullCode || req.body.locationCode || `X-01-01-1`,
    blockCode: req.body.blockCode || 'X',
    bay: req.body.bay || 1,
    row: req.body.row || 1,
    tier: req.body.tier || 1,
    isBlocked: false,
    status: 'ACTIVE',
    logInst: 1,
    ...req.body
  };
  yardLocations.push(newLoc);
  res.status(201).json(newLoc);
});

router.get('/yard/locations/:yardLocationId', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  const loc = yardLocations.find(l => String(l.yardLocationId) === req.params.yardLocationId || l.fullCode === req.params.yardLocationId);
  if (!loc) return res.status(404).json({ error: 'Yard location not found' });
  res.json(loc);
});

router.patch('/yard/locations/:yardLocationId', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const loc = yardLocations.find(l => String(l.yardLocationId) === req.params.yardLocationId || l.fullCode === req.params.yardLocationId);
  if (!loc) return res.status(404).json({ error: 'Yard location not found' });
  Object.assign(loc, req.body, { logInst: loc.logInst + 1 });
  res.json(loc);
});

router.get('/yard/locations/:yardLocationId/children', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  const loc = yardLocations.find(l => String(l.yardLocationId) === req.params.yardLocationId || l.fullCode === req.params.yardLocationId);
  if (!loc) return res.status(404).json({ error: 'Yard location not found' });
  const children = yardLocations.filter(l => l.fullCode.startsWith(loc.fullCode) && l.yardLocationId !== loc.yardLocationId);
  res.json({ items: children, total: children.length, nextCursor: null });
});

router.post('/yard/locations:generate', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const { blockCode, bays, rows, tiers } = req.body;
  const total = (bays || 10) * (rows || 4) * (tiers || 4);
  res.status(201).json({
    message: `Generated ${total} slots for block ${blockCode || 'NEW'} successfully.`,
    blockCode,
    totalSlots: total
  });
});

router.post('/yard/locations/:yardLocationId([0-9a-zA-Z_.-]+):block', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const loc = yardLocations.find(l => String(l.yardLocationId) === req.params.yardLocationId || l.fullCode === req.params.yardLocationId);
  if (loc) loc.isBlocked = true;
  res.json({
    yardLocationId: req.params.yardLocationId,
    isBlocked: true,
    reason: req.body.reason || 'Maintenance'
  });
});

router.post('/yard/locations/:yardLocationId([0-9a-zA-Z_.-]+):unblock', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const loc = yardLocations.find(l => String(l.yardLocationId) === req.params.yardLocationId || l.fullCode === req.params.yardLocationId);
  if (loc) loc.isBlocked = false;
  res.json({
    yardLocationId: req.params.yardLocationId,
    isBlocked: false
  });
});

router.get('/yard/tags', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  res.json({ items: locationTags, total: locationTags.length, nextCursor: null });
});

router.post('/yard/tags', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const newTag = {
    locationTagId: locationTags.length + 1,
    tagCode: req.body.tagCode || `TAG-${locationTags.length + 1}`,
    tagName: req.body.tagName || 'Custom Tag',
    colorHex: req.body.colorHex || '#3B82F6',
    isActive: true,
    logInst: 1,
    ...req.body
  };
  locationTags.push(newTag as any);
  res.status(201).json(newTag);
});

router.get('/yard/tags/:locationTagId', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  const tag = locationTags.find(t => String((t as any).locationTagId) === req.params.locationTagId || t.tagCode === req.params.locationTagId);
  if (!tag) return res.status(404).json({ error: 'Location tag not found' });
  res.json(tag);
});

router.patch('/yard/tags/:locationTagId', requireSite(false), requirePermission('admin.yard.design', 'DO'), (req, res) => {
  const tag = locationTags.find(t => String((t as any).locationTagId) === req.params.locationTagId || t.tagCode === req.params.locationTagId);
  if (!tag) return res.status(404).json({ error: 'Location tag not found' });
  Object.assign(tag, req.body);
  res.json(tag);
});

// ------------------------------------------------------------------ Yard Operations (Site-scoped)
router.get('/yard/map', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  res.json({
    siteId: 1,
    siteCode: 'DAR1',
    blocks: blocks.map(b => ({
      ...b,
      totalSlots: 160,
      occupiedSlots: 98,
      utilizationPct: 61.25
    }))
  });
});

router.get('/yard/blocks/:blockId/slots', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  const slots = yardLocations.filter(l => l.blockCode.toUpperCase() === req.params.blockId.toUpperCase());
  res.json({ blockId: req.params.blockId, slots, total: slots.length });
});

router.get('/yard/occupancy', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  const totalSlots = 800;
  const occupiedSlots = allStays.filter(s => s.physicalStatus === 'IN_YARD').length || 420;
  res.json({
    totalSlots,
    occupiedSlots,
    availableSlots: totalSlots - occupiedSlots,
    utilizationPct: Number(((occupiedSlots / totalSlots) * 100).toFixed(1)),
    reeferPlugsOccupied: 18,
    reeferPlugsTotal: 32,
    byBlock: blocks.map(b => ({ blockCode: b.code, capacity: 160, occupied: 84 }))
  });
});

router.post(['/yard/suggestions', '/yard/allocation:suggest'], requireSite(false), requirePermission('yard.allocate'), (req, res) => {
  const { unitNo, isoType } = req.body;
  res.json({
    suggestedLocation: 'A-02-04-2',
    blockCode: 'A',
    bay: 2,
    row: 4,
    tier: 2,
    score: 94.5,
    unitNo: unitNo || 'MSKU 123456 7',
    reason: 'Minimizes reshuffling; matches destination corridor'
  });
});

router.get(['/move-orders', '/moves'], requireSite(false), requirePermission('yard.move.execute'), async (req, res) => {
  const { status, equipmentCode } = req.query;
  let items: any[] = moveOrders;

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbMoves = await prisma.yard_moves.findMany({
          include: {
            unit_stays: true,
            equipment: true,
            users: true,
            yard_locations_yard_moves_from_location_idToyard_locations: true,
            yard_locations_yard_moves_to_location_idToyard_locations: true
          },
          orderBy: { yard_move_id: 'desc' }
        });
        if (dbMoves && dbMoves.length > 0) {
          const mapped = dbMoves.map(m => {
            const moveKind = m.move_type === 'CUSTOMS_SHUTTLE' ? 'EXAM_SHUTTLE' : 'SHUFFLE';
            let moveStatus: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' = 'IN_PROGRESS';
            if (m.status === 'COMPLETED') moveStatus = 'DONE';
            else if (m.status === 'IN_PROGRESS') moveStatus = 'IN_PROGRESS';
            else if (m.status === 'CANCELLED') moveStatus = 'CANCELLED';
            else moveStatus = 'OPEN';

            const fromCode = m.yard_locations_yard_moves_from_location_idToyard_locations?.full_code || 'A-01-01-1';
            const toCode = m.yard_locations_yard_moves_to_location_idToyard_locations?.full_code || 'X-01-01-1';

            return {
              moveOrderId: m.yard_move_id,
              siteId: m.site_id || 1,
              unitStayId: m.unit_stay_id,
              unitNo: m.unit_stays?.unit_no || 'MSKU 882014 9',
              category: 'CONTAINER',
              unitType: '40HC',
              lineCode: 'MSK',
              fromCode,
              toCode,
              fromLocation: fromCode,
              toLocation: toCode,
              moveKind: moveKind as any,
              priority: 1,
              assignedEquipmentId: m.equipment_id || 1,
              assignedOperatorSub: m.users?.user_name || 'ashok.k',
              requestedAt: m.ordered_at?.toISOString() || new Date(Date.now() - 3600000).toISOString(),
              startedAt: m.executed_at?.toISOString() || new Date().toISOString(),
              completedAt: m.status === 'COMPLETED' ? m.executed_at?.toISOString() || new Date().toISOString() : undefined,
              status: moveStatus,
              logInst: 1
            };
          });
          const dbIds = new Set(mapped.map(x => x.moveOrderId));
          items = [...mapped, ...moveOrders.filter(mo => !dbIds.has(mo.moveOrderId!))];
        }
      } catch (err) {
        console.warn('[YardRouter] DB query error on move-orders:', err);
      }
    }
  }

  if (status) {
    items = items.filter(m => m.status === status);
  }
  if (equipmentCode) {
    items = items.filter(m => String((m as any).assignedEquipmentId) === equipmentCode || (m as any).assignedEquipmentCode === equipmentCode);
  }
  res.json({ items, equipment: equipmentForMoves, total: items.length, nextCursor: null });
});

router.post(['/move-orders', '/moves'], requireSite(false), requirePermission('yard.allocate', 'DO'), (req, res) => {
  const newOrder = {
    moveOrderId: moveOrders.length + 33001,
    siteId: 1,
    unitStayId: req.body.unitStayId || 5001,
    unitNo: req.body.unitNo || 'MSKU 000000 0',
    moveKind: req.body.moveKind || 'YARD_TO_GATE',
    status: 'PLANNED' as const,
    fromLocation: req.body.fromLocation || 'A-02-04-2',
    toLocation: req.body.toLocation || 'OUT_LANE_1',
    createdAt: new Date().toISOString(),
    logInst: 1,
    ...req.body
  };
  moveOrders.push(newOrder as any);
  res.status(201).json(newOrder);
});

router.get(['/move-orders/:moveOrderId', '/moves/:moveOrderId'], requireSite(false), requirePermission('yard.move.execute'), (req, res) => {
  const mo = moveOrders.find(m => String(m.moveOrderId) === req.params.moveOrderId);
  if (!mo) return res.status(404).json({ error: 'Move order not found' });
  res.json(mo);
});

router.post('/move-orders/:moveOrderId([0-9a-zA-Z_.-]+):assign', requireSite(false), requirePermission('yard.allocate', 'DO'), (req, res) => {
  const mo = moveOrders.find(m => String(m.moveOrderId) === req.params.moveOrderId);
  if (!mo) return res.status(404).json({ error: 'Move order not found' });
  (mo as any).assignedEquipmentCode = req.body.equipmentCode || 'RS-01';
  (mo as any).status = 'ASSIGNED';
  res.json({ success: true, moveOrder: mo });
});

router.post('/move-orders/:moveOrderId([0-9a-zA-Z_.-]+):start', requireSite(false), requirePermission('yard.move.execute', 'DO'), (req, res) => {
  const mo = moveOrders.find(m => String(m.moveOrderId) === req.params.moveOrderId);
  if (!mo) return res.status(404).json({ error: 'Move order not found' });
  (mo as any).status = 'IN_PROGRESS';
  (mo as any).startedAt = new Date().toISOString();
  res.json({ success: true, moveOrder: mo });
});

router.post('/move-orders/:moveOrderId([0-9a-zA-Z_.-]+):complete', requireSite(false), requirePermission('yard.move.execute', 'DO'), (req, res) => {
  const mo = moveOrders.find(m => String(m.moveOrderId) === req.params.moveOrderId);
  if (!mo) return res.status(404).json({ error: 'Move order not found' });
  (mo as any).status = 'COMPLETED';
  (mo as any).completedAt = new Date().toISOString();
  res.json({ success: true, moveOrder: mo });
});

router.post('/move-orders/:moveOrderId([0-9a-zA-Z_.-]+):cancel', requireSite(false), requirePermission('yard.allocate', 'DO'), (req, res) => {
  const mo = moveOrders.find(m => String(m.moveOrderId) === req.params.moveOrderId);
  if (!mo) return res.status(404).json({ error: 'Move order not found' });
  (mo as any).status = 'CANCELLED';
  res.json({ success: true, moveOrder: mo });
});

router.get('/yard-moves', requireSite(false), requirePermission('yard.map.view'), (req, res) => {
  res.json({ items: yardMovesLog, total: yardMovesLog.length, nextCursor: null });
});

export const yardRouter = router;
