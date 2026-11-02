import { Request, Response } from 'express';
import { statement } from '../../../data/money';

export const billingStatementsController = {
  getStatements: async (req: Request, res: Response) => {
    try {
      res.json({
        statement,
        customerName: 'Mediterranean Shipping Company (Tanzania) Ltd',
        period: '2026-10',
        totalDebits: 38400.0,
        totalCredits: 35000.0,
        closingBalance: 3400.0,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

