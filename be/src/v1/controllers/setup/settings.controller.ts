import { Request, Response } from 'express';
import { setupService } from '../../../modules/setup/setup.service';

export const setupSettingsController = {
  getFieldRules: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getFieldRules();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createFieldRule: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createFieldRule(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateFieldRule: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateFieldRule(req.params.fieldRuleId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteFieldRule: async (req: Request, res: Response) => {
    try {
      const result = await setupService.deleteFieldRule(Number(req.params.fieldRuleId));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getCalendars: async (_req: Request, res: Response) => {
    try {
      const items = await setupService.getCalendars();
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createCalendar: async (req: Request, res: Response) => {
    try {
      const created = await setupService.createCalendar(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateCalendar: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateCalendar(req.params.calendarId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getHolidays: async (req: Request, res: Response) => {
    try {
      const items = await setupService.getHolidays(Number(req.params.calendarId));
      res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createHoliday: async (req: Request, res: Response) => {
    try {
      const created = await setupService.addHoliday(Number(req.params.calendarId) || 1, req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateHoliday: async (req: Request, res: Response) => {
    try {
      const updated = await setupService.updateHoliday(req.params.holidayId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteHoliday: async (req: Request, res: Response) => {
    try {
      const result = await setupService.deleteHoliday(
        Number(req.params.calendarId) || 1,
        Number(req.params.holidayId) || Number(req.params.calendarHolidayId)
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
