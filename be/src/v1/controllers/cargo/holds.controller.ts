import { Request, Response } from 'express';
import { cargoService } from '../../../modules/cargo/cargo.service';

export const cargoHoldsController = {
  getHolds: async (req: Request, res: Response) => {
    try {
      const items = await cargoService.getHolds(req.query);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createHold: async (req: Request, res: Response) => {
    try {
      const username = (req as any).user?.username || 'Customs Officer';
      const created = await cargoService.createHold(req.body, username);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  releaseHold: async (req: Request, res: Response) => {
    try {
      const { holdId } = req.params;
      const username = (req as any).user?.username || 'Customs Officer';
      const result = await cargoService.releaseHold(holdId, username, req.body.reason);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

