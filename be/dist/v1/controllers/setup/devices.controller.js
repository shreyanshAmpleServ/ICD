"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDevicesController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupDevicesController = {
    getDevices: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getDevices();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createDevice: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createDevice(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateDevice: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateDevice(req.params.deviceId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    revokeDevice: async (req, res) => {
        try {
            const revoked = await setup_service_1.setupService.revokeDevice(req.params.deviceId, req.body?.reason);
            res.json(revoked);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getDeviceIntegrations: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getDeviceIntegrations();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createDeviceIntegration: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createDeviceIntegration(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateDeviceIntegration: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateDeviceIntegration(req.params.integrationId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
