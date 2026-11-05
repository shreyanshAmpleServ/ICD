"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashierRouter = void 0;
const express_1 = require("express");
const cashier_controller_1 = require("../controllers/cashier.controller");
const siteScope_1 = require("../../middlewares/siteScope");
exports.cashierRouter = (0, express_1.Router)();
// ==========================================
// 1. Payments Endpoints
// ==========================================
exports.cashierRouter.get('/payments', (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.getPayments);
exports.cashierRouter.post('/payments', (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.recordPayment);
exports.cashierRouter.get('/payments/:paymentId', (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.getPaymentById);
exports.cashierRouter.post(['/payments/:paymentId/allocate', '/payments/:paymentId([0-9a-zA-Z_.-]+):allocate'], (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.allocatePayment);
exports.cashierRouter.post(['/payments/:paymentId/reverse', '/payments/:paymentId([0-9a-zA-Z_.-]+):reverse'], (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.reversePayment);
exports.cashierRouter.get('/payments/:paymentId/receipt', (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.getPaymentReceipt);
// ==========================================
// 2. Cashier Shifts Endpoints
// ==========================================
exports.cashierRouter.get('/cashier-shifts', (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.getShifts);
exports.cashierRouter.post(['/cashier-shifts', '/cashier-shifts/open'], (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.openShift);
exports.cashierRouter.get('/cashier-shifts/current', (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.getCurrentShift);
exports.cashierRouter.post(['/cashier-shifts/:shiftId/close', '/cashier-shifts/:shiftId([0-9a-zA-Z_.-]+):close'], (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.closeShift);
exports.cashierRouter.post(['/cashier-shifts/:shiftId/approve', '/cashier-shifts/:shiftId([0-9a-zA-Z_.-]+):approve'], (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.approveShift);
// ==========================================
// 3. Payment Channels
// ==========================================
exports.cashierRouter.get(['/payment-channels', '/channels'], (0, siteScope_1.requireSite)(false), cashier_controller_1.cashierController.getChannels);
