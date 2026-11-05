"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devicesRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const utils_1 = require("../../../utils");
const devices_controller_1 = require("../../controllers/devices.controller");
const router = (0, express_1.Router)();
// Device Integrations
router.get("/device-integrations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("device.configure"), (0, utils_1.asyncHandler)(devices_controller_1.devicesController.getIntegrations));
router.post("/device-integrations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("device.configure", "DO"), (0, utils_1.asyncHandler)(devices_controller_1.devicesController.createIntegration));
router.get("/device-integrations/:deviceIntegrationId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("device.configure"), (0, utils_1.asyncHandler)(devices_controller_1.devicesController.getIntegrationById));
router.patch("/device-integrations/:deviceIntegrationId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("device.configure", "DO"), (0, utils_1.asyncHandler)(devices_controller_1.devicesController.updateIntegration));
// Device Reads
router.post("/device-reads:ingest", (0, siteScope_1.requireSite)(false), (0, utils_1.asyncHandler)(devices_controller_1.devicesController.ingestRead));
router.get("/device-reads", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("device.configure"), (0, utils_1.asyncHandler)(devices_controller_1.devicesController.getReads));
router.post("/device-reads/:deviceReadId([0-9a-zA-Z_.-]+):match", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("gate.visit.checkin", "DO"), (0, utils_1.asyncHandler)(devices_controller_1.devicesController.matchRead));
exports.devicesRouter = router;
exports.default = router;
