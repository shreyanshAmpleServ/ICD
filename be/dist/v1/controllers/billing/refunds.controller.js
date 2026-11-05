"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRefundsController = void 0;
const refunds_controller_1 = require("../refunds.controller");
exports.billingRefundsController = {
    getRefunds: (req, res) => refunds_controller_1.refundsController.getRefunds(req, res),
    createRefund: (req, res) => refunds_controller_1.refundsController.createRefund(req, res),
    decideRefund: (req, res) => refunds_controller_1.refundsController.decideRefund(req, res),
    markPaid: (req, res) => refunds_controller_1.refundsController.markPaid(req, res),
};
