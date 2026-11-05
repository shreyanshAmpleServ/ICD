"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoDangerousGoodsController = void 0;
const cargo_service_1 = require("../../../modules/cargo/cargo.service");
exports.cargoDangerousGoodsController = {
    getDgLines: async (_req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getDgLines();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getUnitDgLines: async (req, res) => {
        try {
            const { unitStayId } = req.params;
            const all = await cargo_service_1.cargoService.getDgLines();
            const items = all.filter((l) => String(l.unitStayId) === unitStayId);
            res.json({ items, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    saveDgLines: async (req, res) => {
        try {
            const { unitStayId } = req.params;
            const lines = Array.isArray(req.body) ? req.body : [req.body];
            const saved = await cargo_service_1.cargoService.saveDgLines(unitStayId, lines);
            res.json({ items: saved, total: saved.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
