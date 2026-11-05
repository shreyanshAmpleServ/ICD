"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authAccessController = void 0;
const permissions_1 = require("../../../configs/permissions");
exports.authAccessController = {
    getPermissions: async (_req, res) => {
        try {
            res.json({
                items: permissions_1.ALL_PERMISSIONS.map((code) => ({
                    permissionCode: code,
                    module: code.split('.')[0] || 'core',
                    description: `Permission to perform ${code}`,
                })),
                total: permissions_1.ALL_PERMISSIONS.length,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    getRoleGrants: async (req, res) => {
        try {
            const { roleCode } = req.params;
            const role = permissions_1.ROLES[roleCode] || permissions_1.ROLES['ALL_PERMISSIONS'];
            res.json({
                roleCode,
                grants: role.grants,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
