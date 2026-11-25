import { Router } from "express";
import { requireSite } from "../../../middlewares/siteScope";
import { requirePermission } from "../../../middlewares/permission";
import {
  customerPortalController,
  customerServiceRequestsController,
} from "../../controllers/customers";

export const customersRoutes = Router();

// Customer Portal
customersRoutes.get(
  "/portal/overview",
  requireSite(false),
  requirePermission("portal.request.submit"),
  customerPortalController.getOverview,
);
customersRoutes.get(
  "/portal/requests",
  requireSite(false),
  requirePermission("portal.request.submit"),
  customerPortalController.getRequests,
);

// Service Requests
customersRoutes.get(
  "/service-requests",
  requireSite(false),
  requirePermission("portal.request.handle"),
  customerServiceRequestsController.getServiceRequests,
);
customersRoutes.post(
  "/service-requests",
  requireSite(false),
  requirePermission("portal.request.handle", "DO"),
  customerServiceRequestsController.createServiceRequest,
);
customersRoutes.post(
  [
    "/service-requests/:serviceRequestId/respond",
    "/service-requests/:serviceRequestId:respond",
  ],
  requireSite(false),
  requirePermission("portal.request.handle", "DO"),
  customerServiceRequestsController.respondServiceRequest,
);
