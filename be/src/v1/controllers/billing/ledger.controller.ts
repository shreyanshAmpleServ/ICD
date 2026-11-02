import { Request, Response } from 'express';
import { glPostings, periods } from '../../../data/money';

export const billingLedgerController = {
  getLedgerPostings: async (_req: Request, res: Response) => {
    try {
      res.json({ items: glPostings, total: glPostings.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getPeriods: async (_req: Request, res: Response) => {
    try {
      res.json({ items: periods, total: periods.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

