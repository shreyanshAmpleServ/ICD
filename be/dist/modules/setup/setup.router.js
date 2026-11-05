"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const permission_1 = require("../../middlewares/permission");
const setup_service_1 = require("./setup.service");
const admin_1 = require("../../data/admin");
const insight_1 = require("../../data/insight");
const router = (0, express_1.Router)();
const mockDocuments = [
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
router.get("/companies", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const comp = await setup_service_1.setupService.getCompany();
    res.json({ items: [comp], total: 1, nextCursor: null });
});
router.post("/companies", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    const comp = await setup_service_1.setupService.updateCompany(1, req.body);
    res.status(201).json(comp);
});
router.get("/companies/:companyId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const comp = await setup_service_1.setupService.getCompany(Number(req.params.companyId) || 1);
    res.json(comp);
});
router.patch("/companies/:companyId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    const comp = await setup_service_1.setupService.updateCompany(Number(req.params.companyId) || 1, req.body);
    res.json(comp);
});
// Country Packs
router.get("/country-packs", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getCountryPacks();
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/country-packs/:packCode:activate", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    const pack = await setup_service_1.setupService.activateCountryPack(req.params.packCode);
    res.json(pack);
});
// Sites
router.get("/sites", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const { active, isActive, q } = req.query;
    let items = await setup_service_1.setupService.getSites();
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
router.get("/sites/:siteId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const sites = await setup_service_1.setupService.getSites();
    const site = sites.find((s) => String(s.siteId) === req.params.siteId || s.siteCode.toUpperCase() === req.params.siteId.toUpperCase());
    if (!site)
        return res.status(404).json({ error: "Site not found" });
    res.json(site);
});
router.post("/sites", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    const site = await setup_service_1.setupService.createSite(req.body);
    res.status(201).json(site);
});
router.patch("/sites/:siteId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    const site = await setup_service_1.setupService.updateSite(req.params.siteId, req.body);
    res.json(site);
});
// =========================================================================
// 2. Yard Designer
// =========================================================================
router.get("/yard/locations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;
    const items = await setup_service_1.setupService.getYardLocations(siteId);
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/yard/locations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    const node = await setup_service_1.setupService.createYardLocation(req.body);
    res.status(201).json(node);
});
router.patch("/yard/locations/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    res.json({ id: req.params.id, ...req.body });
});
// =========================================================================
// 3. Gates & Visit Types
// =========================================================================
router.get("/gates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const siteId = req.query.siteId ? Number(req.query.siteId) : undefined;
    const items = await setup_service_1.setupService.getGates(siteId);
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/gates/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const items = await setup_service_1.setupService.getGates();
    const g = items.find((x) => String(x.gateId) === req.params.id || x.gateCode === req.params.id);
    if (!g)
        return res.status(404).json({ error: "Gate not found" });
    res.json(g);
});
router.post("/gates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const created = await setup_service_1.setupService.createGate(req.body);
    res.status(201).json(created);
});
router.patch("/gates/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const updated = await setup_service_1.setupService.updateGate(Number(req.params.id), req.body);
    res.json(updated);
});
router.delete("/gates/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const result = await setup_service_1.setupService.deleteGate(Number(req.params.id));
    res.json(result);
});
router.post("/gates/:id/lanes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const created = await setup_service_1.setupService.createLane(Number(req.params.id), req.body);
    res.status(201).json(created);
});
router.patch("/gate-lanes/:laneId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const updated = await setup_service_1.setupService.updateLane(Number(req.params.laneId), req.body);
    res.json(updated);
});
router.delete("/gate-lanes/:laneId", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const result = await setup_service_1.setupService.deleteLane(Number(req.params.laneId));
    res.json(result);
});
router.get("/checkpoints", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getCheckpoints();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/checkpoints/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const items = await setup_service_1.setupService.getCheckpoints();
    const cp = items.find((x) => String(x.checkpointId) === req.params.id || x.checkpointCode === req.params.id);
    if (!cp)
        return res.status(404).json({ error: "Checkpoint not found" });
    res.json(cp);
});
router.post("/checkpoints", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const created = await setup_service_1.setupService.createCheckpoint(req.body);
    res.status(201).json(created);
});
router.patch("/checkpoints/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const updated = await setup_service_1.setupService.updateCheckpoint(Number(req.params.id), req.body);
    res.json(updated);
});
router.delete("/checkpoints/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const result = await setup_service_1.setupService.deleteCheckpoint(Number(req.params.id));
    res.json(result);
});
router.get("/visit-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getVisitTypes();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/visit-types/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const items = await setup_service_1.setupService.getVisitTypes();
    const vt = items.find((x) => String(x.visitTypeId) === req.params.id || x.visitTypeCode === req.params.id);
    if (!vt)
        return res.status(404).json({ error: "Visit type not found" });
    res.json(vt);
});
router.post("/visit-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const created = await setup_service_1.setupService.createVisitType(req.body);
    res.status(201).json(created);
});
router.patch("/visit-types/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const updated = await setup_service_1.setupService.updateVisitType(Number(req.params.id), req.body);
    res.json(updated);
});
router.delete("/visit-types/:id", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.gate.configure", "DO"), async (req, res) => {
    const result = await setup_service_1.setupService.deleteVisitType(Number(req.params.id));
    res.json(result);
});
// =========================================================================
// 4. Unit Types & Checks
// =========================================================================
router.get("/unit-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getUnitTypes();
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/unit-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), async (req, res) => {
    const created = await setup_service_1.setupService.createUnitType(req.body);
    res.status(201).json(created);
});
router.patch("/unit-types/:code", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), async (req, res) => {
    const updated = await setup_service_1.setupService.updateUnitType(req.params.code, req.body);
    res.json(updated);
});
router.get("/cargo-regimes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getCargoRegimes();
    res.json({ items, total: items.length, nextCursor: null });
});
// =========================================================================
// 5. Trucks, Drivers, Vessels, Masters
// =========================================================================
router.get("/trucks", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getTrucks();
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/trucks", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    const created = await setup_service_1.setupService.createTruck(req.body);
    res.status(201).json(created);
});
router.get("/drivers", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getDrivers();
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/drivers", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.site.manage", "DO"), async (req, res) => {
    const created = await setup_service_1.setupService.createDriver(req.body);
    res.status(201).json(created);
});
router.get("/vessels", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getVessels();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/ports", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getPorts();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/commodities", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getCommodities();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/equipment", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getEquipment();
    res.json({ items, total: items.length, nextCursor: null });
});
// =========================================================================
// 6. Users & Roles
// =========================================================================
router.get("/users", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage"), async (_req, res) => {
    const items = await setup_service_1.setupService.getUsers();
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/users", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage", "DO"), async (req, res) => {
    const created = await setup_service_1.setupService.createUser(req.body);
    res.status(201).json(created);
});
router.patch("/users/:id", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.users.manage", "DO"), async (req, res) => {
    const updated = await setup_service_1.setupService.updateUser(Number(req.params.id), req.body);
    res.json(updated);
});
router.get("/roles", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getRoles();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/permissions", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getPermissions();
    res.json({ items, total: items.length, nextCursor: null });
});
// =========================================================================
// 7. Holds, Release & Approvals
// =========================================================================
router.get("/hold-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = [
        { holdCode: 'CUSTOMS', holdName: 'Customs Examination Hold', authorityName: 'TRA Customs', defaultReason: 'Routine physical inspection required' },
        { holdCode: 'FINANCE', holdName: 'Outstanding Payment Hold', authorityName: 'DCC Finance', defaultReason: 'Uncleared storage invoices' },
        { holdCode: 'HEALTH', holdName: 'Port Health Quarantine', authorityName: 'Ministry of Health', defaultReason: 'Phytosanitary inspection needed' },
        { holdCode: 'LINE', holdName: 'Shipping Line Hold', authorityName: 'Carrier Line', defaultReason: 'Original Bill of Lading pending surrender' },
        { holdCode: 'DAMAGE', holdName: 'Safety / Damage Quarantine', authorityName: 'ICD Operations', defaultReason: 'Severe structural container defect' }
    ];
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/release-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getReleaseRules();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/approval-policies", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getApprovalPolicies();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/exception-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getExceptionTypes();
    res.json({ items, total: items.length, nextCursor: null });
});
// =========================================================================
// 8. Inspection Checklists & Damage Codes
// =========================================================================
router.get("/inspection-templates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getInspectionTemplates();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/damage-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getDamageCodes();
    res.json({ items, total: items.length, nextCursor: null });
});
// =========================================================================
// 9. Finance Setup
// =========================================================================
router.get("/accounting-periods", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getAccountingPeriods();
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/accounting-periods/:key:close", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), async (req, res) => {
    res.json({ periodKey: req.params.key, status: 'CLOSED', closedAt: new Date().toISOString(), closedBy: 'Current User' });
});
router.get("/charge-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getChargeCodes();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/tax-codes", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getTaxCodes();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/payment-channels", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getPaymentChannels();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/gl-settings", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getGlSettings();
    res.json({ items, total: items.length, nextCursor: null });
});
// =========================================================================
// 10. Notifications & Printing
// =========================================================================
router.get("/notification-templates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getNotificationTemplates();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/notification-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getNotificationRules();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/print-templates", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getPrintTemplates();
    res.json({ items, total: items.length, nextCursor: null });
});
// =========================================================================
// 11. Calendars & Holidays
// =========================================================================
router.get("/calendars", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getCalendars();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/calendars/:calendarId/holidays", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const items = await setup_service_1.setupService.getHolidays(Number(req.params.calendarId) || 1);
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/calendars/:calendarId/holidays", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), async (req, res) => {
    const hol = await setup_service_1.setupService.addHoliday(Number(req.params.calendarId) || 1, req.body);
    res.status(201).json(hol);
});
router.delete("/calendars/:calendarId/holidays/:calendarHolidayId", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage", "DO"), async (req, res) => {
    await setup_service_1.setupService.deleteHoliday(Number(req.params.calendarId) || 1, Number(req.params.calendarHolidayId));
    res.status(204).end();
});
// =========================================================================
// 12. Number Sequences & Documents
// =========================================================================
router.get("/number-sequences", (0, siteScope_1.requireSite)(true), (0, permission_1.requirePermission)("admin.config.manage"), async (_req, res) => {
    const items = await setup_service_1.setupService.getNumberSequences();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/document-types", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getDocumentTypes();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/documents", (0, siteScope_1.requireSite)(false), (req, res) => {
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
router.post("/documents", (0, siteScope_1.requireSite)(false), (req, res) => {
    const newDoc = {
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
router.delete("/documents/:documentId", (0, siteScope_1.requireSite)(false), (req, res) => {
    const idx = mockDocuments.findIndex((d) => String(d.documentId) === req.params.documentId);
    if (idx >= 0)
        mockDocuments.splice(idx, 1);
    res.status(204).end();
});
// =========================================================================
// 13. Devices & Integrations
// =========================================================================
router.get("/devices", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getDevices();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/device-integrations", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getDeviceIntegrations();
    res.json({ items, total: items.length, nextCursor: null });
});
// =========================================================================
// 14. Field Rules
// =========================================================================
router.get("/field-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (req, res) => {
    const { roleCode, entityName } = req.query;
    let items = await setup_service_1.setupService.getFieldRules();
    if (roleCode)
        items = items.filter((r) => r.roleCode === roleCode);
    if (entityName)
        items = items.filter((r) => r.entityName === entityName);
    res.json({ items, catalogue: admin_1.FIELD_CATALOGUE, total: items.length, nextCursor: null });
});
router.post("/field-rules", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), async (req, res) => {
    const rule = await setup_service_1.setupService.createFieldRule(req.body);
    res.status(201).json(rule);
});
// =========================================================================
// 15. Prediction Models
// =========================================================================
router.get("/models", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("masters.view"), async (_req, res) => {
    const items = await setup_service_1.setupService.getModels();
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/models/:id:activate", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), async (req, res) => {
    res.json({ modelVersionId: req.params.id, isActive: true, activatedAt: new Date().toISOString() });
});
// =========================================================================
// 16. Sync
// =========================================================================
router.get(["/sync/status", "/sync/states"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), async (_req, res) => {
    const items = await setup_service_1.setupService.getSyncStates();
    res.json({ items, total: items.length, nextCursor: null });
});
router.get("/sync/outbox", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage"), async (_req, res) => {
    const items = await setup_service_1.setupService.getOutbox();
    res.json({ items, total: items.length, nextCursor: null });
});
router.post("/sync/:masterCode([0-9a-zA-Z_.-]+):run", (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.config.manage", "DO"), (req, res) => {
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
router.get(["/audit-log", "/audit/logs"], (0, siteScope_1.requireSite)(false), (0, permission_1.requirePermission)("admin.audit.view"), (req, res) => {
    const { entityName, entityId, action, userSub } = req.query;
    let items = insight_1.auditLog;
    if (entityName)
        items = items.filter((a) => a.entityName?.toLowerCase() === String(entityName).toLowerCase());
    if (entityId)
        items = items.filter((a) => String(a.entityId) === String(entityId));
    if (action)
        items = items.filter((a) => a.action === action);
    if (userSub)
        items = items.filter((a) => a.userSub === userSub);
    res.json({ items, total: items.length, nextCursor: null });
});
exports.setupRouter = router;
