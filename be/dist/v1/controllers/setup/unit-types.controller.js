"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupUnitTypesController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupUnitTypesController = {
    getUnitTypes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getUnitTypes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createUnitType: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createUnitType(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateUnitType: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateUnitType(req.params.unitTypeId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCargoRegimes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getCargoRegimes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
