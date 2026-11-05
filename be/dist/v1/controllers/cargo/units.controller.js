"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoUnitsController = void 0;
const cargo_service_1 = require("../../../modules/cargo/cargo.service");
exports.cargoUnitsController = {
    getUnits: async (req, res) => {
        try {
            const items = await cargo_service_1.cargoService.getUnits(req.query);
            res.json({ items, nextCursor: null, total: items.length });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getUnitById: async (req, res) => {
        try {
            const { unitStayId } = req.params;
            const unit = await cargo_service_1.cargoService.getUnit(unitStayId);
            if (!unit)
                return res.status(404).json({ error: 'Unit not found' });
            res.json(unit);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createUnit: async (req, res) => {
        try {
            const created = await cargo_service_1.cargoService.createUnit(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateUnit: async (req, res) => {
        try {
            const { unitStayId } = req.params;
            const updated = await cargo_service_1.cargoService.updateUnit(unitStayId, req.body);
            if (!updated)
                return res.status(404).json({ error: 'Unit not found' });
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getUnitTimeline: async (req, res) => {
        try {
            const { unitStayId } = req.params;
            const timeline = await cargo_service_1.cargoService.getUnitTimeline(unitStayId);
            res.json(timeline);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
