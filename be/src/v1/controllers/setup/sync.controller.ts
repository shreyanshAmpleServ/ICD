import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupSyncController = {
  getSyncStatus: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getSyncStates();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createSyncStatus: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createSyncStatus(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateSyncStatus: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateSyncStatus(req.params.entityName, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getOutbox: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getOutbox();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createOutbox: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createOutbox(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateOutbox: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateOutbox(req.params.outboxId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
