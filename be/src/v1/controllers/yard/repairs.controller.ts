import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const yardRepairsController = {
  getWorkOrders: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).repair_work_orders) {
          const orders = await (prisma as any).repair_work_orders.findMany({
            include: { unit_stays: true },
            orderBy: { work_order_id: 'desc' },
          });
          if (orders && orders.length > 0) {
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
          }
        }
      }
      res.json({
        items: [
          {
            workOrderId: 1,
            orderNo: 'WO-2026-001',
            unitStayId: 103,
            unitNumber: 'CMAU 450123 8',
            estimateAmount: 450.0,
            currency: 'USD',
            status: 'ESTIMATED',
            approvalStatus: 'PENDING_CUSTOMER',
            createdDate: new Date().toISOString(),
          },
        ],
        total: 1,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createWorkOrder: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (prisma) {
        const created = await prisma.repair_work_orders.create({
          data: {
            order_no: `WO-${Date.now()}`,
            unit_stay_id: Number(req.body.unitStayId) || 1,
            estimate_amount: Number(req.body.estimateAmount) || 250,
            currency: req.body.currency || 'USD',
            status: 'ESTIMATED',
            approval_status: 'PENDING',
          },
        });
        return res.status(201).json(created);
      }
      res.status(201).json({ workOrderId: 2, orderNo: `WO-${Date.now()}`, ...req.body });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

