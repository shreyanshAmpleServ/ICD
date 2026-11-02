import { Request, Response } from 'express';
import { tariffs, rates } from '../../../data/money';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const billingTariffsController = {
  getTariffs: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).tariff) {
          try {
            const dbTariffs = await (prisma as any).tariff.findMany({
              include: { tariff_rule: true },
              orderBy: { tariff_id: 'asc' },
            });
            if (dbTariffs && dbTariffs.length > 0) {
              const items = dbTariffs.map((t: any) => ({
                tariffId: t.tariff_id,
                tariffCode: t.tariff_code,
                tariffName: t.tariff_name,
                currency: t.currency || 'USD',
                ratesCount: t.tariff_rule?.length || 0,
                isActive: t.status === 'ACTIVE',
              }));
              return res.json({ items, total: items.length });
            }
          } catch (dbErr: any) {
            console.warn('[Tariffs Controller] DB query failed, using fallback:', dbErr.message);
          }
        }
      }
      return res.json({ items: tariffs, total: tariffs.length });
    } catch (err: any) {
      console.error('[Tariffs Controller] getTariffs error:', err.message);
      return res.json({ items: tariffs, total: tariffs.length });
    }
  },

  getTariffRates: async (_req: Request, res: Response) => {
    try {
      res.json({ items: rates, total: rates.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
