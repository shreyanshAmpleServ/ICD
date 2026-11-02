import { invoicesController } from '../invoices.controller';

export const billingInvoicesController = {
  getInvoices: invoicesController.getInvoices,
  getInvoiceById: invoicesController.getInvoiceById,
  createInvoice: invoicesController.createInvoice,
  convertProforma: invoicesController.convertProforma,
  postInvoice: invoicesController.postInvoice,
  fiscalise: invoicesController.fiscalise,
  issueCreditNote: invoicesController.issueCreditNote,
  cancelInvoice: invoicesController.cancelInvoice,
  getInvoicePdf: invoicesController.getInvoicePdf,
};
