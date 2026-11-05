"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairsRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const utils_1 = require("../../../utils");
const repairs_controller_1 = require("../../controllers/repairs.controller");
const router = (0, express_1.Router)();
// Repair Codes
router.get("/repair-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.getCodes));
router.post("/repair-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.createCode));
router.get("/repair-codes/:repairCodeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.getCodeById));
router.patch("/repair-codes/:repairCodeId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.updateCode));
// Repair Estimates
router.get(["/repair-estimates", "/repairs"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.getEstimates));
router.post(["/repair-estimates", "/repairs"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate", "DO"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.createEstimate));
router.get(["/repair-estimates/:repairEstimateId", "/repairs/:repairEstimateId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.getEstimateById));
router.patch(["/repair-estimates/:repairEstimateId", "/repairs/:repairEstimateId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate", "DO"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.updateEstimate));
// Action routes supporting both slash and colon syntax
router.post([
    "/repair-estimates/:repairEstimateId/send",
    "/repairs/:repairEstimateId/send",
    "/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):send",
    "/repairs/:repairEstimateId([0-9a-zA-Z_.-]+):send",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate", "DO"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.sendEstimate));
router.post([
    "/repair-estimates/:repairEstimateId/decide",
    "/repairs/:repairEstimateId/decide",
    "/repair-estimates/:repairEstimateId/decision",
    "/repairs/:repairEstimateId/decision",
    "/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):decision",
    "/repairs/:repairEstimateId([0-9a-zA-Z_.-]+):decision",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate", "DO"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.decideEstimate));
router.post([
    "/repair-estimates/:repairEstimateId/complete",
    "/repairs/:repairEstimateId/complete",
    "/repair-estimates/:repairEstimateId([0-9a-zA-Z_.-]+):complete",
    "/repairs/:repairEstimateId([0-9a-zA-Z_.-]+):complete",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("repair.estimate", "DO"), (0, utils_1.asyncHandler)(repairs_controller_1.repairsController.completeEstimate));
exports.repairsRouter = router;
exports.default = router;
