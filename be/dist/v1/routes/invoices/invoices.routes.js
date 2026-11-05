"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const invoices_controller_1 = require("../../controllers/invoices.controller");
const router = (0, express_1.Router)();
// List all invoices, proformas, notes
router.get("/invoices", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.getInvoices);
// Create new invoice or proforma
router.post("/invoices", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.createInvoice);
// Convert proforma to invoice (both :from-proforma and :invoiceId/convert supported)
router.post("/invoices:from-proforma", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.convertProforma);
router.post("/invoices/:invoiceId/convert", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.convertProforma);
// Fetch single invoice by ID or invoice number
router.get("/invoices/:invoiceId", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.getInvoiceById);
// Post invoice (both :post and /post supported)
router.post("/invoices/:invoiceId([0-9a-zA-Z_.-]+):post", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.postInvoice);
router.post("/invoices/:invoiceId/post", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.postInvoice);
// Fiscalise invoice with TRA / VFD
router.post("/invoices/:invoiceId/fiscalise", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.fiscalise);
// Issue credit note
router.post("/invoices/:invoiceId/credit-note", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.issueCreditNote);
// Cancel draft invoice (both :cancel and /cancel supported)
router.post("/invoices/:invoiceId([0-9a-zA-Z_.-]+):cancel", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.cancelInvoice);
router.post("/invoices/:invoiceId/cancel", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.cancelInvoice);
// PDF export
router.get("/invoices/:invoiceId/pdf", (0, siteScope_1.requireSite)(false), invoices_controller_1.invoicesController.getInvoicePdf);
exports.invoicesRouter = router;
