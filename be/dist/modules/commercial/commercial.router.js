"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commercialRouter = void 0;
const controllers_1 = require("../../v1/controllers");
const { billingRefundsController, billingDisbursementsController, billingStatementsController } = controllers_1.billingControllers;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const money_1 = require("../../data/money");
const admin_1 = require("../../data/admin");
const core_1 = require("../../data/core");
const router = (0, express_1.Router)();
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
const creditNotes = [];
const fiscalReceipts = [
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
const billableEvents = [
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
router.get("/accounting-periods", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.period.close"), controllers_1.ledgerController.getPeriods);
router.post(["/accounting-periods/:accountingPeriodId([0-9a-zA-Z_.-]+):close", "/accounting-periods/:accountingPeriodId([0-9a-zA-Z_.-]+)/close"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.period.close", "DO"), controllers_1.ledgerController.closePeriod);
router.post(["/accounting-periods/:accountingPeriodId([0-9a-zA-Z_.-]+):reopen", "/accounting-periods/:accountingPeriodId([0-9a-zA-Z_.-]+)/reopen"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.period.close", "DO"), controllers_1.ledgerController.reopenPeriod);
router.get("/gl-settings", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.period.close"), (req, res) => {
    res.json(admin_1.glSettings);
});
router.put("/gl-settings", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.period.close", "DO"), (req, res) => {
    Object.assign(admin_1.glSettings, req.body);
    res.json(admin_1.glSettings);
});
router.get("/exchange-rates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), controllers_1.exchangeRatesController.getExchangeRates);
router.post("/exchange-rates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.exchange_rate.edit", "DO"), controllers_1.exchangeRatesController.createExchangeRate);
router.get("/exchange-rates/effective", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), controllers_1.exchangeRatesController.getEffectiveRate);
router.patch("/exchange-rates/:exchangeRateId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.exchange_rate.edit", "DO"), controllers_1.exchangeRatesController.updateExchangeRate);
router.get("/tax-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), (req, res) => {
    res.json({ items: admin_1.taxCodes, total: admin_1.taxCodes.length, nextCursor: null });
});
router.post("/tax-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newTc = {
        taxCodeId: admin_1.taxCodes.length + 1,
        taxCode: req.body.taxCode || `TAX_${admin_1.taxCodes.length + 1}`,
        taxRatePct: req.body.taxRatePct || 18.0,
        description: req.body.description || "Standard VAT",
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.taxCodes.push(newTc);
    res.status(201).json(newTc);
});
router.get("/tax-codes/:taxCodeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), (req, res) => {
    const tc = admin_1.taxCodes.find((x) => String(x.taxCodeId) === req.params.taxCodeId ||
        x.code === req.params.taxCodeId);
    if (!tc)
        return res.status(404).json({ error: "Tax code not found" });
    res.json(tc);
});
router.patch("/tax-codes/:taxCodeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const tc = admin_1.taxCodes.find((x) => String(x.taxCodeId) === req.params.taxCodeId ||
        x.code === req.params.taxCodeId);
    if (!tc)
        return res.status(404).json({ error: "Tax code not found" });
    Object.assign(tc, req.body);
    res.json(tc);
});
router.get("/charge-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), (req, res) => {
    res.json({
        items: admin_1.chargeCodes,
        total: admin_1.chargeCodes.length,
        nextCursor: null,
    });
});
router.post("/charge-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.tariff.change", "DO"), (req, res) => {
    const newCc = {
        chargeCodeId: admin_1.chargeCodes.length + 1,
        chargeCode: req.body.chargeCode || `CC_${admin_1.chargeCodes.length + 1}`,
        chargeName: req.body.chargeName || "Auxiliary Handling",
        chargeCategory: req.body.chargeCategory || "HANDLING",
        currency: "USD",
        taxCode: "VAT18",
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.chargeCodes.push(newCc);
    res.status(201).json(newCc);
});
router.get("/charge-codes/:chargeCodeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), (req, res) => {
    const cc = admin_1.chargeCodes.find((x) => String(x.chargeCodeId) === req.params.chargeCodeId ||
        x.code === req.params.chargeCodeId);
    if (!cc)
        return res.status(404).json({ error: "Charge code not found" });
    res.json(cc);
});
router.patch("/charge-codes/:chargeCodeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.tariff.change", "DO"), (req, res) => {
    const cc = admin_1.chargeCodes.find((x) => String(x.chargeCodeId) === req.params.chargeCodeId ||
        x.code === req.params.chargeCodeId);
    if (!cc)
        return res.status(404).json({ error: "Charge code not found" });
    Object.assign(cc, req.body);
    res.json(cc);
});
router.get("/payment-channels", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), (req, res) => {
    res.json({
        items: admin_1.paymentChannels,
        total: admin_1.paymentChannels.length,
        nextCursor: null,
    });
});
router.post("/payment-channels", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const newCh = {
        paymentChannelId: admin_1.paymentChannels.length + 1,
        channelCode: req.body.channelCode || `CH_${admin_1.paymentChannels.length + 1}`,
        channelName: req.body.channelName || "Mobile Wallet",
        channelType: req.body.channelType || "MOBILE_MONEY",
        isActive: true,
        logInst: 1,
        ...req.body,
    };
    admin_1.paymentChannels.push(newCh);
    res.status(201).json(newCh);
});
router.get("/payment-channels/:paymentChannelId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), (req, res) => {
    const ch = admin_1.paymentChannels.find((x) => String(x.paymentChannelId) === req.params.paymentChannelId ||
        x.code === req.params.paymentChannelId);
    if (!ch)
        return res.status(404).json({ error: "Payment channel not found" });
    res.json(ch);
});
router.patch("/payment-channels/:paymentChannelId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
    const ch = admin_1.paymentChannels.find((x) => String(x.paymentChannelId) === req.params.paymentChannelId ||
        x.code === req.params.paymentChannelId);
    if (!ch)
        return res.status(404).json({ error: "Payment channel not found" });
    Object.assign(ch, req.body);
    res.json(ch);
});
// ------------------------------------------------------------------ 2. Tariffs (Site-scoped)
router.get("/tariffs", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), controllers_1.tariffsController.getTariffs);
router.post("/tariffs", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.tariff.change", "DO"), controllers_1.tariffsController.createTariff);
router.get("/tariffs/:tariffId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), controllers_1.tariffsController.getTariffById);
router.patch("/tariffs/:tariffId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.tariff.change", "DO"), controllers_1.tariffsController.updateTariff);
router.get("/tariffs/:tariffId/rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), controllers_1.tariffsController.getTariffRules);
router.post("/tariffs/:tariffId([0-9a-zA-Z_.-]+):submit", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.tariff.change", "DO"), controllers_1.tariffsController.submitTariff);
router.post("/tariffs/:tariffId([0-9a-zA-Z_.-]+):new-version", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.tariff.change", "DO"), controllers_1.tariffsController.newVersion);
router.post("/rating/preview", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.rates.view"), (req, res) => {
    const unitStayId = req.body.unitStayId || 5001;
    const stay = core_1.allStays.find((s) => s.unitStayId === Number(unitStayId)) || core_1.allStays[0];
    const through = req.body.throughDate || money_1.TODAY;
    const rating = stay ? (0, money_1.rateStay)(stay, through) : [];
    res.json({
        lines: rating,
        total: rating.reduce((acc, l) => acc + (l.amountUsd || 0), 0),
    });
});
// ------------------------------------------------------------------ 3. Charges (Site-scoped)
router.get("/billable-events", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.json({
        items: billableEvents,
        total: billableEvents.length,
        nextCursor: null,
    });
});
router.post("/billable-events:manual", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.create", "DO"), (req, res) => {
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
});
router.get("/charges", (0, siteScope_1.requireSite)(false), controllers_1.chargesController.getCharges);
router.post("/charges/:chargeId([0-9a-zA-Z_.-]+):waive", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.waiver", "DO"), controllers_1.chargesController.waiveCharge);
router.post("/free-day-extensions", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.freeday.extend", "DO"), (req, res) => {
    res.status(201).json({
        unitStayId: req.body.unitStayId,
        extendedDays: req.body.days || 3,
        newFreeUntil: new Date(Date.now() + (req.body.days || 3) * 86400000).toISOString(),
        approvedBy: req.user?.username || "OPS_MANAGER",
        reason: req.body.reason || "Port congestion waiver",
    });
});
// ------------------------------------------------------------------ 4. Invoicing (Site-scoped)
router.post("/proformas", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.create", "DO"), (req, res) => {
    const newProf = {
        invoiceId: money_1.invoices.length + 3301,
        invoiceNo: `PROF-2026-00${money_1.invoices.length + 3301}`,
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
    money_1.invoices.push(newProf);
    res.status(201).json(newProf);
});
router.get("/invoices", (0, siteScope_1.requireSite)(false), controllers_1.invoicesController.getInvoices);
router.post("/invoices", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.create", "DO"), controllers_1.invoicesController.createInvoice);
router.post("/invoices:from-proforma", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.create", "DO"), controllers_1.invoicesController.convertProforma);
router.get("/invoices/:invoiceId", (0, siteScope_1.requireSite)(false), controllers_1.invoicesController.getInvoiceById);
router.patch("/invoices/:invoiceId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.create", "DO"), controllers_1.invoicesController.postInvoice);
router.post("/invoices/:invoiceId([0-9a-zA-Z_.-]+):post", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.post", "DO"), controllers_1.invoicesController.postInvoice);
router.post("/invoices/:invoiceId([0-9a-zA-Z_.-]+):cancel", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.create", "DO"), controllers_1.invoicesController.cancelInvoice);
router.get("/invoices/:invoiceId/pdf", (0, siteScope_1.requireSite)(false), controllers_1.invoicesController.getInvoicePdf);
router.post("/credit-notes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.creditnote", "DO"), (req, res) => {
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
});
router.post("/debit-notes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.post", "DO"), (req, res) => {
    res.status(201).json({
        debitNoteId: Date.now(),
        debitNoteNo: `DN-2026-${String(Date.now()).slice(-5)}`,
        invoiceId: req.body.invoiceId,
        amountUsd: req.body.amountUsd || 50.0,
        issuedAt: new Date().toISOString(),
    });
});
router.get("/fiscal-receipts", (0, siteScope_1.requireSite)(false), (req, res) => {
    res.json({
        items: fiscalReceipts,
        total: fiscalReceipts.length,
        nextCursor: null,
    });
});
router.post("/fiscal-receipts/:fiscalReceiptId([0-9a-zA-Z_.-]+):retry", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("billing.invoice.post", "DO"), (req, res) => {
    const rcpt = fiscalReceipts.find((r) => String(r.fiscalReceiptId) === req.params.fiscalReceiptId);
    if (rcpt)
        rcpt.status = "ISSUED";
    res.json({ success: true, fiscalReceipt: rcpt });
});
// ------------------------------------------------------------------ 5. Cashier (Site-scoped)
router.get("/cashier-shifts", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.getShifts);
router.post("/cashier-shifts", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.openShift);
router.get("/cashier-shifts/current", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.getCurrentShift);
router.post("/cashier-shifts/:shiftId([0-9a-zA-Z_.-]+):close", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.closeShift);
router.post("/cashier-shifts/:shiftId([0-9a-zA-Z_.-]+):approve", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.approveShift);
router.get("/payments", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.getPayments);
router.post("/payments", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.recordPayment);
router.get("/payments/:paymentId", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.getPaymentById);
router.post("/payments/:paymentId([0-9a-zA-Z_.-]+):allocate", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.allocatePayment);
router.post("/payments/:paymentId([0-9a-zA-Z_.-]+):reverse", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.reversePayment);
router.get("/payments/:paymentId/receipt", (0, siteScope_1.requireSite)(false), controllers_1.cashierController.getPaymentReceipt);
router.get("/refunds", (0, siteScope_1.requireSite)(false), billingRefundsController.getRefunds);
router.post("/refunds", (0, siteScope_1.requireSite)(false), billingRefundsController.createRefund);
router.post("/refunds/:refundId/decide", (0, siteScope_1.requireSite)(false), billingRefundsController.decideRefund);
router.post("/refunds/:refundId([0-9a-zA-Z_.-]+):decide", (0, siteScope_1.requireSite)(false), billingRefundsController.decideRefund);
router.post("/refunds/:refundId/mark-paid", (0, siteScope_1.requireSite)(false), billingRefundsController.markPaid);
router.post("/refunds/:refundId([0-9a-zA-Z_.-]+):mark-paid", (0, siteScope_1.requireSite)(false), billingRefundsController.markPaid);
// ------------------------------------------------------------------ 6. Disbursements (Site-scoped)
router.get("/disbursements", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.disbursement.record"), billingDisbursementsController.getDisbursements);
router.post("/disbursements", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.disbursement.record", "DO"), billingDisbursementsController.createDisbursement);
router.get("/disbursements/:disbursementId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.disbursement.record"), billingDisbursementsController.getDisbursementById);
router.post("/disbursements/:disbursementId([0-9a-zA-Z_.-]+):write-off", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.disbursement.record", "DO"), billingDisbursementsController.writeOffDisbursement);
router.post("/disbursements/:disbursementId/write-off", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.disbursement.record", "DO"), billingDisbursementsController.writeOffDisbursement);
// ------------------------------------------------------------------ 7. Accounting & Statements (Site-scoped)
router.get(["/gl-postings", "/ledger/entries"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.period.close"), controllers_1.ledgerController.getLedgerPostings);
router.post(["/gl-postings/:glPostingId([0-9a-zA-Z_.-]+):retry", "/gl-postings/:glPostingId([0-9a-zA-Z_.-]+)/retry"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("finance.period.close", "DO"), controllers_1.ledgerController.retryPosting);
router.get("/statements", (0, siteScope_1.requireSite)(false), billingStatementsController.getStatements);
router.get("/statements/:partyId", (0, siteScope_1.requireSite)(false), billingStatementsController.getStatementByPartyId);
router.get("/statements/:partyId/pdf", (0, siteScope_1.requireSite)(false), billingStatementsController.getStatementPdf);
exports.commercialRouter = router;
