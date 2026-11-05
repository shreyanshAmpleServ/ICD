"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yardRoutes = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const yard_1 = require("../../controllers/yard");
const yard_designer_controller_1 = require("../../controllers/setup/yard-designer.controller");
exports.yardRoutes = (0, express_1.Router)();
// Yard Map & Locations
exports.yardRoutes.get('/yard/map', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.map.view'), yard_1.yardMapController.getYardMap);
exports.yardRoutes.get('/yard/blocks', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.map.view'), yard_1.yardMapController.getBlocks);
exports.yardRoutes.get('/yard/blocks/:blockId/slots', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.map.view'), yard_1.yardMapController.getBlockSlots);
exports.yardRoutes.get('/yard/occupancy', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.map.view'), yard_1.yardMapController.getOccupancy);
// Slot Blocking
exports.yardRoutes.post(['/yard/slots/:slotCode/block', '/yard/slots/block'], (0, siteScope_1.requireSite)(false), yard_1.yardMapController.blockSlot);
exports.yardRoutes.post(['/yard/slots/:slotCode/unblock', '/yard/slots/unblock'], (0, siteScope_1.requireSite)(false), yard_1.yardMapController.unblockSlot);
// Locations CRUD & Generation
exports.yardRoutes.get('/yard/locations', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.map.view'), yard_designer_controller_1.setupYardDesignerController.getYardLocations);
exports.yardRoutes.post('/yard/locations', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('admin.yard.design', 'DO'), yard_designer_controller_1.setupYardDesignerController.createYardLocation);
exports.yardRoutes.patch('/yard/locations/:locationId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('admin.yard.design', 'DO'), yard_designer_controller_1.setupYardDesignerController.updateYardLocation);
exports.yardRoutes.delete('/yard/locations/:locationId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('admin.yard.design', 'DO'), yard_designer_controller_1.setupYardDesignerController.deleteYardLocation);
exports.yardRoutes.post('/yard/locations/:locationId/generate', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('admin.yard.design', 'DO'), yard_designer_controller_1.setupYardDesignerController.generateSlots);
exports.yardRoutes.post('/yard/locations/:locationId:generate', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('admin.yard.design', 'DO'), yard_designer_controller_1.setupYardDesignerController.generateSlots);
exports.yardRoutes.post('/yard/locations:generate', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('admin.yard.design', 'DO'), yard_designer_controller_1.setupYardDesignerController.generateSlots);
exports.yardRoutes.post('/yard/locations/generate', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('admin.yard.design', 'DO'), yard_designer_controller_1.setupYardDesignerController.generateSlots);
// Move Orders
exports.yardRoutes.get(['/moves', '/move-orders', '/yard/moves'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.move.execute'), yard_1.yardMovesController.getMoveOrders);
exports.yardRoutes.post(['/moves', '/move-orders', '/yard/moves'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.move.execute', 'DO'), yard_1.yardMovesController.createMoveOrder);
exports.yardRoutes.post(['/moves/:moveOrderId/start', '/yard/moves/:moveOrderId/start'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.move.execute', 'DO'), yard_1.yardMovesController.startMove);
exports.yardRoutes.post(['/moves/:moveOrderId/complete', '/yard/moves/:moveOrderId/complete'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.move.execute', 'DO'), yard_1.yardMovesController.completeMove);
exports.yardRoutes.post(['/moves/:moveOrderId/assign', '/yard/moves/:moveOrderId/assign'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.move.execute', 'DO'), yard_1.yardMovesController.assignMove);
exports.yardRoutes.post(['/moves/:moveId/execute', '/yard/moves/:moveId/execute'], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.move.execute', 'DO'), yard_1.yardMovesController.executeMove);
exports.yardRoutes.get(['/yard/equipment', '/equipment'], (0, siteScope_1.requireSite)(false), yard_1.yardMovesController.getEquipment);
exports.yardRoutes.get('/locations', (0, siteScope_1.requireSite)(false), yard_1.yardMovesController.getLocations);
exports.yardRoutes.get(['/yard/operators', '/operators'], (0, siteScope_1.requireSite)(false), yard_1.yardMovesController.getOperators);
// Inspections
exports.yardRoutes.get('/inspections', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('inspection.perform'), yard_1.yardInspectionsController.getInspections);
exports.yardRoutes.post('/inspections', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('inspection.perform', 'DO'), yard_1.yardInspectionsController.createInspection);
exports.yardRoutes.get('/inspections/:inspectionId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('inspection.perform'), yard_1.yardInspectionsController.getInspectionById);
exports.yardRoutes.put('/inspections/:inspectionId/results', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('inspection.perform', 'DO'), yard_1.yardInspectionsController.saveResults);
exports.yardRoutes.post('/inspections/:inspectionId/complete', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('inspection.perform', 'DO'), yard_1.yardInspectionsController.completeInspection);
exports.yardRoutes.post('/inspections/:inspectionId/approve', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('inspection.perform', 'DO'), yard_1.yardInspectionsController.approveInspection);
// Vehicle Keys
exports.yardRoutes.get('/keys', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.key.custody'), yard_1.yardKeysController.getKeys);
exports.yardRoutes.post('/keys/:keyId/checkout', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.key.custody', 'DO'), yard_1.yardKeysController.checkoutKey);
exports.yardRoutes.post('/keys/:keyId/return', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('yard.key.custody', 'DO'), yard_1.yardKeysController.returnKey);
// CFS Jobs
exports.yardRoutes.get('/cfs/jobs', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('cfs.job.manage'), yard_1.yardCfsController.getJobs);
exports.yardRoutes.post('/cfs/jobs', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('cfs.job.manage', 'DO'), yard_1.yardCfsController.createJob);
// Reefers
exports.yardRoutes.get('/reefers/logs', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('reefer.manage'), yard_1.yardReefersController.getLogs);
exports.yardRoutes.post('/reefers/logs', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('reefer.manage', 'DO'), yard_1.yardReefersController.createLog);
// Repairs
exports.yardRoutes.get('/repairs/work-orders', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('repair.estimate'), yard_1.yardRepairsController.getWorkOrders);
exports.yardRoutes.post('/repairs/work-orders', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('repair.estimate', 'DO'), yard_1.yardRepairsController.createWorkOrder);
