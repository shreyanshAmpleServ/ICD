import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { requirePermission } from '../../../middlewares/permission';
import {
  yardMapController,
  yardMovesController,
  yardInspectionsController,
  yardKeysController,
  yardCfsController,
  yardReefersController,
  yardRepairsController,
} from '../../controllers/yard';

export const yardRoutes = Router();

// Yard Map & Locations
yardRoutes.get('/yard/map', requireSite(false), requirePermission('yard.map.view'), yardMapController.getYardMap);
yardRoutes.get('/yard/blocks', requireSite(false), requirePermission('yard.map.view'), yardMapController.getBlocks);
yardRoutes.get('/yard/occupancy', requireSite(false), requirePermission('yard.map.view'), yardMapController.getOccupancy);

// Move Orders
yardRoutes.get(['/moves', '/move-orders', '/yard/moves'], requireSite(false), requirePermission('yard.move.execute'), yardMovesController.getMoveOrders);
yardRoutes.post(['/moves', '/move-orders', '/yard/moves'], requireSite(false), requirePermission('yard.move.execute', 'DO'), yardMovesController.createMoveOrder);
yardRoutes.post(['/moves/:moveOrderId/start', '/yard/moves/:moveOrderId/start'], requireSite(false), requirePermission('yard.move.execute', 'DO'), yardMovesController.startMove);
yardRoutes.post(['/moves/:moveOrderId/complete', '/yard/moves/:moveOrderId/complete'], requireSite(false), requirePermission('yard.move.execute', 'DO'), yardMovesController.completeMove);
yardRoutes.post(['/moves/:moveOrderId/assign', '/yard/moves/:moveOrderId/assign'], requireSite(false), requirePermission('yard.move.execute', 'DO'), yardMovesController.assignMove);
yardRoutes.post(['/moves/:moveId/execute', '/yard/moves/:moveId/execute'], requireSite(false), requirePermission('yard.move.execute', 'DO'), yardMovesController.executeMove);
yardRoutes.get('/yard/equipment', requireSite(false), requirePermission('yard.move.execute'), yardMovesController.getEquipment);

// Inspections
yardRoutes.get('/inspections', requireSite(false), requirePermission('inspection.perform'), yardInspectionsController.getInspections);
yardRoutes.post('/inspections', requireSite(false), requirePermission('inspection.perform', 'DO'), yardInspectionsController.createInspection);
yardRoutes.get('/inspections/:inspectionId', requireSite(false), requirePermission('inspection.perform'), yardInspectionsController.getInspectionById);
yardRoutes.put('/inspections/:inspectionId/results', requireSite(false), requirePermission('inspection.perform', 'DO'), yardInspectionsController.saveResults);
yardRoutes.post('/inspections/:inspectionId/complete', requireSite(false), requirePermission('inspection.perform', 'DO'), yardInspectionsController.completeInspection);
yardRoutes.post('/inspections/:inspectionId/approve', requireSite(false), requirePermission('inspection.perform', 'DO'), yardInspectionsController.approveInspection);

// Vehicle Keys
yardRoutes.get('/keys', requireSite(false), requirePermission('yard.key.custody'), yardKeysController.getKeys);
yardRoutes.post('/keys/:keyId/checkout', requireSite(false), requirePermission('yard.key.custody', 'DO'), yardKeysController.checkoutKey);
yardRoutes.post('/keys/:keyId/return', requireSite(false), requirePermission('yard.key.custody', 'DO'), yardKeysController.returnKey);

// CFS Jobs
yardRoutes.get('/cfs/jobs', requireSite(false), requirePermission('cfs.job.manage'), yardCfsController.getJobs);
yardRoutes.post('/cfs/jobs', requireSite(false), requirePermission('cfs.job.manage', 'DO'), yardCfsController.createJob);

// Reefers
yardRoutes.get('/reefers/logs', requireSite(false), requirePermission('reefer.manage'), yardReefersController.getLogs);
yardRoutes.post('/reefers/logs', requireSite(false), requirePermission('reefer.manage', 'DO'), yardReefersController.createLog);

// Repairs
yardRoutes.get('/repairs/work-orders', requireSite(false), requirePermission('repair.estimate'), yardRepairsController.getWorkOrders);
yardRoutes.post('/repairs/work-orders', requireSite(false), requirePermission('repair.estimate', 'DO'), yardRepairsController.createWorkOrder);

