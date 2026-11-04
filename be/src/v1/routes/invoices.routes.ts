import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { invoicesController } from "../controllers/invoices.controller";

const router = Router();

// List all invoices, proformas, notes
router.get("/invoices", requireSite(false), invoicesController.getInvoices);

// Create new invoice or proforma
router.post("/invoices", requireSite(false), invoicesController.createInvoice);

// Convert proforma to invoice (both :from-proforma and :invoiceId/convert supported)
router.post(
  "/invoices:from-proforma",
  requireSite(false),
  invoicesController.convertProforma,
);

router.post(
  "/invoices/:invoiceId/convert",
  requireSite(false),
  invoicesController.convertProforma,
);

// Fetch single invoice by ID or invoice number
router.get(
  "/invoices/:invoiceId",
  requireSite(false),
  invoicesController.getInvoiceById,
);

// Post invoice (both :post and /post supported)
router.post(
  "/invoices/:invoiceId([0-9a-zA-Z_.-]+):post",
  requireSite(false),
  invoicesController.postInvoice,
);

router.post(
  "/invoices/:invoiceId/post",
  requireSite(false),
  invoicesController.postInvoice,
);

// Fiscalise invoice with TRA / VFD
router.post(
  "/invoices/:invoiceId/fiscalise",
  requireSite(false),
  invoicesController.fiscalise,
);

// Issue credit note
router.post(
  "/invoices/:invoiceId/credit-note",
  requireSite(false),
  invoicesController.issueCreditNote,
);

// Cancel draft invoice (both :cancel and /cancel supported)
router.post(
  "/invoices/:invoiceId([0-9a-zA-Z_.-]+):cancel",
  requireSite(false),
  invoicesController.cancelInvoice,
);

router.post(
  "/invoices/:invoiceId/cancel",
  requireSite(false),
  invoicesController.cancelInvoice,
);

// PDF export
router.get(
  "/invoices/:invoiceId/pdf",
  requireSite(false),
  invoicesController.getInvoicePdf,
);

export const invoicesRouter = router;
