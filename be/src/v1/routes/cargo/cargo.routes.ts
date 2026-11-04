import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { requirePermission } from '../../../middlewares/permission';
import {
  cargoUnitsController,
  cargoConsignmentsController,
  cargoVesselCallsController,
  cargoManifestsController,
  cargoReferenceController,
  cargoCustomsController,
  cargoHoldsController,
  cargoReleasesController,
  cargoDangerousGoodsController,
} from '../../controllers/cargo';

export const cargoRoutes = Router();

// Reference Data (Parties, Unit Types, Regimes, Holds, IMO)
cargoRoutes.get('/cargo/parties', requireSite(true), cargoReferenceController.getParties);
cargoRoutes.get(['/cargo/unit-types', '/unit-types'], requireSite(true), cargoReferenceController.getUnitTypes);
cargoRoutes.get(['/cargo/regimes', '/cargo-regimes'], requireSite(true), cargoReferenceController.getRegimes);
cargoRoutes.get(['/cargo/hold-types', '/hold-types'], requireSite(true), cargoReferenceController.getHoldTypes);
cargoRoutes.get(['/cargo/imo-classes', '/imo-classes'], requireSite(true), cargoReferenceController.getImoClasses);
cargoRoutes.get(['/cargo/customs-ref-types', '/customs-ref-types'], requireSite(true), cargoReferenceController.getCustomsRefTypes);

// Units
cargoRoutes.get('/units', requireSite(false), requirePermission('consignment.view'), cargoUnitsController.getUnits);
cargoRoutes.post('/units', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoUnitsController.createUnit);
cargoRoutes.get('/units/:unitStayId', requireSite(false), requirePermission('consignment.view'), cargoUnitsController.getUnitById);
cargoRoutes.patch('/units/:unitStayId', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoUnitsController.updateUnit);
cargoRoutes.get('/units/:unitStayId/timeline', requireSite(false), requirePermission('consignment.view'), cargoUnitsController.getUnitTimeline);

// Consignments
cargoRoutes.get('/consignments', requireSite(true), requirePermission('consignment.view'), cargoConsignmentsController.getConsignments);
cargoRoutes.post('/consignments', requireSite(true), requirePermission('consignment.edit', 'DO'), cargoConsignmentsController.createConsignment);
cargoRoutes.get('/consignments/:consignmentId', requireSite(true), requirePermission('consignment.view'), cargoConsignmentsController.getConsignmentById);
cargoRoutes.patch('/consignments/:consignmentId', requireSite(true), requirePermission('consignment.edit', 'DO'), cargoConsignmentsController.updateConsignment);
cargoRoutes.get('/consignments/:consignmentId/lines', requireSite(true), requirePermission('consignment.view'), cargoConsignmentsController.getConsignmentLines);
cargoRoutes.put('/consignments/:consignmentId/lines', requireSite(true), requirePermission('consignment.edit', 'DO'), cargoConsignmentsController.saveConsignmentLines);
cargoRoutes.get('/consignments/:consignmentId/units', requireSite(true), requirePermission('consignment.view'), cargoConsignmentsController.getConsignmentUnits);

// Vessel Calls
cargoRoutes.get('/vessel-calls', requireSite(true), requirePermission('consignment.view'), cargoVesselCallsController.getVesselCalls);
cargoRoutes.post('/vessel-calls', requireSite(true), requirePermission('consignment.edit', 'DO'), cargoVesselCallsController.createVesselCall);
cargoRoutes.get('/vessel-calls/:vesselCallId', requireSite(true), requirePermission('consignment.view'), cargoVesselCallsController.getVesselCallById);
cargoRoutes.patch('/vessel-calls/:vesselCallId', requireSite(true), requirePermission('consignment.edit', 'DO'), cargoVesselCallsController.updateVesselCall);

// Manifests
cargoRoutes.get('/manifests', requireSite(true), requirePermission('manifest.import'), cargoManifestsController.getManifests);
cargoRoutes.post(['/manifests', '/manifests:import'], requireSite(true), requirePermission('manifest.import', 'DO'), cargoManifestsController.createManifest);
cargoRoutes.post(['/manifests/evaluate', '/manifests:evaluate'], requireSite(true), requirePermission('manifest.import', 'DO'), cargoManifestsController.evaluateManifest);
cargoRoutes.get('/manifests/:manifestId', requireSite(true), requirePermission('manifest.import'), cargoManifestsController.getManifestById);
cargoRoutes.get('/manifests/:manifestId/lines', requireSite(true), requirePermission('manifest.import'), cargoManifestsController.getManifestLines);
cargoRoutes.patch('/manifests/:manifestId/lines/:manifestLineId', requireSite(true), requirePermission('manifest.import', 'DO'), cargoManifestsController.updateManifestLine);
cargoRoutes.post(['/manifests/:manifestId([0-9a-zA-Z_.-]+):apply', '/manifests/:manifestId/apply'], requireSite(true), requirePermission('manifest.import', 'DO'), cargoManifestsController.applyManifest);

// Customs & Exams
cargoRoutes.get('/customs/refs', requireSite(false), requirePermission('consignment.view'), cargoCustomsController.getCustomsRefs);
cargoRoutes.post('/customs/refs', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoCustomsController.createCustomsRef);
cargoRoutes.get('/exams', requireSite(false), requirePermission('consignment.view'), cargoCustomsController.getExams);
cargoRoutes.post('/exams', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoCustomsController.createExam);

// Holds
cargoRoutes.get('/holds', requireSite(false), requirePermission('consignment.view'), cargoHoldsController.getHolds);
cargoRoutes.post('/holds', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoHoldsController.createHold);
cargoRoutes.post('/holds/:holdId([0-9a-zA-Z_.-]+):release', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoHoldsController.releaseHold);

// Release Orders
cargoRoutes.get('/release-orders', requireSite(false), requirePermission('consignment.view'), cargoReleasesController.getReleaseOrders);
cargoRoutes.post('/release-orders', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoReleasesController.createReleaseOrder);
cargoRoutes.get('/release-orders/:releaseOrderId', requireSite(false), requirePermission('consignment.view'), cargoReleasesController.getReleaseOrderById);
cargoRoutes.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):approve', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoReleasesController.approveReleaseOrder);
cargoRoutes.post('/release-orders/:releaseOrderId/approve', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoReleasesController.approveReleaseOrder);
cargoRoutes.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):cancel', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoReleasesController.cancelReleaseOrder);
cargoRoutes.post('/release-orders/:releaseOrderId/cancel', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoReleasesController.cancelReleaseOrder);
cargoRoutes.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):revalidate', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoReleasesController.revalidateReleaseOrder);
cargoRoutes.post('/release-orders/:releaseOrderId/revalidate', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoReleasesController.revalidateReleaseOrder);

// Dangerous Goods
cargoRoutes.get('/dg-lines', requireSite(false), requirePermission('consignment.view'), cargoDangerousGoodsController.getDgLines);
cargoRoutes.get('/units/:unitStayId/dg-lines', requireSite(false), requirePermission('consignment.view'), cargoDangerousGoodsController.getUnitDgLines);
cargoRoutes.put('/units/:unitStayId/dg-lines', requireSite(false), requirePermission('consignment.edit', 'DO'), cargoDangerousGoodsController.saveDgLines);

