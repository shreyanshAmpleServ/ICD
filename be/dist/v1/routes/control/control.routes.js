"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controlRoutes = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const control_1 = require("../../controllers/control");
exports.controlRoutes = (0, express_1.Router)();
// Approvals
exports.controlRoutes.get('/approvals', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('masters.view'), control_1.controlApprovalsController.getApprovals);
exports.controlRoutes.post('/approvals/:approvalId/action', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('masters.view', 'DO'), control_1.controlApprovalsController.actionApproval);
exports.controlRoutes.post('/approvals/:approvalId/act', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('masters.view', 'DO'), control_1.controlApprovalsController.actionApproval);
exports.controlRoutes.post('/approvals/:approvalId:decide', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('masters.view', 'DO'), control_1.controlApprovalsController.actionApproval);
// Exceptions
exports.controlRoutes.get('/exceptions', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('exception.view'), control_1.controlExceptionsController.getExceptions);
exports.controlRoutes.post('/exceptions/:exceptionId/resolve', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('exception.view', 'DO'), control_1.controlExceptionsController.resolveException);
// Reports
exports.controlRoutes.get('/reports', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('reports.operational'), control_1.controlReportsController.getOperationalReports);
// KPIs
exports.controlRoutes.get('/kpis', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('dashboard.executive'), control_1.controlKpisController.getKpis);
// Forecasts
exports.controlRoutes.get('/forecasts', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.map.view'), control_1.controlForecastsController.getForecasts);
// Audit Trail
exports.controlRoutes.get('/audit', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('admin.audit.view'), control_1.controlAuditController.getAuditTrail);
// Control Tower
exports.controlRoutes.get('/control-tower/status', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('dashboard.control_tower'), control_1.controlTowerController.getStatus);
