import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { asyncHandler } from "../../utils";
import { reefersController } from "../controllers/reefers.controller";

const router = Router();

router.get(
  ["/reefer-sessions", "/reefers"],
  requireSite(false),
  requirePermission("reefer.manage"),
  asyncHandler(reefersController.getSessions)
);

router.post(
  ["/reefer-sessions", "/reefers"],
  requireSite(false),
  requirePermission("reefer.manage", "DO"),
  asyncHandler(reefersController.createSession)
);

router.get(
  ["/reefer-sessions/:reeferSessionId", "/reefers/:reeferSessionId"],
  requireSite(false),
  requirePermission("reefer.manage"),
  asyncHandler(reefersController.getSessionById)
);

router.post(
  "/reefer-sessions/:reeferSessionId([0-9a-zA-Z_.-]+):unplug",
  requireSite(false),
  requirePermission("reefer.manage", "DO"),
  asyncHandler(reefersController.unplugSession)
);

router.get(
  [
    "/reefer-sessions/:reeferSessionId/readings",
    "/reefers/:reeferSessionId/readings",
  ],
  requireSite(false),
  requirePermission("reefer.manage"),
  asyncHandler(reefersController.getReadings)
);

router.post(
  [
    "/reefer-sessions/:reeferSessionId/readings",
    "/reefers/:reeferSessionId/readings",
  ],
  requireSite(false),
  requirePermission("reefer.manage", "DO"),
  asyncHandler(reefersController.addReading)
);

export const reefersRouter = router;
export default router;

