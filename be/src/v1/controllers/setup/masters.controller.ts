import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupMastersController = {
  getTrucks: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getTrucks();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createTruck: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createTruck(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateTruck: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateTruck(req.params.truckId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getDrivers: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getDrivers();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createDriver: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createDriver(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateDriver: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateDriver(req.params.driverId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getVessels: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getVessels();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createVessel: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createVessel(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateVessel: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateVessel(req.params.vesselId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getPorts: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getPorts();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createPort: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createPort(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updatePort: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updatePort(req.params.portId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getCommodities: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getCommodities();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createCommodity: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createCommodity(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateCommodity: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateCommodity(req.params.commodityId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getEquipment: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getEquipment();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createEquipment: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createEquipment(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateEquipment: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateEquipment(req.params.equipmentId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

