import { Request, Response } from 'express';
import { getPrisma } from '../../../db/prisma';

export const yardKeysController = {
  getKeys: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const keys = await (prisma as any).vehicle_keys?.findMany({
        include: {
          unit_stays: true,
        },
        orderBy: { key_id: 'asc' },
      }) || [];

      const items = keys.map((k: any) => ({
        keyId: k.key_id,
        tagNumber: k.tag_number,
        pegNumber: k.peg_number,
        unitStayId: k.unit_stay_id,
        vin: k.vin,
        makeModel: k.make_model,
        status: k.status,
        currentHolder: k.current_holder,
        checkedOutAt: k.checked_out_at,
      }));
      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error('yardKeysController.getKeys error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  checkoutKey: async (req: Request, res: Response) => {
    try {
      const { keyId } = req.params;
      const { holderName } = req.body;
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const updated = await (prisma as any).vehicle_keys.update({
        where: { key_id: Number(keyId) },
        data: { status: 'CHECKED_OUT', current_holder: holderName || 'Driver', checked_out_at: new Date() },
      });
      return res.json(updated);
    } catch (err: any) {
      console.error('yardKeysController.checkoutKey error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  returnKey: async (req: Request, res: Response) => {
    try {
      const { keyId } = req.params;
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const updated = await (prisma as any).vehicle_keys.update({
        where: { key_id: Number(keyId) },
        data: { status: 'IN_BOARD', current_holder: null, checked_out_at: null },
      });
      return res.json(updated);
    } catch (err: any) {
      console.error('yardKeysController.returnKey error:', err);
      res.status(500).json({ error: err.message });
    }
  },
};
