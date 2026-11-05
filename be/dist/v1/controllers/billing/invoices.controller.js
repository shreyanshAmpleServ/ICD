"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingInvoicesController = void 0;
const invoices_controller_1 = require("../invoices.controller");
exports.billingInvoicesController = {
    getInvoices: invoices_controller_1.invoicesController.getInvoices,
    getInvoiceById: invoices_controller_1.invoicesController.getInvoiceById,
    createInvoice: invoices_controller_1.invoicesController.createInvoice,
    convertProforma: invoices_controller_1.invoicesController.convertProforma,
    postInvoice: invoices_controller_1.invoicesController.postInvoice,
    fiscalise: invoices_controller_1.invoicesController.fiscalise,
    issueCreditNote: invoices_controller_1.invoicesController.issueCreditNote,
    cancelInvoice: invoices_controller_1.invoicesController.cancelInvoice,
    getInvoicePdf: invoices_controller_1.invoicesController.getInvoicePdf,
};
