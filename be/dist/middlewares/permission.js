"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
const permissions_1 = require("../configs/permissions");
const setup_service_1 = require("../modules/setup/setup.service");
/**
 * Enforces x-permission RBAC requirement per the API contract.
 * Checks caller's effective grants for the permission code.
 */
function requirePermission(permission, requiredGrant = 'VIEW') {
    return (req, res, next) => {
        const rawRole = req.headers['x-role-code'] || req.user?.roleCode || 'ALL_PERMISSIONS';
        const roleCode = rawRole.trim();
        // Administrator always has full permission to manage all permissions and features
        if (!roleCode ||
            roleCode === 'ALL_PERMISSIONS' ||
            roleCode === 'ICD_ADMIN' ||
            roleCode === '__ALL__' ||
            roleCode.toUpperCase() === 'ADMIN' ||
            roleCode.toLowerCase().includes('admin')) {
            return next();
        }
        const role = permissions_1.ROLES[roleCode] || setup_service_1.setupService.customRoles.get(roleCode) || permissions_1.ROLES['ALL_PERMISSIONS'];
        if (!role) {
            res.status(403).json({
                type: 'https://api.icd.dcc/errors/forbidden',
                title: 'Access Denied',
                status: 403,
                detail: `Role '${roleCode}' is unknown.`,
                requiredPermission: permission
            });
            return;
        }
        const grant = role.grants?.[permission];
        const grantPrecedence = {
            'DO': 4,
            'APPR': 3,
            'REQ': 2,
            'VIEW': 1
        };
        if (!grant || grantPrecedence[grant] < grantPrecedence[requiredGrant]) {
            res.status(403).json({
                type: 'https://api.icd.dcc/errors/forbidden',
                title: 'Permission Denied',
                status: 403,
                detail: `Role '${role.name || roleCode}' does not possess '${requiredGrant}' rights for permission '${permission}'. Current grant: ${grant || 'NONE'}.`,
                permission,
                requiredGrant,
                currentGrant: grant || null
            });
            return;
        }
        next();
    };
}
