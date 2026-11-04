import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../db/prisma';
import { seedStatements } from '../../scripts/seed-statements';
import { customers as mockCustomers, statement as mockStatement } from '../../data/money';

// Standard error helper
const sendError = (res: Response, message: string, code = 400) =>
  res.status(code).json({
    type: 'https://api.icd.dcc/errors/validation',
    title: 'Validation Error',
    status: code,
    detail: message,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString(),
  });

let seededInitial = false;

export class StatementsController {
  /**
   * Ensure database is initialized with statements/AR data if needed
   */
  private async ensureDatabaseSeeded() {
    if (seededInitial) return;
    try {
      const prisma = getPrisma();
      if (prisma) {
        const count = await prisma.m_party.count({
          where: { m_party_m_party_role: { some: { role_code: 'CUSTOMER' } } },
        });
        if (count === 0) {
          console.log('[StatementsController] DB has 0 customer parties. Seeding initial data...');
          await seedStatements();
        }
        seededInitial = true;
      }
    } catch (e: any) {
      console.warn('[StatementsController] Error checking/seeding statements DB:', e.message);
    }
  }

  /**
   * GET /statements
   * Fetch customer list with statement AR summaries (Outstanding, Overdue, On-Account, Credit Used)
   */
  public getStatements = async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          await this.ensureDatabaseSeeded();

          // Fetch all customer parties
          const parties = await prisma.m_party.findMany({
            where: {
              OR: [
                { m_party_m_party_role: { some: { role_code: 'CUSTOMER' } } },
                { party_code: { startsWith: 'C-' } },
              ],
            },
            include: {
              m_party_invoice: {
                where: {
                  doc_kind: { not: 'PROFORMA' },
                  status: { notIn: ['DRAFT', 'CANCELLED'] },
                },
              },
              m_party_payment: {
                where: {
                  status: { not: 'REVERSED' },
                },
              },
            },
            orderBy: { party_id: 'asc' },
          });

          const now = new Date();

          const list = parties.map((p: any) => {
            const invoices = p.m_party_invoice || [];
            const payments = p.m_party_payment || [];

            // Calculate Outstanding and Overdue
            let outstanding = 0;
            let overdue = 0;

            for (const inv of invoices) {
              const total = Number(inv.total || 0);
              const paid = Number(inv.amount_paid || 0);
              const credited = Number(inv.amount_credited || 0);
              const fxRate = Number(inv.exchange_rate || 1);
              const balDoc = total - paid - credited;

              if (balDoc > 0.01) {
                const balUsd = inv.currency === 'USD' ? balDoc : balDoc / (fxRate > 0 ? fxRate : 1);
                outstanding += balUsd;

                // Check if overdue
                const due = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date);
                if (due < now) {
                  overdue += balUsd;
                }
              }
            }

            // Calculate On-Account (unallocated payments)
            let unallocated = 0;
            for (const pay of payments) {
              const pAmt = Number(pay.amount || 0);
              const pAlloc = Number(pay.amount_allocated || 0);
              const pUnalloc = pAmt - pAlloc;
              if (pUnalloc > 0.01) {
                const fxRate = Number(pay.exchange_rate || 1);
                const unallocUsd = pay.currency === 'USD' ? pUnalloc : pUnalloc / (fxRate > 0 ? fxRate : 1);
                unallocated += unallocUsd;
              }
            }

            const creditLimit = p.credit_limit ? Number(p.credit_limit) : null;
            const creditUsedPct = creditLimit && creditLimit > 0 ? Math.round((outstanding / creditLimit) * 100) : 0;

            return {
              c: {
                partyId: p.party_id,
                partyCode: p.party_code,
                partyName: p.party_name,
                creditStatus: p.credit_status || 'CASH',
                creditLimit: p.credit_limit ? String(p.credit_limit) : undefined,
                creditCurrency: p.credit_currency || 'USD',
                email: p.email,
              },
              s: {
                partyId: p.party_id,
                currency: 'USD',
                outstanding: Number(outstanding.toFixed(2)),
                overdue: Number(overdue.toFixed(2)),
                unallocated: Number(unallocated.toFixed(2)),
                creditLimit,
                creditUsedPct,
                ageing: {
                  current: Number((outstanding - overdue).toFixed(2)),
                  d1_30: Number(overdue.toFixed(2)),
                  d31_60: 0,
                  d61_90: 0,
                  over90: 0,
                },
              },
            };
          });

          // Sort by outstanding descending, matching UI
          list.sort((a, b) => b.s.outstanding - a.s.outstanding);

          return res.json({
            items: list,
            total: list.length,
          });
        }
      }

      // Memory fallback
      const fallbackList = mockCustomers.map((c) => ({ c, s: mockStatement(c.partyId!) })).sort((a, b) => b.s.outstanding - a.s.outstanding);
      res.json({ items: fallbackList, total: fallbackList.length });
    } catch (err: any) {
      console.error('[StatementsController.getStatements] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * GET /statements/:partyId
   * Fetch detailed statement ledger, running balance, and ageing breakdown for a single customer
   */
  public getStatementByPartyId = async (req: Request, res: Response) => {
    try {
      const partyIdParam = req.params.partyId;
      const partyId = Number(partyIdParam);

      const from = (req.query.from as string) || new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
      const to = (req.query.to as string) || new Date().toISOString().slice(0, 10);

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const party = await prisma.m_party.findUnique({
            where: { party_id: partyId },
            include: {
              m_party_invoice: {
                where: {
                  doc_kind: { not: 'PROFORMA' },
                  status: { notIn: ['DRAFT', 'CANCELLED'] },
                },
              },
              m_party_payment: {
                where: {
                  status: { not: 'REVERSED' },
                },
                include: {
                  m_payment_channel_payment: true,
                },
              },
            },
          });

          if (!party) {
            return sendError(res, `Customer with ID ${partyId} not found`, 404);
          }

          const refunds = await prisma.refund.findMany({
            where: {
              payment_refund: {
                party_id: partyId,
              },
              status: 'PAID',
            },
          });

          const events: any[] = [];

          // Add Invoices
          for (const inv of party.m_party_invoice) {
            const total = Number(inv.total || 0);
            const fxRate = Number(inv.exchange_rate || 1);
            const amtUsd = inv.currency === 'USD' ? total : total / (fxRate > 0 ? fxRate : 1);
            const isCreditNote = inv.doc_kind === 'CREDIT_NOTE';
            const dateStr = inv.invoice_date instanceof Date ? inv.invoice_date.toISOString().slice(0, 10) : String(inv.invoice_date).slice(0, 10);

            events.push({
              date: dateStr,
              docKind: inv.doc_kind === 'TAX_INVOICE' ? 'Tax invoice' : inv.doc_kind === 'DEBIT_NOTE' ? 'Debit note' : 'Credit note',
              docNo: inv.invoice_no || `INV-${inv.invoice_id}`,
              reference: undefined,
              debit: isCreditNote ? 0 : Number(amtUsd.toFixed(2)),
              credit: isCreditNote ? Number(amtUsd.toFixed(2)) : 0,
              to: `/invoices/${inv.invoice_id}`,
              due: inv.due_date ? (inv.due_date instanceof Date ? inv.due_date.toISOString().slice(0, 10) : String(inv.due_date).slice(0, 10)) : undefined,
            });
          }

          // Add Payments
          for (const pay of party.m_party_payment) {
            const amt = Number(pay.amount || 0);
            const fxRate = Number(pay.exchange_rate || 1);
            const amtUsd = pay.currency === 'USD' ? amt : amt / (fxRate > 0 ? fxRate : 1);
            const dateStr = pay.value_date
              ? (pay.value_date instanceof Date ? pay.value_date.toISOString().slice(0, 10) : String(pay.value_date).slice(0, 10))
              : (pay.received_at instanceof Date ? pay.received_at.toISOString().slice(0, 10) : String(pay.received_at).slice(0, 10));

            events.push({
              date: dateStr,
              docKind: 'Payment',
              docNo: pay.receipt_no,
              reference: [pay.m_payment_channel_payment?.channel_name, pay.external_ref].filter(Boolean).join(' · '),
              debit: 0,
              credit: Number(amtUsd.toFixed(2)),
            });
          }

          // Add Refunds
          for (const rfd of refunds) {
            const amt = Number(rfd.amount || 0);
            const amtUsd = rfd.currency === 'USD' ? amt : amt / 2600.0;
            const dateStr = rfd.paid_at ? (rfd.paid_at instanceof Date ? rfd.paid_at.toISOString().slice(0, 10) : String(rfd.paid_at).slice(0, 10)) : to;

            events.push({
              date: dateStr,
              docKind: 'Refund',
              docNo: rfd.refund_no,
              reference: rfd.paid_reference || undefined,
              debit: Number(amtUsd.toFixed(2)),
              credit: 0,
            });
          }

          // Sort by date ascending
          events.sort((a, b) => a.date.localeCompare(b.date) || a.docNo.localeCompare(b.docNo));

          // Opening balance (prior to 'from')
          const opening = Number(events.filter((e) => e.date < from).reduce((sum, e) => sum + e.debit - e.credit, 0).toFixed(2));

          let running = opening;
          const lines = events
            .filter((e) => e.date >= from && e.date <= to)
            .map((e) => {
              running = Number((running + e.debit - e.credit).toFixed(2));
              return {
                ...e,
                balance: running,
              };
            });

          // Ageing calculation
          const ageing = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0 };
          const toDateObj = new Date(to);

          for (const inv of party.m_party_invoice) {
            const total = Number(inv.total || 0);
            const paid = Number(inv.amount_paid || 0);
            const credited = Number(inv.amount_credited || 0);
            const bal = total - paid - credited;

            if (bal > 0.01 && (inv.doc_kind === 'TAX_INVOICE' || inv.doc_kind === 'DEBIT_NOTE')) {
              const fxRate = Number(inv.exchange_rate || 1);
              const balUsd = inv.currency === 'USD' ? bal : bal / (fxRate > 0 ? fxRate : 1);
              const due = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date);
              const daysDiff = Math.floor((toDateObj.getTime() - due.getTime()) / 86400000);

              if (daysDiff <= 0) ageing.current += balUsd;
              else if (daysDiff <= 30) ageing.d1_30 += balUsd;
              else if (daysDiff <= 60) ageing.d31_60 += balUsd;
              else if (daysDiff <= 90) ageing.d61_90 += balUsd;
              else ageing.over90 += balUsd;
            }
          }

          // Unallocated prepayments
          let unallocated = 0;
          for (const pay of party.m_party_payment) {
            const pAmt = Number(pay.amount || 0);
            const pAlloc = Number(pay.amount_allocated || 0);
            const pUnalloc = pAmt - pAlloc;
            if (pUnalloc > 0.01) {
              const fxRate = Number(pay.exchange_rate || 1);
              unallocated += pay.currency === 'USD' ? pUnalloc : pUnalloc / (fxRate > 0 ? fxRate : 1);
            }
          }

          const outstanding = Number(Object.values(ageing).reduce((a, b) => a + b, 0).toFixed(2));

          return res.json({
            partyId,
            currency: 'USD',
            fromDate: from,
            toDate: to,
            openingBalance: opening,
            lines,
            closingBalance: running,
            ageing: {
              current: Number(ageing.current.toFixed(2)),
              d1_30: Number(ageing.d1_30.toFixed(2)),
              d31_60: Number(ageing.d31_60.toFixed(2)),
              d61_90: Number(ageing.d61_90.toFixed(2)),
              over90: Number(ageing.over90.toFixed(2)),
            },
            outstanding,
            unallocated: Number(unallocated.toFixed(2)),
          });
        }
      }

      // Memory fallback
      res.json(mockStatement(partyId, from, to));
    } catch (err: any) {
      console.error('[StatementsController.getStatementByPartyId] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * GET /statements/:partyId/pdf
   * Return printable statement PDF details
   */
  public getStatementPdf = async (req: Request, res: Response) => {
    try {
      const partyId = req.params.partyId;
      res.json({
        partyId,
        pdfUrl: `/api/statements/party-${partyId}.pdf`,
        contentBase64: 'JVBERi0xLjQKJcTl8uXr...',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
}

export const statementsController = new StatementsController();

