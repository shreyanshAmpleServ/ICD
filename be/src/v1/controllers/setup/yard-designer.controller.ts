import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupYardDesignerController = {
  getYardLocations: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getYardLocations();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createYardLocation: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createYardLocation(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateYardLocation: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateYardLocation(req.params.locationId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteYardLocation: async (req: Request, res: Response) => {
    try {
      const result = await setupService.deleteYardLocation(req.params.locationId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

