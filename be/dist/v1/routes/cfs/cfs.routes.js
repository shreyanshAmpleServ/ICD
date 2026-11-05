"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cfsRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const utils_1 = require("../../../utils");
const cfs_controller_1 = require("../../controllers/cfs.controller");
const router = (0, express_1.Router)();
// Labour Contractors
router.get("/labour-contractors", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.getContractors));
router.post("/labour-contractors", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.createContractor));
router.get("/labour-contractors/:labourContractorId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.getContractorById));
router.patch("/labour-contractors/:labourContractorId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.updateContractor));
// Lots Balances
router.get("/lots/balances", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.getLotBalances));
router.get("/lots/:unitStayId/balance", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("consignment.view"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.getLotBalance));
router.post("/lots/:lotStayId/deliveries", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.recordLotDelivery));
// Handling Jobs
router.get(["/handling-jobs", "/cfs/jobs"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.getJobs));
router.post(["/handling-jobs", "/cfs/jobs"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.createJob));
router.get(["/handling-jobs/:handlingJobId", "/cfs/jobs/:handlingJobId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.getJobById));
router.patch("/handling-jobs/:handlingJobId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.updateJob));
router.put("/handling-jobs/:handlingJobId/lines", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.updateJobLines));
// Action routes supporting both slash and colon syntax
router.post(["/handling-jobs/:handlingJobId/start", "/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):start"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.startJob));
router.post(["/handling-jobs/:handlingJobId/complete", "/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):complete"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.manage", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.completeJob));
router.post(["/handling-jobs/:handlingJobId/approve", "/handling-jobs/:handlingJobId([0-9a-zA-Z_.-]+):approve"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("cfs.job.approve", "DO"), (0, utils_1.asyncHandler)(cfs_controller_1.cfsController.approveJob));
exports.cfsRouter = router;
exports.default = router;
