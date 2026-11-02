import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupGatesController = {
  getGates: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getGates();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createGate: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createGate(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateGate: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateGate(req.params.gateId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getCheckpoints: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getCheckpoints();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createCheckpoint: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createCheckpoint(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateCheckpoint: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateCheckpoint(req.params.checkpointId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteCheckpoint: async (req: Request, res: Response) => {
    try {
      const result = await setupService.deleteCheckpoint(req.params.checkpointId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getVisitTypes: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getVisitTypes();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createVisitType: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createVisitType(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateVisitType: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateVisitType(req.params.visitTypeId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

