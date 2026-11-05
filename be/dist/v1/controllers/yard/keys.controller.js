"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yardKeysController = void 0;
const prisma_1 = require("../../../db/prisma");
exports.yardKeysController = {
    getKeys: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const keys = await prisma.vehicle_keys.findMany({
                        include: {
                            unit_stays: true,
                        },
                        orderBy: { key_id: 'asc' },
                    });
                    if (keys && keys.length > 0) {
                        const items = keys.map((k) => ({
                            keyId: k.key_id,
                            tagNumber: k.tag_number,
                            pegNumber: k.peg_number,
                            unitStayId: k.unit_stay_id,
                            vin: k.vin,
                            makeModel: k.make_model,
                            status: k.status,
                            currentHolder: k.current_holder,
                            checkedOutAt: k.checked_out_at,
                        }));
                        return res.json({ items, total: items.length });
                    }
                }
            }
            res.json({
                items: [
                    { keyId: 1, tagNumber: 'KEY-001', pegNumber: 'P-12', vin: 'JT111AB222', makeModel: 'Toyota Hilux', status: 'IN_BOARD', currentHolder: null },
                    { keyId: 2, tagNumber: 'KEY-002', pegNumber: 'P-13', vin: 'WBABF33421', makeModel: 'BMW 320d', status: 'CHECKED_OUT', currentHolder: 'Driver Ali' },
                ],
                total: 2,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    checkoutKey: async (req, res) => {
        try {
            const { keyId } = req.params;
            const { holderName } = req.body;
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const updated = await prisma.vehicle_keys.update({
                    where: { key_id: Number(keyId) },
                    data: { status: 'CHECKED_OUT', current_holder: holderName || 'Driver', checked_out_at: new Date() },
                });
                return res.json(updated);
            }
            res.json({ keyId, status: 'CHECKED_OUT', currentHolder: holderName, checkedOutAt: new Date().toISOString() });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    returnKey: async (req, res) => {
        try {
            const { keyId } = req.params;
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const updated = await prisma.vehicle_keys.update({
                    where: { key_id: Number(keyId) },
                    data: { status: 'IN_BOARD', current_holder: null, checked_out_at: null },
                });
                return res.json(updated);
            }
            res.json({ keyId, status: 'IN_BOARD', currentHolder: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
