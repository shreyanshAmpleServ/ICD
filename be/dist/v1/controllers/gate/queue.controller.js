"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gateQueueController = void 0;
const gate_1 = require("../../../data/gate");
const prisma_1 = require("../../../db/prisma");
exports.gateQueueController = {
    getQueue: async (req, res) => {
        try {
            let items = [];
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const dbVisits = await prisma.truck_visit.findMany({
                        where: {
                            status: { in: ['WAITING', 'CALLED', 'ADMITTED', 'ANNOUNCED', 'ARRIVED'] },
                        },
                        include: {
                            m_truck_truck_visit_truck_idTom_truck: true,
                            m_driver: true,
                            m_party_truck_visit: true,
                            m_visit_type: true,
                            visit_unit_txn: {
                                include: {
                                    unit_stay: {
                                        include: {
                                            unit_stay_cargo_units: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: { arrived_at: 'asc' },
                    });
                    if (dbVisits && dbVisits.length > 0) {
                        items = dbVisits.map((v, i) => ({
                            queueNo: i + 1,
                            truckVisitId: Number(v.truck_visit_id),
                            visitNo: v.visit_no,
                            plateNo: v.m_truck_truck_visit_truck_idTom_truck?.plate_no || 'T 000 AAA',
                            driverName: v.m_driver?.driver_name || 'Driver',
                            driverPhone: v.m_driver?.phone,
                            visitTypeCode: v.m_visit_type?.visit_type_code || 'IMPORT_PICKUP',
                            visitTypeName: v.m_visit_type?.visit_type_name,
                            status: v.status,
                            arrivedAt: v.arrived_at?.toISOString() || v.createdate?.toISOString() || new Date().toISOString(),
                            waitingMin: v.arrived_at
                                ? Math.max(0, Math.round((Date.now() - new Date(v.arrived_at).getTime()) / 60000))
                                : 15,
                            lane: 'L1',
                            units: (v.visit_unit_txn || []).map((u) => ({
                                unitStayId: Number(u.unit_stay_id),
                                direction: u.direction,
                                status: u.status,
                                unitNumber: u.unit_stay?.unit_stay_cargo_units?.unit_number,
                            })),
                        }));
                    }
                }
            }
            if (items.length === 0) {
                items = gate_1.visits.filter(v => v.status === 'WAITING' || v.status === 'CALLED');
            }
            res.json({ items, total: items.length });
        }
        catch (err) {
            console.error('getQueue error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    getQueueSummary: async (_req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const waiting = await prisma.truck_visit.count({
                        where: { status: { in: ['WAITING', 'ANNOUNCED'] } },
                    });
                    const inProgress = await prisma.truck_visit.count({
                        where: { status: { in: ['CALLED', 'ADMITTED', 'ARRIVED'] } },
                    });
                    const openLanes = await prisma.m_gate_lane.count({
                        where: { is_active: true },
                    });
                    return res.json({
                        waiting,
                        inProgress,
                        avgWaitMinutes: waiting > 0 ? 14 : 5,
                        openLanes: openLanes || 4,
                        peakHours: '09:00 - 15:00',
                    });
                }
            }
            res.json({
                waiting: 6,
                inProgress: 3,
                avgWaitMinutes: 12,
                openLanes: 4,
                peakHours: '10:00 - 14:00',
            });
        }
        catch (err) {
            console.error('getQueueSummary error:', err);
            res.status(500).json({ error: err.message });
        }
    },
};
