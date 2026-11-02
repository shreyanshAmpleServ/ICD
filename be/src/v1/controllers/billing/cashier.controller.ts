import { Request, Response } from 'express';
import { payments, shifts, channels } from '../../../data/money';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const billingCashierController = {
  getPayments: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbPayments = await prisma.payments.findMany({
            include: { invoices: true },
            orderBy: { payment_id: 'desc' },
          });
          if (dbPayments && dbPayments.length > 0) {
            const items = dbPayments.map((p: any) => ({
              paymentId: p.payment_id,
              receiptNo: p.receipt_no,
              invoiceId: p.invoice_id,
              amount: Number(p.amount),
              currency: p.currency,
              paymentMethod: p.payment_method,
              paidAt: p.paid_at,
              status: p.status,
            }));
            return res.json({ items, total: items.length });
          }
        }
      }
      res.json({ items: payments, total: payments.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getShifts: async (_req: Request, res: Response) => {
    try {
      res.json({ items: shifts, total: shifts.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getChannels: async (_req: Request, res: Response) => {
    try {
      res.json({ items: channels, total: channels.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  recordPayment: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (prisma) {
        const created = await prisma.payments.create({
          data: {
            receipt_no: `REC-${Date.now()}`,
            invoice_id: Number(req.body.invoiceId) || 1,
            amount: Number(req.body.amount) || 100,
            currency: req.body.currency || 'USD',
            payment_method: req.body.paymentMethod || 'CASH',
            status: 'COMPLETED',
            paid_at: new Date(),
          },
        });
        return res.status(201).json(created);
      }
      const newPay = { paymentId: payments.length + 1, receiptNo: `REC-${Date.now()}`, ...req.body };
      payments.push(newPay as any);
      res.status(201).json(newPay);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

