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
};

