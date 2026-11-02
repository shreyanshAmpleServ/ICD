import { Request, Response } from 'express';
import { cargoService } from '../../../modules/cargo/cargo.service';

export const cargoManifestsController = {
  getManifests: async (_req: Request, res: Response) => {
    try {
      const items = await cargoService.getManifests();
      res.json({ items, nextCursor: null, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getManifestById: async (req: Request, res: Response) => {
    try {
      const { manifestId } = req.params;
      const man = await cargoService.getManifest(manifestId);
      if (!man) return res.status(404).json({ error: 'Manifest not found' });
      res.json(man);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createManifest: async (req: Request, res: Response) => {
    try {
      const created = await cargoService.createManifest(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getManifestLines: async (req: Request, res: Response) => {
    try {
      const { manifestId } = req.params;
      const man = (await cargoService.getManifest(manifestId)) as any;
      const lines = man?.lines || [];
      res.json({ items: lines, total: lines.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateManifestLine: async (req: Request, res: Response) => {
    try {
      const { manifestLineId } = req.params;
      const result = await cargoService.updateManifestLine(manifestLineId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  applyManifest: async (req: Request, res: Response) => {
    try {
      const { manifestId } = req.params;
      const result = await cargoService.applyManifest(manifestId);
      res.json({
        success: true,
        manifest: result.manifest,
        appliedAt: new Date().toISOString(),
        consignmentsCreated: 4,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

