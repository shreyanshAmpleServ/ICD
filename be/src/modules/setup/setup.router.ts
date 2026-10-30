import { Router } from "express";
import { requireSite } from "../../middlewares/siteScope";
import { requirePermission } from "../../middlewares/permission";
import { setupService } from "./setup.service";
import { FIELD_CATALOGUE } from "../../data/admin";
import { auditLog } from "../../data/insight";

const router = Router();

// In-memory documents store
interface StoredDoc {
  documentId: number;
  siteId?: number;
  documentTypeId: number;
  docTypeCode: string;
  docTypeName: string;
  entityName: string;
  entityId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  fileContentBase64?: string;
  isArchived: boolean;
  logInst: number;
}

const mockDocuments: StoredDoc[] = [
  {
    documentId: 101,
    siteId: 1,
    documentTypeId: 1,
    docTypeCode: "BL",
    docTypeName: "Bill of Lading",
    entityName: "consignment",
    entityId: "101",
    fileName: "BL-MSK-2026-9901.pdf",
    fileSizeBytes: 245100,
    mimeType: "application/pdf",
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    uploadedBy: "Juma M.",
    fileContentBase64: "JVBERi0xLjQKJcTl8uXr...",
    isArchived: false,
    logInst: 1,
  },
  {
    documentId: 102,
    siteId: 1,
    documentTypeId: 3,
    docTypeCode: "TANSAD",
    docTypeName: "Customs Declaration",
    entityName: "consignment",
    entityId: "101",
    fileName: "TANSAD-TZ-2026-881.pdf",
    fileSizeBytes: 184500,
    mimeType: "application/pdf",
    uploadedAt: new Date(Date.now() - 43200000).toISOString(),
    uploadedBy: "Rehema K.",
    fileContentBase64: "JVBERi0xLjQKJcTl8uXr...",
    isArchived: false,
    logInst: 1,
  },
];

// =========================================================================
// 1. Companies & Sites
// =========================================================================
router.get("/companies", requireSite(true), requirePermission("masters.view"), async (_req, res) => {
  const comp = await setupService.getCompany();
  res.json({ items: [comp], total: 1, nextCursor: null });
});

router.post("/companies", requireSite(true), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  const comp = await setupService.updateCompany(1, req.body);
  res.status(201).json(comp);
});

router.get("/companies/:companyId", requireSite(true), requirePermission("masters.view"), async (req, res) => {
  const comp = await setupService.getCompany(Number(req.params.companyId) || 1);
  res.json(comp);
});

router.patch("/companies/:companyId", requireSite(true), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  const comp = await setupService.updateCompany(Number(req.params.companyId) || 1, req.body);
  res.json(comp);
});

// Country Packs
router.get("/country-packs", requireSite(true), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getCountryPacks();
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/country-packs/:packCode:activate", requireSite(true), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  const pack = await setupService.activateCountryPack(req.params.packCode);
  res.json(pack);
});

// Sites
router.get("/sites", requireSite(true), requirePermission("masters.view"), async (req, res) => {
  const { active, isActive, q } = req.query;
  let items = await setupService.getSites();
  if (active !== undefined || isActive !== undefined) {
    const act = String(active ?? isActive).toLowerCase() === "true";
    items = items.filter((s) => s.isActive === act);
  }
  if (q) {
    const query = String(q).toLowerCase();
    items = items.filter((s) => s.siteCode.toLowerCase().includes(query) || s.siteName.toLowerCase().includes(query));
  }
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/sites/:siteId", requireSite(true), requirePermission("masters.view"), async (req, res) => {
  const sites = await setupService.getSites();
  const site = sites.find((s) => String(s.siteId) === req.params.siteId || s.siteCode.toUpperCase() === req.params.siteId.toUpperCase());
  if (!site) return res.status(404).json({ error: "Site not found" });
  res.json(site);
});

router.post("/sites", requireSite(true), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  const site = await setupService.createSite(req.body);
  res.status(201).json(site);
});

router.patch("/sites/:siteId", requireSite(true), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  const site = await setupService.updateSite(req.params.siteId, req.body);
  res.json(site);
});

// =========================================================================
// 2. Yard Designer
// =========================================================================
router.get("/yard/locations", requireSite(false), requirePermission("masters.view"), async (req, res) => {
  const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;
  const items = await setupService.getYardLocations(siteId);
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/yard/locations", requireSite(false), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  const node = await setupService.createYardLocation(req.body);
  res.status(201).json(node);
});

router.patch("/yard/locations/:id", requireSite(false), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  res.json({ id: req.params.id, ...req.body });
});

// =========================================================================
// 3. Gates & Visit Types
// =========================================================================
router.get("/gates", requireSite(false), requirePermission("masters.view"), async (req, res) => {
  const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;
  const items = await setupService.getGates(siteId);
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/checkpoints", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getCheckpoints();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/visit-types", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getVisitTypes();
  res.json({ items, total: items.length, nextCursor: null });
});

router.patch("/visit-types/:id", requireSite(false), requirePermission("admin.config.manage", "DO"), async (req, res) => {
  const updated = await setupService.updateVisitType(Number(req.params.id), req.body);
  res.json(updated);
});

// =========================================================================
// 4. Unit Types & Checks
// =========================================================================
router.get("/unit-types", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getUnitTypes();
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/unit-types", requireSite(false), requirePermission("admin.config.manage", "DO"), async (req, res) => {
  const created = await setupService.createUnitType(req.body);
  res.status(201).json(created);
});

router.patch("/unit-types/:code", requireSite(false), requirePermission("admin.config.manage", "DO"), async (req, res) => {
  const updated = await setupService.updateUnitType(req.params.code, req.body);
  res.json(updated);
});

router.get("/cargo-regimes", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getCargoRegimes();
  res.json({ items, total: items.length, nextCursor: null });
});

// =========================================================================
// 5. Trucks, Drivers, Vessels, Masters
// =========================================================================
router.get("/trucks", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getTrucks();
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/trucks", requireSite(false), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  const created = await setupService.createTruck(req.body);
  res.status(201).json(created);
});

router.get("/drivers", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getDrivers();
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/drivers", requireSite(false), requirePermission("admin.site.manage", "DO"), async (req, res) => {
  const created = await setupService.createDriver(req.body);
  res.status(201).json(created);
});

router.get("/vessels", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getVessels();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/ports", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getPorts();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/commodities", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getCommodities();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/equipment", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getEquipment();
  res.json({ items, total: items.length, nextCursor: null });
});

// =========================================================================
// 6. Users & Roles
// =========================================================================
router.get("/users", requireSite(true), requirePermission("admin.users.manage"), async (_req, res) => {
  const items = await setupService.getUsers();
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/users", requireSite(true), requirePermission("admin.users.manage", "DO"), async (req, res) => {
  const created = await setupService.createUser(req.body);
  res.status(201).json(created);
});

router.patch("/users/:id", requireSite(true), requirePermission("admin.users.manage", "DO"), async (req, res) => {
  const updated = await setupService.updateUser(Number(req.params.id), req.body);
  res.json(updated);
});

router.get("/roles", requireSite(true), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getRoles();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/permissions", requireSite(true), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getPermissions();
  res.json({ items, total: items.length, nextCursor: null });
});

// =========================================================================
// 7. Holds, Release & Approvals
// =========================================================================
router.get("/hold-types", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = [
    { holdCode: 'CUSTOMS', holdName: 'Customs Examination Hold', authorityName: 'TRA Customs', defaultReason: 'Routine physical inspection required' },
    { holdCode: 'FINANCE', holdName: 'Outstanding Payment Hold', authorityName: 'DCC Finance', defaultReason: 'Uncleared storage invoices' },
    { holdCode: 'HEALTH', holdName: 'Port Health Quarantine', authorityName: 'Ministry of Health', defaultReason: 'Phytosanitary inspection needed' },
    { holdCode: 'LINE', holdName: 'Shipping Line Hold', authorityName: 'Carrier Line', defaultReason: 'Original Bill of Lading pending surrender' },
    { holdCode: 'DAMAGE', holdName: 'Safety / Damage Quarantine', authorityName: 'ICD Operations', defaultReason: 'Severe structural container defect' }
  ];
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/release-rules", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getReleaseRules();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/approval-policies", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getApprovalPolicies();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/exception-types", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getExceptionTypes();
  res.json({ items, total: items.length, nextCursor: null });
});

// =========================================================================
// 8. Inspection Checklists & Damage Codes
// =========================================================================
router.get("/inspection-templates", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getInspectionTemplates();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/damage-codes", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getDamageCodes();
  res.json({ items, total: items.length, nextCursor: null });
});

// =========================================================================
// 9. Finance Setup
// =========================================================================
router.get("/accounting-periods", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getAccountingPeriods();
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/accounting-periods/:key:close", requireSite(false), requirePermission("admin.config.manage", "DO"), async (req, res) => {
  res.json({ periodKey: req.params.key, status: 'CLOSED', closedAt: new Date().toISOString(), closedBy: 'Current User' });
});

router.get("/charge-codes", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getChargeCodes();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/tax-codes", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getTaxCodes();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/payment-channels", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getPaymentChannels();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/gl-settings", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getGlSettings();
  res.json({ items, total: items.length, nextCursor: null });
});

// =========================================================================
// 10. Notifications & Printing
// =========================================================================
router.get("/notification-templates", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getNotificationTemplates();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/notification-rules", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getNotificationRules();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/print-templates", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getPrintTemplates();
  res.json({ items, total: items.length, nextCursor: null });
});

// =========================================================================
// 11. Calendars & Holidays
// =========================================================================
router.get("/calendars", requireSite(true), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getCalendars();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/calendars/:calendarId/holidays", requireSite(true), requirePermission("masters.view"), async (req, res) => {
  const items = await setupService.getHolidays(Number(req.params.calendarId) || 1);
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/calendars/:calendarId/holidays", requireSite(true), requirePermission("admin.config.manage", "DO"), async (req, res) => {
  const hol = await setupService.addHoliday(Number(req.params.calendarId) || 1, req.body);
  res.status(201).json(hol);
});

router.delete("/calendars/:calendarId/holidays/:calendarHolidayId", requireSite(true), requirePermission("admin.config.manage", "DO"), async (req, res) => {
  await setupService.deleteHoliday(Number(req.params.calendarId) || 1, Number(req.params.calendarHolidayId));
  res.status(204).end();
});

// =========================================================================
// 12. Number Sequences & Documents
// =========================================================================
router.get("/number-sequences", requireSite(true), requirePermission("admin.config.manage"), async (_req, res) => {
  const items = await setupService.getNumberSequences();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/document-types", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getDocumentTypes();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/documents", requireSite(false), (req, res) => {
  const { entityName, entityId, docTypeCode } = req.query;
  let items = mockDocuments;
  if (entityName)
    items = items.filter((d) => d.entityName.toLowerCase() === String(entityName).toLowerCase());
  if (entityId)
    items = items.filter((d) => String(d.entityId) === String(entityId));
  if (docTypeCode)
    items = items.filter((d) => d.docTypeCode === String(docTypeCode));
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/documents", requireSite(false), (req, res) => {
  const newDoc: StoredDoc = {
    documentId: mockDocuments.length + 101,
    siteId: 1,
    documentTypeId: req.body.documentTypeId || 1,
    docTypeCode: req.body.docTypeCode || "BL",
    docTypeName: req.body.docTypeName || "Bill of Lading",
    entityName: req.body.entityName || "consignment",
    entityId: String(req.body.entityId || "101"),
    fileName: req.body.fileName || `document-${Date.now()}.pdf`,
    fileSizeBytes: req.body.fileSizeBytes || 102400,
    mimeType: req.body.mimeType || "application/pdf",
    uploadedAt: new Date().toISOString(),
    uploadedBy: req.user?.username || "Current User",
    fileContentBase64: req.body.fileContentBase64 || "JVBERi0xLjQKJcTl8uXr...",
    isArchived: false,
    logInst: 1,
    ...req.body,
  };
  mockDocuments.push(newDoc);
  res.status(201).json(newDoc);
});

router.delete("/documents/:documentId", requireSite(false), (req, res) => {
  const idx = mockDocuments.findIndex((d) => String(d.documentId) === req.params.documentId);
  if (idx >= 0) mockDocuments.splice(idx, 1);
  res.status(204).end();
});

// =========================================================================
// 13. Devices & Integrations
// =========================================================================
router.get("/devices", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getDevices();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/device-integrations", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getDeviceIntegrations();
  res.json({ items, total: items.length, nextCursor: null });
});

// =========================================================================
// 14. Field Rules
// =========================================================================
router.get("/field-rules", requireSite(false), requirePermission("masters.view"), async (req, res) => {
  const { roleCode, entityName } = req.query;
  let items: any[] = await setupService.getFieldRules();
  if (roleCode) items = items.filter((r) => r.roleCode === roleCode);
  if (entityName) items = items.filter((r) => r.entityName === entityName);
  res.json({ items, catalogue: FIELD_CATALOGUE, total: items.length, nextCursor: null });
});

router.post("/field-rules", requireSite(false), requirePermission("admin.config.manage", "DO"), async (req, res) => {
  const rule = await setupService.createFieldRule(req.body);
  res.status(201).json(rule);
});

// =========================================================================
// 15. Prediction Models
// =========================================================================
router.get("/models", requireSite(false), requirePermission("masters.view"), async (_req, res) => {
  const items = await setupService.getModels();
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/models/:id:activate", requireSite(false), requirePermission("admin.config.manage", "DO"), async (req, res) => {
  res.json({ modelVersionId: req.params.id, isActive: true, activatedAt: new Date().toISOString() });
});

// =========================================================================
// 16. Sync
// =========================================================================
router.get(["/sync/status", "/sync/states"], requireSite(false), requirePermission("admin.config.manage"), async (_req, res) => {
  const items = await setupService.getSyncStates();
  res.json({ items, total: items.length, nextCursor: null });
});

router.get("/sync/outbox", requireSite(false), requirePermission("admin.config.manage"), async (_req, res) => {
  const items = await setupService.getOutbox();
  res.json({ items, total: items.length, nextCursor: null });
});

router.post("/sync/:masterCode([0-9a-zA-Z_.-]+):run", requireSite(false), requirePermission("admin.config.manage", "DO"), (req, res) => {
  const masterCode = req.params.masterCode;
  const now = new Date().toISOString();
  res.json({
    masterCode,
    status: "OK",
    rowsLastRun: 14,
    lastRunAt: now,
    message: `Master sync job for '${masterCode}' triggered successfully.`,
  });
});

// Audit Log
router.get(["/audit-log", "/audit/logs"], requireSite(false), requirePermission("admin.audit.view"), (req, res) => {
  const { entityName, entityId, action, userSub } = req.query;
  let items = auditLog as any[];
  if (entityName) items = items.filter((a) => a.entityName?.toLowerCase() === String(entityName).toLowerCase());
  if (entityId) items = items.filter((a) => String(a.entityId) === String(entityId));
  if (action) items = items.filter((a) => a.action === action);
  if (userSub) items = items.filter((a) => a.userSub === userSub);
  res.json({ items, total: items.length, nextCursor: null });
});

export const setupRouter = router;
