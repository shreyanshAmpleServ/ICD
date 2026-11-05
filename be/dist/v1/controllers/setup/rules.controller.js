"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRulesController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupRulesController = {
    getHoldTypes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getHoldTypes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createHoldType: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createHoldType(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateHoldType: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateHoldType(req.params.holdTypeId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getReleaseRules: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getReleaseRules();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createReleaseRule: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createReleaseRule(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateReleaseRule: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateReleaseRule(req.params.ruleId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getApprovalPolicies: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getApprovalPolicies();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createApprovalPolicy: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createApprovalPolicy(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateApprovalPolicy: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateApprovalPolicy(req.params.policyId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getExceptionTypes: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getExceptionTypes();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createExceptionType: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createExceptionType(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateExceptionType: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateExceptionType(req.params.typeId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
