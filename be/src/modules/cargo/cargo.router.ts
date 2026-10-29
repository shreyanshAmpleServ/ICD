import { Router } from 'express';
import { requireSite } from '../../middleware/siteScope';
import { requirePermission } from '../../middleware/permission';
import { vesselCalls, consignments, allStays } from '../../data/core';
import { manifests, sampleManifestLines, linesOf } from '../../data/cargo';
import { cargoRegimes } from '../../data/admin';

const router = Router();

// In-memory manifest lines store
const manifestLinesStore: Record<string, any[]> = {
  '1': sampleManifestLines.map((l, i) => ({ manifestLineId: i + 1, manifestId: 1, ...l, logInst: 1 }))
};

// In-memory consignment lines store
const consignmentLinesStore: Record<string, any[]> = {
  '101': [
    { consignmentLineId: 1, consignmentId: 101, lineNo: 1, packageType: 'PK', packageCount: 450, goodsDescription: 'Ceramic Floor Tiles', grossWeightKg: 28450, volumeCbm: 32.5, commodityCode: 'TILES', hsCode: '6907.21' }
  ]
};

import { getPrisma, isDbLive } from '../../db/prisma';

// ------------------------------------------------------------------ Vessel Calls (Global 🌐)
router.get('/vessel-calls', requireSite(true), requirePermission('consignment.view'), async (req, res) => {
  const { status } = req.query;
  let items = vesselCalls as any[];

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbCalls = await prisma.vessel_calls.findMany({
          include: {
            vessels: true,
            ports: true,
            parties: true
          },
          orderBy: { vessel_call_id: 'desc' }
        });

        if (dbCalls && dbCalls.length > 0) {
          const mapped = dbCalls.map(vc => ({
            vesselCallId: vc.vessel_call_id,
            status: (vc.status as any) || 'BERTHED',
            portId: vc.port_id,
            portName: vc.ports?.port_name || 'Port of Dar es Salaam',
            callSign: vc.vessels?.call_sign || '5LDF8',
            vesselName: vc.vessels?.vessel_name || 'MV Maersk Karachi',
            voyageIn: vc.voyage_no,
            voyageOut: vc.voyage_no,
            voyageNo: vc.voyage_no,
            eta: vc.eta?.toISOString() || new Date().toISOString(),
            ata: vc.ata?.toISOString(),
            etd: new Date(Date.now() + 24 * 3600000).toISOString(),
            shippingLineName: vc.parties?.party_name || 'Maersk Line',
            shippingLineCode: vc.parties?.party_code || 'MSK'
          }));

          const dbIds = new Set(mapped.map(m => m.voyageNo));
          items = [...mapped, ...vesselCalls.filter(v => !dbIds.has(v.voyageNo))] as any;
        }
      } catch (err: any) {
        console.warn('[Vessel Calls API] DB query fallback:', err.message);
      }
    }
  }

  if (status) {
    items = items.filter(v => v.status === status);
  }
  res.json({ items, nextCursor: null, total: items.length });
});

router.post('/vessel-calls', requireSite(true), requirePermission('consignment.edit', 'DO'), (req, res) => {
  const newCall = {
    vesselCallId: vesselCalls.length + 1,
    status: 'EXPECTED' as const,
    portId: 1,
    callSign: req.body.callSign || 'V-CALL-26',
    eta: req.body.eta || new Date(Date.now() + 86400000).toISOString(),
    etd: req.body.etd || new Date(Date.now() + 172800000).toISOString(),
    voyageIn: req.body.voyageIn || '2601W',
    voyageOut: req.body.voyageOut || '2601E',
    logInst: 1,
    ...req.body
  };
  vesselCalls.push(newCall);
  res.status(201).json(newCall);
});

router.get('/vessel-calls/:vesselCallId', requireSite(true), requirePermission('consignment.view'), (req, res) => {
  const call = vesselCalls.find(v => String(v.vesselCallId) === req.params.vesselCallId);
  if (!call) return res.status(404).json({ error: 'Vessel call not found' });
  res.json(call);
});

router.patch('/vessel-calls/:vesselCallId', requireSite(true), requirePermission('consignment.edit', 'DO'), (req, res) => {
  const call = vesselCalls.find(v => String(v.vesselCallId) === req.params.vesselCallId);
  if (!call) return res.status(404).json({ error: 'Vessel call not found' });
  Object.assign(call, req.body, { logInst: ((call as any).logInst || 1) + 1 });
  res.json(call);
});

// ------------------------------------------------------------------ Manifests (Global 🌐)
router.get('/manifests', requireSite(true), requirePermission('manifest.import'), async (req, res) => {
  let items = manifests as any[];

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbMans = await prisma.manifests.findMany({
          include: {
            parties: true,
            vessel_calls: {
              include: { vessels: true }
            },
            manifest_lines: true
          },
          orderBy: { manifest_id: 'desc' }
        });

        if (dbMans && dbMans.length > 0) {
          const mapped = dbMans.map(m => ({
            manifestId: m.manifest_id,
            manifestNo: m.manifest_ref,
            vesselCallId: m.vessel_call_id,
            vesselName: m.vessel_calls?.vessels?.vessel_name || 'MV Maersk Karachi',
            voyageNo: m.vessel_calls?.voyage_no || '2601W',
            shippingLineName: m.parties?.party_name || 'Maersk Line',
            shippingLineCode: m.parties?.party_code || 'MSK',
            status: m.status || 'PROCESSED',
            totalLines: m.line_count || m.manifest_lines.length,
            importedAt: m.imported_at?.toISOString() || new Date().toISOString(),
            lines: m.manifest_lines.map(l => ({
              manifestLineId: l.manifest_line_id,
              manifestId: l.manifest_id,
              lineNo: l.line_no,
              containerNo: l.unit_no,
              unitNo: l.unit_no,
              billOfLading: l.bl_no,
              blNo: l.bl_no,
              consigneeName: l.consignee_raw,
              fullEmpty: l.full_empty,
              sealNo: l.seal_no,
              grossWeightKg: Number(l.gross_weight_kg || 0),
              matchStatus: l.match_status
            }))
          }));

          const dbRefs = new Set(mapped.map(m => m.manifestNo));
          items = [...mapped, ...manifests.filter(m => !dbRefs.has((m as any).manifestNo || (m as any).manifestId))] as any;
        }
      } catch (err: any) {
        console.warn('[Manifests API] DB query fallback:', err.message);
      }
    }
  }

  res.json({ items, nextCursor: null, total: items.length });
});

router.post('/manifests', requireSite(true), requirePermission('manifest.import', 'DO'), (req, res) => {
  const { manifestNo, vesselCallId, items } = req.body;
  const newMan = {
    manifestId: manifests.length + 1,
    manifestNo: manifestNo || `MAN-2026-${Date.now()}`,
    vesselCallId: vesselCallId || 1,
    status: 'DRAFT',
    totalLines: (items || []).length || 10,
    importedAt: new Date().toISOString(),
    logInst: 1,
    ...req.body
  };
  manifests.push(newMan as any);
  if (items && Array.isArray(items)) {
    manifestLinesStore[String(newMan.manifestId)] = items.map((l: any, i: number) => ({
      manifestLineId: i + 1,
      manifestId: newMan.manifestId,
      ...l,
      logInst: 1
    }));
  }
  res.status(201).json(newMan);
});

router.post('/manifests:import', requireSite(true), requirePermission('manifest.import', 'DO'), (req, res) => {
  const { manifestNo, vesselCallId, items } = req.body;
  const newMan = {
    manifestId: manifests.length + 1,
    manifestNo: manifestNo || `MAN-2026-${Date.now()}`,
    vesselCallId: vesselCallId || 1,
    status: 'IMPORTED',
    totalLines: (items || []).length || 48,
    importedAt: new Date().toISOString(),
    logInst: 1
  };
  manifests.push(newMan as any);
  res.status(201).json(newMan);
});

router.get('/manifests/:manifestId', requireSite(true), requirePermission('manifest.import'), (req, res) => {
  const man = manifests.find(m => String((m as any).manifestId) === req.params.manifestId || (m as any).manifestNo === req.params.manifestId);
  if (!man) return res.status(404).json({ error: 'Manifest not found' });
  res.json(man);
});

router.get('/manifests/:manifestId/lines', requireSite(true), requirePermission('manifest.import'), (req, res) => {
  const lines = manifestLinesStore[req.params.manifestId] || sampleManifestLines.map((l, i) => ({
    manifestLineId: i + 1,
    manifestId: Number(req.params.manifestId),
    ...l,
    logInst: 1
  }));
  res.json({ items: lines, total: lines.length, nextCursor: null });
});

router.patch('/manifests/:manifestId/lines/:manifestLineId', requireSite(true), requirePermission('manifest.import', 'DO'), (req, res) => {
  const lines = manifestLinesStore[req.params.manifestId] || [];
  const line = lines.find(l => String(l.manifestLineId) === req.params.manifestLineId);
  if (!line) return res.status(404).json({ error: 'Manifest line not found' });
  Object.assign(line, req.body, { logInst: (line.logInst || 1) + 1 });
  res.json(line);
});

router.post('/manifests/:manifestId([0-9a-zA-Z_.-]+):apply', requireSite(true), requirePermission('manifest.import', 'DO'), (req, res) => {
  const man = manifests.find(m => String((m as any).manifestId) === req.params.manifestId || (m as any).manifestNo === req.params.manifestId);
  if (!man) return res.status(404).json({ error: 'Manifest not found' });
  (man as any).status = 'APPLIED';
  res.json({ success: true, manifest: man, appliedAt: new Date().toISOString(), consignmentsCreated: 4 });
});

router.post('/manifests/:manifestId([0-9a-zA-Z_.-]+):cancel', requireSite(true), requirePermission('manifest.import', 'DO'), (req, res) => {
  const man = manifests.find(m => String((m as any).manifestId) === req.params.manifestId || (m as any).manifestNo === req.params.manifestId);
  if (!man) return res.status(404).json({ error: 'Manifest not found' });
  (man as any).status = 'CANCELLED';
  res.json({ success: true, manifest: man, cancelledAt: new Date().toISOString() });
});

// ------------------------------------------------------------------ Consignments (Global 🌐)
router.get('/consignments', requireSite(true), requirePermission('consignment.view'), async (req, res) => {
  const { refNo, vesselCallId, consigneePartyId } = req.query;
  let items = consignments as any[];

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbCons = await prisma.consignments.findMany({
          orderBy: { consignment_id: 'desc' }
        });

        if (dbCons && dbCons.length > 0) {
          const mapped = dbCons.map(c => ({
            consignmentId: c.consignment_id,
            siteId: c.site_id,
            vesselCallId: c.vessel_call_id,
            vesselName: 'MV Maersk Karachi',
            refType: (c.ref_type as any) || 'BL',
            refNo: c.ref_no,
            status: (c.status as any) || 'OPEN',
            regime: 'IMPORT',
            cargoRegime: 'IMPORT',
            consigneeName: 'Twiga Cement Ltd',
            consigneePartyId: c.consignee_party_id || 1,
            billToPartyId: c.bill_to_party_id || 1,
            validTo: new Date(Date.now() + 14 * 86400000).toISOString(),
            unitCount: 1
          }));

          const dbRefs = new Set(mapped.map(m => m.refNo));
          items = [...mapped, ...consignments.filter(c => !dbRefs.has(c.refNo))] as any;
        }
      } catch (err: any) {
        console.warn('[Consignments API] DB query fallback:', err.message);
      }
    }
  }

  if (refNo) {
    items = items.filter(c => c.refNo.toLowerCase().includes(String(refNo).toLowerCase()));
  }
  if (vesselCallId) {
    items = items.filter(c => String(c.vesselCallId) === String(vesselCallId));
  }
  if (consigneePartyId) {
    items = items.filter(c => String(c.consigneePartyId) === String(consigneePartyId));
  }
  res.json({ items, nextCursor: null, total: items.length });
});

router.post('/consignments', requireSite(true), requirePermission('consignment.edit', 'DO'), (req, res) => {
  const newC = {
    consignmentId: consignments.length + 101,
    status: 'OPEN' as const,
    refType: 'BL' as const,
    refNo: req.body.refNo || `BL-LOCAL-${Date.now()}`,
    vesselCallId: req.body.vesselCallId || 1,
    consigneePartyId: req.body.consigneePartyId || 1,
    logInst: 1,
    ...req.body
  };
  consignments.push(newC);
  res.status(201).json(newC);
});

router.get('/consignments/:consignmentId', requireSite(true), requirePermission('consignment.view'), (req, res) => {
  const c = consignments.find(x => String(x.consignmentId) === req.params.consignmentId || x.refNo === req.params.consignmentId);
  if (!c) return res.status(404).json({ error: 'Consignment not found' });
  res.json(c);
});

router.patch('/consignments/:consignmentId', requireSite(true), requirePermission('consignment.edit', 'DO'), (req, res) => {
  const c = consignments.find(x => String(x.consignmentId) === req.params.consignmentId || x.refNo === req.params.consignmentId);
  if (!c) return res.status(404).json({ error: 'Consignment not found' });
  Object.assign(c, req.body, { logInst: ((c as any).logInst || 1) + 1 });
  res.json(c);
});

router.get('/consignments/:consignmentId/lines', requireSite(true), requirePermission('consignment.view'), (req, res) => {
  const lines = consignmentLinesStore[req.params.consignmentId] || [
    { consignmentLineId: 1, consignmentId: Number(req.params.consignmentId), lineNo: 1, packageType: 'PK', packageCount: 450, goodsDescription: 'General Merchandise', grossWeightKg: 28000, volumeCbm: 30, commodityCode: 'TILES' }
  ];
  res.json({ items: lines, total: lines.length, nextCursor: null });
});

router.put('/consignments/:consignmentId/lines', requireSite(true), requirePermission('consignment.edit', 'DO'), (req, res) => {
  consignmentLinesStore[req.params.consignmentId] = Array.isArray(req.body) ? req.body : [req.body];
  res.json({ items: consignmentLinesStore[req.params.consignmentId], total: consignmentLinesStore[req.params.consignmentId].length });
});

router.get('/consignments/:consignmentId/units', requireSite(true), requirePermission('consignment.view'), (req, res) => {
  const stays = allStays.filter(s => String(s.consignmentId) === req.params.consignmentId);
  res.json({ items: stays, total: stays.length, nextCursor: null });
});

// ------------------------------------------------------------------ Cargo Regimes (Global 🌐)
router.get('/cargo-regimes', requireSite(true), requirePermission('masters.view'), (req, res) => {
  res.json({ items: cargoRegimes, total: cargoRegimes.length, nextCursor: null });
});

router.get('/cargo-regimes/:regimeCode', requireSite(true), requirePermission('masters.view'), (req, res) => {
  const item = cargoRegimes.find(r => r.regimeCode === req.params.regimeCode || String((r as any).cargoRegimeId) === req.params.regimeCode);
  if (!item) return res.status(404).json({ error: 'Cargo regime not found' });
  res.json(item);
});

export const cargoRouter = router;
