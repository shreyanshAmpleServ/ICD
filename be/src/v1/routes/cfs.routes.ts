import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { asyncHandler } from "../../utils";
import { cfsController } from "../controllers/cfs.controller";

const router = Router();

router.get(
  "/labour-contractors",
  requireSite(false),
  requirePermission("cfs.job.manage"),
  asyncHandler(cfsController.getContractors),
);

router.post(
  "/labour-contractors",
  requireSite(false),
  requirePermission("cfs.job.manage", "DO"),
  asyncHandler(cfsController.createContractor),
);

router.get(
  "/labour-contractors/:labourContractorId",
  requireSite(false),
  requirePermission("cfs.job.manage"),
  asyncHandler(cfsController.getContractorById),
);

router.patch(
  "/labour-contractors/:labourContractorId",
  requireSite(false),
  requirePermission("cfs.job.manage", "DO"),
  asyncHandler(cfsController.updateContractor),
);

router.get(
  ["/handling-jobs", "/cfs/jobs"],
  requireSite(false),
  requirePermission("cfs.job.manage"),
  asyncHandler(cfsController.getJobs),
);

router.post(
  ["/handling-jobs", "/cfs/jobs"],
  requireSite(false),
  requirePermission("cfs.job.manage", "DO"),
  asyncHandler(cfsController.createJob),
);

router.get(
  ["/handling-jobs/:handlingJobId", "/cfs/jobs/:handlingJobId"],
  requireSite(false),
  requirePermission("cfs.job.manage"),
  asyncHandler(cfsController.getJobById),
);

router.patch(
  "/handling-jobs/:handlingJobId",
  requireSite(false),
  requirePermission("cfs.job.manage", "DO"),
  asyncHandler(cfsController.updateJob),
);

router.put(
  "/handling-jobs/:handlingJobId/lines",
  requireSite(false),
  requirePermission("cfs.job.manage", "DO"),
  asyncHandler(cfsController.updateJobLines),
);

router.post(
  "/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):start",
  requireSite(false),
  requirePermission("cfs.job.manage", "DO"),
  asyncHandler(cfsController.startJob),
);

router.post(
  "/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):complete",
  requireSite(false),
  requirePermission("cfs.job.manage", "DO"),
  asyncHandler(cfsController.completeJob),
);

router.post(
  "/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):approve",
  requireSite(false),
  requirePermission("cfs.job.approve", "DO"),
  asyncHandler(cfsController.approveJob),
);

// Lots Balance
router.get(
  "/lots/:unitStayId/balance",
  requireSite(false),
  requirePermission("consignment.view"),
  asyncHandler(cfsController.getLotBalance),
);

export const cfsRouter = router;
export default router;
