import { Request, Response } from 'express';
import { getPrisma, isDbLive } from '../../db/prisma';
import { charges as mockCharges, openCharges as mockOpenCharges, CHARGE_NAMES } from '../../data/money';
import { allStays, consignment as getMockConsignment, party as getMockParty } from '../../data/core';

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

export interface ChargeItem {
  chargeId: number;
  key?: string;
  unitStayId?: number | null;
  unitNo?: string | null;
  unitCategory?: string;
  consignmentId?: number | null;
  consignmentRef?: string | null;
  billToPartyId: number;
  partyName?: string;
  chargeCode: string;
  chargeName: string;
  description: string;
  serviceFrom?: string | null;
  serviceTo?: string | null;
  quantity: string | number;
  uom: string;
  unitRate: string | number;
  amount: string | number;
  taxCode: string;
  taxPct: number;
  taxAmount: string | number;
  tariffCode?: string;
  tariffVersion?: number;
  ruleId?: number;
  how?: string | string[];
  kind: 'NORMAL' | 'MANUAL';
  status: 'OPEN' | 'WAIVER_PENDING' | 'WAIVED' | 'BILLED';
  ratedAt: string;
  waiverNote?: string | null;
}

export class ChargesController {
  /**
   * GET /charges
   * Fetch rated / unbilled charges (from DB when live, with dynamic fallback)
   */
  public getCharges = async (req: Request, res: Response) => {
    try {
      const siteId = req.query.siteId ? parseInt(String(req.query.siteId), 10) : undefined;
      const unitStayId = req.query.unitStayId ? parseInt(String(req.query.unitStayId), 10) : undefined;
      const consignmentId = req.query.consignmentId ? parseInt(String(req.query.consignmentId), 10) : undefined;
      const billToPartyId = req.query.billToPartyId ? parseInt(String(req.query.billToPartyId), 10) : undefined;
      const statusParam = req.query.status ? String(req.query.status).toUpperCase() : undefined;
      const q = req.query.q ? String(req.query.q).trim().toLowerCase() : undefined;

      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        const whereClause: any = {};
        if (statusParam) {
          whereClause.status = statusParam;
        }

        const dbCharges = await prisma.charge.findMany({
          where: whereClause,
          include: {
            billable_event_charge: {
              include: {
                m_charge_code_billable_event: true,
                consignment_billable_event: true,
                unit_stay_billable_event: {
                  include: {
                    unit_stay_cargo_units: true,
                  },
                },
              },
            },
            m_party_charge: true,
            m_tax_code_charge: true,
            tariff_charge: true,
            tariff_rule_charge: true,
            approval_request_charge: true,
          },
          orderBy: { charge_id: 'desc' },
        });

        if (dbCharges && dbCharges.length > 0) {
          let items: ChargeItem[] = dbCharges.map((c: any) => {
            const ev = c.billable_event_charge;
            const stay = ev?.unit_stay_billable_event;
            const con = ev?.consignment_billable_event;
            const party = c.m_party_charge;
            const tax = c.m_tax_code_charge;
            const code = ev?.m_charge_code_billable_event;

            const unitNo = stay?.unit_stay_cargo_units?.unit_no || null;
            const serviceFrom = ev?.service_date ? new Date(ev.service_date).toISOString().slice(0, 10) : null;
            const serviceTo = c.rated_at ? new Date(c.rated_at).toISOString().slice(0, 10) : serviceFrom;

            return {
              chargeId: Number(c.charge_id),
              key: `${stay?.unit_stay_id || 0}-${c.tariff_rule_id || 0}-${serviceFrom || 'c'}`,
              unitStayId: stay?.unit_stay_id ? Number(stay.unit_stay_id) : null,
              unitNo: unitNo,
              unitCategory: stay?.unit_stay_cargo_units?.unit_category || 'CONTAINER',
              consignmentId: con?.consignment_id ? Number(con.consignment_id) : (ev?.consignment_id ? Number(ev.consignment_id) : null),
              consignmentRef: con?.ref_no || null,
              billToPartyId: Number(c.bill_to_party_id),
              partyName: party?.party_name || `Party #${c.bill_to_party_id}`,
              chargeCode: code?.charge_code || 'STORAGE_IMPORT',
              chargeName: code?.charge_name || 'Import Storage',
              description: code?.charge_name || 'Dwell storage charge',
              serviceFrom: serviceFrom,
              serviceTo: serviceTo,
              quantity: c.quantity ? String(c.quantity) : '1',
              uom: ev?.uom || 'DAY',
              unitRate: c.unit_rate ? String(c.unit_rate) : '0.00',
              amount: c.amount ? String(c.amount) : '0.00',
              taxCode: tax?.tax_code || 'VAT18',
              taxPct: tax?.rate_pct ? Number(tax.rate_pct) : 18,
              taxAmount: c.tax_amount ? String(c.tax_amount) : '0.00',
              tariffCode: c.tariff_charge?.tariff_code || 'TRF-DAR1-STD',
              tariffVersion: c.tariff_charge?.version_no || 1,
              ruleId: c.tariff_rule_id ? Number(c.tariff_rule_id) : undefined,
              how: `${code?.charge_name || 'Charge'} rated by active tariff`,
              kind: c.charge_kind === 'MANUAL' ? 'MANUAL' : 'NORMAL',
              status: (c.status || 'OPEN') as any,
              ratedAt: c.rated_at ? new Date(c.rated_at).toISOString() : new Date().toISOString(),
              waiverNote: c.approval_request_charge?.reason || null,
            };
          });

          // In-memory filters if specified
          if (unitStayId) {
            items = items.filter((x) => x.unitStayId === unitStayId);
          }
          if (consignmentId) {
            items = items.filter((x) => x.consignmentId === consignmentId);
          }
          if (billToPartyId) {
            items = items.filter((x) => x.billToPartyId === billToPartyId);
          }
          if (q) {
            const query = q.toLowerCase();
            items = items.filter(
              (x) =>
                (x.unitNo && x.unitNo.toLowerCase().includes(query)) ||
                (x.consignmentRef && x.consignmentRef.toLowerCase().includes(query)) ||
                (x.partyName && x.partyName.toLowerCase().includes(query)) ||
                (x.chargeCode && x.chargeCode.toLowerCase().includes(query))
            );
          }

          if (req.query.format === 'array') {
            return res.json(items);
          }

          return res.json({
            items,
            total: items.length,
            nextCursor: null,
          });
        }
      }

      // Dynamic Fallback store when DB is in standby
      let rawFallback = siteId ? mockOpenCharges(siteId) : mockCharges;
      if (!rawFallback || rawFallback.length === 0) {
        rawFallback = mockCharges;
      }
      let fallbackItems: ChargeItem[] = rawFallback.map((c: any) => ({
        chargeId: c.chargeId,
        key: c.key || `chg-${c.chargeId}`,
        unitStayId: c.unitStayId || null,
        unitNo: c.unitNo || null,
        unitCategory: c.unitCategory || 'CONTAINER',
        consignmentId: c.consignmentId || null,
        consignmentRef: getMockConsignment(c.consignmentId)?.refNo || null,
        billToPartyId: c.billToPartyId,
        partyName: getMockParty(c.billToPartyId)?.partyName || `Party #${c.billToPartyId}`,
        chargeCode: c.chargeCode,
        chargeName: c.chargeName || c.chargeCode,
        description: c.description || c.chargeName || 'Charge item',
        serviceFrom: c.serviceFrom || null,
        serviceTo: c.serviceTo || null,
        quantity: String(c.quantity || 1),
        uom: c.uom || 'DAY',
        unitRate: String(c.unitRate || 0),
        amount: String(c.amount || 0),
        taxCode: c.taxCode || 'VAT18',
        taxPct: c.taxPct || 18,
        taxAmount: String(c.taxAmount || 0),
        tariffCode: c.tariffCode || 'TRF-DAR1-STD',
        tariffVersion: c.tariffVersion || 1,
        ruleId: c.ruleId,
        how: c.how,
        kind: c.kind || 'NORMAL',
        status: c.status || 'OPEN',
        ratedAt: c.ratedAt || new Date().toISOString(),
        waiverNote: c.waiverNote || null,
      }));

      if (statusParam) {
        fallbackItems = fallbackItems.filter((x) => x.status === statusParam);
      }
      if (unitStayId) {
        fallbackItems = fallbackItems.filter((x) => x.unitStayId === unitStayId);
      }
      if (billToPartyId) {
        fallbackItems = fallbackItems.filter((x) => x.billToPartyId === billToPartyId);
      }
      if (q) {
        const query = q.toLowerCase();
        fallbackItems = fallbackItems.filter(
          (x) =>
            (x.unitNo && x.unitNo.toLowerCase().includes(query)) ||
            (x.consignmentRef && x.consignmentRef.toLowerCase().includes(query)) ||
            (x.partyName && x.partyName.toLowerCase().includes(query)) ||
            (x.chargeCode && x.chargeCode.toLowerCase().includes(query))
        );
      }

      if (req.query.format === 'array') {
        return res.json(fallbackItems);
      }

      return res.json({
        items: fallbackItems,
        total: fallbackItems.length,
        nextCursor: null,
      });
    } catch (err: any) {
      console.error('[ChargesController.getCharges] Error:', err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * GET /charges/open
   * Fetch only unbilled/open charges
   */
  public getOpenCharges = async (req: Request, res: Response) => {
    (req.query as any).status = 'OPEN';
    return this.getCharges(req, res);
  };

  /**
   * POST /charges/:chargeId/waive & POST /charges/:chargeId:waive
   * Waive a specific charge
   */
  public waiveCharge = async (req: Request, res: Response) => {
    try {
      const chargeIdParam = parseInt(req.params.chargeId, 10);
      const { reason, percentage } = req.body;
      const prisma = getPrisma();

      if (isDbLive() && prisma && !isNaN(chargeIdParam)) {
        const existing = await prisma.charge.findUnique({
          where: { charge_id: BigInt(chargeIdParam) },
        });

        if (existing) {
          const updated = await prisma.charge.update({
            where: { charge_id: BigInt(chargeIdParam) },
            data: {
              status: 'WAIVED',
              updatedby: (req as any).userSub || 'system',
            },
          });

          return res.json({
            success: true,
            chargeId: Number(updated.charge_id),
            status: updated.status,
            reason: reason || 'Approved management waiver',
          });
        }
      }

      // Fallback in-memory update
      const found = mockCharges.find((c) => c.chargeId === chargeIdParam);
      if (found) {
        found.status = 'OPEN';
        found.waiverNote = reason || 'Waiver applied';
      }

      return res.json({
        success: true,
        chargeId: chargeIdParam,
        status: 'WAIVED',
        reason: reason || 'Waiver applied',
      });
    } catch (err: any) {
      console.error('[ChargesController.waiveCharge] Error:', err);
      return sendError(res, err.message, 500);
    }
  };

  /**
   * POST /charges/manual
   * Add a manual charge
   */
  public addManualCharge = async (req: Request, res: Response) => {
    try {
      const {
        billToPartyId,
        unitStayId,
        consignmentId,
        chargeCode,
        description,
        amount,
        quantity,
        unitRate,
        taxCode,
      } = req.body;

      const prisma = getPrisma();

      if (isDbLive() && prisma) {
        // 1. Find or create charge code
        let codeRec = await prisma.m_charge_code.findFirst({
          where: { charge_code: chargeCode || 'OTHER' },
        });
        if (!codeRec) {
          codeRec = await prisma.m_charge_code.findFirst();
        }

        // 2. Create billable event
        const event = await prisma.billable_event.create({
          data: {
            site_id: req.body.siteId ? Number(req.body.siteId) : 1,
            charge_code_id: codeRec?.charge_code_id || 1,
            dedupe_key: `MAN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            unit_stay_id: unitStayId ? BigInt(unitStayId) : null,
            consignment_id: consignmentId ? BigInt(consignmentId) : null,
            bill_to_party_id: billToPartyId ? Number(billToPartyId) : 1,
            source_entity: 'MANUAL',
            service_date: new Date(),
            occurred_at: new Date(),
            quantity: quantity ? Number(quantity) : 1,
            uom: 'UNIT',
            status: 'RATED',
            createdby: (req as any).userSub || 'system',
          },
        });

        // 3. Create charge
        const numAmount = Number(amount || 25.0);
        const taxRate = 18.0;
        const taxAmt = numAmount * (taxRate / 100);

        const newCharge = await prisma.charge.create({
          data: {
            billable_event_id: event.billable_event_id,
            bill_to_party_id: Number(billToPartyId || 1),
            currency: 'USD',
            quantity: quantity ? Number(quantity) : 1,
            unit_rate: unitRate ? Number(unitRate) : numAmount,
            amount: numAmount,
            tax_rate_pct: taxRate,
            tax_amount: taxAmt,
            charge_kind: 'MANUAL',
            status: 'MANUAL_PENDING',
            createdby: (req as any).userSub || 'system',
          },
        });

        const createdResult: ChargeItem = {
          chargeId: Number(newCharge.charge_id),
          key: `m-${Date.now()}-${chargeCode || 'WEIGHING'}`,
          unitStayId: unitStayId ? Number(unitStayId) : null,
          consignmentId: consignmentId ? Number(consignmentId) : null,
          consignmentRef: getMockConsignment(Number(consignmentId))?.refNo || null,
          billToPartyId: Number(billToPartyId || 1),
          partyName: getMockParty(Number(billToPartyId))?.partyName || `Party #${billToPartyId}`,
          chargeCode: chargeCode || 'WEIGHING',
          chargeName: CHARGE_NAMES[chargeCode] || 'Manual charge',
          description: description || `${CHARGE_NAMES[chargeCode] || 'Charge'} (manual)`,
          serviceFrom: req.body.serviceDate || new Date().toISOString().slice(0, 10),
          serviceTo: req.body.serviceDate || new Date().toISOString().slice(0, 10),
          quantity: String(quantity || 1),
          uom: 'visit',
          unitRate: String(unitRate || numAmount),
          amount: String(numAmount),
          taxCode: taxCode || 'VAT18',
          taxPct: taxRate,
          taxAmount: String(taxAmt.toFixed(2)),
          how: ['Manual charge requested for approval'],
          kind: 'MANUAL',
          status: 'MANUAL_PENDING' as any,
          ratedAt: new Date().toISOString(),
        };

        // Also add to in-memory fallback list so it appears everywhere immediately
        mockCharges.unshift(createdResult as any);

        return res.status(201).json({
          success: true,
          charge: createdResult,
          chargeId: Number(newCharge.charge_id),
          amount: Number(newCharge.amount),
          status: newCharge.status,
          message: 'Manual charge created successfully.',
        });
      }

      // Fallback
      const newId = 70250 + mockCharges.length;
      const numAmount = Number(amount || 25.0);
      const taxRate = 18.0;
      const taxAmt = numAmount * (taxRate / 100);

      const createdFallback: any = {
        chargeId: newId,
        key: `man-${newId}`,
        siteId: req.body.siteId ? Number(req.body.siteId) : 1,
        unitStayId: unitStayId ? Number(unitStayId) : null,
        consignmentId: consignmentId ? Number(consignmentId) : null,
        consignmentRef: getMockConsignment(Number(consignmentId))?.refNo || null,
        billToPartyId: Number(billToPartyId || 1),
        partyName: getMockParty(Number(billToPartyId))?.partyName || `Party #${billToPartyId}`,
        chargeCode: chargeCode || 'WEIGHING',
        chargeName: CHARGE_NAMES[chargeCode] || 'Manual charge',
        description: description || `${CHARGE_NAMES[chargeCode] || 'Charge'} (manual)`,
        serviceFrom: req.body.serviceDate || new Date().toISOString().slice(0, 10),
        serviceTo: req.body.serviceDate || new Date().toISOString().slice(0, 10),
        quantity: String(quantity || 1),
        uom: 'visit',
        unitRate: String(unitRate || numAmount),
        amount: String(numAmount),
        taxCode: taxCode || 'VAT18',
        taxPct: taxRate,
        taxAmount: String(taxAmt.toFixed(2)),
        how: ['Manual charge requested for approval'],
        kind: 'MANUAL',
        status: 'MANUAL_PENDING',
        ratedAt: new Date().toISOString(),
      };
      mockCharges.unshift(createdFallback);

      return res.status(201).json({
        success: true,
        charge: createdFallback,
        chargeId: newId,
        amount: Number(createdFallback.amount),
        status: 'MANUAL_PENDING',
      });
    } catch (err: any) {
      console.error('[ChargesController.addManualCharge] Error:', err);
      return sendError(res, err.message, 500);
    }
  };
}

export const chargesController = new ChargesController();

