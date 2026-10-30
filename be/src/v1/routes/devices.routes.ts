import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { asyncHandler } from "../../utils";
import { devicesController } from "../controllers/devices.controller";

const router = Router();

// Device Integrations
router.get(
  "/device-integrations",
  requireSite(false),
  requirePermission("device.configure"),
  asyncHandler(devicesController.getIntegrations)
);

router.post(
  "/device-integrations",
  requireSite(false),
  requirePermission("device.configure", "DO"),
  asyncHandler(devicesController.createIntegration)
);

router.get(
  "/device-integrations/:deviceIntegrationId",
  requireSite(false),
  requirePermission("device.configure"),
  asyncHandler(devicesController.getIntegrationById)
);

router.patch(
  "/device-integrations/:deviceIntegrationId",
  requireSite(false),
  requirePermission("device.configure", "DO"),
  asyncHandler(devicesController.updateIntegration)
);

// Device Reads
router.post(
  "/device-reads:ingest",
  requireSite(false),
  asyncHandler(devicesController.ingestRead)
);

router.get(
  "/device-reads",
  requireSite(false),
  requirePermission("device.configure"),
  asyncHandler(devicesController.getReads)
);

router.post(
  "/device-reads/:deviceReadId([0-9a-zA-Z_.-]+):match",
  requireSite(false),
  requirePermission("gate.visit.checkin", "DO"),
  asyncHandler(devicesController.matchRead)
);

export const devicesRouter = router;
export default router;

