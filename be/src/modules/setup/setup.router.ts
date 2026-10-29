import { Router } from 'express';
import { requireSite } from '../../middleware/siteScope';
import { requirePermission } from '../../middleware/permission';
import {
  company, countryPacks, sites, calendars, holidays,
  numberSequences, fieldRules, FIELD_CATALOGUE, documentTypes, syncStates, outbox
} from '../../data/admin';
import { auditLog } from '../../data/insight';

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
    docTypeCode: 'BL',
    docTypeName: 'Bill of Lading',
    entityName: 'consignment',
    entityId: '101',
    fileName: 'BL-MSK-2026-9901.pdf',
    fileSizeBytes: 245100,
    mimeType: 'application/pdf',
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    uploadedBy: 'Juma M.',
    fileContentBase64: 'JVBERi0xLjQKJcTl8uXr...',
    isArchived: false,
    logInst: 1
  },
  {
    documentId: 102,
    siteId: 1,
    documentTypeId: 3,
    docTypeCode: 'TANSAD',
    docTypeName: 'Customs Declaration',
    entityName: 'consignment',
    entityId: '101',
    fileName: 'TANSAD-TZ-2026-881.pdf',
    fileSizeBytes: 184500,
    mimeType: 'application/pdf',
    uploadedAt: new Date(Date.now() - 43200000).toISOString(),
    uploadedBy: 'Rehema K.',
    fileContentBase64: 'JVBERi0xLjQKJcTl8uXr...',
    isArchived: false,
    logInst: 1
  }
];

// ------------------------------------------------------------------ Companies (Global 🌐)
router.get('/companies', requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json({ items: [company], total: 1, nextCursor: null });
});

router.post('/companies', requireSite(true), requirePermission('admin.site.manage', 'DO'), (req, res) => {
  const newCompany = {
    companyId: 2,
    companyCode: req.body.companyCode || 'DCC2',
    companyName: req.body.companyName || 'DCC Subsidiary',
    taxId: req.body.taxId || 'TAX-TZ-00000',
    currencyCode: req.body.currencyCode || 'USD',
    isActive: true,
    logInst: 1,
    ...req.body
  };
  res.status(201).json(newCompany);
});

router.get('/companies/:companyId', requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json(company);
});

router.patch('/companies/:companyId', requireSite(true), requirePermission('admin.site.manage', 'DO'), (req, res) => {
  Object.assign(company, req.body);
  res.json(company);
});

// ------------------------------------------------------------------ Country Packs (Global 🌐)
router.get('/country-packs', requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json({ items: countryPacks, total: countryPacks.length, nextCursor: null });
});

// ------------------------------------------------------------------ Sites (Global 🌐)
router.get('/sites', requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json({ items: sites, total: sites.length, nextCursor: null });
});

router.get('/sites/:siteId', requireSite(true), requirePermission('masters.view'), (req, res) => {
  const param = req.params.siteId;
  const site = sites.find(s => String(s.siteId) === param || s.siteCode.toUpperCase() === param.toUpperCase());
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json(site);
});

router.post('/sites', requireSite(true), requirePermission('admin.site.manage', 'DO'), (req, res) => {
  const newSite = {
    siteId: sites.length + 1,
    siteCode: req.body.siteCode || `SITE${sites.length + 1}`,
    siteName: req.body.siteName,
    companyId: 1,
    countryCode: 'TZ',
    timeZone: 'Africa/Dar_es_Salaam',
    calendarId: 1,
    calendarCode: 'TZ_PUBLIC',
    facilities: req.body.facilities || ['ICD'],
    isActive: true,
    gates: req.body.gates || 1,
    slots: req.body.slots || 100,
    ...req.body
  };
  sites.push(newSite as any);
  res.status(201).json(newSite);
});

router.patch('/sites/:siteId', requireSite(true), requirePermission('admin.site.manage', 'DO'), (req, res) => {
  const param = req.params.siteId;
  const site = sites.find(s => String(s.siteId) === param || s.siteCode.toUpperCase() === param.toUpperCase());
  if (!site) return res.status(404).json({ error: 'Site not found' });
  Object.assign(site, req.body);
  res.json(site);
});

router.delete('/sites/:siteId', requireSite(true), requirePermission('admin.site.manage', 'DO'), (req, res) => {
  const param = req.params.siteId;
  const idx = sites.findIndex(s => String(s.siteId) === param || s.siteCode.toUpperCase() === param.toUpperCase());
  if (idx === -1) return res.status(404).json({ error: 'Site not found' });
  const [removed] = sites.splice(idx, 1);
  res.json({ message: 'Site deleted', site: removed });
});

// ------------------------------------------------------------------ Calendars & Holidays (Global 🌐)
router.get('/calendars', requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json({ items: calendars, total: calendars.length, nextCursor: null });
});

router.post('/calendars', requireSite(true), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newCal = {
    calendarId: calendars.length + 1,
    calendarCode: req.body.calendarCode || `CAL_${calendars.length + 1}`,
    calendarName: req.body.calendarName || 'Standard Operating Calendar',
    isStandard: false,
    workingDays: req.body.workingDays || [1, 2, 3, 4, 5, 6],
    ...req.body
  };
  calendars.push(newCal as any);
  res.status(201).json(newCal);
});

router.get('/calendars/:calendarId', requireSite(true), requirePermission('masters.view'), (req, res) => {
  const cal = calendars.find(c => String(c.calendarId) === req.params.calendarId || c.calendarCode === req.params.calendarId);
  if (!cal) return res.status(404).json({ error: 'Calendar not found' });
  res.json(cal);
});

router.patch('/calendars/:calendarId', requireSite(true), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const cal = calendars.find(c => String(c.calendarId) === req.params.calendarId || c.calendarCode === req.params.calendarId);
  if (!cal) return res.status(404).json({ error: 'Calendar not found' });
  Object.assign(cal, req.body);
  res.json(cal);
});

router.get('/calendars/:calendarId/holidays', requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json({ items: holidays, total: holidays.length, nextCursor: null });
});

router.post('/calendars/:calendarId/holidays', requireSite(true), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newHoliday = {
    calendarHolidayId: holidays.length + 1,
    holidayDate: req.body.holidayDate,
    holidayName: req.body.holidayName,
    moves: !!req.body.moves
  };
  holidays.push(newHoliday as any);
  res.status(201).json(newHoliday);
});

router.delete('/calendars/:calendarId/holidays/:calendarHolidayId', requireSite(true), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const idx = holidays.findIndex(h => String((h as any).calendarHolidayId) === req.params.calendarHolidayId);
  if (idx >= 0) holidays.splice(idx, 1);
  res.status(204).end();
});

// ------------------------------------------------------------------ Number Sequences (Global 🌐)
router.get('/number-sequences', requireSite(true), requirePermission('admin.config.manage'), (req, res) => {
  res.json({ items: numberSequences, total: numberSequences.length, nextCursor: null });
});

router.post('/number-sequences', requireSite(true), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newSeq = {
    numberSequenceId: numberSequences.length + 1,
    companyId: 1,
    siteId: req.body.siteId || null,
    documentKind: req.body.documentKind || 'CUSTOM',
    prefix: req.body.prefix || 'DOC',
    pattern: req.body.pattern || '{PREFIX}-{YYYY}-{#####}',
    nextValue: 1,
    resetPolicy: req.body.resetPolicy || 'YEARLY',
    sample: `${req.body.prefix || 'DOC'}-2026-00001`,
    ...req.body
  };
  numberSequences.push(newSeq as any);
  res.status(201).json(newSeq);
});

router.get('/number-sequences/:numberSequenceId', requireSite(true), requirePermission('admin.config.manage'), (req, res) => {
  const seq = numberSequences.find(s => String(s.numberSequenceId) === req.params.numberSequenceId);
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  res.json(seq);
});

router.patch('/number-sequences/:numberSequenceId', requireSite(true), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const seq = numberSequences.find(s => String(s.numberSequenceId) === req.params.numberSequenceId);
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  Object.assign(seq, req.body);
  res.json(seq);
});

// ------------------------------------------------------------------ Field Rules (Site-scoped)
router.get('/field-rules', requireSite(false), requirePermission('masters.view'), (req, res) => {
  const { roleCode, entityName } = req.query;
  let items = fieldRules;
  if (roleCode) {
    items = items.filter(r => r.roleCode === roleCode);
  }
  if (entityName) {
    items = items.filter(r => r.entityName === entityName);
  }
  res.json({ items, catalogue: FIELD_CATALOGUE, total: items.length, nextCursor: null });
});

router.put('/field-rules/:screenCode', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  res.json({ message: `Updated field rules for ${req.params.screenCode}`, rules: req.body });
});

// ------------------------------------------------------------------ Document Types (Site-scoped)
router.get('/document-types', requireSite(false), requirePermission('masters.view'), (req, res) => {
  res.json({ items: documentTypes, total: documentTypes.length, nextCursor: null });
});

router.post('/document-types', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newDocType = {
    documentTypeId: documentTypes.length + 1,
    docTypeCode: req.body.docTypeCode || `DOC_${documentTypes.length + 1}`,
    docTypeName: req.body.docTypeName || 'New Document Type',
    appliesTo: req.body.appliesTo || 'CONSIGNMENT',
    retentionYears: req.body.retentionYears || 7,
    requiresApproval: !!req.body.requiresApproval,
    maxSizeMb: req.body.maxSizeMb || 10,
    allowedExt: req.body.allowedExt || 'pdf, jpg, png',
    isActive: true,
    requiredFor: req.body.requiredFor || [],
    ...req.body
  };
  documentTypes.push(newDocType as any);
  res.status(201).json(newDocType);
});

router.get('/document-types/:documentTypeId', requireSite(false), requirePermission('masters.view'), (req, res) => {
  const item = documentTypes.find(d => String(d.documentTypeId) === req.params.documentTypeId || d.docTypeCode === req.params.documentTypeId);
  if (!item) return res.status(404).json({ error: 'Document type not found' });
  res.json(item);
});

router.patch('/document-types/:documentTypeId', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const item = documentTypes.find(d => String(d.documentTypeId) === req.params.documentTypeId || d.docTypeCode === req.params.documentTypeId);
  if (!item) return res.status(404).json({ error: 'Document type not found' });
  Object.assign(item, req.body);
  res.json(item);
});

// ------------------------------------------------------------------ Documents (Site-scoped)
router.get('/documents', requireSite(false), (req, res) => {
  const { entityName, entityId, docTypeCode } = req.query;
  let items = mockDocuments;
  if (entityName) items = items.filter(d => d.entityName.toLowerCase() === String(entityName).toLowerCase());
  if (entityId) items = items.filter(d => String(d.entityId) === String(entityId));
  if (docTypeCode) items = items.filter(d => d.docTypeCode === String(docTypeCode));
  res.json({ items, total: items.length, nextCursor: null });
});

router.post('/documents', requireSite(false), (req, res) => {
  const newDoc: StoredDoc = {
    documentId: mockDocuments.length + 101,
    siteId: 1,
    documentTypeId: req.body.documentTypeId || 1,
    docTypeCode: req.body.docTypeCode || 'BL',
    docTypeName: req.body.docTypeName || 'Bill of Lading',
    entityName: req.body.entityName || 'consignment',
    entityId: String(req.body.entityId || '101'),
    fileName: req.body.fileName || `document-${Date.now()}.pdf`,
    fileSizeBytes: req.body.fileSizeBytes || 102400,
    mimeType: req.body.mimeType || 'application/pdf',
    uploadedAt: new Date().toISOString(),
    uploadedBy: (req.user?.username || 'Current User'),
    fileContentBase64: req.body.fileContentBase64 || 'JVBERi0xLjQKJcTl8uXr...',
    isArchived: false,
    logInst: 1,
    ...req.body
  };
  mockDocuments.push(newDoc);
  res.status(201).json(newDoc);
});

router.get('/documents/:documentId', requireSite(false), (req, res) => {
  const doc = mockDocuments.find(d => String(d.documentId) === req.params.documentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

router.delete('/documents/:documentId', requireSite(false), (req, res) => {
  const idx = mockDocuments.findIndex(d => String(d.documentId) === req.params.documentId);
  if (idx >= 0) mockDocuments.splice(idx, 1);
  res.status(204).end();
});

router.get('/documents/:documentId/content', requireSite(false), (req, res) => {
  const doc = mockDocuments.find(d => String(d.documentId) === req.params.documentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({
    documentId: doc.documentId,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    fileSizeBytes: doc.fileSizeBytes,
    contentBase64: doc.fileContentBase64 || 'JVBERi0xLjQKJcTl8uXr...'
  });
});

// ------------------------------------------------------------------ Audit Log (Site-scoped)
router.get(['/audit-log', '/audit/logs'], requireSite(false), requirePermission('admin.audit.view'), (req, res) => {
  const { entityName, entityId, action, userSub } = req.query;
  let items = auditLog as any[];
  if (entityName) items = items.filter(a => a.entityName?.toLowerCase() === String(entityName).toLowerCase());
  if (entityId) items = items.filter(a => String(a.entityId) === String(entityId));
  if (action) items = items.filter(a => a.action === action);
  if (userSub) items = items.filter(a => a.userSub === userSub);
  res.json({ items, total: items.length, nextCursor: null });
});

router.get('/audit-log/:entityName/:entityId', requireSite(false), (req, res) => {
  const { entityName, entityId } = req.params;
  const items = (auditLog as any[]).filter(a =>
    a.entityName?.toLowerCase() === entityName.toLowerCase() &&
    String(a.entityId) === String(entityId)
  );
  res.json({ items, total: items.length, nextCursor: null });
});

// ------------------------------------------------------------------ Sync (Site-scoped)
router.get('/sync/status', requireSite(false), requirePermission('admin.config.manage'), (req, res) => {
  res.json({ items: syncStates, total: syncStates.length, nextCursor: null });
});

router.get('/sync/outbox', requireSite(false), requirePermission('admin.config.manage'), (req, res) => {
  res.json({ items: outbox, total: outbox.length, nextCursor: null });
});

router.post('/sync/:masterCode([0-9a-zA-Z_.-]+):run', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const masterCode = req.params.masterCode;
  const item = syncStates.find(s => s.entityName.toLowerCase() === masterCode.toLowerCase());
  const now = new Date().toISOString();
  if (item) {
    item.lastRunAt = now;
    item.lastStatus = 'OK';
  }
  res.json({
    masterCode,
    status: 'OK',
    rowsLastRun: 14,
    lastRunAt: now,
    message: `Master sync job for '${masterCode}' triggered successfully.`
  });
});

export const setupRouter = router;
