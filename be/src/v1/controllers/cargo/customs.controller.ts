import { Request, Response } from 'express';
import { cargoService } from '../../../modules/cargo/cargo.service';

export const cargoCustomsController = {
  getCustomsRefs: async (req: Request, res: Response) => {
    try {
      const items = await cargoService.getCustomsRefs(req.query);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createCustomsRef: async (req: Request, res: Response) => {
    try {
      const created = await cargoService.createCustomsRef(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getExams: async (_req: Request, res: Response) => {
    try {
      const items = await cargoService.getCustomsExams();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createExam: async (req: Request, res: Response) => {
    try {
      const created = await cargoService.createCustomsExam(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

