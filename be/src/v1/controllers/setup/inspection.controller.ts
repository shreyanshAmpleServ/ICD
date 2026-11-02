import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupInspectionController = {
  getInspectionTemplates: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getInspectionTemplates();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createInspectionTemplate: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createInspectionTemplate(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateInspectionTemplate: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateInspectionTemplate(req.params.templateId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getDamageCodes: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getDamageCodes();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createDamageCode: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createDamageCode(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateDamageCode: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateDamageCode(req.params.codeId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

