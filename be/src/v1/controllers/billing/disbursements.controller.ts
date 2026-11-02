import { Request, Response } from 'express';
import { disbursements } from '../../../data/money';

export const billingDisbursementsController = {
  getDisbursements: async (_req: Request, res: Response) => {
    try {
      res.json({ items: disbursements, total: disbursements.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createDisbursement: async (req: Request, res: Response) => {
    try {
      const newDisb = {
        disbursementId: disbursements.length + 1,
        disbursementNo: `DISB-${Date.now()}`,
        amount: Number(req.body.amount) || 50,
        currency: req.body.currency || 'USD',
        payee: req.body.payee || 'Port Authority',
        purpose: req.body.purpose || 'Wharfage duty',
        status: 'PAID',
        paidAt: new Date().toISOString(),
        ...req.body,
      };
      disbursements.push(newDisb as any);
      res.status(201).json(newDisb);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

