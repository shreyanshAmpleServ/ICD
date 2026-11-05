"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGatesController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupGatesController = {
    getGates: async (req, res) => {
        try {
            const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;
            const items = await setup_service_1.setupService.getGates(siteId);
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getGateById: async (req, res) => {
        try {
            const gate = await setup_service_1.setupService.getGateById(req.params.gateId);
            if (!gate)
                return res.status(404).json({ error: 'Gate not found' });
            res.json(gate);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createGate: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createGate(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateGate: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateGate(Number(req.params.gateId), req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteGate: async (req, res) => {
        try {
            const result = await setup_service_1.setupService.deleteGate(Number(req.params.gateId));
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createLane: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createLane(Number(req.params.gateId), req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateLane: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateLane(Number(req.params.laneId), req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteLane: async (req, res) => {
        try {
            const result = await setup_service_1.setupService.deleteLane(Number(req.params.laneId));
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCheckpoints: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getCheckpoints();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getCheckpointById: async (req, res) => {
        try {
            const cp = await setup_service_1.setupService.getCheckpointById(req.params.checkpointId);
            if (!cp)
                return res.status(404).json({ error: 'Checkpoint not found' });
            res.json(cp);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createCheckpoint: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createCheckpoint(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateCheckpoint: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateCheckpoint(Number(req.params.checkpointId), req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteCheckpoint: async (req, res) => {
        try {
            const result = await setup_service_1.setupService.deleteCheckpoint(Number(req.params.checkpointId));
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getVisitTypes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getVisitTypes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getVisitTypeById: async (req, res) => {
        try {
            const vt = await setup_service_1.setupService.getVisitTypeById(req.params.visitTypeId);
            if (!vt)
                return res.status(404).json({ error: 'Visit type not found' });
            res.json(vt);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createVisitType: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createVisitType(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateVisitType: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateVisitType(Number(req.params.visitTypeId), req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deleteVisitType: async (req, res) => {
        try {
            const result = await setup_service_1.setupService.deleteVisitType(Number(req.params.visitTypeId));
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
