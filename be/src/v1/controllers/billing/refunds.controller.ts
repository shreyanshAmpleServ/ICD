import { Request, Response } from 'express';
import { refundsController } from '../refunds.controller';

export const billingRefundsController = {
  getRefunds: (req: Request, res: Response) => refundsController.getRefunds(req, res),
  createRefund: (req: Request, res: Response) => refundsController.createRefund(req, res),
  decideRefund: (req: Request, res: Response) => refundsController.decideRefund(req, res),
  markPaid: (req: Request, res: Response) => refundsController.markPaid(req, res),
};
