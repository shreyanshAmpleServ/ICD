import { Request, Response } from 'express';
import { statementsController } from '../statements.controller';

export const billingStatementsController = {
  getStatements: (req: Request, res: Response) => statementsController.getStatements(req, res),
  getStatementByPartyId: (req: Request, res: Response) => statementsController.getStatementByPartyId(req, res),
  getStatementPdf: (req: Request, res: Response) => statementsController.getStatementPdf(req, res),
};
