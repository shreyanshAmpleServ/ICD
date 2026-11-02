import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupUsersController = {
  getUsers: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getUsers();
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
      const updated = await setupService.updateUser(req.params.userId, req.body);
      res.json(updated);
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

  getPermissions: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getPermissions();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

