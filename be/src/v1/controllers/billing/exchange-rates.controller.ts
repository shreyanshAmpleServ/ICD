import { Request, Response } from 'express';
import { fx } from '../../../data/money';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const billingExchangeRatesController = {
  getExchangeRates: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const rates = await prisma.exchange_rates.findMany({
            orderBy: { rate_id: 'asc' },
          });
          if (rates && rates.length > 0) {
            const items = rates.map((r: any) => ({
              exchangeRateId: r.rate_id,
              baseCurrency: r.base_currency,
              quoteCurrency: r.quote_currency,
              rate: Number(r.rate),
              effectiveFrom: r.effective_from,
              isCurrent: r.is_current,
            }));
            return res.json({ items, total: items.length });
          }
        }
      }
      res.json({
        items: [
          { exchangeRateId: 1, baseCurrency: 'USD', quoteCurrency: 'TZS', rate: 2650.0, effectiveFrom: '2026-10-01T00:00:00Z', isCurrent: true },
          { exchangeRateId: 2, baseCurrency: 'EUR', quoteCurrency: 'TZS', rate: 2880.0, effectiveFrom: '2026-10-01T00:00:00Z', isCurrent: true },
        ],
        total: 2,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createExchangeRate: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (prisma) {
        const created = await prisma.exchange_rates.create({
          data: {
            base_currency: req.body.baseCurrency || 'USD',
            quote_currency: req.body.quoteCurrency || 'TZS',
            rate: Number(req.body.rate) || 2650,
            effective_from: new Date(req.body.effectiveFrom || Date.now()),
            is_current: true,
          },
        });
        return res.status(201).json(created);
      }
      res.status(201).json({ exchangeRateId: 3, ...req.body });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

