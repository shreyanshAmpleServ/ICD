import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { requirePermission } from '../../../middlewares/permission';
import {
  controlApprovalsController,
  controlExceptionsController,
  controlReportsController,
  controlKpisController,
  controlForecastsController,
  controlAuditController,
  controlTowerController,
} from '../../controllers/control';

export const controlRoutes = Router();

// Approvals
controlRoutes.get('/approvals', requireSite(false), requirePermission('masters.view'), controlApprovalsController.getApprovals);
controlRoutes.post('/approvals/:approvalId/action', requireSite(false), requirePermission('masters.view', 'DO'), controlApprovalsController.actionApproval);
controlRoutes.post('/approvals/:approvalId/act', requireSite(false), requirePermission('masters.view', 'DO'), controlApprovalsController.actionApproval);
controlRoutes.post('/approvals/:approvalId:decide', requireSite(false), requirePermission('masters.view', 'DO'), controlApprovalsController.actionApproval);

// Exceptions
controlRoutes.get('/exceptions', requireSite(false), requirePermission('exception.view'), controlExceptionsController.getExceptions);
controlRoutes.post('/exceptions/:exceptionId/resolve', requireSite(false), requirePermission('exception.view', 'DO'), controlExceptionsController.resolveException);

// Reports
controlRoutes.get('/reports', requireSite(false), requirePermission('reports.operational'), controlReportsController.getOperationalReports);

// KPIs
controlRoutes.get('/kpis', requireSite(false), requirePermission('dashboard.executive'), controlKpisController.getKpis);

// Forecasts
controlRoutes.get('/forecasts', requireSite(false), requirePermission('yard.map.view'), controlForecastsController.getForecasts);

// Audit Trail
controlRoutes.get('/audit', requireSite(false), requirePermission('admin.audit.view'), controlAuditController.getAuditTrail);

// Control Tower
controlRoutes.get(['/dashboards/control-tower', '/control-tower'], requireSite(false), requirePermission('dashboard.control_tower'), controlTowerController.getControlTower);
controlRoutes.get('/control-tower/status', requireSite(false), requirePermission('dashboard.control_tower'), controlTowerController.getStatus);

