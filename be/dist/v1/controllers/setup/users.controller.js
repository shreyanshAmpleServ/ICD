"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupUsersController = void 0;
const setup_service_1 = require("../../../modules/setup/setup.service");
exports.setupUsersController = {
    getUsers: async (req, res) => {
        try {
            const q = req.query.q;
            const role = (req.query.role || req.query.roleCode);
            const siteId = req.query.siteId !== undefined && req.query.siteId !== 'all' ? Number(req.query.siteId) : undefined;
            const active = req.query.active;
            const items = await setup_service_1.setupService.getUsers({ q, role, siteId, active });
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createUser: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createUser(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateUser: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateUser(Number(req.params.userId), req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    grantRole: async (req, res) => {
        try {
            const userId = Number(req.params.userId);
            const result = await setup_service_1.setupService.grantUserRole(userId, req.body);
            res.status(201).json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    revokeRole: async (req, res) => {
        try {
            const userId = Number(req.params.userId);
            const roleGrantIdOrCode = req.params.roleGrantIdOrCode;
            const result = await setup_service_1.setupService.revokeUserRole(userId, roleGrantIdOrCode);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    activateUser: async (req, res) => {
        try {
            const userId = Number(req.params.userId);
            const result = await setup_service_1.setupService.activateUser(userId);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    deactivateUser: async (req, res) => {
        try {
            const userId = Number(req.params.userId);
            const reason = req.body?.reason || 'Deactivated by administrator';
            const result = await setup_service_1.setupService.deactivateUser(userId, reason);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getRoles: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getRoles();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createRole: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createRole(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateRole: async (req, res) => {
        try {
            const updated = await setup_service_1.setupService.updateRole(req.params.roleId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    updateRolePermissions: async (req, res) => {
        try {
            const roleIdOrCode = req.params.roleId || req.params.roleCode;
            const grants = req.body?.grants || req.body;
            const updated = await setup_service_1.setupService.updateRolePermissions(roleIdOrCode, grants);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getPermissions: async (_req, res) => {
        try {
            const items = await setup_service_1.setupService.getPermissions();
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createPermission: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createPermission(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getDelegations: async (req, res) => {
        try {
            const items = await setup_service_1.setupService.getDelegations(req.query);
            res.json({ items, total: items.length, nextCursor: null });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    createDelegation: async (req, res) => {
        try {
            const created = await setup_service_1.setupService.createDelegation(req.body);
            res.status(201).json(created);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    revokeDelegation: async (req, res) => {
        try {
            const result = await setup_service_1.setupService.revokeDelegation(req.params.delegationId);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
