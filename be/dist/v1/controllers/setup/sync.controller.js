"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSyncController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupSyncController = {
    getSyncStatus: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getSyncStates();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createSyncStatus: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createSyncStatus(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateSyncStatus: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateSyncStatus(req.params.entityName, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getOutbox: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getOutbox();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createOutbox: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createOutbox(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateOutbox: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateOutbox(req.params.outboxId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
