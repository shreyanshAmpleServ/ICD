import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupSitesController = {
  getCompanies: async (_req: Request, res: Response) => {
    try {
      const comp = await setupService.getCompany();
      const items = comp ? [comp] : [];
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createCompany: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createCompany(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateCompany: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateCompany(Number(req.params.companyId), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getSites: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getSites();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createSite: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createSite(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateSite: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateSite(req.params.siteId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getCountryPacks: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getCountryPacks();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createCountryPack: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createCountryPack(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateCountryPack: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateCountryPack(req.params.countryCode, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
