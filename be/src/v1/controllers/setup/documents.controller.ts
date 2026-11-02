import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupDocumentsController = {
  getNumberSequences: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getNumberSequences();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createNumberSequence: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createNumberSequence(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateNumberSequence: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateNumberSequence(req.params.sequenceId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getDocumentTypes: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getDocumentTypes();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createDocumentType: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createDocumentType(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateDocumentType: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateDocumentType(req.params.documentTypeId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

