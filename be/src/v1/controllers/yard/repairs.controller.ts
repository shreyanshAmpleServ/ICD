import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';

export const yardRepairsController = {
  getWorkOrders: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const orders = await (prisma as any).repair_work_orders?.findMany({
        include: { unit_stays: true },
        orderBy: { work_order_id: 'desc' },
      }) || [];

      const items = orders.map((o: any) => ({
        workOrderId: o.work_order_id,
        orderNo: o.order_no,
        unitStayId: o.unit_stay_id,
        unitNumber: o.unit_stays?.unit_number,
        estimateAmount: Number(o.estimate_amount),
        currency: o.currency,
        status: o.status,
        approvalStatus: o.approval_status,
        createdDate: o.createdate,
      }));
      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error('yardRepairsController.getWorkOrders error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  createWorkOrder: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const created = await (prisma as any).repair_work_orders.create({
        data: {
          site_id: Number(req.body.siteId) || 1,
          order_no: `WO-${Date.now()}`,
          unit_stay_id: Number(req.body.unitStayId) || 1,
          estimate_amount: parseFloat(req.body.estimateAmount) || 0,
          currency: req.body.currency || 'USD',
          status: 'ESTIMATED',
          approval_status: 'PENDING_CUSTOMER',
        },
      });
      return res.status(201).json(created);
    } catch (err: any) {
      console.error('yardRepairsController.createWorkOrder error:', err);
      res.status(500).json({ error: err.message });
    }
  },
};
