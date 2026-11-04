import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupFinanceController = {
  getAccountingPeriods: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getAccountingPeriods();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createAccountingPeriod: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createAccountingPeriod(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateAccountingPeriod: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateAccountingPeriod(req.params.periodId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  closePeriod: async (req: Request, res: Response) => {
    try {
      const periodKey = req.params.periodKey || (req.params as any).accountingPeriodId || req.body.periodKey || req.params.periodId;
      const cleanKey = String(periodKey).replace(':close', '').replace('/close', '');
      const closed = await setupService.closeAccountingPeriod(cleanKey, req.body.reason);
      res.json(closed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  reopenPeriod: async (req: Request, res: Response) => {
    try {
      const periodKey = req.params.periodKey || (req.params as any).accountingPeriodId || req.body.periodKey || req.params.periodId;
      const cleanKey = String(periodKey).replace(':reopen', '').replace('/reopen', '');
      const reopened = await setupService.reopenAccountingPeriod(cleanKey, req.body.reason);
      res.json(reopened);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getChargeCodes: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getChargeCodes();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createChargeCode: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createChargeCode(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateChargeCode: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateChargeCode(req.params.chargeCodeId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getTaxCodes: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getTaxCodes();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createTaxCode: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createTaxCode(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateTaxCode: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateTaxCode(req.params.taxCodeId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getPaymentChannels: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getPaymentChannels();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createPaymentChannel: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createPaymentChannel(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updatePaymentChannel: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updatePaymentChannel(req.params.channelId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getGlSettings: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getGlSettings();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createGlSetting: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createGlSetting(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateGlSetting: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateGlSetting(req.params.glSettingId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

