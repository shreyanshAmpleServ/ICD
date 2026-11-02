import { Request, Response } from 'express';
import { cashierController } from '../cashier.controller';

export const billingCashierController = {
  getPayments: (req: Request, res: Response) => cashierController.getPayments(req, res),
  getShifts: (req: Request, res: Response) => cashierController.getShifts(req, res),
  getChannels: (req: Request, res: Response) => cashierController.getChannels(req, res),
  recordPayment: (req: Request, res: Response) => cashierController.recordPayment(req, res),
};
