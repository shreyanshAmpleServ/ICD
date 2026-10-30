import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validate";
import { asyncHandler } from "../../utils";
import { portalController } from "../controllers/portal.controller";
import {
  portalQuerySchema,
  bookAppointmentSchema,
  portalRequestSchema,
  portalPaymentSchema,
} from "../validations/portal.validation";
import { numericIdParamSchema } from "../validations/common.validation";

const router = Router();

router.get(
  "/portal/units",
  requireSite(false),
  requirePermission("consignment.view"),
  validateQuery(portalQuerySchema),
  asyncHandler(portalController.getUnits),
);

router.get(
  "/portal/invoices",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  validateQuery(portalQuerySchema),
  asyncHandler(portalController.getInvoices),
);

router.get(
  "/portal/documents",
  requireSite(false),
  requirePermission("consignment.view"),
  validateQuery(portalQuerySchema),
  asyncHandler(portalController.getDocuments),
);

router.get(
  "/portal/appointments",
  requireSite(false),
  requirePermission("appointment.book"),
  validateQuery(portalQuerySchema),
  asyncHandler(portalController.getAppointments),
);

router.get(
  "/portal/requests",
  requireSite(false),
  requirePermission("consignment.view"),
  validateQuery(portalQuerySchema),
  asyncHandler(portalController.getRequests),
);

router.get(
  "/portal/summary",
  requireSite(false),
  requirePermission("consignment.view"),
  validateQuery(portalQuerySchema),
  asyncHandler(portalController.getSummary),
);

router.post(
  "/portal/appointments",
  requireSite(false),
  requirePermission("appointment.book", "DO"),
  validateBody(bookAppointmentSchema),
  asyncHandler(portalController.bookAppointment),
);

router.post(
  "/appointments",
  requireSite(false),
  requirePermission("appointment.book", "DO"),
  validateBody(bookAppointmentSchema),
  asyncHandler(portalController.bookAppointment),
);

router.post(
  "/portal/requests",
  requireSite(false),
  requirePermission("portal.request.submit", "DO"),
  validateBody(portalRequestSchema),
  asyncHandler(portalController.submitRequest),
);

router.post(
  "/portal/invoices/:invoiceId/pay",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  validateParams(numericIdParamSchema("invoiceId")),
  validateBody(portalPaymentSchema),
  asyncHandler(portalController.payInvoice),
);

router.post(
  "/invoices/:invoiceId:pay",
  requireSite(false),
  requirePermission("billing.invoice.view"),
  validateParams(numericIdParamSchema("invoiceId")),
  validateBody(portalPaymentSchema),
  asyncHandler(portalController.payInvoice),
);

export const portalRouter = router;
export default router;
