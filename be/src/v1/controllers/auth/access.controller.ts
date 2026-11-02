import { Request, Response } from 'express';
import { ALL_PERMISSIONS, ROLES } from '../../../configs/permissions';

export const authAccessController = {
  getPermissions: async (_req: Request, res: Response) => {
    try {
      res.json({
        items: ALL_PERMISSIONS.map((code) => ({
          permissionCode: code,
          module: code.split('.')[0] || 'core',
          description: `Permission to perform ${code}`,
        })),
        total: ALL_PERMISSIONS.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getRoleGrants: async (req: Request, res: Response) => {
    try {
      const { roleCode } = req.params;
      const role = ROLES[roleCode] || ROLES['ALL_PERMISSIONS'];
      res.json({
        roleCode,
        grants: role.grants,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

