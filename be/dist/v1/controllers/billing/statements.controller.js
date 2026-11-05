"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingStatementsController = void 0;
const statements_controller_1 = require("../statements.controller");
exports.billingStatementsController = {
    getStatements: (req, res) => statements_controller_1.statementsController.getStatements(req, res),
    getStatementByPartyId: (req, res) => statements_controller_1.statementsController.getStatementByPartyId(req, res),
    getStatementPdf: (req, res) => statements_controller_1.statementsController.getStatementPdf(req, res),
};
