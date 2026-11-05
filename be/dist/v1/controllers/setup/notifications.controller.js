"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupNotificationsController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupNotificationsController = {
    getNotificationTemplates: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getNotificationTemplates();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createNotificationTemplate: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createNotificationTemplate(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateNotificationTemplate: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateNotificationTemplate(req.params.templateId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getNotificationRules: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getNotificationRules();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createNotificationRule: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createNotificationRule(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateNotificationRule: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateNotificationRule(req.params.ruleId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPrintTemplates: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getPrintTemplates();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createPrintTemplate: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createPrintTemplate(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updatePrintTemplate: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updatePrintTemplate(req.params.templateId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
