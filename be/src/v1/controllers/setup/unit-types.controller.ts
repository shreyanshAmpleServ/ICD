import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupUnitTypesController = {
  getUnitTypes: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getUnitTypes();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createUnitType: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createUnitType(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateUnitType: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateUnitType(req.params.unitTypeId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getCargoRegimes: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getCargoRegimes();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

