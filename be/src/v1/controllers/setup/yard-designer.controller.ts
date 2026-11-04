import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupYardDesignerController = {
  getYardLocations: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getYardLocations();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createYardLocation: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createYardLocation(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateYardLocation: async (req: Request, res: Response) => {
    try {
      const id = req.params.locationId || (req.params as any).yardLocationId || (req.params as any).id;
      const updated = await setupService.updateYardLocation(id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteYardLocation: async (req: Request, res: Response) => {
    try {
      const id = req.params.locationId || (req.params as any).yardLocationId || (req.params as any).id;
      const result = await setupService.deleteYardLocation(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  generateSlots: async (req: Request, res: Response) => {
    try {
      const locId = req.params.locationId || (req.params as any).yardLocationId || req.body.locationId || req.body.blockId || req.body.parentLocationId;
      const result = await setupService.generateSlots(locId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  blockSlot: async (req: Request, res: Response) => {
    try {
      const codeOrId = req.params.locationId || req.body.locationCode || req.body.slotCode;
      const result = await setupService.blockSlot(codeOrId, req.body.reason);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  unblockSlot: async (req: Request, res: Response) => {
    try {
      const codeOrId = req.params.locationId || req.body.locationCode || req.body.slotCode;
      const result = await setupService.unblockSlot(codeOrId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

