import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupRulesController = {
  getHoldTypes: async (_req: Request, res: Response) => {
    try {
      const items = [
        { holdCode: 'CUSTOMS', holdName: 'Customs Examination Hold', authorityName: 'TRA Customs', defaultReason: 'Routine physical inspection required' },
        { holdCode: 'FINANCE', holdName: 'Outstanding Payment Hold', authorityName: 'DCC Finance', defaultReason: 'Uncleared storage invoices' },
        { holdCode: 'HEALTH', holdName: 'Port Health Quarantine', authorityName: 'Ministry of Health', defaultReason: 'Phytosanitary inspection needed' },
        { holdCode: 'LINE', holdName: 'Shipping Line Hold', authorityName: 'Carrier Line', defaultReason: 'Original Bill of Lading pending surrender' },
        { holdCode: 'POLICE', holdName: 'Police Verification Hold', authorityName: 'Port Police', defaultReason: 'Cargo seal discrepancy investigation' },
      ];
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createHoldType: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createHoldType(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateHoldType: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateHoldType(req.params.holdTypeId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getReleaseRules: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getReleaseRules();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createReleaseRule: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createReleaseRule(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateReleaseRule: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateReleaseRule(req.params.ruleId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getApprovalPolicies: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getApprovalPolicies();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createApprovalPolicy: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createApprovalPolicy(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateApprovalPolicy: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateApprovalPolicy(req.params.policyId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getExceptionTypes: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getExceptionTypes();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createExceptionType: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createExceptionType(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateExceptionType: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateExceptionType(req.params.typeId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
