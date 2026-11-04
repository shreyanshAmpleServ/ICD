import { Request, Response } from 'express';
import { disbursementsController } from '../disbursements.controller';

export const billingDisbursementsController = {
  getDisbursements: (req: Request, res: Response) => disbursementsController.getDisbursements(req, res),
  getDisbursementById: (req: Request, res: Response) => disbursementsController.getDisbursementById(req, res),
  createDisbursement: (req: Request, res: Response) => disbursementsController.createDisbursement(req, res),
  writeOffDisbursement: (req: Request, res: Response) => disbursementsController.writeOffDisbursement(req, res),
};
