import { Router } from "express";
import { chargesController } from "../../controllers/charges.controller";
import { requireSite } from "../../../middlewares/siteScope";
// import { requirePermission } from '../../../middlewares/permission';

export const chargesRouter = Router();

// Charges list
chargesRouter.get("/charges", requireSite(false), chargesController.getCharges);

// Open charges
chargesRouter.get(
  "/charges/open",
  requireSite(false),
  chargesController.getOpenCharges,
);

// Manual charge creation
chargesRouter.post(
  "/charges/manual",
  requireSite(false),
  chargesController.addManualCharge,
);

// Waive charge
chargesRouter.post(
  "/charges/waiver",
  requireSite(false),
  // requirePermission("billing.waiver", "DO"),
  chargesController.waiveCharge,
);

chargesRouter.post(
  "/charges/:chargeId([0-9a-zA-Z_.-]+)/waive",
  requireSite(false),
  // requirePermission("billing.waiver", "DO"),
  chargesController.waiveCharge,
);

chargesRouter.post(
  "/charges/:chargeId([0-9a-zA-Z_.-]+):waive",
  requireSite(false),
  // requirePermission("billing.waiver", "DO"),
  chargesController.waiveCharge,
);

export default chargesRouter;
