import { Request, Response } from 'express';
import { cargoService } from '../../../modules/cargo/cargo.service';

export const cargoDangerousGoodsController = {
  getDgLines: async (_req: Request, res: Response) => {
    try {
      const items = await cargoService.getDgLines();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getUnitDgLines: async (req: Request, res: Response) => {
    try {
      const { unitStayId } = req.params;
      const all = await cargoService.getDgLines();
      const items = all.filter((l: any) => String(l.unitStayId) === unitStayId);
      res.json({ items, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  saveDgLines: async (req: Request, res: Response) => {
    try {
      const { unitStayId } = req.params;
      const lines = Array.isArray(req.body) ? req.body : [req.body];
      const saved = await cargoService.saveDgLines(unitStayId, lines);
      res.json({ items: saved, total: saved.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

