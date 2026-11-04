import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupDevicesController = {
  getDevices: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getDevices();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createDevice: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createDevice(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateDevice: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateDevice(req.params.deviceId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  revokeDevice: async (req: Request, res: Response) => {
    try {
      const revoked = await setupService.revokeDevice(req.params.deviceId, req.body?.reason);
      res.json(revoked);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getDeviceIntegrations: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getDeviceIntegrations();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createDeviceIntegration: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createDeviceIntegration(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateDeviceIntegration: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateDeviceIntegration(req.params.integrationId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

