"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupYardDesignerController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupYardDesignerController = {
    getYardLocations: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getYardLocations();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createYardLocation: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createYardLocation(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateYardLocation: async (req, res) => {
        try {
            const id = req.params.locationId || req.params.yardLocationId || req.params.id;
            const updated = await setup_service_1.setupService.updateYardLocation(id, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteYardLocation: async (req, res) => {
        try {
            const id = req.params.locationId || req.params.yardLocationId || req.params.id;
            const result = await setup_service_1.setupService.deleteYardLocation(id);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    generateSlots: async (req, res) => {
        try {
            const locId = req.params.locationId || req.params.yardLocationId || req.body.locationId || req.body.blockId || req.body.parentLocationId;
            const result = await setup_service_1.setupService.generateSlots(locId, req.body);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    blockSlot: async (req, res) => {
        try {
            const codeOrId = req.params.locationId || req.body.locationCode || req.body.slotCode;
            const result = await setup_service_1.setupService.blockSlot(codeOrId, req.body.reason);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    unblockSlot: async (req, res) => {
        try {
            const codeOrId = req.params.locationId || req.body.locationCode || req.body.slotCode;
            const result = await setup_service_1.setupService.unblockSlot(codeOrId);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
