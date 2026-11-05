"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargesRouter = void 0;
const express_1 = require("express");
const charges_controller_1 = require("../controllers/charges.controller");
const siteScope_1 = require("../../middlewares/siteScope");
// import { requirePermission } from '../../middlewares/permission';
exports.chargesRouter = (0, express_1.Router)();
// Charges list
exports.chargesRouter.get("/charges", (0, siteScope_1.requireSite)(false), charges_controller_1.chargesController.getCharges);
// Open charges
exports.chargesRouter.get("/charges/open", (0, siteScope_1.requireSite)(false), charges_controller_1.chargesController.getOpenCharges);
// Manual charge creation
exports.chargesRouter.post("/charges/manual", (0, siteScope_1.requireSite)(false), charges_controller_1.chargesController.addManualCharge);
// Waive charge
exports.chargesRouter.post("/charges/waiver", (0, siteScope_1.requireSite)(false), 
// requirePermission("billing.waiver", "DO"),
charges_controller_1.chargesController.waiveCharge);
exports.chargesRouter.post("/charges/:chargeId([0-9a-zA-Z_.-]+)/waive", (0, siteScope_1.requireSite)(false), 
// requirePermission("billing.waiver", "DO"),
charges_controller_1.chargesController.waiveCharge);
exports.chargesRouter.post("/charges/:chargeId([0-9a-zA-Z_.-]+):waive", (0, siteScope_1.requireSite)(false), 
// requirePermission("billing.waiver", "DO"),
charges_controller_1.chargesController.waiveCharge);
exports.default = exports.chargesRouter;
