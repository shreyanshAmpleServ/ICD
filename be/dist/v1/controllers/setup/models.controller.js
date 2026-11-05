"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupModelsController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupModelsController = {
    getModels: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getModels();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createModel: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createModel(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateModel: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateModel(req.params.modelId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
