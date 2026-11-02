import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const controlTowerController = {
  getStatus: async (_req: Request, res: Response) => {
    try {
      res.json({
        terminalStatus: 'GREEN',
        activeVesselsAtBerth: 2,
        trucksInYard: 14,
        waitingGateInQueue: 4,
        averageDwellDays: 3.8,
        activeCriticalAlerts: 0,
        equipmentAvailabilityPct: 94.0,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

