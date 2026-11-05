"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingDisbursementsController = void 0;
const disbursements_controller_1 = require("../disbursements.controller");
exports.billingDisbursementsController = {
    getDisbursements: (req, res) => disbursements_controller_1.disbursementsController.getDisbursements(req, res),
    getDisbursementById: (req, res) => disbursements_controller_1.disbursementsController.getDisbursementById(req, res),
    createDisbursement: (req, res) => disbursements_controller_1.disbursementsController.createDisbursement(req, res),
    writeOffDisbursement: (req, res) => disbursements_controller_1.disbursementsController.writeOffDisbursement(req, res),
};
