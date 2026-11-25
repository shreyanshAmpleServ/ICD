import { Request, Response } from 'express';
import { occupancyForecast, dwellPredictions } from '../../../data/insight';

export const controlForecastsController = {
  getForecasts: async (_req: Request, res: Response) => {
    try {
      res.json({
        modelName: 'YARD-OCCUPANCY-PROPHET-V2',
        predictedPeakDay: '2026-11-04',
        predictedPeakTeu: 10200,
        confidenceIntervalPct: 92.5,
        forecastPoints: [
          { day: 'Day 1 (+1d)', expectedInboundTeu: 340, expectedOutboundTeu: 310, netOccupancy: 8520 },
          { day: 'Day 2 (+2d)', expectedInboundTeu: 410, expectedOutboundTeu: 320, netOccupancy: 8610 },
          { day: 'Day 3 (+3d)', expectedInboundTeu: 500, expectedOutboundTeu: 350, netOccupancy: 8760 },
          { day: 'Day 4 (+4d)', expectedInboundTeu: 620, expectedOutboundTeu: 380, netOccupancy: 9000 },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getOccupancyForecast: async (req: Request, res: Response) => {
    try {
      const siteId = Number(req.query.siteId || (req as any).siteId) || 1;
      const block = String(req.query.block || 'ALL');
      const items = occupancyForecast(siteId, block);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getDwellPredictions: async (req: Request, res: Response) => {
    try {
      const siteId = Number(req.query.siteId || (req as any).siteId) || 1;
      const items = dwellPredictions(siteId);
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};


