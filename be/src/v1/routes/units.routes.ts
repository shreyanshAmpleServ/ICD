import { Router } from "express";
import {
  requireSite,
  requirePermission,
  validateBody,
} from "../../middlewares";
import { asyncHandler } from "../../utils";
import { unitsController } from "../controllers/units.controller";
import {
  validateIdentitySchema,
  createUnitTypeSchema,
  createUnitSchema,
} from "../validations/units.validation";

const router = Router();

router.get(
  "/unit-types",
  requireSite(true),
  requirePermission("masters.view"),
  asyncHandler(unitsController.getUnitTypes),
);

router.post(
  "/unit-types",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  validateBody(createUnitTypeSchema),
  asyncHandler(unitsController.createUnitType),
);

router.get(
  "/unit-types/:unitTypeId",
  requireSite(true),
  requirePermission("masters.view"),
  asyncHandler(unitsController.getUnitTypeById),
);

router.patch(
  "/unit-types/:unitTypeId",
  requireSite(true),
  requirePermission("admin.config.manage", "DO"),
  asyncHandler(unitsController.updateUnitType),
);

router.get(
  "/identity-rules",
  requireSite(true),
  requirePermission("masters.view"),
  asyncHandler(unitsController.getIdentityRules),
);

router.post(
  "/identity:validate",
  requireSite(false),
  requirePermission("masters.view"),
  validateBody(validateIdentitySchema),
  asyncHandler(unitsController.validateIdentity),
);

router.get(
  "/plate-formats",
  requireSite(true),
  requirePermission("masters.view"),
  asyncHandler(unitsController.getPlateFormats),
);

router.get("/search", requireSite(true), asyncHandler(unitsController.search));

router.get(
  "/units",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(unitsController.getUnits),
);

router.post(
  "/units",
  requireSite(false),
  requirePermission("consignment.edit", "DO"),
  validateBody(createUnitSchema),
  asyncHandler(unitsController.createUnit),
);

router.get(
  "/units/:unitStayId",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(unitsController.getUnitById),
);

router.patch(
  "/units/:unitStayId",
  requireSite(false),
  requirePermission("consignment.edit", "DO"),
  asyncHandler(unitsController.updateUnit),
);

router.get(
  "/units/:unitStayId/timeline",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(unitsController.getUnitTimeline),
);

router.get(
  "/units/:unitStayId/holds",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(unitsController.getUnitHolds),
);

router.get(
  "/units/:unitStayId/history",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(unitsController.getUnitHistory),
);

export const unitsRouter = router;
export default router;
