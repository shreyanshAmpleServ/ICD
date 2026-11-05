"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlExceptionsController = void 0;
const control_1 = require("../../../data/control");
const prisma_1 = require("../../../db/prisma");
exports.controlExceptionsController = {
    getExceptions: async (req, res) => {
        try {
            if ((0, prisma_1.isDbLive)()) {
                const prisma = (0, prisma_1.getPrisma)();
                if (prisma) {
                    const dbExceptions = await prisma.exceptions.findMany({
                        include: { exception_types: true },
                        orderBy: { exception_id: 'desc' },
                    });
                    if (dbExceptions && dbExceptions.length > 0) {
                        const items = dbExceptions.map((e) => ({
                            exceptionId: e.exception_id,
                            exceptionTypeCode: e.exception_types?.type_code || 'GATE_WEIGHT_DISCREPANCY',
                            exceptionTypeName: e.exception_types?.type_name || 'Weight Discrepancy',
                            severity: e.severity || 'HIGH',
                            status: e.status || 'OPEN',
                            details: e.details,
                            raisedAt: e.raised_at,
                        }));
                        return res.json({ items, total: items.length });
                    }
                }
            }
            res.json({ items: control_1.exceptions, total: control_1.exceptions.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    resolveException: async (req, res) => {
        try {
            const { exceptionId } = req.params;
            const { resolution, resolutionNotes } = req.body;
            const prisma = (0, prisma_1.getPrisma)();
            if (prisma) {
                const updated = await prisma.exceptions.update({
                    where: { exception_id: Number(exceptionId) },
                    data: {
                        status: 'RESOLVED',
                        resolution_code: resolution || 'AUTHORIZED_EXCEPTION',
                        resolution_notes: resolutionNotes || '',
                        resolved_at: new Date(),
                    },
                });
                return res.json(updated);
            }
            const item = control_1.exceptions.find((e) => String(e.exceptionId) === exceptionId);
            if (item)
                item.status = 'RESOLVED';
            res.json(item || { success: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
