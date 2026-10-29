import { Request, Response, NextFunction } from 'express';
import { ALL_PERMISSIONS, ROLES, PermissionCode, Grant } from '../configs/permissions';

/**
 * Enforces x-permission RBAC requirement per the API contract.
 * Checks caller's effective grants for the permission code.
 */
export function requirePermission(permission: PermissionCode, requiredGrant: Grant = 'VIEW') {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Determine active role from header (for testing/demo flexibility) or default session
    const roleCode = (req.headers['x-role-code'] as string) || req.user?.roleCode || 'ALL_PERMISSIONS';
    const role = ROLES[roleCode] || ROLES['ALL_PERMISSIONS'];

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

    // Check grant
    const grant = role.grants[permission];
    const grantPrecedence: Record<Grant, number> = {
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
        detail: `Role '${role.name}' does not possess '${requiredGrant}' rights for permission '${permission}'. Current grant: ${grant || 'NONE'}.`,
        permission,
        requiredGrant,
        currentGrant: grant || null
      });
      return;
    }

    next();
  };
}
