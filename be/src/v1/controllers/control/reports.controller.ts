import { Request, Response } from 'express';
import { reports } from '../../../data/insight';

export const controlReportsController = {
  getOperationalReports: async (_req: Request, res: Response) => {
    try {
      res.json({
        items: reports,
        reports,
        total: reports.length,
        nextCursor: null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};


