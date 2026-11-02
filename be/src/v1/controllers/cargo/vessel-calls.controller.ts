import { Request, Response } from 'express';
import { cargoService } from '../../../modules/cargo/cargo.service';

export const cargoVesselCallsController = {
  getVesselCalls: async (req: Request, res: Response) => {
    try {
      const items = await cargoService.getVesselCalls(req.query);
      res.json({ items, nextCursor: null, total: items.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getVesselCallById: async (req: Request, res: Response) => {
    try {
      const { vesselCallId } = req.params;
      const call = await cargoService.getVesselCall(vesselCallId);
      if (!call) return res.status(404).json({ error: 'Vessel call not found' });
      res.json(call);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createVesselCall: async (req: Request, res: Response) => {
    try {
      const created = await cargoService.createVesselCall(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateVesselCall: async (req: Request, res: Response) => {
    try {
      const { vesselCallId } = req.params;
      const updated = await cargoService.updateVesselCall(vesselCallId, req.body);
      if (!updated) return res.status(404).json({ error: 'Vessel call not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

