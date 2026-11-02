import { Request, Response } from 'express';
import { cargoService } from '../../../modules/cargo/cargo.service';

export const cargoUnitsController = {
  getUnits: async (req: Request, res: Response) => {
    try {
      const items = await cargoService.getUnits(req.query);
      res.json({ items, nextCursor: null, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getUnitById: async (req: Request, res: Response) => {
    try {
      const { unitStayId } = req.params;
      const unit = await cargoService.getUnit(unitStayId);
      if (!unit) return res.status(404).json({ error: 'Unit not found' });
      res.json(unit);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createUnit: async (req: Request, res: Response) => {
    try {
      const created = await cargoService.createUnit(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateUnit: async (req: Request, res: Response) => {
    try {
      const { unitStayId } = req.params;
      const updated = await cargoService.updateUnit(unitStayId, req.body);
      if (!updated) return res.status(404).json({ error: 'Unit not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getUnitTimeline: async (req: Request, res: Response) => {
    try {
      const { unitStayId } = req.params;
      const timeline = await cargoService.getUnitTimeline(unitStayId);
      res.json(timeline);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

