import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';

export const yardReefersController = {
  getLogs: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const logs = await (prisma as any).reefer_monitoring_logs?.findMany({
        include: { unit_stays: true },
        orderBy: { log_id: 'desc' },
      }) || [];

      const items = logs.map((l: any) => ({
        logId: l.log_id,
        unitStayId: l.unit_stay_id,
        unitNumber: l.unit_stays?.unit_number,
        setTempC: Number(l.set_temp_c),
        supplyTempC: Number(l.supply_temp_c),
        returnTempC: Number(l.return_temp_c),
        powerStatus: l.power_status,
        plugPointId: l.plug_point_id,
        loggedAt: l.logged_at,
        alarmStatus: l.alarm_status,
      }));
      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error('yardReefersController.getLogs error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  createLog: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const created = await (prisma as any).reefer_monitoring_logs.create({
        data: {
          unit_stay_id: Number(req.body.unitStayId) || 1,
          set_temp_c: parseFloat(req.body.setTempC) || -18.0,
          supply_temp_c: parseFloat(req.body.supplyTempC) || -18.0,
          return_temp_c: parseFloat(req.body.returnTempC) || -17.5,
          powerStatus: req.body.powerStatus || 'CONNECTED',
          plug_point_id: req.body.plugPointId || 'PLUG-1',
          logged_at: new Date(),
          alarm_status: req.body.alarmStatus || 'NORMAL',
        },
      });
      return res.status(201).json(created);
    } catch (err: any) {
      console.error('yardReefersController.createLog error:', err);
      res.status(500).json({ error: err.message });
    }
  },
};
