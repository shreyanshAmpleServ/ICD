import { chargesController, invoicesController, cashierController, billingControllers } from '../../v1/controllers';
const { billingRefundsController } = billingControllers;
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
          const dbRates = await (prisma as any).m_exchange_rate.findMany({
            orderBy: { exchange_rate_id: "desc" },
          });

          if (dbRates && dbRates.length > 0) {
            const mapped = dbRates.map((r: any) => ({
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
              mapped.map((m: any) => `${m.baseCurrency}_${m.quoteCurrency}`),
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
          const dbTariffs = await (prisma as any).tariff.findMany({
            include: {
              tariff_rules: true,
            },
            orderBy: { tariff_id: "desc" },
          });

          if (dbTariffs && dbTariffs.length > 0) {
            const mapped = dbTariffs.map((t: any) => ({
              tariffId: t.tariff_id,
              tariffCode: t.tariff_code,
              tariffName: t.tariff_name,
              currency: "USD",
              versionNo: 1,
              status: t.is_active ? "ACTIVE" : "INACTIVE",
              effectiveFrom:
                t.valid_from?.toISOString() || new Date().toISOString(),
              rules: t.tariff_rules.map((r: any) => ({
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

            const dbCodes = new Set(mapped.map((m: any) => m.tariffCode));
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
  chargesController.getCharges
);

router.post(
  "/charges/:chargeId([0-9a-zA-Z_.-]+):waive",
  requireSite(false),
  requirePermission("billing.waiver", "DO"),
  chargesController.waiveCharge
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
  invoicesController.getInvoices
);

router.post(
  "/invoices",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  invoicesController.createInvoice
);

router.post(
  "/invoices:from-proforma",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  invoicesController.convertProforma
);

router.get(
  "/invoices/:invoiceId",
  requireSite(false),
  invoicesController.getInvoiceById
);

router.patch(
  "/invoices/:invoiceId",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  invoicesController.postInvoice
);

router.post(
  "/invoices/:invoiceId([0-9a-zA-Z_.-]+):post",
  requireSite(false),
  requirePermission("billing.invoice.post", "DO"),
  invoicesController.postInvoice
);

router.post(
  "/invoices/:invoiceId([0-9a-zA-Z_.-]+):cancel",
  requireSite(false),
  requirePermission("billing.invoice.create", "DO"),
  invoicesController.cancelInvoice
);

router.get(
  "/invoices/:invoiceId/pdf",
  requireSite(false),
  invoicesController.getInvoicePdf
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
router.get("/cashier-shifts", requireSite(false), cashierController.getShifts);
router.post("/cashier-shifts", requireSite(false), cashierController.openShift);
router.get("/cashier-shifts/current", requireSite(false), cashierController.getCurrentShift);
router.post("/cashier-shifts/:shiftId([0-9a-zA-Z_.-]+):close", requireSite(false), cashierController.closeShift);
router.post("/cashier-shifts/:shiftId([0-9a-zA-Z_.-]+):approve", requireSite(false), cashierController.approveShift);

router.get("/payments", requireSite(false), cashierController.getPayments);
router.post("/payments", requireSite(false), cashierController.recordPayment);
router.get("/payments/:paymentId", requireSite(false), cashierController.getPaymentById);
router.post("/payments/:paymentId([0-9a-zA-Z_.-]+):allocate", requireSite(false), cashierController.allocatePayment);
router.post("/payments/:paymentId([0-9a-zA-Z_.-]+):reverse", requireSite(false), cashierController.reversePayment);
router.get("/payments/:paymentId/receipt", requireSite(false), cashierController.getPaymentReceipt);

router.get("/refunds", requireSite(false), billingRefundsController.getRefunds);
router.post("/refunds", requireSite(false), billingRefundsController.createRefund);
router.post("/refunds/:refundId/decide", requireSite(false), billingRefundsController.decideRefund);
router.post("/refunds/:refundId([0-9a-zA-Z_.-]+):decide", requireSite(false), billingRefundsController.decideRefund);
router.post("/refunds/:refundId/mark-paid", requireSite(false), billingRefundsController.markPaid);
router.post("/refunds/:refundId([0-9a-zA-Z_.-]+):mark-paid", requireSite(false), billingRefundsController.markPaid);

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
          const dbDisbs = await (prisma as any).disbursement.findMany({
            include: { parties: true },
            orderBy: { disbursement_id: "desc" },
          });

          if (dbDisbs && dbDisbs.length > 0) {
            const mapped = dbDisbs.map((d: any) => ({
              disbursementId: d.disbursement_id,
              consignmentId: 101,
              authority: d.parties?.party_name || "Bollore Logistics",
              description: "Terminal port wharfage fee paid on customer behalf",
              amountUsd: Number(d.amount),
              receiptRef: `DISB-RCPT-2026-00${d.disbursement_id}`,
              status: d.status || "BILLED",
              paidAt: d.created_at?.toISOString() || new Date().toISOString(),
            }));

            const dbIds = new Set(mapped.map((m: any) => m.disbursementId));
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
  (req, res) => {
    const st = statement(Number(req.params.partyId || 1));
    res.json(st);
  },
);

router.get(
  "/statements/:partyId/pdf",
  requireSite(false),
  (req, res) => {
    res.json({
      partyId: req.params.partyId,
      pdfUrl: `/api/statements/party-${req.params.partyId}.pdf`,
      contentBase64: "JVBERi0xLjQKJcTl8uXr...",
    });
  },
);

export const commercialRouter = router;
