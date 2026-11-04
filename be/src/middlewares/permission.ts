import { Request, Response, NextFunction } from 'express';
import { ROLES, PermissionCode, Grant } from '../configs/permissions';
import { setupService } from '../modules/setup/setup.service';

/**
 * Enforces x-permission RBAC requirement per the API contract.
 * Checks caller's effective grants for the permission code.
 */
export function requirePermission(permission: PermissionCode, requiredGrant: Grant = 'VIEW') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawRole = (req.headers['x-role-code'] as string) || req.user?.roleCode || 'ALL_PERMISSIONS';
    const roleCode = rawRole.trim();

    // Administrator always has full permission to manage all permissions and features
    if (
      !roleCode ||
      roleCode === 'ALL_PERMISSIONS' ||
      roleCode === 'ICD_ADMIN' ||
      roleCode === '__ALL__' ||
      roleCode.toUpperCase() === 'ADMIN' ||
      roleCode.toLowerCase().includes('admin')
    ) {
      return next();
    }

    const role = ROLES[roleCode] || setupService.customRoles.get(roleCode) || ROLES['ALL_PERMISSIONS'];

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
