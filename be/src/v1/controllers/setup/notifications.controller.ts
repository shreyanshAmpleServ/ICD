import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupNotificationsController = {
  getNotificationTemplates: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getNotificationTemplates();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createNotificationTemplate: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createNotificationTemplate(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateNotificationTemplate: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateNotificationTemplate(req.params.templateId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getNotificationRules: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getNotificationRules();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createNotificationRule: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createNotificationRule(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateNotificationRule: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateNotificationRule(req.params.ruleId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getPrintTemplates: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getPrintTemplates();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createPrintTemplate: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createPrintTemplate(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updatePrintTemplate: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updatePrintTemplate(req.params.templateId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

