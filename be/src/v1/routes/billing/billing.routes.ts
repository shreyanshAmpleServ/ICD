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
billingRoutes.get('/disbursements', requireSite(false), requirePermission('finance.disbursement.record'), billingDisbursementsController.getDisbursements);
billingRoutes.post('/disbursements', requireSite(false), requirePermission('finance.disbursement.record', 'DO'), billingDisbursementsController.createDisbursement);

// Statements
billingRoutes.get('/statements', requireSite(false), billingStatementsController.getStatements);

// Tariffs & Rates
billingRoutes.get('/tariffs', requireSite(false), requirePermission('billing.rates.view'), billingTariffsController.getTariffs);
billingRoutes.get('/tariffs/rates', requireSite(false), requirePermission('billing.rates.view'), billingTariffsController.getTariffRates);

// Exchange Rates
billingRoutes.get('/exchange-rates', requireSite(false), requirePermission('billing.rates.view'), billingExchangeRatesController.getExchangeRates);
billingRoutes.post('/exchange-rates', requireSite(false), requirePermission('billing.rates.view', 'DO'), billingExchangeRatesController.createExchangeRate);

// Ledger
billingRoutes.get('/ledger/postings', requireSite(false), requirePermission('finance.period.close'), billingLedgerController.getLedgerPostings);
billingRoutes.get('/ledger/periods', requireSite(false), requirePermission('finance.period.close'), billingLedgerController.getPeriods);

