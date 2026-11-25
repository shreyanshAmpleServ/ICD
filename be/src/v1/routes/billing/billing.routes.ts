import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { requirePermission } from '../../../middlewares/permission';
import {
  billingChargesController,
  billingInvoicesController,
  billingCashierController,
  billingRefundsController,
  billingDisbursementsController,
  billingStatementsController,
  billingTariffsController,
  billingExchangeRatesController,
  billingLedgerController,
} from '../../controllers/billing';

export const billingRoutes = Router();

// Charges
billingRoutes.get('/charges', requireSite(false), billingChargesController.getCharges);
billingRoutes.get('/charges/open', requireSite(false), billingChargesController.getOpenCharges);

// Invoices
billingRoutes.get('/invoices', requireSite(false), billingInvoicesController.getInvoices);
billingRoutes.post('/invoices', requireSite(false), billingInvoicesController.createInvoice);
billingRoutes.get('/invoices/:invoiceId', requireSite(false), billingInvoicesController.getInvoiceById);

// Cashier & Payments
billingRoutes.get('/payments', requireSite(false), billingCashierController.getPayments);
billingRoutes.post('/payments', requireSite(false), billingCashierController.recordPayment);
billingRoutes.get('/cashier/shifts', requireSite(false), billingCashierController.getShifts);
billingRoutes.get('/cashier/channels', requireSite(false), billingCashierController.getChannels);

// Refunds
billingRoutes.get('/refunds', requireSite(false), requirePermission('payment.refund'), billingRefundsController.getRefunds);
billingRoutes.post('/refunds', requireSite(false), requirePermission('payment.refund', 'DO'), billingRefundsController.createRefund);
billingRoutes.post('/refunds/:refundId/decide', requireSite(false), billingRefundsController.decideRefund);
billingRoutes.post('/refunds/:refundId/mark-paid', requireSite(false), billingRefundsController.markPaid);

// Disbursements
billingRoutes.get('/disbursements', requireSite(false), billingDisbursementsController.getDisbursements);
billingRoutes.post('/disbursements', requireSite(false), billingDisbursementsController.createDisbursement);
billingRoutes.get('/disbursements/:disbursementId', requireSite(false), billingDisbursementsController.getDisbursementById);
billingRoutes.post(['/disbursements/:disbursementId/write-off', '/disbursements/:disbursementId:write-off'], requireSite(false), billingDisbursementsController.writeOffDisbursement);

// Statements
billingRoutes.get('/statements', requireSite(false), billingStatementsController.getStatements);
billingRoutes.get('/statements/:partyId', requireSite(false), billingStatementsController.getStatementByPartyId);
billingRoutes.get('/statements/:partyId/pdf', requireSite(false), billingStatementsController.getStatementPdf);

// Tariffs & Rates
billingRoutes.get('/tariffs', requireSite(false), requirePermission('billing.rates.view'), billingTariffsController.getTariffs);
billingRoutes.post('/tariffs', requireSite(false), requirePermission('billing.tariff.change', 'DO'), billingTariffsController.createTariff);
billingRoutes.get('/tariffs/rates', requireSite(false), requirePermission('billing.rates.view'), billingTariffsController.getTariffRates);
billingRoutes.get('/tariffs/:tariffId', requireSite(false), requirePermission('billing.rates.view'), billingTariffsController.getTariffById);
billingRoutes.patch('/tariffs/:tariffId', requireSite(false), requirePermission('billing.tariff.change', 'DO'), billingTariffsController.updateTariff);
billingRoutes.get('/tariffs/:tariffId/rules', requireSite(false), requirePermission('billing.rates.view'), billingTariffsController.getTariffRules);
billingRoutes.post('/tariffs/:tariffId:submit', requireSite(false), requirePermission('billing.tariff.change', 'DO'), billingTariffsController.submitTariff);
billingRoutes.post('/tariffs/:tariffId:new-version', requireSite(false), requirePermission('billing.tariff.change', 'DO'), billingTariffsController.newVersion);

// Exchange Rates
billingRoutes.get('/exchange-rates', requireSite(false), requirePermission('billing.rates.view'), billingExchangeRatesController.getExchangeRates);
billingRoutes.get('/exchange-rates/effective', requireSite(false), requirePermission('billing.rates.view'), billingExchangeRatesController.getEffectiveRate);
billingRoutes.post('/exchange-rates', requireSite(false), requirePermission('finance.exchange_rate.edit', 'DO'), billingExchangeRatesController.createExchangeRate);
billingRoutes.patch('/exchange-rates/:exchangeRateId', requireSite(false), requirePermission('finance.exchange_rate.edit', 'DO'), billingExchangeRatesController.updateExchangeRate);

// Ledger & Accounting
billingRoutes.get(['/gl-postings', '/ledger/postings', '/ledger/entries'], requireSite(false), billingLedgerController.getLedgerPostings);
billingRoutes.post(['/gl-postings/:glPostingId/retry', '/gl-postings/:glPostingId:retry', '/ledger/postings/:glPostingId/retry'], requireSite(false), billingLedgerController.retryPosting);
billingRoutes.get(['/accounting-periods', '/ledger/periods'], requireSite(false), billingLedgerController.getPeriods);
billingRoutes.post(['/accounting-periods/:accountingPeriodId/close', '/accounting-periods/:accountingPeriodId:close', '/ledger/periods/:accountingPeriodId/close'], requireSite(false), billingLedgerController.closePeriod);
billingRoutes.post(['/accounting-periods/:accountingPeriodId/reopen', '/accounting-periods/:accountingPeriodId:reopen', '/ledger/periods/:accountingPeriodId/reopen'], requireSite(false), billingLedgerController.reopenPeriod);
