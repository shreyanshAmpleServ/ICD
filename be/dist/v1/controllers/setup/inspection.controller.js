"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupInspectionController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupInspectionController = {
    getInspectionTemplates: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getInspectionTemplates();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createInspectionTemplate: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createInspectionTemplate(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateInspectionTemplate: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateInspectionTemplate(req.params.templateId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getDamageCodes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getDamageCodes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createDamageCode: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createDamageCode(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateDamageCode: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateDamageCode(req.params.codeId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
