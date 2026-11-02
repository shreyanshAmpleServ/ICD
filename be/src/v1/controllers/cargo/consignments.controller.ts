import { Request, Response } from 'express';
import { cargoService } from '../../../modules/cargo/cargo.service';

export const cargoConsignmentsController = {
  getConsignments: async (req: Request, res: Response) => {
    try {
      const items = await cargoService.getConsignments(req.query);
      res.json({ items, nextCursor: null, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getConsignmentById: async (req: Request, res: Response) => {
    try {
      const { consignmentId } = req.params;
      const c = await cargoService.getConsignment(consignmentId);
      if (!c) return res.status(404).json({ error: 'Consignment not found' });
      res.json(c);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createConsignment: async (req: Request, res: Response) => {
    try {
      const created = await cargoService.createConsignment(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateConsignment: async (req: Request, res: Response) => {
    try {
      const { consignmentId } = req.params;
      const updated = await cargoService.updateConsignment(consignmentId, req.body);
      if (!updated) return res.status(404).json({ error: 'Consignment not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getConsignmentLines: async (req: Request, res: Response) => {
    try {
      const { consignmentId } = req.params;
      const lines = await cargoService.getConsignmentLines(consignmentId);
      res.json({ items: lines, total: lines.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  saveConsignmentLines: async (req: Request, res: Response) => {
    try {
      const { consignmentId } = req.params;
      const lines = Array.isArray(req.body) ? req.body : [req.body];
      const saved = await cargoService.saveConsignmentLines(consignmentId, lines);
      res.json({ items: saved, total: saved.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getConsignmentUnits: async (req: Request, res: Response) => {
    try {
      const { consignmentId } = req.params;
      const units = await cargoService.getConsignmentUnits(consignmentId);
      res.json({ items: units, total: units.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

