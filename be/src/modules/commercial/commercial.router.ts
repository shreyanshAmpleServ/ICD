import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import {
  tariffs,
  charges,
  openCharges,
  invoices,
  channels,
  payments,
  shifts,
  refunds,
  disbursements,
  statement,
  glPostings,
  periods,
  rates,
  fx,
  rateStay,
  TODAY,
} from "../../data/money";
import {
  glSettings,
  taxCodes,
  chargeCodes,
  paymentChannels,
} from "../../data/admin";
import { allStays } from "../../data/core";
import { getPrisma, isDbLive } from "../../db/prisma";

const router = Router();

// In-memory exchange rates
let exchangeRates = [
  {
    exchangeRateId: 1,
    baseCurrency: "USD",
    quoteCurrency: "TZS",
    rate: 2650.0,
    effectiveFrom: "2026-10-01T00:00:00Z",
    isCurrent: true,
    logInst: 1,
  },
  {
    exchangeRateId: 2,
    baseCurrency: "EUR",
    quoteCurrency: "TZS",
    rate: 2880.0,
    effectiveFrom: "2026-10-01T00:00:00Z",
    isCurrent: true,
    logInst: 1,
  },
];

// In-memory credit notes & fiscal receipts
const creditNotes: any[] = [];
const fiscalReceipts: any[] = [
  {
    fiscalReceiptId: 1,
    invoiceId: 3318,
    invoiceNo: "INV-2026-003318",
    rctvCode: "VFD-TZ-2026-99120",
    verificationUrl: "https://verify.tra.go.tz/vfd/99120",
    status: "ISSUED",
    issuedAt: new Date().toISOString(),
  },
];

// In-memory billable events
const billableEvents: any[] = [
  {
    billableEventId: 1,
    unitStayId: 5001,
    eventType: "STORAGE_DAY",
    quantity: 3,
    uom: "DAY",
    rateUsd: 14.0,
    totalUsd: 42.0,
    status: "CHARGED",
  },
  {
    billableEventId: 2,
    unitStayId: 5001,
    eventType: "REEFER_ELECTRICITY",
    quantity: 24,
    uom: "HOUR",
    rateUsd: 2.5,
    totalUsd: 60.0,
    status: "CHARGED",
  },
];

// ------------------------------------------------------------------ 1. Finance Setup (Site-scoped)
router.get(
  "/accounting-periods",
  requireSite(false),
  requirePermission("finance.period.close"),
  (req, res) => {
    res.json({ items: periods, total: periods.length, nextCursor: null });
  },
);

router.post(
  "/accounting-periods/:accountingPeriodId([0-9a-zA-Z_.-]+):close",
  requireSite(false),
  requirePermission("finance.period.close", "DO"),
  (req, res) => {
    const p = (periods as any[]).find(
      (x) =>
        String(x.periodId) === req.params.accountingPeriodId ||
        x.periodCode === req.params.accountingPeriodId,
    );
    if (p) p.status = "CLOSED";
    res.json({ success: true, period: p });
  },
);

router.post(
  "/accounting-periods/:accountingPeriodId([0-9a-zA-Z_.-]+):reopen",
  requireSite(false),
  requirePermission("finance.period.close", "DO"),
  (req, res) => {
    const p = (periods as any[]).find(
      (x) =>
        String(x.periodId) === req.params.accountingPeriodId ||
        x.periodCode === req.params.accountingPeriodId,
    );
    if (p) p.status = "OPEN";
    res.json({ success: true, period: p });
  },
);

router.get(
  "/gl-settings",
  requireSite(false),
  requirePermission("finance.period.close"),
  (req, res) => {
    res.json(glSettings);
  },
);

router.put(
  "/gl-settings",
  requireSite(false),
  requirePermission("finance.period.close", "DO"),
  (req, res) => {
    Object.assign(glSettings, req.body);
    res.json(glSettings);
  },
);

router.get(
  "/exchange-rates",
  requireSite(false),
  requirePermission("billing.rates.view"),
  async (req, res) => {
    let items = exchangeRates as any[];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbRates = await prisma.exchange_rates.findMany({
            orderBy: { exchange_rate_id: "desc" },
          });

          if (dbRates && dbRates.length > 0) {
            const mapped = dbRates.map((r) => ({
              exchangeRateId: r.exchange_rate_id,
              baseCurrency: r.base_currency || "USD",
              quoteCurrency: r.quote_currency || "TZS",
              rate: String(Number(r.rate).toFixed(2)),
              rateDate: r.effective_date
                ? r.effective_date.toISOString().split("T")[0]
                : "2026-10-07",
              rateKind: "DAILY" as const,
              sourceNote: "Bank of Tanzania mean rate 09:00",
              enteredBy: "Neema Mushi",
              enteredAt:
                (r as any).created_at?.toISOString() ||
                new Date().toISOString(),
              effectiveFrom:
                r.effective_date?.toISOString() || new Date().toISOString(),
              isCurrent: r.is_current ?? true,
              usedBy: 14,
              logInst: 1,
            }));

            const dbPairs = new Set(
              mapped.map((m) => `${m.baseCurrency}_${m.quoteCurrency}`),
            );
            items = [
              ...mapped,
              ...exchangeRates.filter(
                (r) => !dbPairs.has(`${r.baseCurrency}_${r.quoteCurrency}`),
              ),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Exchange Rates API] DB query fallback:", err.message);
        }
      }
    }

    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/exchange-rates",
  requireSite(false),
  requirePermission("finance.exchange_rate.edit", "DO"),
  (req, res) => {
    const newRate = {
      exchangeRateId: exchangeRates.length + 1,
      baseCurrency: req.body.baseCurrency || "USD",
      quoteCurrency: req.body.quoteCurrency || "TZS",
      rate: Number(req.body.rate || 2650.0),
      effectiveFrom: req.body.effectiveFrom || new Date().toISOString(),
      isCurrent: true,
      logInst: 1,
      ...req.body,
    };
    exchangeRates.forEach((r) => {
      if (
        r.baseCurrency === newRate.baseCurrency &&
        r.quoteCurrency === newRate.quoteCurrency
      )
        r.isCurrent = false;
    });
    exchangeRates.push(newRate);
    res.status(201).json(newRate);
  },
);

router.get(
  "/exchange-rates/effective",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    const current = exchangeRates.filter((r) => r.isCurrent);
    res.json({ items: current, total: current.length, nextCursor: null });
  },
);

router.patch(
  "/exchange-rates/:exchangeRateId",
  requireSite(false),
  requirePermission("finance.exchange_rate.edit", "DO"),
  (req, res) => {
    const r = exchangeRates.find(
      (x) => String(x.exchangeRateId) === req.params.exchangeRateId,
    );
    if (!r) return res.status(404).json({ error: "Exchange rate not found" });
    Object.assign(r, req.body);
    res.json(r);
  },
);

router.get(
  "/tax-codes",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    res.json({ items: taxCodes, total: taxCodes.length, nextCursor: null });
  },
);

router.post(
  "/tax-codes",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const newTc = {
      taxCodeId: taxCodes.length + 1,
      taxCode: req.body.taxCode || `TAX_${taxCodes.length + 1}`,
      taxRatePct: req.body.taxRatePct || 18.0,
      description: req.body.description || "Standard VAT",
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    taxCodes.push(newTc as any);
    res.status(201).json(newTc);
  },
);

router.get(
  "/tax-codes/:taxCodeId",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    const tc = (taxCodes as any[]).find(
      (x) =>
        String(x.taxCodeId) === req.params.taxCodeId ||
        x.code === req.params.taxCodeId,
    );
    if (!tc) return res.status(404).json({ error: "Tax code not found" });
    res.json(tc);
  },
);

router.patch(
  "/tax-codes/:taxCodeId",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const tc = (taxCodes as any[]).find(
      (x) =>
        String(x.taxCodeId) === req.params.taxCodeId ||
        x.code === req.params.taxCodeId,
    );
    if (!tc) return res.status(404).json({ error: "Tax code not found" });
    Object.assign(tc, req.body);
    res.json(tc);
  },
);

router.get(
  "/charge-codes",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    res.json({
      items: chargeCodes,
      total: chargeCodes.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/charge-codes",
  requireSite(false),
  requirePermission("billing.tariff.change", "DO"),
  (req, res) => {
    const newCc = {
      chargeCodeId: chargeCodes.length + 1,
      chargeCode: req.body.chargeCode || `CC_${chargeCodes.length + 1}`,
      chargeName: req.body.chargeName || "Auxiliary Handling",
      chargeCategory: req.body.chargeCategory || "HANDLING",
      currency: "USD",
      taxCode: "VAT18",
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    chargeCodes.push(newCc as any);
    res.status(201).json(newCc);
  },
);

router.get(
  "/charge-codes/:chargeCodeId",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    const cc = (chargeCodes as any[]).find(
      (x) =>
        String(x.chargeCodeId) === req.params.chargeCodeId ||
        x.code === req.params.chargeCodeId,
    );
    if (!cc) return res.status(404).json({ error: "Charge code not found" });
    res.json(cc);
  },
);

router.patch(
  "/charge-codes/:chargeCodeId",
  requireSite(false),
  requirePermission("billing.tariff.change", "DO"),
  (req, res) => {
    const cc = (chargeCodes as any[]).find(
      (x) =>
        String(x.chargeCodeId) === req.params.chargeCodeId ||
        x.code === req.params.chargeCodeId,
    );
    if (!cc) return res.status(404).json({ error: "Charge code not found" });
    Object.assign(cc, req.body);
    res.json(cc);
  },
);

router.get(
  "/payment-channels",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    res.json({
      items: paymentChannels,
      total: paymentChannels.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/payment-channels",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const newCh = {
      paymentChannelId: paymentChannels.length + 1,
      channelCode: req.body.channelCode || `CH_${paymentChannels.length + 1}`,
      channelName: req.body.channelName || "Mobile Wallet",
      channelType: req.body.channelType || "MOBILE_MONEY",
      isActive: true,
      logInst: 1,
      ...req.body,
    };
    paymentChannels.push(newCh as any);
    res.status(201).json(newCh);
  },
);

router.get(
  "/payment-channels/:paymentChannelId",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    const ch = (paymentChannels as any[]).find(
      (x) =>
        String(x.paymentChannelId) === req.params.paymentChannelId ||
        x.code === req.params.paymentChannelId,
    );
    if (!ch)
      return res.status(404).json({ error: "Payment channel not found" });
    res.json(ch);
  },
);

router.patch(
  "/payment-channels/:paymentChannelId",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  (req, res) => {
    const ch = (paymentChannels as any[]).find(
      (x) =>
        String(x.paymentChannelId) === req.params.paymentChannelId ||
        x.code === req.params.paymentChannelId,
    );
    if (!ch)
      return res.status(404).json({ error: "Payment channel not found" });
    Object.assign(ch, req.body);
    res.json(ch);
  },
);

// ------------------------------------------------------------------ 2. Tariffs (Site-scoped)
router.get(
  "/tariffs",
  requireSite(false),
  requirePermission("billing.rates.view"),
  async (req, res) => {
    let items = tariffs as any[];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbTariffs = await prisma.tariffs.findMany({
            include: {
              tariff_rules: true,
            },
            orderBy: { tariff_id: "desc" },
          });

          if (dbTariffs && dbTariffs.length > 0) {
            const mapped = dbTariffs.map((t) => ({
              tariffId: t.tariff_id,
              tariffCode: t.tariff_code,
              tariffName: t.tariff_name,
              currency: "USD",
              versionNo: 1,
              status: t.is_active ? "ACTIVE" : "INACTIVE",
              effectiveFrom:
                t.valid_from?.toISOString() || new Date().toISOString(),
              rules: t.tariff_rules.map((r) => ({
                ruleId: r.tariff_rule_id,
                chargeCode: r.charge_code,
                chargeName: r.charge_code.replace(/_/g, " "),
                chargeCategory: "HANDLING",
                currency: r.currency || "USD",
                baseRate: Number(r.base_rate),
                calcBasis: r.calculation_basis || "FLAT",
                freeDays: r.free_days ?? 0,
              })),
              logInst: 1,
            }));

            const dbCodes = new Set(mapped.map((m) => m.tariffCode));
            items = [
              ...mapped,
              ...tariffs.filter((t) => !dbCodes.has(t.tariffCode)),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Tariffs API] DB query fallback:", err.message);
        }
      }
    }

    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/tariffs",
  requireSite(false),
  requirePermission("billing.tariff.change", "DO"),
  (req, res) => {
    const newT = {
      tariffId: tariffs.length + 1,
      tariffCode: req.body.tariffCode || `TAR-${tariffs.length + 1}`,
      tariffName: req.body.tariffName || "Standard ICD Tariff",
      currency: req.body.currency || "USD",
      versionNo: 1,
      status: "ACTIVE",
      effectiveFrom: new Date().toISOString(),
      rules: req.body.rules || [],
      logInst: 1,
      ...req.body,
    };
    tariffs.push(newT as any);
    res.status(201).json(newT);
  },
);

router.get(
  "/tariffs/:tariffId",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    const t = (tariffs as any[]).find(
      (x) =>
        String(x.tariffId) === req.params.tariffId ||
        x.tariffCode === req.params.tariffId,
    );
    if (!t) return res.status(404).json({ error: "Tariff not found" });
    res.json(t);
  },
);

router.patch(
  "/tariffs/:tariffId",
  requireSite(false),
  requirePermission("billing.tariff.change", "DO"),
  (req, res) => {
    const t = (tariffs as any[]).find(
      (x) =>
        String(x.tariffId) === req.params.tariffId ||
        x.tariffCode === req.params.tariffId,
    );
    if (!t) return res.status(404).json({ error: "Tariff not found" });
    Object.assign(t, req.body);
    res.json(t);
  },
);

router.get(
  "/tariffs/:tariffId/rules",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    const t = (tariffs as any[]).find(
      (x) =>
        String(x.tariffId) === req.params.tariffId ||
        x.tariffCode === req.params.tariffId,
    );
    res.json({
      items: t?.rules || [],
      total: (t?.rules || []).length,
      nextCursor: null,
    });
  },
);

router.put(
  "/tariffs/:tariffId/rules",
  requireSite(false),
  requirePermission("billing.tariff.change", "DO"),
  (req, res) => {
    const t = (tariffs as any[]).find(
      (x) =>
        String(x.tariffId) === req.params.tariffId ||
        x.tariffCode === req.params.tariffId,
    );
    if (!t) return res.status(404).json({ error: "Tariff not found" });
    t.rules = req.body;
    res.json({ success: true, rules: t.rules });
  },
);

router.post(
  "/tariffs/:tariffId([0-9a-zA-Z_.-]+):submit",
  requireSite(false),
  requirePermission("billing.tariff.change", "DO"),
  (req, res) => {
    const t = (tariffs as any[]).find(
      (x) => String(x.tariffId) === req.params.tariffId,
    );
    if (t) t.status = "PENDING_APPROVAL";
    res.json({ success: true, tariff: t });
  },
);

router.post(
  "/tariffs/:tariffId([0-9a-zA-Z_.-]+):new-version",
  requireSite(false),
  requirePermission("billing.tariff.change", "DO"),
  (req, res) => {
    const t = (tariffs as any[]).find(
      (x) => String(x.tariffId) === req.params.tariffId,
    );
    const version = {
      ...t,
      tariffId: tariffs.length + 1,
      versionNo: (t?.versionNo || 1) + 1,
      status: "DRAFT",
      createdFromId: t?.tariffId,
    };
    tariffs.push(version);
    res.status(201).json(version);
  },
);

router.post(
  "/rating/preview",
  requireSite(false),
  requirePermission("billing.rates.view"),
  (req, res) => {
    const unitStayId = req.body.unitStayId || 5001;
    const stay =
      allStays.find((s) => s.unitStayId === Number(unitStayId)) || allStays[0];
    const through = req.body.throughDate || TODAY;
    const rating = stay ? rateStay(stay, through) : [];
    res.json({
      lines: rating,
      total: rating.reduce(
        (acc: number, l: any) => acc + (l.amountUsd || 0),
        0,
      ),
    });
  },
);

// ------------------------------------------------------------------ 3. Charges (Site-scoped)
router.get(
  "/billable-events",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  (req, res) => {
    res.json({
      items: billableEvents,
      total: billableEvents.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/billable-events:manual",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  (req, res) => {
    const event = {
      billableEventId: billableEvents.length + 1,
      unitStayId: req.body.unitStayId || 5001,
      eventType: req.body.eventType || "MANUAL_CHARGE",
      quantity: req.body.quantity || 1,
      uom: req.body.uom || "EACH",
      rateUsd: req.body.rateUsd || 50.0,
      totalUsd: (req.body.quantity || 1) * (req.body.rateUsd || 50.0),
      status: "UNINVOICED",
      notes: req.body.notes || "Manually entered billable service",
      createdAt: new Date().toISOString(),
    };
    billableEvents.push(event);
    res.status(201).json(event);
  },
);

router.get(
  "/charges",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  async (req, res) => {
    const { unitStayId } = req.query;
    let items = charges as any[];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbCharges = await prisma.billable_charges.findMany({
            include: {
              parties: true,
              unit_stays: true,
              consignments: true,
            },
            orderBy: { charge_id: "desc" },
          });

          if (dbCharges && dbCharges.length > 0) {
            const mapped = dbCharges.map((c) => ({
              chargeId: c.charge_id,
              siteId: c.site_id,
              consignmentId: c.consignment_id,
              consignmentRef: c.consignments?.ref_no || "BL-DAR-2026-9901",
              unitStayId: c.unit_stay_id,
              unitNo: c.unit_stays?.unit_no || "MSKU 882014 9",
              chargeCode: c.charge_code,
              chargeName: c.charge_name,
              partyName: c.parties?.party_name || "Twiga Cement Ltd",
              amount: Number(c.amount),
              amountUsd: Number(c.amount),
              currency: c.currency || "USD",
              quantity: Number(c.quantity || 1),
              unitPrice: Number(c.unit_price),
              status: c.status || "UNBILLED",
              createdAt:
                c.created_at?.toISOString() || new Date().toISOString(),
            }));

            const dbIds = new Set(mapped.map((m) => m.chargeId));
            items = [
              ...mapped,
              ...charges.filter((c) => !dbIds.has(c.chargeId)),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Charges API] DB query fallback:", err.message);
        }
      }
    }

    if (unitStayId)
      items = items.filter((c) => String(c.unitStayId) === String(unitStayId));
    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/charges/:chargeId([0-9a-zA-Z_.-]+):waive",
  requireSite(false),
  requirePermission("billing.waiver", "DO"),
  (req, res) => {
    const c = (charges as any[]).find(
      (x) => String(x.chargeId) === req.params.chargeId,
    );
    if (c) {
      c.status = "WAIVED";
      c.waivedReason = req.body.reason || "Management waiver";
      c.waivedBy = req.user?.username || "OPS_MANAGER";
    }
    res.json({ success: true, charge: c });
  },
);

router.post(
  "/free-day-extensions",
  requireSite(false),
  requirePermission("billing.freeday.extend", "DO"),
  (req, res) => {
    res.status(201).json({
      unitStayId: req.body.unitStayId,
      extendedDays: req.body.days || 3,
      newFreeUntil: new Date(
        Date.now() + (req.body.days || 3) * 86400000,
      ).toISOString(),
      approvedBy: req.user?.username || "OPS_MANAGER",
      reason: req.body.reason || "Port congestion waiver",
    });
  },
);

// ------------------------------------------------------------------ 4. Invoicing (Site-scoped)
router.post(
  "/proformas",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  (req, res) => {
    const newProf = {
      invoiceId: invoices.length + 3301,
      invoiceNo: `PROF-2026-00${invoices.length + 3301}`,
      docKind: "PROFORMA",
      partyName: req.body.partyName || "Bollore Transport",
      currency: req.body.currency || "USD",
      subtotal: req.body.amount || 450.0,
      taxAmount: (req.body.amount || 450.0) * 0.18,
      totalAmount: (req.body.amount || 450.0) * 1.18,
      status: "ISSUED",
      createdAt: new Date().toISOString(),
      lines: req.body.lines || [],
      logInst: 1,
      ...req.body,
    };
    invoices.push(newProf as any);
    res.status(201).json(newProf);
  },
);

router.get(
  "/invoices",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  async (req, res) => {
    const { status, partyId } = req.query;
    let items = invoices as any[];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbInvoices = await prisma.invoices.findMany({
            include: {
              parties: true,
              consignments: true,
              invoice_lines: true,
            },
            orderBy: { invoice_id: "desc" },
          });

          if (dbInvoices && dbInvoices.length > 0) {
            const mapped = dbInvoices.map((i) => ({
              invoiceId: i.invoice_id,
              invoiceNo: i.invoice_no,
              docKind: "TAX_INVOICE" as const,
              siteId: 1,
              billToPartyId: i.bill_to_party_id || 201,
              partyId: i.bill_to_party_id || 201,
              partyName: i.parties?.party_name || "Twiga Cement Ltd",
              consignmentRef: i.consignments?.ref_no || "BL-DAR-2026-9901",
              invoiceDate: i.created_at
                ? i.created_at.toISOString().split("T")[0]
                : "2026-10-07",
              exchangeRate: "2650.00",
              exchangeRateDate: "2026-10-07",
              currency: i.currency || "USD",
              subtotal: String(i.subtotal),
              taxTotal: String(i.tax_amount || 0),
              total: String(i.total_amount),
              totalBase: String(Math.round(Number(i.total_amount) * 2650)),
              amountPaid: "0.00",
              amountCredited: "0.00",
              balance: String(i.total_amount),
              status: (i.status || "ISSUED") as any,
              glStatus: "POSTED" as const,
              createdBy: "Neema Mushi",
              createdAt:
                i.created_at?.toISOString() || new Date().toISOString(),
              dueDate: new Date(Date.now() + 14 * 86400000)
                .toISOString()
                .split("T")[0],
              lines: (i.invoice_lines || []).map((l) => ({
                invoiceLineId: l.invoice_line_id,
                lineNo: l.line_no,
                description: l.description,
                quantity: String(l.quantity || 1),
                unitRate: String(l.unit_price),
                amount: String(l.amount),
                taxAmount: String((Number(l.amount) * 0.18).toFixed(2)),
                lineTotal: String((Number(l.amount) * 1.18).toFixed(2)),
                taxCode: "VAT18",
                taxRatePct: "18",
                uom: "UNIT",
              })),
              logInst: 1,
            }));

            const dbNos = new Set(mapped.map((m) => m.invoiceNo));
            items = [
              ...mapped,
              ...invoices.filter((i) => !dbNos.has(i.invoiceNo)),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Invoices API] DB query fallback:", err.message);
        }
      }
    }

    if (status) items = items.filter((i) => i.status === status);
    if (partyId)
      items = items.filter((i) => String(i.partyId) === String(partyId));
    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/invoices",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  (req, res) => {
    const newInv = {
      invoiceId: invoices.length + 3301,
      invoiceNo: `INV-2026-00${invoices.length + 3301}`,
      docKind: "TAX_INVOICE",
      partyName: req.body.partyName || "Customer",
      currency: req.body.currency || "USD",
      subtotal: req.body.amount || 620.0,
      taxAmount: (req.body.amount || 620.0) * 0.18,
      totalAmount: (req.body.amount || 620.0) * 1.18,
      status: "ISSUED",
      createdAt: new Date().toISOString(),
      lines: req.body.lines || [],
      logInst: 1,
      ...req.body,
    };
    invoices.push(newInv as any);
    res.status(201).json(newInv);
  },
);

router.post(
  "/invoices:from-proforma",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  (req, res) => {
    const prof = (invoices as any[]).find(
      (i) => String(i.invoiceId) === String(req.body.proformaId),
    );
    const newInv = {
      ...prof,
      invoiceId: invoices.length + 3301,
      invoiceNo: `INV-2026-00${invoices.length + 3301}`,
      docKind: "TAX_INVOICE",
      status: "ISSUED",
      convertedFromProformaId: req.body.proformaId,
      createdAt: new Date().toISOString(),
    };
    invoices.push(newInv);
    res.status(201).json(newInv);
  },
);

router.get(
  "/invoices/:invoiceId",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  (req, res) => {
    const inv = (invoices as any[]).find(
      (i) =>
        String(i.invoiceId) === req.params.invoiceId ||
        i.invoiceNo === req.params.invoiceId,
    );
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    res.json(inv);
  },
);

router.patch(
  "/invoices/:invoiceId",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  (req, res) => {
    const inv = (invoices as any[]).find(
      (i) => String(i.invoiceId) === req.params.invoiceId,
    );
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    Object.assign(inv, req.body);
    res.json(inv);
  },
);

router.post(
  "/invoices/:invoiceId([0-9a-zA-Z_.-]+):post",
  requireSite(false),
  requirePermission("billing.invoice.post", "DO"),
  (req, res) => {
    const inv = (invoices as any[]).find(
      (i) => String(i.invoiceId) === req.params.invoiceId,
    );
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    inv.status = "POSTED";
    inv.postedAt = new Date().toISOString();
    res.json({ success: true, invoice: inv });
  },
);

router.post(
  "/invoices/:invoiceId([0-9a-zA-Z_.-]+):cancel",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  (req, res) => {
    const inv = (invoices as any[]).find(
      (i) => String(i.invoiceId) === req.params.invoiceId,
    );
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    inv.status = "CANCELLED";
    res.json({ success: true, invoice: inv });
  },
);

router.get(
  "/invoices/:invoiceId/pdf",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  (req, res) => {
    res.json({
      invoiceId: req.params.invoiceId,
      pdfUrl: `/api/documents/invoice-${req.params.invoiceId}.pdf`,
      contentBase64: "JVBERi0xLjQKJcTl8uXr...",
    });
  },
);

router.post(
  "/credit-notes",
  requireSite(false),
  requirePermission("billing.creditnote", "DO"),
  (req, res) => {
    const cn = {
      creditNoteId: creditNotes.length + 1,
      creditNoteNo: `CN-2026-${String(Date.now()).slice(-5)}`,
      invoiceId: req.body.invoiceId,
      amountUsd: req.body.amountUsd || 100.0,
      reason: req.body.reason || "Overbilling adjustment",
      status: "ISSUED",
      issuedAt: new Date().toISOString(),
    };
    creditNotes.push(cn);
    res.status(201).json(cn);
  },
);

router.post(
  "/debit-notes",
  requireSite(false),
  requirePermission("billing.invoice.post", "DO"),
  (req, res) => {
    res.status(201).json({
      debitNoteId: Date.now(),
      debitNoteNo: `DN-2026-${String(Date.now()).slice(-5)}`,
      invoiceId: req.body.invoiceId,
      amountUsd: req.body.amountUsd || 50.0,
      issuedAt: new Date().toISOString(),
    });
  },
);

router.get(
  "/fiscal-receipts",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  (req, res) => {
    res.json({
      items: fiscalReceipts,
      total: fiscalReceipts.length,
      nextCursor: null,
    });
  },
);

router.post(
  "/fiscal-receipts/:fiscalReceiptId([0-9a-zA-Z_.-]+):retry",
  requireSite(false),
  requirePermission("billing.invoice.post", "DO"),
  (req, res) => {
    const rcpt = fiscalReceipts.find(
      (r) => String(r.fiscalReceiptId) === req.params.fiscalReceiptId,
    );
    if (rcpt) rcpt.status = "ISSUED";
    res.json({ success: true, fiscalReceipt: rcpt });
  },
);

// ------------------------------------------------------------------ 5. Cashier (Site-scoped)
router.get(
  "/cashier-shifts",
  requireSite(false),
  requirePermission("payment.record"),
  async (req, res) => {
    let items = shifts as any[];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbShifts = await prisma.cashier_shifts.findMany({
            include: { users: true },
            orderBy: { cashier_shift_id: "desc" },
          });

          if (dbShifts && dbShifts.length > 0) {
            const mapped = dbShifts.map((s) => ({
              cashierShiftId: s.cashier_shift_id,
              shiftNo: `SH-2026-${String(s.cashier_shift_id).padStart(4, "0")}`,
              cashierName: s.users?.user_name || "Ashok Kumar",
              status: s.status || "OPEN",
              openingFloatTzs: Number(s.opening_balance || 500000),
              openedAt: s.opened_at?.toISOString() || new Date().toISOString(),
              closedAt: s.closed_at?.toISOString(),
              totalCollectedTzs: 165.2 * 2650,
              logInst: 1,
            }));

            const dbIds = new Set(mapped.map((m) => m.cashierShiftId));
            items = [
              ...mapped,
              ...shifts.filter((s) => !dbIds.has(s.cashierShiftId)),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Cashier Shifts API] DB query fallback:", err.message);
        }
      }
    }

    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/cashier-shifts",
  requireSite(false),
  requirePermission("payment.record", "DO"),
  (req, res) => {
    const newShift = {
      cashierShiftId: shifts.length + 1,
      shiftNo: `SH-2026-${String(shifts.length + 1).padStart(4, "0")}`,
      cashierName: req.user?.username || "Mary T.",
      status: "OPEN",
      openingFloatTzs: req.body.openingFloatTzs || 250000,
      openedAt: new Date().toISOString(),
      totalCollectedTzs: 0,
      logInst: 1,
      ...req.body,
    };
    shifts.push(newShift as any);
    res.status(201).json(newShift);
  },
);

router.get(
  "/cashier-shifts/current",
  requireSite(false),
  requirePermission("payment.record"),
  (req, res) => {
    const cur = (shifts as any[]).find((s) => s.status === "OPEN") || shifts[0];
    res.json(cur);
  },
);

router.post(
  "/cashier-shifts/:cashierShiftId([0-9a-zA-Z_.-]+):close",
  requireSite(false),
  requirePermission("payment.record", "DO"),
  (req, res) => {
    const s = (shifts as any[]).find(
      (x) => String(x.cashierShiftId) === req.params.cashierShiftId,
    );
    if (s) {
      s.status = "CLOSED";
      s.closedAt = new Date().toISOString();
    }
    res.json({ success: true, shift: s });
  },
);

router.post(
  "/cashier-shifts/:cashierShiftId([0-9a-zA-Z_.-]+):approve",
  requireSite(false),
  requirePermission("payment.cashup.approve", "DO"),
  (req, res) => {
    const s = (shifts as any[]).find(
      (x) => String(x.cashierShiftId) === req.params.cashierShiftId,
    );
    if (s) {
      s.status = "APPROVED";
      s.approvedBy = req.user?.username || "Finance Manager";
    }
    res.json({ success: true, shift: s });
  },
);

router.get(
  "/payments",
  requireSite(false),
  requirePermission("payment.record"),
  async (req, res) => {
    let items = payments as any[];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbPayments = await prisma.payments.findMany({
            include: { parties: true },
            orderBy: { payment_id: "desc" },
          });

          if (dbPayments && dbPayments.length > 0) {
            const mapped = dbPayments.map((p) => ({
              paymentId: p.payment_id,
              paymentRef: p.payment_ref,
              partyName: p.parties?.party_name || "Twiga Cement Ltd",
              method: p.payment_channel || "BANK_TRANSFER",
              currency: p.currency || "USD",
              amount: Number(p.amount),
              referenceNo: p.payment_ref,
              status: p.status || "COMPLETED",
              paidAt: p.paid_at?.toISOString() || new Date().toISOString(),
              cashierName: "Ashok Kumar",
              logInst: 1,
            }));

            const dbRefs = new Set(mapped.map((m) => m.paymentRef));
            items = [
              ...mapped,
              ...payments.filter(
                (p) =>
                  !dbRefs.has((p as any).paymentRef || (p as any).receiptNo),
              ),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Payments API] DB query fallback:", err.message);
        }
      }
    }

    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/payments",
  requireSite(false),
  requirePermission("payment.record", "DO"),
  (req, res) => {
    const newPay = {
      paymentId: payments.length + 55001,
      paymentRef: `RCT-2026-${String(Date.now()).slice(-6)}`,
      invoiceId: req.body.invoiceId || 3318,
      partyName: req.body.partyName || "Customer",
      method: req.body.method || "MPESA",
      currency: req.body.currency || "TZS",
      amount: req.body.amount || 1180000,
      referenceNo: req.body.referenceNo || `REF-${Date.now()}`,
      status: "COMPLETED",
      paidAt: new Date().toISOString(),
      cashierName: req.user?.username || "Mary T.",
      logInst: 1,
      ...req.body,
    };
    payments.push(newPay as any);
    res.status(201).json(newPay);
  },
);

router.get(
  "/payments/:paymentId",
  requireSite(false),
  requirePermission("payment.record"),
  (req, res) => {
    const p = (payments as any[]).find(
      (x) =>
        String(x.paymentId) === req.params.paymentId ||
        x.paymentRef === req.params.paymentId,
    );
    if (!p) return res.status(404).json({ error: "Payment record not found" });
    res.json(p);
  },
);

router.post(
  "/payments/:paymentId([0-9a-zA-Z_.-]+):allocate",
  requireSite(false),
  requirePermission("payment.record", "DO"),
  (req, res) => {
    const p = (payments as any[]).find(
      (x) => String(x.paymentId) === req.params.paymentId,
    );
    if (p) p.allocatedInvoiceId = req.body.invoiceId;
    res.json({ success: true, payment: p });
  },
);

router.post(
  "/payments/:paymentId([0-9a-zA-Z_.-]+):reverse",
  requireSite(false),
  requirePermission("payment.refund", "DO"),
  (req, res) => {
    const p = (payments as any[]).find(
      (x) => String(x.paymentId) === req.params.paymentId,
    );
    if (p) {
      p.status = "REVERSED";
      p.reversedReason = req.body.reason || "Customer request";
    }
    res.json({ success: true, payment: p });
  },
);

router.get(
  "/payments/:paymentId/receipt",
  requireSite(false),
  requirePermission("payment.record"),
  (req, res) => {
    const p = (payments as any[]).find(
      (x) => String(x.paymentId) === req.params.paymentId,
    );
    res.json({
      paymentId: p?.paymentId || req.params.paymentId,
      receiptNo: p?.paymentRef || "RCT-2026-004472",
      amount: p?.amount || 1180000,
      currency: p?.currency || "TZS",
      receiptHtml: `<html><body><h1>Cashier Receipt ${p?.paymentRef}</h1></body></html>`,
    });
  },
);

router.get(
  "/refunds",
  requireSite(false),
  requirePermission("payment.refund"),
  async (req, res) => {
    let items = refunds as any[];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbRefunds = await prisma.refunds.findMany({
            include: {
              invoices: {
                include: { parties: true },
              },
              payments: true,
            },
            orderBy: { refund_id: "desc" },
          });

          if (dbRefunds && dbRefunds.length > 0) {
            const mapped = dbRefunds.map((r) => ({
              refundId: r.refund_id,
              refundNo: `RFD-DAR1-26-0000${r.refund_id}`,
              invoiceId: r.invoice_id,
              invoiceNo: r.invoices?.invoice_no || `INV-2026-00${r.invoice_id}`,
              partyId: r.invoices?.bill_to_party_id || 201,
              partyName: r.invoices?.parties?.party_name || "Twiga Cement Ltd",
              amount: Number(r.refund_amount),
              currency: "USD",
              reason: "Excess demurrage deposit refund",
              status: r.status || "APPROVED",
              requestedBy: "Neema Mushi",
              requestedAt:
                r.created_at?.toISOString() || new Date().toISOString(),
              method: "Bank transfer CRDB",
              levels: [],
            }));

            const dbIds = new Set(mapped.map((m) => m.refundId));
            items = [
              ...mapped,
              ...refunds.filter((r) => !dbIds.has(r.refundId)),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Refunds API] DB query fallback:", err.message);
        }
      }
    }

    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/refunds",
  requireSite(false),
  requirePermission("payment.refund", "DO"),
  (req, res) => {
    const newRef = {
      refundId: refunds.length + 1,
      invoiceId: req.body.invoiceId,
      partyName: req.body.partyName || "Customer",
      amount: req.body.amount || 250.0,
      currency: "USD",
      reason: req.body.reason || "Overpayment refund",
      status: "PENDING",
      requestedAt: new Date().toISOString(),
      ...req.body,
    };
    refunds.push(newRef as any);
    res.status(201).json(newRef);
  },
);

router.post(
  "/refunds/:refundId([0-9a-zA-Z_.-]+):mark-paid",
  requireSite(false),
  requirePermission("payment.refund", "DO"),
  (req, res) => {
    const r = (refunds as any[]).find(
      (x) => String(x.refundId) === req.params.refundId,
    );
    if (r) {
      r.status = "PAID";
      r.paidAt = new Date().toISOString();
    }
    res.json({ success: true, refund: r });
  },
);

// ------------------------------------------------------------------ 6. Disbursements (Site-scoped)
router.get(
  "/disbursements",
  requireSite(false),
  requirePermission("finance.disbursement.record"),
  async (req, res) => {
    let items = disbursements as any[];

    if (isDbLive()) {
      const prisma = getPrisma();
      if (prisma) {
        try {
          const dbDisbs = await prisma.disbursements.findMany({
            include: { parties: true },
            orderBy: { disbursement_id: "desc" },
          });

          if (dbDisbs && dbDisbs.length > 0) {
            const mapped = dbDisbs.map((d) => ({
              disbursementId: d.disbursement_id,
              consignmentId: 101,
              authority: d.parties?.party_name || "Bollore Logistics",
              description: "Terminal port wharfage fee paid on customer behalf",
              amountUsd: Number(d.amount),
              receiptRef: `DISB-RCPT-2026-00${d.disbursement_id}`,
              status: d.status || "BILLED",
              paidAt: d.created_at?.toISOString() || new Date().toISOString(),
            }));

            const dbIds = new Set(mapped.map((m) => m.disbursementId));
            items = [
              ...mapped,
              ...disbursements.filter((d) => !dbIds.has(d.disbursementId)),
            ] as any;
          }
        } catch (err: any) {
          console.warn("[Disbursements API] DB query fallback:", err.message);
        }
      }
    }

    res.json({ items, total: items.length, nextCursor: null });
  },
);

router.post(
  "/disbursements",
  requireSite(false),
  requirePermission("finance.disbursement.record", "DO"),
  (req, res) => {
    const newD = {
      disbursementId: disbursements.length + 1,
      consignmentId: req.body.consignmentId || 101,
      authority: req.body.authority || "TPA",
      description:
        req.body.description || "Port wharfage fee paid on customer behalf",
      amountUsd: req.body.amountUsd || 320.0,
      receiptRef: req.body.receiptRef || "TPA-RCPT-2026-99",
      status: "BILLED",
      paidAt: new Date().toISOString(),
      ...req.body,
    };
    disbursements.push(newD as any);
    res.status(201).json(newD);
  },
);

router.get(
  "/disbursements/:disbursementId",
  requireSite(false),
  requirePermission("finance.disbursement.record"),
  (req, res) => {
    const d = (disbursements as any[]).find(
      (x) => String(x.disbursementId) === req.params.disbursementId,
    );
    if (!d) return res.status(404).json({ error: "Disbursement not found" });
    res.json(d);
  },
);

router.post(
  "/disbursements/:disbursementId([0-9a-zA-Z_.-]+):write-off",
  requireSite(false),
  requirePermission("finance.disbursement.record", "DO"),
  (req, res) => {
    const d = (disbursements as any[]).find(
      (x) => String(x.disbursementId) === req.params.disbursementId,
    );
    if (d) d.status = "WRITTEN_OFF";
    res.json({ success: true, disbursement: d });
  },
);

// ------------------------------------------------------------------ 7. Accounting & Statements (Site-scoped)
router.get(
  ["/gl-postings", "/ledger/entries"],
  requireSite(false),
  requirePermission("finance.period.close"),
  (req, res) => {
    res.json({ items: glPostings, total: glPostings.length, nextCursor: null });
  },
);

router.post(
  "/gl-postings/:glPostingId([0-9a-zA-Z_.-]+):retry",
  requireSite(false),
  requirePermission("finance.period.close", "DO"),
  (req, res) => {
    const p = (glPostings as any[]).find(
      (x) => String(x.glPostingId) === req.params.glPostingId,
    );
    if (p) p.status = "POSTED";
    res.json({ success: true, glPosting: p });
  },
);

router.get(
  "/statements/:partyId",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  (req, res) => {
    const st = statement(Number(req.params.partyId || 1));
    res.json(st);
  },
);

router.get(
  "/statements/:partyId/pdf",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  (req, res) => {
    res.json({
      partyId: req.params.partyId,
      pdfUrl: `/api/statements/party-${req.params.partyId}.pdf`,
      contentBase64: "JVBERi0xLjQKJcTl8uXr...",
    });
  },
);

export const commercialRouter = router;
