import { Request, Response } from 'express';
import { refunds } from '../../../data/money';

export const billingRefundsController = {
  getRefunds: async (_req: Request, res: Response) => {
    try {
      res.json({ items: refunds, total: refunds.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createRefund: async (req: Request, res: Response) => {
    try {
      const newRefund = {
        refundId: refunds.length + 1,
        refundNo: `REF-${Date.now()}`,
        amount: Number(req.body.amount) || 100,
        currency: req.body.currency || 'USD',
        status: 'PENDING_APPROVAL',
        reason: req.body.reason || 'Overpayment',
        createdDate: new Date().toISOString(),
        ...req.body,
      };
      refunds.push(newRefund as any);
      res.status(201).json(newRefund);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

