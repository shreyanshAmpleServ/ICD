import { Router } from 'express';
import { requireSite } from '../../../middlewares/siteScope';
import { requirePermission } from '../../../middlewares/permission';
import {
  setupSitesController,
  setupYardDesignerController,
  setupGatesController,
  setupUnitTypesController,
  setupMastersController,
  setupUsersController,
  setupRulesController,
  setupInspectionController,
  setupFinanceController,
  setupNotificationsController,
  setupDocumentsController,
  setupDevicesController,
  setupSyncController,
  setupModelsController,
  setupSettingsController,
} from '../../controllers/setup';

export const setupRoutes = Router();

// 1. Company & Sites
setupRoutes.get('/companies', requireSite(true), requirePermission('masters.view'), setupSitesController.getCompanies);
setupRoutes.post('/companies', requireSite(true), requirePermission('admin.site.manage', 'DO'), setupSitesController.createCompany);
setupRoutes.patch('/companies/:companyId', requireSite(true), requirePermission('admin.site.manage', 'DO'), setupSitesController.updateCompany);

setupRoutes.get('/sites', requireSite(true), requirePermission('masters.view'), setupSitesController.getSites);
setupRoutes.post('/sites', requireSite(true), requirePermission('admin.site.manage', 'DO'), setupSitesController.createSite);
setupRoutes.patch('/sites/:siteId', requireSite(true), requirePermission('admin.site.manage', 'DO'), setupSitesController.updateSite);

setupRoutes.get('/country-packs', requireSite(true), requirePermission('masters.view'), setupSitesController.getCountryPacks);
setupRoutes.post('/country-packs', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSitesController.createCountryPack);
setupRoutes.patch('/country-packs/:countryCode', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSitesController.updateCountryPack);

// 2. Yard Designer
setupRoutes.get('/yard/locations', requireSite(false), requirePermission('yard.map.view'), setupYardDesignerController.getYardLocations);
setupRoutes.post('/yard/locations', requireSite(false), requirePermission('admin.yard.design', 'DO'), setupYardDesignerController.createYardLocation);
setupRoutes.patch('/yard/locations/:locationId', requireSite(false), requirePermission('admin.yard.design', 'DO'), setupYardDesignerController.updateYardLocation);
setupRoutes.delete('/yard/locations/:locationId', requireSite(false), requirePermission('admin.yard.design', 'DO'), setupYardDesignerController.deleteYardLocation);
setupRoutes.post('/yard/locations/:locationId/generate', requireSite(false), requirePermission('admin.yard.design', 'DO'), setupYardDesignerController.generateSlots);
setupRoutes.post('/yard/locations/:locationId:generate', requireSite(false), requirePermission('admin.yard.design', 'DO'), setupYardDesignerController.generateSlots);
setupRoutes.post('/yard/locations:generate', requireSite(false), requirePermission('admin.yard.design', 'DO'), setupYardDesignerController.generateSlots);
setupRoutes.post('/yard/locations/generate', requireSite(false), requirePermission('admin.yard.design', 'DO'), setupYardDesignerController.generateSlots);
setupRoutes.post(
  ['/yard/slots/:slotCode/block', '/yard/slots/block', '/yard/locations/:locationId/block', '/yard/locations/:locationId([0-9a-zA-Z_.-]+):block'],
  requireSite(false),
  requirePermission('admin.yard.design', 'DO'),
  setupYardDesignerController.blockSlot
);
setupRoutes.post(
  ['/yard/slots/:slotCode/unblock', '/yard/slots/unblock', '/yard/locations/:locationId/unblock', '/yard/locations/:locationId([0-9a-zA-Z_.-]+):unblock'],
  requireSite(false),
  requirePermission('admin.yard.design', 'DO'),
  setupYardDesignerController.unblockSlot
);

// 3. Gates & Visit Types
setupRoutes.get('/gates', requireSite(false), requirePermission('masters.view'), setupGatesController.getGates);
setupRoutes.get('/gates/:gateId', requireSite(false), requirePermission('masters.view'), setupGatesController.getGateById);
setupRoutes.post('/gates', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.createGate);
setupRoutes.patch('/gates/:gateId', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.updateGate);
setupRoutes.delete('/gates/:gateId', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.deleteGate);
setupRoutes.post('/gates/:gateId/lanes', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.createLane);
setupRoutes.patch('/gate-lanes/:laneId', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.updateLane);
setupRoutes.delete('/gate-lanes/:laneId', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.deleteLane);

setupRoutes.get('/checkpoints', requireSite(false), requirePermission('masters.view'), setupGatesController.getCheckpoints);
setupRoutes.get('/checkpoints/:checkpointId', requireSite(false), requirePermission('masters.view'), setupGatesController.getCheckpointById);
setupRoutes.post('/checkpoints', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.createCheckpoint);
setupRoutes.patch('/checkpoints/:checkpointId', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.updateCheckpoint);
setupRoutes.delete('/checkpoints/:checkpointId', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.deleteCheckpoint);

setupRoutes.get('/visit-types', requireSite(false), requirePermission('masters.view'), setupGatesController.getVisitTypes);
setupRoutes.get('/visit-types/:visitTypeId', requireSite(false), requirePermission('masters.view'), setupGatesController.getVisitTypeById);
setupRoutes.post('/visit-types', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.createVisitType);
setupRoutes.patch('/visit-types/:visitTypeId', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.updateVisitType);
setupRoutes.delete('/visit-types/:visitTypeId', requireSite(false), requirePermission('admin.gate.configure', 'DO'), setupGatesController.deleteVisitType);

// 4. Unit Types & Cargo Regimes
setupRoutes.get('/unit-types', requireSite(true), requirePermission('masters.view'), setupUnitTypesController.getUnitTypes);
setupRoutes.post('/unit-types', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupUnitTypesController.createUnitType);
setupRoutes.patch('/unit-types/:unitTypeId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupUnitTypesController.updateUnitType);

setupRoutes.get('/cargo-regimes', requireSite(true), requirePermission('masters.view'), setupUnitTypesController.getCargoRegimes);

// 5. Trucks, Drivers, Vessels Masters
setupRoutes.get('/trucks', requireSite(true), requirePermission('masters.view'), setupMastersController.getTrucks);
setupRoutes.post('/trucks', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.createTruck);
setupRoutes.patch('/trucks/:truckId', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.updateTruck);

setupRoutes.get('/drivers', requireSite(true), requirePermission('masters.view'), setupMastersController.getDrivers);
setupRoutes.post('/drivers', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.createDriver);
setupRoutes.patch('/drivers/:driverId', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.updateDriver);

setupRoutes.get('/vessels', requireSite(true), requirePermission('masters.view'), setupMastersController.getVessels);
setupRoutes.post('/vessels', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.createVessel);
setupRoutes.patch('/vessels/:vesselId', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.updateVessel);

setupRoutes.get('/ports', requireSite(true), requirePermission('masters.view'), setupMastersController.getPorts);
setupRoutes.post('/ports', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.createPort);
setupRoutes.patch('/ports/:portId', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.updatePort);

setupRoutes.get('/commodities', requireSite(true), requirePermission('masters.view'), setupMastersController.getCommodities);
setupRoutes.post('/commodities', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.createCommodity);
setupRoutes.patch('/commodities/:commodityId', requireSite(true), requirePermission('masters.view', 'DO'), setupMastersController.updateCommodity);

setupRoutes.get('/equipment', requireSite(false), requirePermission('masters.view'), setupMastersController.getEquipment);
setupRoutes.post('/equipment', requireSite(false), requirePermission('masters.view', 'DO'), setupMastersController.createEquipment);
setupRoutes.patch('/equipment/:equipmentId', requireSite(false), requirePermission('masters.view', 'DO'), setupMastersController.updateEquipment);

// 6. Users & Roles (Global Administration)
setupRoutes.get('/users', requireSite(true), requirePermission('masters.view'), setupUsersController.getUsers);
setupRoutes.post('/users', requireSite(true), requirePermission('admin.users.manage', 'DO'), setupUsersController.createUser);
setupRoutes.patch('/users/:userId', requireSite(true), requirePermission('admin.users.manage', 'DO'), setupUsersController.updateUser);
setupRoutes.post('/users/:userId/roles', requireSite(true), requirePermission('admin.users.manage', 'DO'), setupUsersController.grantRole);
setupRoutes.delete('/users/:userId/roles/:roleGrantIdOrCode', requireSite(true), requirePermission('admin.users.manage', 'DO'), setupUsersController.revokeRole);
setupRoutes.post('/users/:userId/activate', requireSite(true), requirePermission('admin.users.manage', 'DO'), setupUsersController.activateUser);
setupRoutes.post('/users/:userId/deactivate', requireSite(true), requirePermission('admin.users.manage', 'DO'), setupUsersController.deactivateUser);

setupRoutes.get('/roles', requireSite(false), requirePermission('masters.view'), setupUsersController.getRoles);
setupRoutes.post('/roles', requireSite(false), requirePermission('admin.users.manage', 'DO'), setupUsersController.createRole);
setupRoutes.patch('/roles/:roleId', requireSite(false), requirePermission('admin.users.manage', 'DO'), setupUsersController.updateRole);
setupRoutes.put('/roles/:roleId/permissions', requireSite(false), requirePermission('admin.users.manage', 'DO'), setupUsersController.updateRolePermissions);
setupRoutes.patch('/roles/:roleId/permissions', requireSite(false), requirePermission('admin.users.manage', 'DO'), setupUsersController.updateRolePermissions);

setupRoutes.get('/permissions', requireSite(false), requirePermission('masters.view'), setupUsersController.getPermissions);
setupRoutes.post('/permissions', requireSite(false), requirePermission('admin.users.manage', 'DO'), setupUsersController.createPermission);

setupRoutes.get('/delegations', requireSite(false), requirePermission('masters.view'), setupUsersController.getDelegations);
setupRoutes.post('/delegations', requireSite(false), requirePermission('admin.users.manage', 'DO'), setupUsersController.createDelegation);
setupRoutes.post(['/delegations/:delegationId:revoke', '/delegations/:delegationId/revoke'], requireSite(false), requirePermission('admin.users.manage', 'DO'), setupUsersController.revokeDelegation);
setupRoutes.delete('/delegations/:delegationId', requireSite(false), requirePermission('admin.users.manage', 'DO'), setupUsersController.revokeDelegation);

// 7. Rules, Holds & Approvals Policies
setupRoutes.get('/hold-types', requireSite(true), requirePermission('masters.view'), setupRulesController.getHoldTypes);
setupRoutes.post('/hold-types', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupRulesController.createHoldType);
setupRoutes.patch('/hold-types/:holdTypeId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupRulesController.updateHoldType);

setupRoutes.get('/release-rules', requireSite(true), requirePermission('masters.view'), setupRulesController.getReleaseRules);
setupRoutes.post('/release-rules', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupRulesController.createReleaseRule);
setupRoutes.patch('/release-rules/:ruleId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupRulesController.updateReleaseRule);

setupRoutes.get('/approval-policies', requireSite(true), requirePermission('masters.view'), setupRulesController.getApprovalPolicies);
setupRoutes.post('/approval-policies', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupRulesController.createApprovalPolicy);
setupRoutes.patch('/approval-policies/:policyId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupRulesController.updateApprovalPolicy);

setupRoutes.get('/exception-types', requireSite(true), requirePermission('masters.view'), setupRulesController.getExceptionTypes);
setupRoutes.post('/exception-types', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupRulesController.createExceptionType);
setupRoutes.patch('/exception-types/:typeId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupRulesController.updateExceptionType);

// 8. Inspection Checklists & Damage Codes
setupRoutes.get('/inspection-templates', requireSite(true), requirePermission('masters.view'), setupInspectionController.getInspectionTemplates);
setupRoutes.post('/inspection-templates', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupInspectionController.createInspectionTemplate);
setupRoutes.patch('/inspection-templates/:templateId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupInspectionController.updateInspectionTemplate);

setupRoutes.get('/damage-codes', requireSite(true), requirePermission('masters.view'), setupInspectionController.getDamageCodes);
setupRoutes.post('/damage-codes', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupInspectionController.createDamageCode);
setupRoutes.patch('/damage-codes/:codeId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupInspectionController.updateDamageCode);

// 9. Finance Setup
setupRoutes.get('/accounting-periods', requireSite(true), requirePermission('masters.view'), setupFinanceController.getAccountingPeriods);
setupRoutes.post('/accounting-periods', requireSite(true), requirePermission('finance.period.close', 'DO'), setupFinanceController.createAccountingPeriod);
setupRoutes.patch('/accounting-periods/:periodId', requireSite(true), requirePermission('finance.period.close', 'DO'), setupFinanceController.updateAccountingPeriod);
setupRoutes.post(
  ['/accounting-periods/:periodKey:close', '/accounting-periods/:periodKey/close'],
  requireSite(true),
  requirePermission('finance.period.close', 'DO'),
  setupFinanceController.closePeriod
);
setupRoutes.post(
  ['/accounting-periods/:periodKey:reopen', '/accounting-periods/:periodKey/reopen'],
  requireSite(true),
  requirePermission('finance.period.close', 'DO'),
  setupFinanceController.reopenPeriod
);

setupRoutes.get('/charge-codes', requireSite(true), requirePermission('masters.view'), setupFinanceController.getChargeCodes);
setupRoutes.post('/charge-codes', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupFinanceController.createChargeCode);
setupRoutes.patch('/charge-codes/:chargeCodeId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupFinanceController.updateChargeCode);

setupRoutes.get('/tax-codes', requireSite(true), requirePermission('masters.view'), setupFinanceController.getTaxCodes);
setupRoutes.post('/tax-codes', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupFinanceController.createTaxCode);
setupRoutes.patch('/tax-codes/:taxCodeId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupFinanceController.updateTaxCode);

setupRoutes.get('/payment-channels', requireSite(true), requirePermission('masters.view'), setupFinanceController.getPaymentChannels);
setupRoutes.post('/payment-channels', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupFinanceController.createPaymentChannel);
setupRoutes.patch('/payment-channels/:channelId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupFinanceController.updatePaymentChannel);

setupRoutes.get('/gl-settings', requireSite(true), requirePermission('masters.view'), setupFinanceController.getGlSettings);
setupRoutes.post('/gl-settings', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupFinanceController.createGlSetting);
setupRoutes.patch('/gl-settings/:glSettingId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupFinanceController.updateGlSetting);

// 10. Notifications & Printing
setupRoutes.get('/notification-templates', requireSite(true), requirePermission('masters.view'), setupNotificationsController.getNotificationTemplates);
setupRoutes.post('/notification-templates', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupNotificationsController.createNotificationTemplate);
setupRoutes.patch('/notification-templates/:templateId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupNotificationsController.updateNotificationTemplate);

setupRoutes.get('/notification-rules', requireSite(true), requirePermission('masters.view'), setupNotificationsController.getNotificationRules);
setupRoutes.post('/notification-rules', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupNotificationsController.createNotificationRule);
setupRoutes.patch('/notification-rules/:ruleId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupNotificationsController.updateNotificationRule);

setupRoutes.get('/print-templates', requireSite(true), requirePermission('masters.view'), setupNotificationsController.getPrintTemplates);
setupRoutes.post('/print-templates', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupNotificationsController.createPrintTemplate);
setupRoutes.patch('/print-templates/:templateId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupNotificationsController.updatePrintTemplate);

// 11. Documents & Number Sequences
setupRoutes.get('/number-sequences', requireSite(true), requirePermission('masters.view'), setupDocumentsController.getNumberSequences);
setupRoutes.post('/number-sequences', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupDocumentsController.createNumberSequence);
setupRoutes.patch('/number-sequences/:sequenceId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupDocumentsController.updateNumberSequence);

setupRoutes.get('/document-types', requireSite(true), requirePermission('masters.view'), setupDocumentsController.getDocumentTypes);
setupRoutes.post('/document-types', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupDocumentsController.createDocumentType);
setupRoutes.patch('/document-types/:documentTypeId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupDocumentsController.updateDocumentType);

// 12. Devices & Integrations
setupRoutes.get('/devices', requireSite(false), requirePermission('masters.view'), setupDevicesController.getDevices);
setupRoutes.post('/devices', requireSite(false), requirePermission('admin.device.manage', 'DO'), setupDevicesController.createDevice);
setupRoutes.patch('/devices/:deviceId', requireSite(false), requirePermission('admin.device.manage', 'DO'), setupDevicesController.updateDevice);
setupRoutes.post(
  ['/devices/:deviceId:revoke', '/devices/:deviceId/revoke'],
  requireSite(false),
  requirePermission('admin.device.manage', 'DO'),
  setupDevicesController.revokeDevice
);
setupRoutes.delete(
  '/devices/:deviceId',
  requireSite(false),
  requirePermission('admin.device.manage', 'DO'),
  setupDevicesController.revokeDevice
);

setupRoutes.get('/device-integrations', requireSite(false), requirePermission('masters.view'), setupDevicesController.getDeviceIntegrations);
setupRoutes.post('/device-integrations', requireSite(false), requirePermission('admin.device.manage', 'DO'), setupDevicesController.createDeviceIntegration);
setupRoutes.patch('/device-integrations/:integrationId', requireSite(false), requirePermission('admin.device.manage', 'DO'), setupDevicesController.updateDeviceIntegration);

// 13. Sync Status & Outbox
setupRoutes.get('/sync/status', requireSite(true), requirePermission('masters.view'), setupSyncController.getSyncStatus);
setupRoutes.post('/sync/status', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSyncController.createSyncStatus);
setupRoutes.patch('/sync/status/:entityName', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSyncController.updateSyncStatus);

setupRoutes.get('/sync/outbox', requireSite(true), requirePermission('masters.view'), setupSyncController.getOutbox);
setupRoutes.post('/sync/outbox', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSyncController.createOutbox);
setupRoutes.patch('/sync/outbox/:outboxId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSyncController.updateOutbox);

// 14. Prediction Models
setupRoutes.get('/models', requireSite(true), requirePermission('masters.view'), setupModelsController.getModels);
setupRoutes.post('/models', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupModelsController.createModel);
setupRoutes.patch('/models/:modelId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupModelsController.updateModel);

// 15. Field Rules & Calendars
setupRoutes.get('/field-rules', requireSite(true), requirePermission('masters.view'), setupSettingsController.getFieldRules);
setupRoutes.post('/field-rules', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSettingsController.createFieldRule);
setupRoutes.patch('/field-rules/:fieldRuleId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSettingsController.updateFieldRule);

setupRoutes.get('/calendars', requireSite(true), requirePermission('masters.view'), setupSettingsController.getCalendars);
setupRoutes.post('/calendars', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSettingsController.createCalendar);
setupRoutes.patch('/calendars/:calendarId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSettingsController.updateCalendar);

setupRoutes.get('/calendars/:calendarId/holidays', requireSite(true), requirePermission('masters.view'), setupSettingsController.getHolidays);
setupRoutes.post('/calendars/:calendarId/holidays', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSettingsController.createHoliday);
setupRoutes.patch('/calendars/:calendarId/holidays/:holidayId', requireSite(true), requirePermission('admin.config.manage', 'DO'), setupSettingsController.updateHoliday);

