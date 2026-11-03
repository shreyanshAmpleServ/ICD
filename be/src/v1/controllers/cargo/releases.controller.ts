import { Request, Response } from 'express';
import { cargoService } from '../../../modules/cargo/cargo.service';

export const cargoReleasesController = {
  getReleaseOrders: async (req: Request, res: Response) => {
    try {
      const items = await cargoService.getReleaseOrders(req.query);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getReleaseOrderById: async (req: Request, res: Response) => {
    try {
      const { releaseOrderId } = req.params;
      const order = await cargoService.getReleaseOrder(releaseOrderId);
      if (!order) return res.status(404).json({ error: 'Release order not found' });
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createReleaseOrder: async (req: Request, res: Response) => {
    try {
      const username = (req as any).user?.username || 'Release Officer';
      const created = await cargoService.createReleaseOrder(req.body, username);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  approveReleaseOrder: async (req: Request, res: Response) => {
    try {
      const { releaseOrderId } = req.params;
      const username = (req as any).user?.username || 'Terminal Manager';
      const result = await cargoService.approveReleaseOrder(releaseOrderId, username);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  cancelReleaseOrder: async (req: Request, res: Response) => {
    try {
      const { releaseOrderId } = req.params;
      const { reason } = req.body;
      const result = await cargoService.cancelReleaseOrder(releaseOrderId, reason);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  revalidateReleaseOrder: async (req: Request, res: Response) => {
    try {
      const { releaseOrderId } = req.params;
      const { validTo } = req.body;
      const result = await cargoService.revalidateReleaseOrder(releaseOrderId, validTo);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

