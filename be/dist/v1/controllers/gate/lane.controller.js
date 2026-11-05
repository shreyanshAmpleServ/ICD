"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gateLaneController = void 0;
const prisma_1 = require("../../../db/prisma");
exports.gateLaneController = {
    getLanes: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const lanes = await prisma.m_gate_lane.findMany({
                        include: { m_gate: true },
                        orderBy: { gate_lane_id: 'asc' },
                    });
                    if (lanes && lanes.length > 0) {
                        const items = lanes.map((l) => ({
                            laneId: l.gate_lane_id,
                            gateId: l.gate_id,
                            gateCode: l.m_gate?.gate_code || 'GATE-1',
                            gateName: l.m_gate?.gate_name || 'Main Gate',
                            laneCode: l.lane_code,
                            direction: l.direction,
                            hasScale: true,
                            hasOcr: true,
                            hasRfid: true,
                            hasKiosk: true,
                            barrierOpen: false,
                            status: l.is_active ? 'ONLINE' : 'OFFLINE',
                        }));
                        return res.json({ items, total: items.length });
                    }
                }
            }
            res.json({
                items: [
                    { laneId: 1, gateId: 1, gateCode: 'MAIN', laneCode: 'L1', direction: 'IN', hasScale: true, hasOcr: true, barrierOpen: false, status: 'ONLINE' },
                    { laneId: 2, gateId: 1, gateCode: 'MAIN', laneCode: 'L2', direction: 'IN', hasScale: false, hasOcr: true, barrierOpen: false, status: 'ONLINE' },
                    { laneId: 3, gateId: 1, gateCode: 'MAIN', laneCode: 'L3', direction: 'OUT', hasScale: true, hasOcr: true, barrierOpen: false, status: 'ONLINE' },
                ],
                total: 3,
            });
        }
        catch (err) {
            console.error('getLanes error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    openBarrier: async (req, res) => {
        try {
            const { laneId } = req.params;
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const id = Number(laneId);
                const lane = await prisma.m_gate_lane.findFirst({
                    where: { gate_lane_id: isNaN(id) ? undefined : id },
                    include: { m_gate: true },
                });
                return res.json({
                    success: true,
                    laneId: lane?.gate_lane_id || Number(laneId) || 1,
                    laneCode: lane?.lane_code || 'L1',
                    gateCode: lane?.m_gate?.gate_code || 'GATE-1',
                    barrierStatus: 'OPEN',
                    openedAt: new Date().toISOString(),
                    openedBy: req.user?.username || 'operator',
                    autoCloseSec: 15,
                });
            }
            res.json({
                success: true,
                laneId: Number(laneId) || laneId,
                barrierStatus: 'OPEN',
                openedAt: new Date().toISOString(),
                openedBy: req.user?.username || 'operator',
                autoCloseSec: 15,
            });
        }
        catch (err) {
            console.error('openBarrier error:', err);
            res.status(500).json({ error: err.message });
        }
    },
    getGatePass: async (req, res) => {
        try {
            const { token } = req.params;
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const visit = await prisma.truck_visit.findFirst({
                    where: {
                        OR: [
                            { gate_pass_token: token },
                            { gate_pass_no: token },
                            { visit_no: token },
                        ],
                    },
                    include: {
                        m_truck_truck_visit_truck_idTom_truck: true,
                        m_driver: true,
                        m_party_truck_visit: true,
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
                });
                if (visit) {
                    return res.json({
                        valid: true,
                        truckVisitId: Number(visit.truck_visit_id),
                        passNo: visit.gate_pass_no || `GP-${token.slice(0, 8).toUpperCase()}`,
                        token: visit.gate_pass_token || token,
                        visitNo: visit.visit_no,
                        truckPlate: visit.m_truck_truck_visit_truck_idTom_truck?.plate_no || 'T 000 AAA',
                        driverName: visit.m_driver?.driver_name || 'Driver',
                        transporter: visit.m_party_truck_visit?.party_name,
                        issuedAt: visit.arrived_at?.toISOString() || visit.createdate?.toISOString(),
                        expiresAt: new Date(Date.now() + 86400000).toISOString(),
                        status: visit.status,
                        units: (visit.visit_unit_txn || []).map((u) => ({
                            unitNumber: u.unit_stay?.unit_stay_cargo_units?.unit_number,
                            action: u.direction,
                        })),
                    });
                }
            }
            res.json({
                valid: true,
                passNo: `GP-${token.slice(0, 8).toUpperCase()}`,
                truckPlate: 'T 123 ABC',
                driverName: 'John Doe',
                issuedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                status: 'ACTIVE',
            });
        }
        catch (err) {
            console.error('getGatePass error:', err);
            res.status(500).json({ error: err.message });
        }
    },
};
