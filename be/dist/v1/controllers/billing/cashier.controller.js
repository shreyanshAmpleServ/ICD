"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingCashierController = void 0;
const cashier_controller_1 = require("../cashier.controller");
exports.billingCashierController = {
    getPayments: (req, res) => cashier_controller_1.cashierController.getPayments(req, res),
    getShifts: (req, res) => cashier_controller_1.cashierController.getShifts(req, res),
    getChannels: (req, res) => cashier_controller_1.cashierController.getChannels(req, res),
    recordPayment: (req, res) => cashier_controller_1.cashierController.recordPayment(req, res),
};
