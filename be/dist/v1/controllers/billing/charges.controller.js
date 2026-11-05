"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingChargesController = void 0;
const charges_controller_1 = require("../charges.controller");
exports.billingChargesController = {
    getCharges: charges_controller_1.chargesController.getCharges,
    getOpenCharges: charges_controller_1.chargesController.getOpenCharges,
    waiveCharge: charges_controller_1.chargesController.waiveCharge,
    addManualCharge: charges_controller_1.chargesController.addManualCharge,
};
