"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reefersRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const utils_1 = require("../../../utils");
const reefers_controller_1 = require("../../controllers/reefers.controller");
const router = (0, express_1.Router)();
router.get(["/reefer-sessions", "/reefers"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage"), (0, utils_1.asyncHandler)(reefers_controller_1.reefersController.getSessions));
router.post(["/reefer-sessions", "/reefers"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage", "DO"), (0, utils_1.asyncHandler)(reefers_controller_1.reefersController.createSession));
router.get(["/reefer-sessions/:reeferSessionId", "/reefers/:reeferSessionId"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage"), (0, utils_1.asyncHandler)(reefers_controller_1.reefersController.getSessionById));
router.post([
    "/reefer-sessions/:reeferSessionId/plug",
    "/reefers/:reeferSessionId/plug",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage", "DO"), (0, utils_1.asyncHandler)(reefers_controller_1.reefersController.plugIn));
router.post([
    "/reefer-sessions/:reeferSessionId/unplug",
    "/reefers/:reeferSessionId/unplug",
    "/reefer-sessions/:reeferSessionId([0-9a-zA-Z_.-]+):unplug",
    "/reefers/:reeferSessionId([0-9a-zA-Z_.-]+):unplug",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage", "DO"), (0, utils_1.asyncHandler)(reefers_controller_1.reefersController.unplugSession));
router.get([
    "/reefer-sessions/:reeferSessionId/readings",
    "/reefers/:reeferSessionId/readings",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage"), (0, utils_1.asyncHandler)(reefers_controller_1.reefersController.getReadings));
router.post([
    "/reefer-sessions/:reeferSessionId/readings",
    "/reefers/:reeferSessionId/readings",
], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("reefer.manage", "DO"), (0, utils_1.asyncHandler)(reefers_controller_1.reefersController.addReading));
exports.reefersRouter = router;
exports.default = router;
