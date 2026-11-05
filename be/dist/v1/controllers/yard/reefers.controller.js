"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yardReefersController = void 0;
const prisma_1 = require("../../../db/prisma");
exports.yardReefersController = {
    getLogs: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const logs = await prisma.reefer_monitoring_logs.findMany({
                        include: { unit_stays: true },
                        orderBy: { log_id: 'desc' },
                    });
                    if (logs && logs.length > 0) {
                        const items = logs.map((l) => ({
                            logId: l.log_id,
                            unitStayId: l.unit_stay_id,
                            unitNumber: l.unit_stays?.unit_number,
                            setTempC: Number(l.set_temp_c),
                            supplyTempC: Number(l.supply_temp_c),
                            returnTempC: Number(l.return_temp_c),
                            powerStatus: l.power_status,
                            plugPointId: l.plug_point_id,
                            loggedAt: l.logged_at,
                            alarmStatus: l.alarm_status,
                        }));
                        return res.json({ items, total: items.length });
                    }
                }
            }
            res.json({
                items: [
                    {
                        logId: 1,
                        unitStayId: 102,
                        unitNumber: 'TGHU 993012 4',
                        setTempC: -18.0,
                        supplyTempC: -17.8,
                        returnTempC: -17.5,
                        powerStatus: 'CONNECTED',
                        plugPointId: 'REEF-PLUG-08',
                        loggedAt: new Date().toISOString(),
                        alarmStatus: 'NORMAL',
                    },
                ],
                total: 1,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createLog: async (req, res) => {
        try {
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const created = await prisma.reefer_monitoring_logs.create({
                    data: {
                        unit_stay_id: Number(req.body.unitStayId) || 1,
                        set_temp_c: Number(req.body.setTempC) || -18.0,
                        supply_temp_c: Number(req.body.supplyTempC) || -17.9,
                        return_temp_c: Number(req.body.returnTempC) || -17.6,
                        power_status: req.body.powerStatus || 'CONNECTED',
                        plug_point_id: req.body.plugPointId || 'PLUG-01',
                        alarm_status: req.body.alarmStatus || 'NORMAL',
                        logged_at: new Date(),
                    },
                });
                return res.status(201).json(created);
            }
            res.status(201).json({ logId: 2, ...req.body });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
