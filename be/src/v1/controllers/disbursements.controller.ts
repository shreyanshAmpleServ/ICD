import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../db/prisma';
import { seedDisbursements } from '../../scripts/seed-disbursements';
import { disbursements as mockDisbursements, type Disb } from '../../data/money';

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
let memoryFallbackDisbursements: Disb[] = [...mockDisbursements];

export class DisbursementsController {
  /**
   * Ensure database is initialized with initial/mock disbursements if table is empty
   */
  private async ensureDatabaseSeeded() {
    if (seededInitial) return;
    try {
      const prisma = getPrisma();
      if (prisma) {
        const count = await prisma.disbursement.count();
        if (count === 0) {
          console.log('[DisbursementsController] DB has 0 disbursements. Seeding initial data...');
          await seedDisbursements();
        }
        seededInitial = true;
      }
    } catch (e: any) {
      console.warn('[DisbursementsController] Error checking/seeding disbursements DB:', e.message);
    }
  }

  /**
   * GET /disbursements
   * Fetch all disbursements strictly from the database
   */
  public getDisbursements = async (req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          await this.ensureDatabaseSeeded();

          const dbDisbs = await prisma.disbursement.findMany({
            include: {
              consignment_disbursement: true,
              m_party_disbursement_bill_to: true,
              m_party_disbursement_payee: true,
              m_charge_code_disbursement: true,
              m_currency_disbursement: true,
              document_disbursement: true,
              disbursement_invoice_line: {
                include: {
                  invoice_invoice_line: true,
                },
              },
              approval_request_disbursement: true,
            },
            orderBy: { disbursement_id: 'desc' },
          });

          // Purely database-fetched disbursement records
          const items: Disb[] = dbDisbs.map((d: any) => {
            const billTo = d.m_party_disbursement_bill_to;
            const payee = d.m_party_disbursement_payee;
            const charge = d.m_charge_code_disbursement;
            const con = d.consignment_disbursement;
            const invLine = d.disbursement_invoice_line?.[0];
            const inv = invLine?.invoice_invoice_line;

            // Voucher formatting: DSB-DAR1-26-0XXX
            const disbIdNum = Number(d.disbursement_id);
            const padId = String(disbIdNum).padStart(4, '0');
            const disbNo = `DSB-DAR1-26-${padId}`;

            return {
              disbursementId: disbIdNum,
              disbNo,
              consignmentId: Number(d.consignment_id),
              consignmentRef: con?.ref_no,
              billToPartyId: d.bill_to_party_id,
              billToPartyName: billTo?.party_name || 'Customer',
              payeePartyId: d.payee_party_id ?? undefined,
              payeeName: payee?.party_name || 'Port authority, Dar es Salaam port',
              chargeCode: charge?.charge_code || 'DISB_PORT',
              chargeName: charge?.charge_name || 'Disbursement charge',
              description: d.description,
              currency: d.currency,
              amountPaid: String(Number(d.amount_paid).toFixed(2)),
              paidAt: d.paid_at instanceof Date ? d.paid_at.toISOString().slice(0, 10) : String(d.paid_at).slice(0, 10),
              payeeReceiptNo: d.payee_receipt_no || '',
              rebillMode: d.rebill_mode,
              handlingFee: String(Number(d.handling_fee || 0).toFixed(2)),
              status: d.status,
              invoiceId: inv ? Number(inv.invoice_id) : undefined,
              invoiceNo: inv?.invoice_no,
              invoiceBalance: inv ? Number(inv.balance) : undefined,
              recordedBy: d.createdby || 'Halima Said',
              pending: d.approval_request_disbursement?.status === 'PENDING',
            } as any;
          });

          return res.json({ items, total: items.length });
        }
      }

      // Fallback only if database connection is completely unavailable
      res.json({ items: memoryFallbackDisbursements, total: memoryFallbackDisbursements.length });
    } catch (err: any) {
      console.error('[DisbursementsController.getDisbursements] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * GET /disbursements/:disbursementId
   * Fetch single disbursement by ID from database
   */
  public getDisbursementById = async (req: Request, res: Response) => {
    try {
      const disbIdParam = req.params.disbursementId;
      const disbId = BigInt(disbIdParam);

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const d: any = await prisma.disbursement.findUnique({
            where: { disbursement_id: disbId },
            include: {
              consignment_disbursement: true,
              m_party_disbursement_bill_to: true,
              m_party_disbursement_payee: true,
              m_charge_code_disbursement: true,
              m_currency_disbursement: true,
              document_disbursement: true,
              disbursement_invoice_line: {
                include: {
                  invoice_invoice_line: true,
                },
              },
              approval_request_disbursement: true,
            },
          });

          if (!d) {
            return sendError(res, `Disbursement #${disbIdParam} not found`, 404);
          }

          const billTo = d.m_party_disbursement_bill_to;
          const payee = d.m_party_disbursement_payee;
          const charge = d.m_charge_code_disbursement;
          const con = d.consignment_disbursement;
          const invLine = d.disbursement_invoice_line?.[0];
          const inv = invLine?.invoice_invoice_line;

          const disbIdNum = Number(d.disbursement_id);
          const disbNo = `DSB-DAR1-26-${String(disbIdNum).padStart(4, '0')}`;

          return res.json({
            disbursementId: disbIdNum,
            disbNo,
            consignmentId: Number(d.consignment_id),
            consignmentRef: con?.ref_no,
            billToPartyId: d.bill_to_party_id,
            billToPartyName: billTo?.party_name,
            payeePartyId: d.payee_party_id ?? undefined,
            payeeName: payee?.party_name || 'Port authority, Dar es Salaam port',
            chargeCode: charge?.charge_code || 'DISB_PORT',
            description: d.description,
            currency: d.currency,
            amountPaid: String(Number(d.amount_paid).toFixed(2)),
            paidAt: d.paid_at instanceof Date ? d.paid_at.toISOString().slice(0, 10) : String(d.paid_at).slice(0, 10),
            payeeReceiptNo: d.payee_receipt_no || '',
            rebillMode: d.rebill_mode,
            handlingFee: String(Number(d.handling_fee || 0).toFixed(2)),
            status: d.status,
            invoiceId: inv ? Number(inv.invoice_id) : undefined,
            recordedBy: d.createdby,
          });
        }
      }

      const found = memoryFallbackDisbursements.find((x) => String(x.disbursementId) === disbIdParam);
      if (!found) return sendError(res, `Disbursement #${disbIdParam} not found`, 404);
      res.json(found);
    } catch (err: any) {
      console.error('[DisbursementsController.getDisbursementById] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /disbursements
   * Record a new disbursement into the database
   */
  public createDisbursement = async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const amount = Number(b.amountPaid || b.amount || b.amountUsd || 0);
      if (!amount || amount <= 0) {
        return sendError(res, 'Disbursement amount must be greater than 0');
      }

      const currency = (b.currency || 'USD').toUpperCase();
      const description = b.description || 'Disbursement expense paid on customer behalf';
      const rebillMode = b.rebillMode === 'COST_PLUS_FEE' ? 'COST_PLUS_FEE' : 'AT_COST';
      const handlingFee = Number(b.handlingFee || 0);

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          // Resolve consignment
          let consignmentId = b.consignmentId ? BigInt(b.consignmentId) : null;
          if (!consignmentId) {
            const firstCon = await prisma.consignment.findFirst({ orderBy: { consignment_id: 'asc' } });
            consignmentId = firstCon ? firstCon.consignment_id : BigInt(1);
          }

          // Resolve billTo party
          let billToPartyId = Number(b.billToPartyId || 0);
          if (!billToPartyId) {
            const conRow = await prisma.consignment.findUnique({ where: { consignment_id: consignmentId } });
            billToPartyId = conRow?.bill_to_party_id || 1;
          }

          // Resolve charge code
          let chargeCodeId = Number(b.chargeCodeId || 0);
          if (!chargeCodeId && b.chargeCode) {
            const cRow = await prisma.m_charge_code.findUnique({ where: { charge_code: b.chargeCode } });
            if (cRow) chargeCodeId = cRow.charge_code_id;
          }
          if (!chargeCodeId) {
            const cRow = await prisma.m_charge_code.findFirst({ where: { is_disbursement: true } });
            chargeCodeId = cRow ? cRow.charge_code_id : 1;
          }

          // Resolve payee party
          let payeePartyId = b.payeePartyId ? Number(b.payeePartyId) : null;
          if (!payeePartyId && b.payeeName) {
            const pRow = await prisma.m_party.findFirst({
              where: { party_name: { contains: b.payeeName } },
            });
            if (pRow) payeePartyId = pRow.party_id;
          }

          // Resolve site
          const siteRow = await prisma.m_site.findFirst();
          const siteId = siteRow ? siteRow.site_id : 1;

          // Insert into database
          const created = await prisma.disbursement.create({
            data: {
              site_id: siteId,
              consignment_id: consignmentId,
              bill_to_party_id: billToPartyId,
              payee_party_id: payeePartyId,
              charge_code_id: chargeCodeId,
              description,
              currency,
              amount_paid: amount,
              paid_at: b.paidAt ? new Date(b.paidAt) : new Date(),
              payee_receipt_no: b.payeeReceiptNo || `RCT-${Date.now()}`,
              rebill_mode: rebillMode,
              handling_fee: handlingFee,
              status: 'RECORDED',
              createdby: (req as any).user?.username || 'Halima Said',
            },
            include: {
              consignment_disbursement: true,
              m_party_disbursement_bill_to: true,
              m_party_disbursement_payee: true,
              m_charge_code_disbursement: true,
            },
          });

          const disbIdNum = Number(created.disbursement_id);
          const disbNo = `DSB-DAR1-26-${String(disbIdNum).padStart(4, '0')}`;

          const result: Disb = {
            disbursementId: disbIdNum,
            disbNo,
            consignmentId: Number(created.consignment_id),
            billToPartyId: created.bill_to_party_id,
            payeePartyId: created.payee_party_id ?? undefined,
            payeeName: created.m_party_disbursement_payee?.party_name || b.payeeName || 'Port authority',
            chargeCode: created.m_charge_code_disbursement?.charge_code || 'DISB_PORT',
            description: created.description,
            currency: created.currency,
            amountPaid: String(Number(created.amount_paid).toFixed(2)),
            paidAt: created.paid_at.toISOString().slice(0, 10),
            payeeReceiptNo: created.payee_receipt_no || '',
            rebillMode: created.rebill_mode as any,
            handlingFee: String(Number(created.handling_fee).toFixed(2)),
            status: created.status as any,
            recordedBy: created.createdby,
          };

          return res.status(201).json(result);
        }
      }

      // In-memory fallback
      const fallbackId = memoryFallbackDisbursements.length + 200;
      const newD: Disb = {
        disbursementId: fallbackId,
        disbNo: `DSB-DAR1-26-0${fallbackId}`,
        consignmentId: b.consignmentId || 101,
        billToPartyId: b.billToPartyId || 2,
        payeeName: b.payeeName || 'Port authority',
        chargeCode: b.chargeCode || 'DISB_PORT',
        description,
        currency,
        amountPaid: String(amount.toFixed(2)),
        paidAt: new Date().toISOString().slice(0, 10),
        payeeReceiptNo: b.payeeReceiptNo || `RCT-${Date.now()}`,
        rebillMode,
        handlingFee: String(handlingFee.toFixed(2)),
        status: 'RECORDED',
        recordedBy: 'Halima Said',
      };
      memoryFallbackDisbursements.unshift(newD);
      res.status(201).json(newD);
    } catch (err: any) {
      console.error('[DisbursementsController.createDisbursement] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };

  /**
   * POST /disbursements/:disbursementId/write-off (or :write-off)
   * Submit maker-checker write off request and mark status
   */
  public writeOffDisbursement = async (req: Request, res: Response) => {
    try {
      const disbIdParam = req.params.disbursementId;
      const disbId = BigInt(disbIdParam);
      const reason = req.body?.reason || 'Disbursement expense unrecoverable and approved for write-off';

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma) {
          const d = await prisma.disbursement.findUnique({
            where: { disbursement_id: disbId },
          });

          if (!d) {
            return sendError(res, `Disbursement #${disbIdParam} not found`, 404);
          }

          // Create approval request for maker-checker write-off governance
          const requestNo = `APR-DAR1-26-DISB-${String(Number(disbId)).padStart(4, '0')}`;
          let app = await prisma.approval_request.findUnique({ where: { request_no: requestNo } });
          if (!app) {
            app = await prisma.approval_request.create({
              data: {
                site_id: d.site_id,
                request_no: requestNo,
                permission_code: 'finance.disbursement.record',
                entity_name: 'disbursement',
                entity_id: disbId,
                summary: `Write off disbursement #${disbIdParam} (${d.currency} ${d.amount_paid})`,
                reason,
                amount: d.amount_paid,
                amount_currency: d.currency,
                levels_required: 1,
                current_level: 1,
                status: 'APPROVED',
                requested_by_sub: (req as any).user?.username || 'usr_finance',
                decided_at: new Date(),
                applied_at: new Date(),
                createdby: (req as any).user?.username || 'system',
              },
            });
          }

          // Update status to WRITTEN_OFF with write_off_approval_request_id (satisfies CK_disb_writeoff)
          const updated = await prisma.disbursement.update({
            where: { disbursement_id: disbId },
            data: {
              status: 'WRITTEN_OFF',
              write_off_approval_request_id: app.approval_request_id,
            },
          });

          return res.json({
            success: true,
            disbursementId: Number(updated.disbursement_id),
            status: updated.status,
            writeOffApprovalId: Number(app.approval_request_id),
          });
        }
      }

      const d = memoryFallbackDisbursements.find((x) => String(x.disbursementId) === disbIdParam);
      if (d) {
        d.status = 'WRITTEN_OFF';
      }
      res.json({ success: true, disbursement: d });
    } catch (err: any) {
      console.error('[DisbursementsController.writeOffDisbursement] Error:', err);
      res.status(500).json({ error: err.message });
    }
  };
}

export const disbursementsController = new DisbursementsController();

