import { Request, Response } from 'express';
import { tariffs, rates } from '../../../data/money';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const billingTariffsController = {
  getTariffs: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbTariffs = await prisma.tariffs.findMany({
            include: { tariff_rates: true },
            orderBy: { tariff_id: 'asc' },
          });
          if (dbTariffs && dbTariffs.length > 0) {
            const items = dbTariffs.map((t: any) => ({
              tariffId: t.tariff_id,
              tariffCode: t.tariff_code,
              tariffName: t.tariff_name,
              currency: t.currency,
              ratesCount: t.tariff_rates?.length || 0,
              isActive: t.is_active ?? true,
            }));
            return res.json({ items, total: items.length });
          }
        }
      }
      res.json({ items: tariffs, total: tariffs.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

