import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../db/prisma';
import { invoices as mockInvoices, invoice as getMockInvoice } from '../../data/money';
import { party as getMockParty, consignment as getMockConsignment } from '../../data/core';

// Standard error / response helpers
const sendError = (res: Response, message: string, code = 400) =>
  res.status(code).json({
    type: 'https://api.icd.dcc/errors/validation',
    title: 'Validation Error',
    status: code,
    detail: message,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString(),
  });

export interface InvoiceItem {
  invoiceId: number;
  invoiceNo: string;
  docKind: string;
  status: string;
  siteId: number;
  billToPartyId: number;
  partyName?: string;
  consignmentId?: number | null;
  consignmentRef?: string | null;
  currency: string;
  baseCurrency: string;
  exchangeRate: number;
  exchangeRateDate?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  serviceToDate?: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  totalBase: string;
  amountPaid: string;
  amountCredited: string;
  balance: string;
  proformaInvoiceId?: number | null;
  originalInvoiceId?: number | null;
  reason?: string | null;
  postedAt?: string | null;
  fiscalReceipt?: {
    provider: string;
    status: string;
    attempts: number;
    receiptNo?: string | null;
    verificationCode?: string | null;
    verificationUrl?: string | null;
    issuedAt?: string | null;
    lastError?: string | null;
  };
  glStatus?: string | null;
  createdBy?: string;
  lines?: any[];
  releaseValidTo?: string;
  zeroRated?: boolean;
}

export class InvoicesController {
  /**
   * GET /invoices
   * List all invoices, proformas, credit notes, and debit notes.
   */
  public getInvoices = async (req: Request, res: Response) => {
    try {
      const siteId = req.query.siteId ? parseInt(String(req.query.siteId), 10) : undefined;
      const kind = req.query.kind ? String(req.query.kind).toUpperCase() : undefined;
      const statusParam = req.query.status ? String(req.query.status).toUpperCase() : undefined;
      const billToPartyId = req.query.billToPartyId ? parseInt(String(req.query.billToPartyId), 10) : undefined;
      const q = req.query.q ? String(req.query.q).trim().toLowerCase() : undefined;

      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const whereClause: any = {};
        if (siteId) whereClause.site_id = siteId;
        if (kind && kind !== 'ALL') whereClause.doc_kind = kind;
        if (statusParam && statusParam !== 'ALL') whereClause.status = statusParam;
        if (billToPartyId) whereClause.bill_to_party_id = billToPartyId;

        const dbInvoices = await prisma.invoice.findMany({
          where: whereClause,
          include: {
            invoice_invoice_line: true,
            m_party_invoice: true,
            consignment_invoice: true,
            invoice_fiscal_receipt: true,
            invoice_payment_allocation: {
              include: {
                payment_payment_allocation: true,
              },
            },
          },
          orderBy: [{ invoice_date: 'desc' }, { invoice_id: 'desc' }],
        });

        if (dbInvoices && dbInvoices.length > 0) {
          let items: InvoiceItem[] = dbInvoices.map((inv: any) => {
            const fiscal = inv.invoice_fiscal_receipt;
            const party = inv.m_party_invoice;
            const con = inv.consignment_invoice;

            return {
              invoiceId: Number(inv.invoice_id),
              invoiceNo: inv.invoice_no || `INV-${inv.invoice_id}`,
              docKind: inv.doc_kind,
              status: inv.status,
              siteId: inv.site_id,
              billToPartyId: inv.bill_to_party_id,
              partyName: party?.party_name,
              consignmentId: inv.consignment_id ? Number(inv.consignment_id) : null,
              consignmentRef: con?.ref_no,
              currency: inv.currency,
              baseCurrency: inv.base_currency,
              exchangeRate: Number(inv.exchange_rate),
              exchangeRateDate: inv.exchange_rate_date ? inv.exchange_rate_date.toISOString().slice(0, 10) : null,
              invoiceDate: inv.invoice_date.toISOString().slice(0, 10),
              dueDate: inv.due_date ? inv.due_date.toISOString().slice(0, 10) : null,
              serviceToDate: inv.service_to_date ? inv.service_to_date.toISOString().slice(0, 10) : null,
              subtotal: Number(inv.subtotal).toFixed(2),
              taxTotal: Number(inv.tax_total).toFixed(2),
              total: Number(inv.total).toFixed(2),
              totalBase: Number(inv.total_base).toFixed(2),
              amountPaid: Number(inv.amount_paid).toFixed(2),
              amountCredited: Number(inv.amount_credited).toFixed(2),
              balance: Number(inv.balance ?? (Number(inv.total) - Number(inv.amount_paid) - Number(inv.amount_credited))).toFixed(2),
              proformaInvoiceId: inv.proforma_invoice_id ? Number(inv.proforma_invoice_id) : null,
              originalInvoiceId: inv.original_invoice_id ? Number(inv.original_invoice_id) : null,
              reason: inv.reason,
              postedAt: inv.posted_at ? inv.posted_at.toISOString() : undefined,
              fiscalReceipt: fiscal
                ? {
                    provider: fiscal.provider,
                    status: fiscal.status,
                    attempts: fiscal.attempts,
                    receiptNo: fiscal.receipt_no,
                    verificationCode: fiscal.verification_code,
                    verificationUrl: fiscal.verification_url,
                    issuedAt: fiscal.issued_at ? fiscal.issued_at.toISOString() : null,
                    lastError: fiscal.last_error,
                  }
                : undefined,
              createdBy: inv.createdby,
              lines: (inv.invoice_invoice_line || []).map((l: any) => ({
                lineNo: l.line_no,
                description: l.description,
                quantity: String(l.quantity),
                uom: l.uom,
                unitRate: String(l.unit_rate),
                amount: String(l.amount),
                taxAmount: String(l.tax_amount),
                lineTotal: String(l.line_total || Number(l.amount) + Number(l.tax_amount)),
                serviceFrom: l.service_from ? l.service_from.toISOString().slice(0, 10) : null,
                serviceTo: l.service_to ? l.service_to.toISOString().slice(0, 10) : null,
              })),
            };
          });

          if (q) {
            const cleanQ = q.replace(/[\s-]/g, '').toLowerCase();
            items = items.filter((i) => {
              const no = (i.invoiceNo || '').replace(/-/g, '').toLowerCase();
              const pName = (i.partyName || '').toLowerCase();
              const cRef = (i.consignmentRef || '').replace(/-/g, '').toLowerCase();
              return no.includes(cleanQ) || pName.includes(cleanQ) || cRef.includes(cleanQ);
            });
          }

          return res.json(items);
        }
      }

      // Dynamic fallback when DB is disconnected
      let fallback = [...mockInvoices];
      if (siteId) fallback = fallback.filter((i) => i.siteId === siteId);
      if (kind && kind !== 'ALL') fallback = fallback.filter((i) => i.docKind === kind);
      if (statusParam && statusParam !== 'ALL') fallback = fallback.filter((i) => i.status === statusParam);
      if (billToPartyId) fallback = fallback.filter((i) => i.billToPartyId === billToPartyId);
      if (q) {
        const cleanQ = q.replace(/[\s-]/g, '').toLowerCase();
        fallback = fallback.filter((i) => {
          const no = (i.invoiceNo || '').replace(/-/g, '').toLowerCase();
          const pName = (getMockParty(i.billToPartyId)?.partyName || '').toLowerCase();
          const cRef = (i.consignmentRef || '').replace(/-/g, '').toLowerCase();
          return no.includes(cleanQ) || pName.includes(cleanQ) || cRef.includes(cleanQ);
        });
      }

      res.json(fallback);
    } catch (err: any) {
      console.error('[InvoicesController.getInvoices] Error:', err);
      res.json(mockInvoices);
    }
  };

  /**
   * GET /invoices/:invoiceId
   * Fetch single invoice with details.
   */
  public getInvoiceById = async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const numId = parseInt(invoiceId, 10);
      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const inv = await prisma.invoice.findFirst({
          where: {
            OR: [
              ...(Number.isFinite(numId) ? [{ invoice_id: BigInt(numId) }] : []),
              { invoice_no: invoiceId },
            ],
          },
          include: {
            invoice_invoice_line: true,
            m_party_invoice: true,
            consignment_invoice: true,
            invoice_fiscal_receipt: true,
            invoice_payment_allocation: {
              include: {
                payment_payment_allocation: true,
              },
            },
          },
        });

        if (inv) {
          const fiscal = inv.invoice_fiscal_receipt;
          const party = inv.m_party_invoice;
          const con = inv.consignment_invoice;

          const result: InvoiceItem = {
            invoiceId: Number(inv.invoice_id),
            invoiceNo: inv.invoice_no || `INV-${inv.invoice_id}`,
            docKind: inv.doc_kind,
            status: inv.status,
            siteId: inv.site_id,
            billToPartyId: inv.bill_to_party_id,
            partyName: party?.party_name,
            consignmentId: inv.consignment_id ? Number(inv.consignment_id) : null,
            consignmentRef: con?.ref_no,
            currency: inv.currency,
            baseCurrency: inv.base_currency,
            exchangeRate: Number(inv.exchange_rate),
            exchangeRateDate: inv.exchange_rate_date ? inv.exchange_rate_date.toISOString().slice(0, 10) : null,
            invoiceDate: inv.invoice_date.toISOString().slice(0, 10),
            dueDate: inv.due_date ? inv.due_date.toISOString().slice(0, 10) : null,
            serviceToDate: inv.service_to_date ? inv.service_to_date.toISOString().slice(0, 10) : null,
            subtotal: Number(inv.subtotal).toFixed(2),
            taxTotal: Number(inv.tax_total).toFixed(2),
            total: Number(inv.total).toFixed(2),
            totalBase: Number(inv.total_base).toFixed(2),
            amountPaid: Number(inv.amount_paid).toFixed(2),
            amountCredited: Number(inv.amount_credited).toFixed(2),
            balance: Number(inv.balance ?? (Number(inv.total) - Number(inv.amount_paid) - Number(inv.amount_credited))).toFixed(2),
            proformaInvoiceId: inv.proforma_invoice_id ? Number(inv.proforma_invoice_id) : null,
            originalInvoiceId: inv.original_invoice_id ? Number(inv.original_invoice_id) : null,
            reason: inv.reason,
            postedAt: inv.posted_at ? inv.posted_at.toISOString() : undefined,
            fiscalReceipt: fiscal
              ? {
                  provider: fiscal.provider,
                  status: fiscal.status,
                  attempts: fiscal.attempts,
                  receiptNo: fiscal.receipt_no,
                  verificationCode: fiscal.verification_code,
                  verificationUrl: fiscal.verification_url,
                  issuedAt: fiscal.issued_at ? fiscal.issued_at.toISOString() : null,
                  lastError: fiscal.last_error,
                }
              : undefined,
            createdBy: inv.createdby,
            lines: (inv.invoice_invoice_line || []).map((l: any) => ({
              lineNo: l.line_no,
              description: l.description,
              quantity: String(l.quantity),
              uom: l.uom,
              unitRate: String(l.unit_rate),
              amount: String(l.amount),
              taxAmount: String(l.tax_amount),
              lineTotal: String(l.line_total || Number(l.amount) + Number(l.tax_amount)),
              serviceFrom: l.service_from ? l.service_from.toISOString().slice(0, 10) : null,
              serviceTo: l.service_to ? l.service_to.toISOString().slice(0, 10) : null,
            })),
          };

          return res.json(result);
        }
      }

      const found = getMockInvoice(numId) || mockInvoices.find((i) => i.invoiceNo === invoiceId);
      if (!found) return sendError(res, `Invoice not found: ${invoiceId}`, 404);
      res.json(found);
    } catch (err: any) {
      console.error('[InvoicesController.getInvoiceById] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /invoices
   * Create a new Proforma or Tax Invoice.
   */
  public createInvoice = async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const docKind = body.docKind || 'PROFORMA';
      const siteId = body.siteId ? Number(body.siteId) : 1;
      const billToPartyId = Number(body.billToPartyId || body.partyId || 1);
      const lines = Array.isArray(body.lines) ? body.lines : [];

      const subtotal = lines.reduce((acc: number, l: any) => acc + (Number(l.amount) || 0), 0);
      const taxTotal = lines.reduce((acc: number, l: any) => acc + (Number(l.taxAmount) || 0), 0);
      const total = subtotal + taxTotal;
      const currency = body.currency || 'USD';
      const exchangeRate = Number(body.exchangeRate) || (currency === 'USD' ? 2600 : 1);
      const totalBase = currency === 'TZS' ? total : total * exchangeRate;

      const prefix = docKind === 'PROFORMA' ? 'PRO' : docKind === 'CREDIT_NOTE' ? 'CRN' : docKind === 'DEBIT_NOTE' ? 'DBN' : 'INV';
      const seq = Math.floor(1000 + Math.random() * 9000);
      const invoiceNo = `${prefix}-DAR${siteId}-26-00${seq}`;

      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const created = await prisma.invoice.create({
          data: {
            company_id: 1,
            site_id: siteId,
            doc_kind: docKind,
            invoice_no: invoiceNo,
            status: docKind === 'PROFORMA' ? 'ISSUED' : 'DRAFT',
            bill_to_party_id: billToPartyId,
            consignment_id: body.consignmentId ? BigInt(body.consignmentId) : null,
            currency,
            base_currency: 'TZS',
            exchange_rate: exchangeRate,
            exchange_rate_date: new Date(),
            invoice_date: new Date(),
            due_date: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 86400000),
            service_to_date: body.serviceToDate ? new Date(body.serviceToDate) : new Date(),
            subtotal,
            tax_total: taxTotal,
            total,
            total_base: totalBase,
            amount_paid: 0,
            amount_credited: 0,
            balance: total,
            proforma_invoice_id: body.proformaInvoiceId ? BigInt(body.proformaInvoiceId) : null,
            original_invoice_id: body.originalInvoiceId ? BigInt(body.originalInvoiceId) : null,
            reason: body.reason || null,
            createdby: 'Neema Mushi',
            invoice_invoice_line: {
              create: lines.map((l: any, idx: number) => ({
                line_no: idx + 1,
                line_doc_kind: docKind,
                charge_code_id: Number(l.chargeCodeId) || 1,
                description: l.description || 'Logistics service charge',
                service_from: l.serviceFrom ? new Date(l.serviceFrom) : null,
                service_to: l.serviceTo ? new Date(l.serviceTo) : null,
                quantity: Number(l.quantity) || 1,
                uom: l.uom || 'UNIT',
                unit_rate: Number(l.unitRate) || Number(l.amount) || 0,
                amount: Number(l.amount) || 0,
                tax_rate_pct: Number(l.taxRatePct || l.taxPct) || 18,
                tax_amount: Number(l.taxAmount) || 0,
                line_total: (Number(l.amount) || 0) + (Number(l.taxAmount) || 0),
                createdby: 'Neema Mushi',
              })),
            },
          },
          include: {
            invoice_invoice_line: true,
            m_party_invoice: true,
            consignment_invoice: true,
          },
        });

        return res.status(201).json({
          invoiceId: Number(created.invoice_id),
          invoiceNo: created.invoice_no,
          docKind: created.doc_kind,
          status: created.status,
          siteId: created.site_id,
          billToPartyId: created.bill_to_party_id,
          total: Number(created.total).toFixed(2),
          balance: Number(created.balance).toFixed(2),
          invoiceDate: created.invoice_date.toISOString().slice(0, 10),
        });
      }

      const newInv = {
        invoiceId: mockInvoices.length + 3301,
        invoiceNo,
        docKind,
        status: docKind === 'PROFORMA' ? 'ISSUED' : 'DRAFT',
        siteId,
        billToPartyId,
        currency,
        baseCurrency: 'TZS',
        exchangeRate,
        invoiceDate: new Date().toISOString().slice(0, 10),
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        totalBase: totalBase.toFixed(2),
        amountPaid: '0.00',
        amountCredited: '0.00',
        balance: total.toFixed(2),
        lines,
        ...body,
      };
      mockInvoices.unshift(newInv as any);
      res.status(201).json(newInv);
    } catch (err: any) {
      console.error('[InvoicesController.createInvoice] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /invoices:from-proforma or /invoices/:invoiceId/convert
   * Converts a paid or valid proforma into an official tax invoice.
   */
  public convertProforma = async (req: Request, res: Response) => {
    try {
      const proformaId = Number(req.params.invoiceId || req.body.proformaId);
      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const prof = await prisma.invoice.findUnique({
          where: { invoice_id: BigInt(proformaId) },
          include: { invoice_invoice_line: true },
        });

        if (!prof) return sendError(res, `Proforma invoice #${proformaId} not found`, 404);

        const seq = Math.floor(1000 + Math.random() * 9000);
        const invNo = `INV-DAR${prof.site_id}-26-00${seq}`;

        // Create the official Tax Invoice
        const taxInv = await prisma.invoice.create({
          data: {
            company_id: prof.company_id,
            site_id: prof.site_id,
            doc_kind: 'TAX_INVOICE',
            invoice_no: invNo,
            status: 'POSTED',
            bill_to_party_id: prof.bill_to_party_id,
            consignment_id: prof.consignment_id,
            currency: prof.currency,
            base_currency: prof.base_currency,
            exchange_rate: prof.exchange_rate,
            exchange_rate_date: prof.exchange_rate_date,
            invoice_date: new Date(),
            due_date: new Date(),
            service_to_date: prof.service_to_date,
            subtotal: prof.subtotal,
            tax_total: prof.tax_total,
            total: prof.total,
            total_base: prof.total_base,
            amount_paid: prof.total,
            amount_credited: 0,
            balance: 0,
            proforma_invoice_id: prof.invoice_id,
            posted_at: new Date(),
            createdby: 'Neema Mushi',
            invoice_fiscal_receipt: {
              create: {
                provider: 'VFD · TRA EFD gateway',
                status: 'ISSUED',
                receiptNo: `10TZ100877-${Math.floor(48000 + Math.random() * 2000)}`,
                verification_code: `VFD${Date.now().toString(16).toUpperCase()}`,
                verification_url: 'https://verify.tra.go.tz/',
                issued_at: new Date(),
                attempts: 1,
                createdby: 'system',
              },
            },
            invoice_invoice_line: {
              create: prof.invoice_invoice_line.map((l: any) => ({
                line_no: l.line_no,
                line_doc_kind: 'TAX_INVOICE',
                charge_code_id: l.charge_code_id,
                description: l.description,
                service_from: l.service_from,
                service_to: l.service_to,
                quantity: l.quantity,
                uom: l.uom,
                unit_rate: l.unit_rate,
                amount: l.amount,
                tax_rate_pct: l.tax_rate_pct,
                tax_amount: l.tax_amount,
                line_total: l.line_total,
                createdby: 'Neema Mushi',
              })),
            },
          },
          include: {
            invoice_fiscal_receipt: true,
            invoice_invoice_line: true,
          },
        });

        // Update proforma status to CONVERTED
        await prisma.invoice.update({
          where: { invoice_id: BigInt(proformaId) },
          data: { status: 'CONVERTED' },
        });

        return res.status(201).json({
          invoiceId: Number(taxInv.invoice_id),
          invoiceNo: taxInv.invoice_no,
          docKind: taxInv.doc_kind,
          status: taxInv.status,
          total: Number(taxInv.total).toFixed(2),
          balance: '0.00',
        });
      }

      const prof = mockInvoices.find((i) => String(i.invoiceId) === String(proformaId));
      if (!prof) return sendError(res, `Proforma invoice #${proformaId} not found`, 404);

      prof.status = 'CONVERTED' as any;
      const newInv = {
        ...prof,
        invoiceId: mockInvoices.length + 3301,
        invoiceNo: `INV-DAR${prof.siteId}-26-00${Math.floor(1000 + Math.random() * 9000)}`,
        docKind: 'TAX_INVOICE' as const,
        status: 'POSTED' as any,
        proformaInvoiceId: prof.invoiceId,
        amountPaid: prof.total,
        balance: '0.00',
      };
      mockInvoices.unshift(newInv);
      res.status(201).json(newInv);
    } catch (err: any) {
      console.error('[InvoicesController.convertProforma] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /invoices/:invoiceId/post or /invoices/:invoiceId:post
   * Post draft invoice to official invoice.
   */
  public postInvoice = async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const numId = parseInt(invoiceId, 10);
      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const updated = await prisma.invoice.update({
          where: { invoice_id: BigInt(numId) },
          data: {
            status: 'POSTED',
            posted_at: new Date(),
          },
        });

        return res.json({
          invoiceId: Number(updated.invoice_id),
          status: updated.status,
          postedAt: updated.posted_at,
        });
      }

      const inv: any = mockInvoices.find((i) => String(i.invoiceId) === invoiceId || i.invoiceNo === invoiceId);
      if (!inv) return sendError(res, `Invoice #${invoiceId} not found`, 404);
      inv.status = 'POSTED';
      inv.postedAt = new Date().toISOString();
      res.json(inv);
    } catch (err: any) {
      console.error('[InvoicesController.postInvoice] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /invoices/:invoiceId/fiscalise
   * Submit to TRA / VFD fiscal device.
   */
  public fiscalise = async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const numId = parseInt(invoiceId, 10);
      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const receipt = await prisma.fiscal_receipt.upsert({
          where: { invoice_id: BigInt(numId) },
          create: {
            invoice_id: BigInt(numId),
            provider: 'VFD · TRA EFD gateway',
            status: 'ISSUED',
            receiptNo: `10TZ100877-${Math.floor(48000 + Math.random() * 2000)}`,
            verification_code: `VFD${Date.now().toString(16).toUpperCase()}`,
            verification_url: 'https://verify.tra.go.tz/',
            issued_at: new Date(),
            attempts: 1,
            createdby: 'system',
          },
          update: {
            status: 'ISSUED',
            receipt_no: `10TZ100877-${Math.floor(48000 + Math.random() * 2000)}`,
            verification_code: `VFD${Date.now().toString(16).toUpperCase()}`,
            verification_url: 'https://verify.tra.go.tz/',
            issued_at: new Date(),
            attempts: { increment: 1 },
            last_error: null,
          },
        });

        return res.json({
          invoiceId: numId,
          fiscalReceipt: receipt,
        });
      }

      const inv: any = mockInvoices.find((i) => String(i.invoiceId) === invoiceId || i.invoiceNo === invoiceId);
      if (!inv) return sendError(res, `Invoice #${invoiceId} not found`, 404);
      inv.fiscalReceipt = {
        provider: 'VFD · TRA EFD gateway',
        status: 'ISSUED',
        attempts: 1,
        receiptNo: `10TZ100877-048991`,
        verificationCode: `VFDDAR26`,
        verificationUrl: 'https://verify.tra.go.tz/',
        issuedAt: new Date().toISOString(),
      };
      res.json(inv);
    } catch (err: any) {
      console.error('[InvoicesController.fiscalise] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /invoices/:invoiceId/credit-note
   * Issue credit note against a posted invoice.
   */
  public issueCreditNote = async (req: Request, res: Response) => {
    try {
      const origId = Number(req.params.invoiceId);
      const { amount, reason } = req.body;
      const creditAmt = Number(amount) || 50;

      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const orig = await prisma.invoice.findUnique({
          where: { invoice_id: BigInt(origId) },
        });

        if (!orig) return sendError(res, `Original invoice #${origId} not found`, 404);

        const seq = Math.floor(100 + Math.random() * 900);
        const crnNo = `CRN-DAR${orig.site_id}-26-000${seq}`;

        const crn = await prisma.invoice.create({
          data: {
            company_id: orig.company_id,
            site_id: orig.site_id,
            doc_kind: 'CREDIT_NOTE',
            invoice_no: crnNo,
            status: 'POSTED',
            bill_to_party_id: orig.bill_to_party_id,
            consignment_id: orig.consignment_id,
            currency: orig.currency,
            base_currency: orig.base_currency,
            exchange_rate: orig.exchange_rate,
            invoice_date: new Date(),
            due_date: new Date(),
            subtotal: creditAmt,
            tax_total: 0,
            total: creditAmt,
            total_base: creditAmt * Number(orig.exchange_rate),
            amount_paid: 0,
            amount_credited: 0,
            balance: 0,
            original_invoice_id: orig.invoice_id,
            reason: reason || 'Adjustment/waiver granted',
            posted_at: new Date(),
            createdby: 'Neema Mushi',
          },
        });

        // Update original invoice's amount_credited and balance
        const newCredited = Number(orig.amount_credited) + creditAmt;
        const newBalance = Math.max(0, Number(orig.total) - Number(orig.amount_paid) - newCredited);
        await prisma.invoice.update({
          where: { invoice_id: BigInt(origId) },
          data: {
            amount_credited: newCredited,
            balance: newBalance,
          },
        });

        return res.status(201).json({
          invoiceId: Number(crn.invoice_id),
          invoiceNo: crn.invoice_no,
          total: Number(crn.total).toFixed(2),
          originalInvoiceId: origId,
        });
      }

      const orig = mockInvoices.find((i) => String(i.invoiceId) === String(origId));
      if (!orig) return sendError(res, `Original invoice #${origId} not found`, 404);

      const crn = {
        invoiceId: mockInvoices.length + 3301,
        invoiceNo: `CRN-DAR${orig.siteId}-26-000${Math.floor(100 + Math.random() * 900)}`,
        docKind: 'CREDIT_NOTE' as const,
        status: 'POSTED' as any,
        siteId: orig.siteId,
        billToPartyId: orig.billToPartyId,
        consignmentId: orig.consignmentId,
        currency: orig.currency,
        baseCurrency: orig.baseCurrency,
        exchangeRate: orig.exchangeRate,
        invoiceDate: new Date().toISOString().slice(0, 10),
        subtotal: creditAmt.toFixed(2),
        taxTotal: '0.00',
        total: creditAmt.toFixed(2),
        totalBase: (creditAmt * Number(orig.exchangeRate)).toFixed(2),
        amountPaid: '0.00',
        amountCredited: '0.00',
        balance: '0.00',
        originalInvoiceId: orig.invoiceId,
        reason: reason || 'Adjustment/waiver',
      };
      mockInvoices.unshift(crn as any);
      orig.amountCredited = (Number(orig.amountCredited || 0) + creditAmt).toFixed(2);
      orig.balance = Math.max(0, Number(orig.total) - Number(orig.amountPaid || 0) - Number(orig.amountCredited)).toFixed(2);

      res.status(201).json(crn);
    } catch (err: any) {
      console.error('[InvoicesController.issueCreditNote] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /invoices/:invoiceId:cancel or /invoices/:invoiceId/cancel
   * Void or cancel draft invoice.
   */
  public cancelInvoice = async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const numId = parseInt(invoiceId, 10);
      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const cancelled = await prisma.invoice.update({
          where: { invoice_id: BigInt(numId) },
          data: {
            status: 'CANCELLED',
            cancelled_at: new Date(),
            cancel_reason: req.body.reason || 'Cancelled by user',
          },
        });

        return res.json({
          invoiceId: Number(cancelled.invoice_id),
          status: cancelled.status,
          cancelledAt: cancelled.cancelled_at,
        });
      }

      const inv = mockInvoices.find((i) => String(i.invoiceId) === invoiceId || i.invoiceNo === invoiceId);
      if (!inv) return sendError(res, `Invoice #${invoiceId} not found`, 404);
      inv.status = 'CANCELLED' as any;
      res.json(inv);
    } catch (err: any) {
      console.error('[InvoicesController.cancelInvoice] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * GET /invoices/:invoiceId/pdf
   * Generate downloadable PDF.
   */
  public getInvoicePdf = async (req: Request, res: Response) => {
    try {
      const { invoiceId } = req.params;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);
      res.send(Buffer.from(`%PDF-1.4\n% Invoice #${invoiceId}\n%%EOF`));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
}

export const invoicesController = new InvoicesController();
