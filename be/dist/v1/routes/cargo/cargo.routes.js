"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoRoutes = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../../middlewares/siteScope");
const permission_1 = require("../../../middlewares/permission");
const cargo_1 = require("../../controllers/cargo");
exports.cargoRoutes = (0, express_1.Router)();
// Reference Data (Parties, Unit Types, Regimes, Holds, IMO)
exports.cargoRoutes.get('/cargo/parties', (0, siteScope_1.requireSite)(true), cargo_1.cargoReferenceController.getParties);
exports.cargoRoutes.get(['/cargo/unit-types', '/unit-types'], (0, siteScope_1.requireSite)(true), cargo_1.cargoReferenceController.getUnitTypes);
exports.cargoRoutes.get(['/cargo/regimes', '/cargo-regimes'], (0, siteScope_1.requireSite)(true), cargo_1.cargoReferenceController.getRegimes);
exports.cargoRoutes.get(['/cargo/hold-types', '/hold-types'], (0, siteScope_1.requireSite)(true), cargo_1.cargoReferenceController.getHoldTypes);
exports.cargoRoutes.get(['/cargo/imo-classes', '/imo-classes'], (0, siteScope_1.requireSite)(true), cargo_1.cargoReferenceController.getImoClasses);
exports.cargoRoutes.get(['/cargo/customs-ref-types', '/customs-ref-types'], (0, siteScope_1.requireSite)(true), cargo_1.cargoReferenceController.getCustomsRefTypes);
// Units
exports.cargoRoutes.get('/units', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoUnitsController.getUnits);
exports.cargoRoutes.post('/units', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoUnitsController.createUnit);
exports.cargoRoutes.get('/units/:unitStayId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoUnitsController.getUnitById);
exports.cargoRoutes.patch('/units/:unitStayId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoUnitsController.updateUnit);
exports.cargoRoutes.get('/units/:unitStayId/timeline', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoUnitsController.getUnitTimeline);
// Consignments
exports.cargoRoutes.get('/consignments', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoConsignmentsController.getConsignments);
exports.cargoRoutes.post('/consignments', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoConsignmentsController.createConsignment);
exports.cargoRoutes.get('/consignments/:consignmentId', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoConsignmentsController.getConsignmentById);
exports.cargoRoutes.patch('/consignments/:consignmentId', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoConsignmentsController.updateConsignment);
exports.cargoRoutes.get('/consignments/:consignmentId/lines', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoConsignmentsController.getConsignmentLines);
exports.cargoRoutes.put('/consignments/:consignmentId/lines', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoConsignmentsController.saveConsignmentLines);
exports.cargoRoutes.get('/consignments/:consignmentId/units', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoConsignmentsController.getConsignmentUnits);
// Vessel Calls
exports.cargoRoutes.get('/vessel-calls', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoVesselCallsController.getVesselCalls);
exports.cargoRoutes.post('/vessel-calls', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoVesselCallsController.createVesselCall);
exports.cargoRoutes.get('/vessel-calls/:vesselCallId', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoVesselCallsController.getVesselCallById);
exports.cargoRoutes.patch('/vessel-calls/:vesselCallId', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoVesselCallsController.updateVesselCall);
// Manifests
exports.cargoRoutes.get('/manifests', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('manifest.import'), cargo_1.cargoManifestsController.getManifests);
exports.cargoRoutes.post(['/manifests', '/manifests:import'], (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('manifest.import', 'DO'), cargo_1.cargoManifestsController.createManifest);
exports.cargoRoutes.post(['/manifests/evaluate', '/manifests:evaluate'], (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('manifest.import', 'DO'), cargo_1.cargoManifestsController.evaluateManifest);
exports.cargoRoutes.get('/manifests/:manifestId', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('manifest.import'), cargo_1.cargoManifestsController.getManifestById);
exports.cargoRoutes.get('/manifests/:manifestId/lines', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('manifest.import'), cargo_1.cargoManifestsController.getManifestLines);
exports.cargoRoutes.patch('/manifests/:manifestId/lines/:manifestLineId', (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('manifest.import', 'DO'), cargo_1.cargoManifestsController.updateManifestLine);
exports.cargoRoutes.post(['/manifests/:manifestId([0-9a-zA-Z_.-]+):apply', '/manifests/:manifestId/apply'], (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)('manifest.import', 'DO'), cargo_1.cargoManifestsController.applyManifest);
// Customs & Exams
exports.cargoRoutes.get('/customs/refs', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoCustomsController.getCustomsRefs);
exports.cargoRoutes.post('/customs/refs', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoCustomsController.createCustomsRef);
exports.cargoRoutes.get('/exams', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoCustomsController.getExams);
exports.cargoRoutes.post('/exams', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoCustomsController.createExam);
// Holds
exports.cargoRoutes.get('/holds', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoHoldsController.getHolds);
exports.cargoRoutes.post('/holds', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoHoldsController.createHold);
exports.cargoRoutes.post('/holds/:holdId([0-9a-zA-Z_.-]+):release', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoHoldsController.releaseHold);
// Release Orders
exports.cargoRoutes.get('/release-orders', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoReleasesController.getReleaseOrders);
exports.cargoRoutes.post('/release-orders', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoReleasesController.createReleaseOrder);
exports.cargoRoutes.get('/release-orders/:releaseOrderId', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoReleasesController.getReleaseOrderById);
exports.cargoRoutes.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):approve', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoReleasesController.approveReleaseOrder);
exports.cargoRoutes.post('/release-orders/:releaseOrderId/approve', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoReleasesController.approveReleaseOrder);
exports.cargoRoutes.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):cancel', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoReleasesController.cancelReleaseOrder);
exports.cargoRoutes.post('/release-orders/:releaseOrderId/cancel', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoReleasesController.cancelReleaseOrder);
exports.cargoRoutes.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):revalidate', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoReleasesController.revalidateReleaseOrder);
exports.cargoRoutes.post('/release-orders/:releaseOrderId/revalidate', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoReleasesController.revalidateReleaseOrder);
// Dangerous Goods
exports.cargoRoutes.get('/dg-lines', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoDangerousGoodsController.getDgLines);
exports.cargoRoutes.get('/units/:unitStayId/dg-lines', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.view'), cargo_1.cargoDangerousGoodsController.getUnitDgLines);
exports.cargoRoutes.put('/units/:unitStayId/dg-lines', (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)('consignment.edit', 'DO'), cargo_1.cargoDangerousGoodsController.saveDgLines);
