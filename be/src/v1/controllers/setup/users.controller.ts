import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupUsersController = {
    getUsers: async (req: Request, res: Response) => {
      try {
        const q = req.query.q as string | undefined;
        const role = (req.query.role || req.query.roleCode) as string | undefined;
        const siteId = req.query.siteId !== undefined && req.query.siteId !== 'all' ? Number(req.query.siteId) : undefined;
        const active = req.query.active as string | undefined;

        const items = await setupService.getUsers({ q, role, siteId, active });
        res.json({ items, total: items.length, nextCursor: null });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },

      createUser: async (req: Request, res: Response) => {
        try {
          const created = await setupService.createUser(req.body);
          res.status(201).json(created);
        } catch (err: any) {
          res.status(500).json({ error: err.message });
        }
      },

        updateUser: async (req: Request, res: Response) => {
          try {
            const updated = await setupService.updateUser(Number(req.params.userId), req.body);
            res.json(updated);
          } catch (err: any) {
            res.status(500).json({ error: err.message });
          }
        },

          grantRole: async (req: Request, res: Response) => {
            try {
              const userId = Number(req.params.userId);
              const result = await setupService.grantUserRole(userId, req.body);
              res.status(201).json(result);
            } catch (err: any) {
              res.status(500).json({ error: err.message });
            }
          },

            revokeRole: async (req: Request, res: Response) => {
              try {
                const userId = Number(req.params.userId);
                const roleGrantIdOrCode = req.params.roleGrantIdOrCode;
                const result = await setupService.revokeUserRole(userId, roleGrantIdOrCode);
                res.json(result);
              } catch (err: any) {
                res.status(500).json({ error: err.message });
              }
            },

              activateUser: async (req: Request, res: Response) => {
                try {
                  const userId = Number(req.params.userId);
                  const result = await setupService.activateUser(userId);
                  res.json(result);
                } catch (err: any) {
                  res.status(500).json({ error: err.message });
                }
              },

                deactivateUser: async (req: Request, res: Response) => {
                  try {
                    const userId = Number(req.params.userId);
                    const reason = req.body?.reason || 'Deactivated by administrator';
                    const result = await setupService.deactivateUser(userId, reason);
                    res.json(result);
                  } catch (err: any) {
                    res.status(500).json({ error: err.message });
                  }
                },

                  getRoles: async (_req: Request, res: Response) => {
                    try {
                      const items = await setupService.getRoles();
                      res.json({ items, total: items.length, nextCursor: null });
                    } catch (err: any) {
                      res.status(500).json({ error: err.message });
                    }
                  },

                    createRole: async (req: Request, res: Response) => {
                      try {
                        const created = await setupService.createRole(req.body);
                        res.status(201).json(created);
                      } catch (err: any) {
                        res.status(500).json({ error: err.message });
                      }
                    },

                      updateRole: async (req: Request, res: Response) => {
                        try {
                          const updated = await setupService.updateRole(req.params.roleId, req.body);
                          res.json(updated);
                        } catch (err: any) {
                          res.status(500).json({ error: err.message });
                        }
                      },

                        updateRolePermissions: async (req: Request, res: Response) => {
                          try {
                            const roleIdOrCode = req.params.roleId || req.params.roleCode;
                            const grants = req.body?.grants || req.body;
                            const updated = await setupService.updateRolePermissions(roleIdOrCode, grants);
                            res.json(updated);
                          } catch (err: any) {
                            res.status(500).json({ error: err.message });
                          }
                        },

                          getPermissions: async (_req: Request, res: Response) => {
                            try {
                              const items = await setupService.getPermissions();
                              res.json({ items, total: items.length, nextCursor: null });
                            } catch (err: any) {
                              res.status(500).json({ error: err.message });
                            }
                          },

                            createPermission: async (req: Request, res: Response) => {
                              try {
                                const created = await setupService.createPermission(req.body);
                                res.status(201).json(created);
                              } catch (err: any) {
                                res.status(500).json({ error: err.message });
                              }
                            },
  getDelegations: async (req: Request, res: Response) => {
    try {
      const items = await setupService.getDelegations(req.query);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createDelegation: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createDelegation(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  revokeDelegation: async (req: Request, res: Response) => {
    try {
      const result = await setupService.revokeDelegation(req.params.delegationId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
