import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { asyncHandler } from "../../utils";
import { repairsController } from "../controllers/repairs.controller";

const router = Router();

// Repair Codes
router.get(
  "/repair-codes",
  requireSite(false),
  requirePermission("repair.estimate"),
  asyncHandler(repairsController.getCodes)
);

router.post(
  "/repair-codes",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  asyncHandler(repairsController.createCode)
);

router.get(
  "/repair-codes/:repairCodeId",
  requireSite(false),
  requirePermission("repair.estimate"),
  asyncHandler(repairsController.getCodeById)
);

router.patch(
  "/repair-codes/:repairCodeId",
  requireSite(false),
  requirePermission("admin.config.manage", "DO"),
  asyncHandler(repairsController.updateCode)
);

// Repair Estimates
router.get(
  ["/repair-estimates", "/repairs"],
  requireSite(false),
  requirePermission("repair.estimate"),
  asyncHandler(repairsController.getEstimates)
);

router.post(
  ["/repair-estimates", "/repairs"],
  requireSite(false),
  requirePermission("repair.estimate", "DO"),
  asyncHandler(repairsController.createEstimate)
);

router.get(
  ["/repair-estimates/:repairEstimateId", "/repairs/:repairEstimateId"],
  requireSite(false),
  requirePermission("repair.estimate"),
  asyncHandler(repairsController.getEstimateById)
);

router.patch(
  ["/repair-estimates/:repairEstimateId", "/repairs/:repairEstimateId"],
  requireSite(false),
  requirePermission("repair.estimate", "DO"),
  asyncHandler(repairsController.updateEstimate)
);

// Action routes supporting both slash and colon syntax
router.post(
  [
    "/repair-estimates/:repairEstimateId/send",
    "/repairs/:repairEstimateId/send",
    "/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):send",
    "/repairs/:repairEstimateId([0-9a-zA-Z_.-]+):send",
  ],
  requireSite(false),
  requirePermission("repair.estimate", "DO"),
  asyncHandler(repairsController.sendEstimate)
);

router.post(
  [
    "/repair-estimates/:repairEstimateId/decide",
    "/repairs/:repairEstimateId/decide",
    "/repair-estimates/:repairEstimateId/decision",
    "/repairs/:repairEstimateId/decision",
    "/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):decision",
    "/repairs/:repairEstimateId([0-9a-zA-Z_.-]+):decision",
  ],
  requireSite(false),
  requirePermission("repair.estimate", "DO"),
  asyncHandler(repairsController.decideEstimate)
);

router.post(
  [
    "/repair-estimates/:repairEstimateId/complete",
    "/repairs/:repairEstimateId/complete",
    "/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):complete",
    "/repairs/:repairEstimateId([0-9a-zA-Z_.-]+):complete",
  ],
  requireSite(false),
  requirePermission("repair.estimate", "DO"),
  asyncHandler(repairsController.completeEstimate)
);

export const repairsRouter = router;
export default router;
