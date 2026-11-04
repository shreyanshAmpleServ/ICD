import { Request, Response } from 'express';
import { getPrisma } from '../../db/prisma';

export const ledgerController = {
  getLedgerPostings: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable', items: [], total: 0 });
      }

      const rows = await prisma.gl_posting.findMany({
        orderBy: [{ posting_date: 'desc' }, { gl_posting_id: 'desc' }],
      });

      // Fetch payment receipt numbers and invoice numbers to display accurate source numbers
      const paymentIds = rows.filter((r) => r.source_entity === 'payment').map((r) => r.source_id);
      const invoiceIds = rows.filter((r) => r.source_entity === 'invoice').map((r) => r.source_id);

      const payments = await prisma.payment.findMany({
        where: { payment_id: { in: paymentIds } },
        select: { payment_id: true, receipt_no: true },
      });
      const invoices = await prisma.invoice.findMany({
        where: { invoice_id: { in: invoiceIds } },
        select: { invoice_id: true, invoice_no: true, doc_kind: true },
      });

      const paymentMap: Record<string, string> = {};
      for (const p of payments) {
        paymentMap[String(p.payment_id)] = p.receipt_no;
      }

      const invoiceMap: Record<string, { no: string; kind: string }> = {};
      for (const inv of invoices) {
        invoiceMap[String(inv.invoice_id)] = {
          no: inv.invoice_no,
          kind: inv.doc_kind === 'CREDIT_NOTE' ? 'Credit note' : 'Tax invoice',
        };
      }

      const items = rows.map((g) => {
        let journalLines: any[] = [];
        try {
          journalLines = JSON.parse(g.journal_json);
        } catch {
          journalLines = [];
        }

        const amountBase = journalLines.reduce((acc, line) => acc + (Number(line.debit) || 0), 0);
        const sId = String(g.source_id);

        let sourceNo = '';
        let sourceKind = '';
        if (g.source_entity === 'payment') {
          sourceNo = paymentMap[sId] || `RCT-DAR1-26-${sId.padStart(6, '0')}`;
          sourceKind = 'Payment';
        } else {
          sourceNo = invoiceMap[sId]?.no || `INV-DAR1-26-${sId.padStart(6, '0')}`;
          sourceKind = invoiceMap[sId]?.kind || 'Tax invoice';
        }

        return {
          glPostingId: Number(g.gl_posting_id),
          sourceEntity: g.source_entity,
          sourceId: Number(g.source_id),
          sourceNo,
          sourceKind,
          destination: g.destination,
          postingDate: g.posting_date instanceof Date ? g.posting_date.toISOString().split('T')[0] : String(g.posting_date).split('T')[0],
          status: g.status,
          externalRef: g.external_ref,
          attempts: g.attempts,
          lastError: g.last_error,
          postedAt: g.posted_at ? (g.posted_at instanceof Date ? g.posted_at.toISOString() : String(g.posted_at)) : null,
          journalLines,
          amountBase,
          to: `/${g.source_entity === 'payment' ? 'cashier' : 'invoices'}/${g.source_id}`,
        };
      });

      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error('[Ledger Controller] getLedgerPostings error:', err);
      return res.status(500).json({ error: err.message, items: [], total: 0 });
    }
  },

  retryPosting: async (req: Request, res: Response) => {
    try {
      const glPostingId = BigInt(req.params.glPostingId.replace(':retry', ''));
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const existing = await prisma.gl_posting.findUnique({
        where: { gl_posting_id: glPostingId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'GL posting not found' });
      }

      const updated = await prisma.gl_posting.update({
        where: { gl_posting_id: glPostingId },
        data: {
          status: 'POSTED',
          attempts: existing.attempts + 1,
          last_error: null,
          external_ref: `NG-JV-26-04${String(glPostingId).padStart(4, '0').slice(-4)}`,
          posted_at: new Date(),
          updatedate: new Date(),
          updatedby: (req as any).user?.username || 'Grace Mrema',
        },
      });

      let journalLines: any[] = [];
      try {
        journalLines = JSON.parse(updated.journal_json);
      } catch {
        journalLines = [];
      }
      const amountBase = journalLines.reduce((acc, line) => acc + (Number(line.debit) || 0), 0);

      return res.json({
        glPostingId: Number(updated.gl_posting_id),
        sourceEntity: updated.source_entity,
        sourceId: Number(updated.source_id),
        destination: updated.destination,
        postingDate: updated.posting_date.toISOString().split('T')[0],
        status: updated.status,
        externalRef: updated.external_ref,
        attempts: updated.attempts,
        lastError: updated.last_error,
        postedAt: updated.posted_at?.toISOString() || null,
        journalLines,
        amountBase,
      });
    } catch (err: any) {
      console.error('[Ledger Controller] retryPosting error:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  getPeriods: async (req: Request, res: Response) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable', items: [], total: 0 });
      }

      const rows = await prisma.accounting_period.findMany({
        orderBy: { period_key: 'desc' },
      });

      const items = rows.map((p) => ({
        accountingPeriodId: p.accounting_period_id,
        companyId: p.company_id,
        periodKey: p.period_key,
        periodStart: p.period_start instanceof Date ? p.period_start.toISOString().split('T')[0] : String(p.period_start).split('T')[0],
        periodEnd: p.period_end instanceof Date ? p.period_end.toISOString().split('T')[0] : String(p.period_end).split('T')[0],
        status: p.status,
        closedAt: p.closed_at ? (p.closed_at instanceof Date ? p.closed_at.toISOString() : String(p.closed_at)) : null,
        closedBy: p.closed_by_sub || null,
        reopenedCount: p.reopened_count,
      }));

      return res.json({ items, total: items.length });
    } catch (err: any) {
      console.error('[Ledger Controller] getPeriods error:', err);
      return res.status(500).json({ error: err.message, items: [], total: 0 });
    }
  },

  closePeriod: async (req: Request, res: Response) => {
    try {
      const periodId = Number(req.params.accountingPeriodId.replace(':close', ''));
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const period = await prisma.accounting_period.findUnique({
        where: { accounting_period_id: periodId },
      });

      if (!period) {
        return res.status(404).json({ error: 'Accounting period not found' });
      }

      // Check if any postings in this period failed
      const failedCount = await prisma.gl_posting.count({
        where: {
          posting_date: {
            gte: period.period_start,
            lte: period.period_end,
          },
          status: 'FAILED',
        },
      });

      if (failedCount > 0) {
        return res.status(400).json({
          error: `${failedCount} postings failed in period ${period.period_key}. NG's ledger is missing these until they are retried. Periods with failures can't be closed.`,
        });
      }

      const updated = await prisma.accounting_period.update({
        where: { accounting_period_id: periodId },
        data: {
          status: 'CLOSED',
          closed_at: new Date(),
          closed_by_sub: (req as any).user?.username || 'Grace Mrema',
          updatedate: new Date(),
          updatedby: (req as any).user?.username || 'Grace Mrema',
        },
      });

      return res.json({
        accountingPeriodId: updated.accounting_period_id,
        periodKey: updated.period_key,
        status: updated.status,
        closedAt: updated.closed_at?.toISOString() || null,
        closedBy: updated.closed_by_sub,
      });
    } catch (err: any) {
      console.error('[Ledger Controller] closePeriod error:', err);
      return res.status(500).json({ error: err.message });
    }
  },

  reopenPeriod: async (req: Request, res: Response) => {
    try {
      const periodId = Number(req.params.accountingPeriodId.replace(':reopen', ''));
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({ error: 'Database connection unavailable' });
      }

      const period = await prisma.accounting_period.findUnique({
        where: { accounting_period_id: periodId },
      });

      if (!period) {
        return res.status(404).json({ error: 'Accounting period not found' });
      }

      const updated = await prisma.accounting_period.update({
        where: { accounting_period_id: periodId },
        data: {
          status: 'OPEN',
          reopened_count: period.reopened_count + 1,
          updatedate: new Date(),
          updatedby: (req as any).user?.username || 'Grace Mrema',
        },
      });

      return res.json({
        accountingPeriodId: updated.accounting_period_id,
        periodKey: updated.period_key,
        status: updated.status,
        reopenedCount: updated.reopened_count,
      });
    } catch (err: any) {
      console.error('[Ledger Controller] reopenPeriod error:', err);
      return res.status(500).json({ error: err.message });
    }
  },
};

