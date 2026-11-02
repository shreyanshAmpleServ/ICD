import { Request, Response } from 'express';
import { charges, openCharges } from '../../../data/money';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const billingChargesController = {
  getCharges: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbCharges = await prisma.charges.findMany({
            include: { unit_stays: true, m_charge_code: true },
            orderBy: { charge_id: 'desc' },
          });
          if (dbCharges && dbCharges.length > 0) {
            const items = dbCharges.map((c: any) => ({
              chargeId: c.charge_id,
              chargeCode: c.m_charge_code?.charge_code || c.charge_code || 'LIFT_ON',
              chargeName: c.m_charge_code?.charge_name || 'Terminal Handling Charge',
              unitStayId: c.unit_stay_id,
              amount: Number(c.amount || 0),
              currency: c.currency || 'USD',
              status: c.status || 'UNBILLED',
              createdDate: c.createdate,
            }));
            return res.json({ items, total: items.length });
          }
        }
      }
      res.json({ items: charges, total: charges.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getOpenCharges: async (req: Request, res: Response) => {
    try {
      res.json({ items: openCharges, total: openCharges.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

