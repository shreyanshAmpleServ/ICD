"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRoutes = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const billing_1 = require("../../controllers/billing");
exports.billingRoutes = (0, express_1.Router)();
// Charges
exports.billingRoutes.get('/charges', (0, siteScope_1.requireSite)(false), billing_1.billingChargesController.getCharges);
exports.billingRoutes.get('/charges/open', (0, siteScope_1.requireSite)(false), billing_1.billingChargesController.getOpenCharges);
// Invoices
exports.billingRoutes.get('/invoices', (0, siteScope_1.requireSite)(false), billing_1.billingInvoicesController.getInvoices);
exports.billingRoutes.post('/invoices', (0, siteScope_1.requireSite)(false), billing_1.billingInvoicesController.createInvoice);
exports.billingRoutes.get('/invoices/:invoiceId', (0, siteScope_1.requireSite)(false), billing_1.billingInvoicesController.getInvoiceById);
// Cashier & Payments
exports.billingRoutes.get('/payments', (0, siteScope_1.requireSite)(false), billing_1.billingCashierController.getPayments);
exports.billingRoutes.post('/payments', (0, siteScope_1.requireSite)(false), billing_1.billingCashierController.recordPayment);
exports.billingRoutes.get('/cashier/shifts', (0, siteScope_1.requireSite)(false), billing_1.billingCashierController.getShifts);
exports.billingRoutes.get('/cashier/channels', (0, siteScope_1.requireSite)(false), billing_1.billingCashierController.getChannels);
// Refunds
exports.billingRoutes.get('/refunds', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('payment.refund'), billing_1.billingRefundsController.getRefunds);
exports.billingRoutes.post('/refunds', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('payment.refund', 'DO'), billing_1.billingRefundsController.createRefund);
exports.billingRoutes.post('/refunds/:refundId/decide', (0, siteScope_1.requireSite)(false), billing_1.billingRefundsController.decideRefund);
exports.billingRoutes.post('/refunds/:refundId/mark-paid', (0, siteScope_1.requireSite)(false), billing_1.billingRefundsController.markPaid);
// Disbursements
exports.billingRoutes.get('/disbursements', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.disbursement.record'), billing_1.billingDisbursementsController.getDisbursements);
exports.billingRoutes.post('/disbursements', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.disbursement.record', 'DO'), billing_1.billingDisbursementsController.createDisbursement);
exports.billingRoutes.get('/disbursements/:disbursementId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.disbursement.record'), billing_1.billingDisbursementsController.getDisbursementById);
exports.billingRoutes.post('/disbursements/:disbursementId/write-off', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.disbursement.record', 'DO'), billing_1.billingDisbursementsController.writeOffDisbursement);
// Statements
exports.billingRoutes.get('/statements', (0, siteScope_1.requireSite)(false), billing_1.billingStatementsController.getStatements);
exports.billingRoutes.get('/statements/:partyId', (0, siteScope_1.requireSite)(false), billing_1.billingStatementsController.getStatementByPartyId);
exports.billingRoutes.get('/statements/:partyId/pdf', (0, siteScope_1.requireSite)(false), billing_1.billingStatementsController.getStatementPdf);
// Tariffs & Rates
exports.billingRoutes.get('/tariffs', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.rates.view'), billing_1.billingTariffsController.getTariffs);
exports.billingRoutes.post('/tariffs', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.tariff.change', 'DO'), billing_1.billingTariffsController.createTariff);
exports.billingRoutes.get('/tariffs/rates', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.rates.view'), billing_1.billingTariffsController.getTariffRates);
exports.billingRoutes.get('/tariffs/:tariffId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.rates.view'), billing_1.billingTariffsController.getTariffById);
exports.billingRoutes.patch('/tariffs/:tariffId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.tariff.change', 'DO'), billing_1.billingTariffsController.updateTariff);
exports.billingRoutes.get('/tariffs/:tariffId/rules', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.rates.view'), billing_1.billingTariffsController.getTariffRules);
exports.billingRoutes.post('/tariffs/:tariffId:submit', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.tariff.change', 'DO'), billing_1.billingTariffsController.submitTariff);
exports.billingRoutes.post('/tariffs/:tariffId:new-version', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.tariff.change', 'DO'), billing_1.billingTariffsController.newVersion);
// Exchange Rates
exports.billingRoutes.get('/exchange-rates', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.rates.view'), billing_1.billingExchangeRatesController.getExchangeRates);
exports.billingRoutes.get('/exchange-rates/effective', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('billing.rates.view'), billing_1.billingExchangeRatesController.getEffectiveRate);
exports.billingRoutes.post('/exchange-rates', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.exchange_rate.edit', 'DO'), billing_1.billingExchangeRatesController.createExchangeRate);
exports.billingRoutes.patch('/exchange-rates/:exchangeRateId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.exchange_rate.edit', 'DO'), billing_1.billingExchangeRatesController.updateExchangeRate);
// Ledger
exports.billingRoutes.get('/ledger/postings', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.period.close'), billing_1.billingLedgerController.getLedgerPostings);
exports.billingRoutes.post('/ledger/postings/:glPostingId/retry', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.period.close', 'DO'), billing_1.billingLedgerController.retryPosting);
exports.billingRoutes.get('/ledger/periods', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.period.close'), billing_1.billingLedgerController.getPeriods);
exports.billingRoutes.post('/ledger/periods/:accountingPeriodId/close', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.period.close', 'DO'), billing_1.billingLedgerController.closePeriod);
exports.billingRoutes.post('/ledger/periods/:accountingPeriodId/reopen', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('finance.period.close', 'DO'), billing_1.billingLedgerController.reopenPeriod);
