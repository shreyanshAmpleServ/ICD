"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yardMovesController = void 0;
const ops_1 = require("../../../data/ops");
const prisma_1 = require("../../../db/prisma");
// Valid check constraints on ICD_New database
const VALID_MOVE_KINDS = ['PICK_FOR_VISIT', 'FROM_ACTIVITY', 'TO_ACTIVITY', 'RESHUFFLE', 'RELOCATE', 'PLACE'];
function normalizeMoveKind(kind) {
    if (!kind)
        return 'PLACE';
    const upper = String(kind).trim().toUpperCase();
    if (VALID_MOVE_KINDS.includes(upper)) {
        return upper;
    }
    const aliases = {
        REHANDLE: 'RESHUFFLE',
        YARD_TO_YARD: 'RELOCATE',
        LOAD: 'PICK_FOR_VISIT',
        DISCHARGE: 'PLACE',
    };
    return aliases[upper] ?? 'RELOCATE';
}
function parseSiteId(val) {
    if (val === undefined || val === null || val === '')
        return undefined;
    const num = Number(val);
    return Number.isSafeInteger(num) && num > 0 ? num : undefined;
}
const FALLBACK_OPERATORS = [
    { userId: 1, userSub: 'ibrahim.n', name: 'Ibrahim N.', email: 'ibrahim.n@icd.tz', phone: '+255 712 345 678' },
    { userId: 2, userSub: 'kassim.o', name: 'Kassim O.', email: 'kassim.o@icd.tz', phone: '+255 713 456 789' },
    { userId: 3, userSub: 'daudi.m', name: 'Daudi M.', email: 'daudi.m@icd.tz', phone: '+255 714 567 890' },
    { userId: 4, userSub: 'juma.k', name: 'Juma K.', email: 'juma.k@icd.tz', phone: '+255 715 678 901' },
    { userId: 5, userSub: 'ashok.k', name: 'Ashok K.', email: 'ashok.k@icd.tz', phone: '+255 716 789 012' },
];
exports.yardMovesController = {
    /**
     * GET move orders for the yard.
     */
    getMoveOrders: async (req, res) => {
        try {
            const siteId = parseSiteId(req.query.siteId || req.headers['x-site-id'] || req.siteId);
            const { status, equipmentCode } = req.query;
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const whereClause = {};
                    if (siteId)
                        whereClause.site_id = siteId;
                    if (status && typeof status === 'string')
                        whereClause.status = status;
                    const dbMoves = await prisma.move_order.findMany({
                        where: whereClause,
                        include: {
                            unit_stay: {
                                include: {
                                    unit_stay_cargo_units: {
                                        include: {
                                            cargo_unit_unit_types: true,
                                        },
                                    },
                                },
                            },
                            m_equipment: true,
                            m_yard_location_move_order_from_location_idTom_yard_location: true,
                            m_yard_location_move_order_to_location_idTom_yard_location: true,
                            truck_visit: {
                                include: {
                                    m_truck_truck_visit_truck_idTom_truck: true,
                                },
                            },
                        },
                        orderBy: { move_order_id: 'desc' },
                        take: 100,
                    });
                    if (dbMoves && dbMoves.length > 0) {
                        let items = dbMoves.map((m) => ({
                            moveOrderId: Number(m.move_order_id),
                            moveId: Number(m.move_order_id),
                            siteId: m.site_id || 1,
                            unitStayId: Number(m.unit_stay_id),
                            unitNo: m.unit_stay?.unit_stay_cargo_units?.unit_no || 'MSKU 123456 7',
                            isoCode: m.unit_stay?.unit_stay_cargo_units?.cargo_unit_unit_types?.iso_code || '42G1',
                            category: m.unit_stay?.unit_stay_cargo_units?.unit_category || 'CONTAINER',
                            unitType: m.unit_stay?.unit_stay_cargo_units?.cargo_unit_unit_types?.type_name || '40ft Standard dry',
                            moveType: m.move_kind,
                            moveKind: m.move_kind,
                            sourceLocation: m.m_yard_location_move_order_from_location_idTom_yard_location?.location_code || 'YARD',
                            fromLocationCode: m.m_yard_location_move_order_from_location_idTom_yard_location?.location_code || 'YARD',
                            targetLocation: m.m_yard_location_move_order_to_location_idTom_yard_location?.location_code || 'BUFFER',
                            toLocationCode: m.m_yard_location_move_order_to_location_idTom_yard_location?.location_code || 'BUFFER',
                            priority: m.priority || 5,
                            status: m.status || 'OPEN',
                            equipmentId: m.assigned_equipment_id,
                            equipmentCode: m.m_equipment?.equipment_code || undefined,
                            equipmentType: m.m_equipment?.equipment_type || undefined,
                            assignedTo: m.assigned_operator_sub || m.m_equipment?.equipment_code || undefined,
                            operatorName: m.assigned_operator_sub || undefined,
                            licensePlate: m.truck_visit?.m_truck_truck_visit_truck_idTom_truck?.plate_no || undefined,
                            truckPlate: m.truck_visit?.m_truck_truck_visit_truck_idTom_truck?.plate_no || undefined,
                            driverName: undefined,
                            requestedAt: m.requested_at ? m.requested_at.toISOString() : new Date().toISOString(),
                            startedAt: undefined,
                            completedAt: m.completed_at ? m.completed_at.toISOString() : undefined,
                            reason: m.override_reason || undefined,
                        }));
                        if (equipmentCode && typeof equipmentCode === 'string') {
                            items = items.filter((x) => x.equipmentCode === equipmentCode);
                        }
                        return res.json({
                            success: true,
                            items,
                            total: items.length,
                        });
                    }
                }
            }
            // Fallback
            let filtered = [...ops_1.moveOrders];
            if (status && typeof status === 'string') {
                filtered = filtered.filter((m) => m.status === status);
            }
            if (equipmentCode && typeof equipmentCode === 'string') {
                filtered = filtered.filter((m) => m.equipmentCode === equipmentCode);
            }
            return res.json({
                success: true,
                items: filtered,
                total: filtered.length,
            });
        }
        catch (error) {
            console.error('getMoveOrders error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * Create a move order.
     */
    createMoveOrder: async (req, res) => {
        try {
            const siteId = parseSiteId(req.body.siteId || req.query.siteId || req.headers['x-site-id'] || 1) || 1;
            const { unitStayId, moveKind, moveType, fromLocationId, toLocationId, priority = 5, assignedEquipmentId, assignedOperatorSub, truckVisitId, overrideReason, } = req.body;
            if (!unitStayId) {
                return res.status(400).json({ success: false, message: 'unitStayId is required' });
            }
            const normalizedKind = normalizeMoveKind(moveKind || moveType);
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const newOrder = await prisma.move_order.create({
                        data: {
                            site_id: siteId,
                            unit_stay_id: BigInt(unitStayId),
                            move_kind: normalizedKind,
                            from_location_id: fromLocationId ? Number(fromLocationId) : null,
                            to_location_id: toLocationId ? Number(toLocationId) : null,
                            priority: Number(priority) || 5,
                            status: 'OPEN',
                            assigned_equipment_id: assignedEquipmentId ? Number(assignedEquipmentId) : null,
                            assigned_operator_sub: assignedOperatorSub || null,
                            truck_visit_id: truckVisitId ? BigInt(truckVisitId) : null,
                            override_reason: overrideReason || null,
                            createdby: req.user?.sub || 'system',
                        },
                        include: {
                            unit_stay: {
                                include: {
                                    unit_stay_cargo_units: true,
                                },
                            },
                            m_equipment: true,
                            m_yard_location_move_order_from_location_idTom_yard_location: true,
                            m_yard_location_move_order_to_location_idTom_yard_location: true,
                        },
                    });
                    return res.status(201).json({
                        success: true,
                        data: {
                            moveOrderId: Number(newOrder.move_order_id),
                            moveId: Number(newOrder.move_order_id),
                            siteId: newOrder.site_id,
                            unitStayId: Number(newOrder.unit_stay_id),
                            unitNo: newOrder.unit_stay?.unit_stay_cargo_units?.unit_no || 'UNKNOWN',
                            moveType: newOrder.move_kind,
                            moveKind: newOrder.move_kind,
                            sourceLocation: newOrder.m_yard_location_move_order_from_location_idTom_yard_location?.location_code || 'YARD',
                            targetLocation: newOrder.m_yard_location_move_order_to_location_idTom_yard_location?.location_code || 'BUFFER',
                            priority: newOrder.priority,
                            status: newOrder.status,
                            assignedEquipmentId: newOrder.assigned_equipment_id,
                            assignedOperatorSub: newOrder.assigned_operator_sub,
                            createdAt: newOrder.createdate.toISOString(),
                        },
                    });
                }
            }
            // Fallback
            const fakeId = Date.now();
            const mockOrder = {
                moveOrderId: fakeId,
                moveId: fakeId,
                siteId,
                unitStayId: Number(unitStayId),
                unitNo: 'MSKU 999999 9',
                moveType: normalizedKind,
                moveKind: normalizedKind,
                sourceLocation: 'YARD-01',
                targetLocation: 'BUFFER-01',
                priority: Number(priority) || 5,
                status: 'OPEN',
                assignedEquipmentId,
                assignedOperatorSub,
                requestedAt: new Date().toISOString(),
            };
            return res.status(201).json({ success: true, data: mockOrder });
        }
        catch (error) {
            console.error('createMoveOrder error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * Start a move order.
     */
    startMove: async (req, res) => {
        try {
            const moveOrderId = req.params.moveOrderId || req.params.moveId;
            if (!moveOrderId) {
                return res.status(400).json({ success: false, message: 'moveOrderId is required' });
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const updated = await prisma.move_order.update({
                        where: { move_order_id: BigInt(moveOrderId) },
                        data: {
                            status: 'IN_PROGRESS',
                            updatedby: req.user?.sub || 'system',
                            updatedate: new Date(),
                        },
                    });
                    return res.json({
                        success: true,
                        data: {
                            moveOrderId: Number(updated.move_order_id),
                            status: updated.status,
                        },
                    });
                }
            }
            return res.json({ success: true, data: { moveOrderId: Number(moveOrderId), status: 'IN_PROGRESS' } });
        }
        catch (error) {
            console.error('startMove error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * Complete a move order.
     */
    completeMove: async (req, res) => {
        try {
            const moveOrderId = req.params.moveOrderId || req.params.moveId;
            const { toLocationId } = req.body;
            if (!moveOrderId) {
                return res.status(400).json({ success: false, message: 'moveOrderId is required' });
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const existing = await prisma.move_order.findUnique({
                        where: { move_order_id: BigInt(moveOrderId) },
                    });
                    if (!existing) {
                        return res.status(404).json({ success: false, message: 'Move order not found' });
                    }
                    const targetLocationId = toLocationId ? Number(toLocationId) : existing.to_location_id;
                    const updated = await prisma.move_order.update({
                        where: { move_order_id: BigInt(moveOrderId) },
                        data: {
                            status: 'COMPLETED',
                            completed_at: new Date(),
                            to_location_id: targetLocationId,
                            updatedby: req.user?.sub || 'system',
                            updatedate: new Date(),
                        },
                    });
                    // Also update unit_stay current location if available
                    if (targetLocationId && existing.unit_stay_id) {
                        await prisma.unit_stay.update({
                            where: { unit_stay_id: existing.unit_stay_id },
                            data: {
                                current_location_id: targetLocationId,
                                updatedby: req.user?.sub || 'system',
                                updatedate: new Date(),
                            },
                        }).catch((e) => console.warn('Could not update unit_stay location:', e.message));
                    }
                    return res.json({
                        success: true,
                        data: {
                            moveOrderId: Number(updated.move_order_id),
                            status: updated.status,
                            completedAt: updated.completed_at?.toISOString(),
                        },
                    });
                }
            }
            return res.json({
                success: true,
                data: {
                    moveOrderId: Number(moveOrderId),
                    status: 'COMPLETED',
                    completedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            console.error('completeMove error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * Assign equipment and/or operator to a move order.
     */
    assignMove: async (req, res) => {
        try {
            const moveOrderId = req.params.moveOrderId || req.params.moveId;
            const { equipmentId, operatorSub, equipmentCode } = req.body;
            if (!moveOrderId) {
                return res.status(400).json({ success: false, message: 'moveOrderId is required' });
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    let resolvedEquipmentId = equipmentId ? Number(equipmentId) : undefined;
                    if (!resolvedEquipmentId && equipmentCode) {
                        const eq = await prisma.m_equipment.findFirst({
                            where: { equipment_code: String(equipmentCode) },
                        });
                        if (eq)
                            resolvedEquipmentId = eq.equipment_id;
                    }
                    const updated = await prisma.move_order.update({
                        where: { move_order_id: BigInt(moveOrderId) },
                        data: {
                            assigned_equipment_id: resolvedEquipmentId ?? null,
                            assigned_operator_sub: operatorSub || null,
                            status: 'ASSIGNED',
                            updatedby: req.user?.sub || 'system',
                            updatedate: new Date(),
                        },
                        include: {
                            m_equipment: true,
                        },
                    });
                    return res.json({
                        success: true,
                        data: {
                            moveOrderId: Number(updated.move_order_id),
                            status: updated.status,
                            assignedEquipmentId: updated.assigned_equipment_id,
                            equipmentCode: updated.m_equipment?.equipment_code || undefined,
                            assignedOperatorSub: updated.assigned_operator_sub,
                        },
                    });
                }
            }
            return res.json({
                success: true,
                data: {
                    moveOrderId: Number(moveOrderId),
                    status: 'ASSIGNED',
                    assignedEquipmentId: equipmentId,
                    assignedOperatorSub: operatorSub,
                },
            });
        }
        catch (error) {
            console.error('assignMove error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * Execute move order (start/run directly).
     */
    executeMove: async (req, res) => {
        try {
            const moveId = req.params.moveId || req.params.moveOrderId;
            if (!moveId) {
                return res.status(400).json({ success: false, message: 'moveId is required' });
            }
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const updated = await prisma.move_order.update({
                        where: { move_order_id: BigInt(moveId) },
                        data: {
                            status: 'IN_PROGRESS',
                            updatedby: req.user?.sub || 'system',
                            updatedate: new Date(),
                        },
                    });
                    return res.json({
                        success: true,
                        data: {
                            moveOrderId: Number(updated.move_order_id),
                            status: updated.status,
                        },
                    });
                }
            }
            return res.json({ success: true, data: { moveOrderId: Number(moveId), status: 'IN_PROGRESS' } });
        }
        catch (error) {
            console.error('executeMove error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * GET equipment list for yard.
     */
    getEquipment: async (req, res) => {
        try {
            const siteId = parseSiteId(req.query.siteId || req.headers['x-site-id'] || req.siteId);
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const whereClause = { is_active: true };
                    if (siteId)
                        whereClause.site_id = siteId;
                    let equipment = await prisma.m_equipment.findMany({
                        where: whereClause,
                        orderBy: { equipment_code: 'asc' },
                    });
                    if ((!equipment || equipment.length === 0) && siteId) {
                        // fallback across all sites
                        equipment = await prisma.m_equipment.findMany({
                            where: { is_active: true },
                            orderBy: { equipment_code: 'asc' },
                        });
                    }
                    if (equipment && equipment.length > 0) {
                        const items = equipment.map((e) => ({
                            equipmentId: e.equipment_id,
                            equipmentCode: e.equipment_code,
                            equipmentName: e.equipment_name,
                            equipmentType: e.equipment_type,
                            capacityKg: e.capacity_kg ? Number(e.capacity_kg) : undefined,
                            status: e.is_active ? 'AVAILABLE' : 'MAINTENANCE',
                            siteId: e.site_id,
                        }));
                        return res.json({ success: true, items, total: items.length });
                    }
                }
            }
            return res.json({ success: true, items: ops_1.equipmentForMoves, total: ops_1.equipmentForMoves.length });
        }
        catch (error) {
            console.error('getEquipment error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * GET yard locations/slots.
     */
    getLocations: async (req, res) => {
        try {
            const siteId = parseSiteId(req.query.siteId || req.headers['x-site-id'] || req.siteId);
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const whereClause = { is_active: true };
                    if (siteId)
                        whereClause.site_id = siteId;
                    let locations = await prisma.m_yard_location.findMany({
                        where: whereClause,
                        orderBy: { location_code: 'asc' },
                        take: 300,
                    });
                    if ((!locations || locations.length === 0) && siteId) {
                        locations = await prisma.m_yard_location.findMany({
                            where: { is_active: true },
                            orderBy: { location_code: 'asc' },
                            take: 300,
                        });
                    }
                    if (locations && locations.length > 0) {
                        const items = locations.map((l) => ({
                            locationId: l.yard_location_id,
                            yardLocationId: l.yard_location_id,
                            parentId: l.parent_id,
                            levelNo: l.level_no,
                            locationCode: l.location_code,
                            fullCode: l.full_code,
                            name: l.location_code,
                            kind: l.location_kind,
                            locationKind: l.location_kind,
                            isSlot: Boolean(l.is_slot),
                            siteId: l.site_id,
                            allows20: Boolean(l.allows_20),
                            allows40: Boolean(l.allows_40),
                            allows45: Boolean(l.allows_45),
                            maxTier: l.max_tier,
                            maxWeightKg: l.max_weight_kg,
                            isBlocked: Boolean(l.is_blocked),
                            blockedReason: l.blocked_reason,
                        }));
                        return res.json({ success: true, items, total: items.length });
                    }
                }
            }
            // Fallback
            const fallback = [
                { locationId: 1, yardLocationId: 1, locationCode: 'A-01-01-1', fullCode: 'A-01-01-1', name: 'A-01-01-1', kind: 'SLOT', locationKind: 'SLOT', isSlot: true, siteId: 1 },
                { locationId: 2, yardLocationId: 2, locationCode: 'A-01-01-2', fullCode: 'A-01-01-2', name: 'A-01-01-2', kind: 'SLOT', locationKind: 'SLOT', isSlot: true, siteId: 1 },
                { locationId: 3, yardLocationId: 3, locationCode: 'B-02-02-1', fullCode: 'B-02-02-1', name: 'B-02-02-1', kind: 'SLOT', locationKind: 'SLOT', isSlot: true, siteId: 1 },
                { locationId: 4, yardLocationId: 4, locationCode: 'B-02-02-2', fullCode: 'B-02-02-2', name: 'B-02-02-2', kind: 'SLOT', locationKind: 'SLOT', isSlot: true, siteId: 1 },
                { locationId: 5, yardLocationId: 5, locationCode: 'C-01-01-1', fullCode: 'C-01-01-1', name: 'C-01-01-1', kind: 'SLOT', locationKind: 'SLOT', isSlot: true, siteId: 1 },
            ];
            return res.json({ success: true, items: fallback, total: fallback.length });
        }
        catch (error) {
            console.error('getLocations error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    /**
     * GET operators / users for yard moves.
     */
    getOperators: async (_req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const users = await prisma.app_user.findMany({
                        where: { is_active: true },
                        select: {
                            user_id: true,
                            user_sub: true,
                            user_name: true,
                            email: true,
                            phone: true,
                        },
                        orderBy: { user_id: 'asc' },
                    });
                    if (users && users.length > 0) {
                        const items = users.map((u) => ({
                            userId: u.user_id,
                            userSub: u.user_sub,
                            name: u.user_name,
                            email: u.email,
                            phone: u.phone,
                        }));
                        return res.json({ success: true, items, total: items.length });
                    }
                }
            }
            return res.json({ success: true, items: FALLBACK_OPERATORS, total: FALLBACK_OPERATORS.length });
        }
        catch (error) {
            console.error('getOperators error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
};
exports.default = exports.yardMovesController;
