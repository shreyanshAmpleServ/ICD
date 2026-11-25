import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupModelsController = {
  getModels: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getModels();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createModel: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createModel(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateModel: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateModel(req.params.modelId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  activateModel: async (req: Request, res: Response) => {
    try {
      const modelId = req.params.modelId || req.params.id || req.params.mlModelVersionId;
      const { reason } = req.body || {};
      const userSub = (req as any).userSub || (req.user as any)?.sub || 'system';
      const result = await setupService.activateModel(modelId, reason, userSub);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

