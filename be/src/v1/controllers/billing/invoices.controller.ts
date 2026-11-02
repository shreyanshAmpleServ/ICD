import { Request, Response } from 'express';
import { invoices } from '../../../data/money';
import { getPrisma, isDbLive } from '../../../db/prisma';

export const billingInvoicesController = {
  getInvoices: async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const dbInvoices = await prisma.invoices.findMany({
            include: { parties: true },
            orderBy: { invoice_id: 'desc' },
          });
          if (dbInvoices && dbInvoices.length > 0) {
            const items = dbInvoices.map((inv: any) => ({
              invoiceId: inv.invoice_id,
              invoiceNo: inv.invoice_no,
              partyId: inv.party_id,
              customerName: inv.parties?.party_name || 'Customer',
              totalAmount: Number(inv.total_amount || 0),
              paidAmount: Number(inv.paid_amount || 0),
              balance: Number(inv.total_amount || 0) - Number(inv.paid_amount || 0),
              currency: inv.currency || 'USD',
              status: inv.status || 'ISSUED',
              dueDate: inv.due_date,
              issuedAt: inv.issued_at || inv.createdate,
            }));
            return res.json({ items, total: items.length });
          }
        }
      }
      res.json({ items: invoices, total: invoices.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getInvoiceById: async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const prisma = getPrisma();
      if (prisma) {
        const inv = await prisma.invoices.findFirst({
          where: { invoice_id: Number(invoiceId) || undefined, invoice_no: invoiceId },
          include: { parties: true },
        });
        if (inv) return res.json(inv);
      }
      const found = invoices.find((i: any) => String(i.invoiceId) === invoiceId || i.invoiceNo === invoiceId);
      if (!found) return res.status(404).json({ error: 'Invoice not found' });
      res.json(found);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createInvoice: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (prisma) {
        const created = await prisma.invoices.create({
          data: {
            invoice_no: `INV-${Date.now()}`,
            party_id: Number(req.body.partyId) || 1,
            total_amount: Number(req.body.totalAmount) || 500,
            paid_amount: 0,
            currency: req.body.currency || 'USD',
            status: 'ISSUED',
            issued_at: new Date(),
          },
        });
        return res.status(201).json(created);
      }
      const newInv = { invoiceId: invoices.length + 1, invoiceNo: `INV-${Date.now()}`, ...req.body };
      invoices.push(newInv as any);
      res.status(201).json(newInv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};

