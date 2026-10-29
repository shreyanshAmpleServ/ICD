import { Router } from 'express';
import { requireSite } from '../../middleware/siteScope';
import { requirePermission } from '../../middleware/permission';
import {
  holds, customsRefs, releaseOrders, approvals, exceptions,
  holdTypes, CONDITIONS, evaluate
} from '../../data/control';
import { exams, REF_TYPES, exceptionComments, delegations } from '../../data/cargo';
import { releaseConditions, releaseRules, approvalPolicies, exceptionTypes } from '../../data/admin';
import { allStays } from '../../data/core';

const router = Router();

// In-memory resolution codes
let resolutionCodes = [
  { resolutionCodeId: 1, code: 'AUTHORIZED_EXCEPTION', name: 'Authorized exception override', isActive: true, logInst: 1 },
  { resolutionCodeId: 2, code: 'CORRECTED_DATA', name: 'Master data or manifest corrected', isActive: true, logInst: 1 },
  { resolutionCodeId: 3, code: 'RELEASE_CONFIRMED', name: 'Official release confirmation verified', isActive: true, logInst: 1 },
  { resolutionCodeId: 4, code: 'TURNED_BACK', name: 'Vehicle turned back from terminal', isActive: true, logInst: 1 }
];

// In-memory comments store
const commentsStore: Record<string, any[]> = {
  ...exceptionComments
};

import { getPrisma, isDbLive } from '../../db/prisma';

// ------------------------------------------------------------------ 1. Customs (Site-scoped)
router.get('/customs/ref-types', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  res.json({ items: REF_TYPES, total: REF_TYPES.length, nextCursor: null });
});

router.get(['/customs/refs', '/customs-declarations'], requireSite(false), requirePermission('consignment.view'), async (req, res) => {
  const { consignmentId, status } = req.query;
  let items = customsRefs as any[];

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbRefs = await prisma.customs_refs.findMany({
          include: {
            consignments: true,
            unit_stays: true
          },
          orderBy: { customs_ref_id: 'desc' }
        });

        if (dbRefs && dbRefs.length > 0) {
          const mapped = dbRefs.map(r => ({
            customsRefId: r.customs_ref_id,
            consignmentId: r.consignment_id,
            consignmentRef: r.consignments?.ref_no || 'BL-DAR-2026-9901',
            unitStayId: r.unit_stay_id,
            unitNo: r.unit_stays?.unit_no,
            refType: r.ref_type || 'TANSAD',
            refTypeCode: r.ref_type || 'TANSAD',
            refNo: r.ref_no,
            status: r.status || 'CLEARED',
            registeredAt: r.lodged_at?.toISOString() || new Date().toISOString(),
            clearedAt: r.cleared_at?.toISOString()
          }));

          const dbRefNos = new Set(mapped.map(m => m.refNo));
          items = [...mapped, ...customsRefs.filter(c => !dbRefNos.has(c.refNo))] as any;
        }
      } catch (err: any) {
        console.warn('[Customs Refs API] DB query fallback:', err.message);
      }
    }
  }

  if (consignmentId) items = items.filter(c => String(c.consignmentId) === String(consignmentId));
  if (status) items = items.filter(c => c.status === status);
  res.json({ items, total: items.length, nextCursor: null });
});

router.post('/customs/refs', requireSite(false), requirePermission('customs.ref.edit', 'DO'), (req, res) => {
  const newRef = {
    customsRefId: customsRefs.length + 101,
    siteId: 1,
    consignmentId: req.body.consignmentId || 101,
    refType: req.body.refType || 'TANSAD',
    refNo: req.body.refNo || `TZ-CUST-2026-${Date.now()}`,
    status: 'ACTIVE',
    registeredAt: new Date().toISOString(),
    logInst: 1,
    ...req.body
  };
  customsRefs.push(newRef as any);
  res.status(201).json(newRef);
});

router.get('/customs/refs/:customsRefId', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const ref = (customsRefs as any[]).find(c => String(c.customsRefId) === req.params.customsRefId);
  if (!ref) return res.status(404).json({ error: 'Customs reference not found' });
  res.json(ref);
});

router.patch('/customs/refs/:customsRefId', requireSite(false), requirePermission('customs.ref.edit', 'DO'), (req, res) => {
  const ref = (customsRefs as any[]).find(c => String(c.customsRefId) === req.params.customsRefId);
  if (!ref) return res.status(404).json({ error: 'Customs reference not found' });
  Object.assign(ref, req.body, { logInst: (ref.logInst || 1) + 1 });
  res.json(ref);
});

router.post('/customs/refs/:customsRefId([0-9a-zA-Z_.-]+):cancel', requireSite(false), requirePermission('customs.ref.edit', 'DO'), (req, res) => {
  const ref = (customsRefs as any[]).find(c => String(c.customsRefId) === req.params.customsRefId);
  if (!ref) return res.status(404).json({ error: 'Customs reference not found' });
  ref.status = 'CANCELLED';
  res.json({ success: true, customsRef: ref });
});

router.get('/exams', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  res.json({ items: exams, total: exams.length, nextCursor: null });
});

router.post('/exams', requireSite(false), requirePermission('customs.exam.record', 'DO'), (req, res) => {
  const newExam = {
    examId: exams.length + 301,
    unitStayId: req.body.unitStayId || 5001,
    examType: req.body.examType || 'PHYSICAL',
    examBay: req.body.examBay || 'EXAM-BAY-1',
    status: 'SCHEDULED',
    scheduledAt: new Date().toISOString(),
    officerName: req.body.officerName || 'TRA Inspector',
    logInst: 1,
    ...req.body
  };
  exams.push(newExam as any);
  res.status(201).json(newExam);
});

router.post('/exams/:examId([0-9a-zA-Z_.-]+):complete', requireSite(false), requirePermission('customs.exam.record', 'DO'), (req, res) => {
  const exam = (exams as any[]).find(e => String(e.examId) === req.params.examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  exam.status = 'COMPLETED';
  exam.completedAt = new Date().toISOString();
  exam.outcome = req.body.outcome || 'CLEARED';
  res.json({ success: true, exam });
});

// ------------------------------------------------------------------ 2. Holds (Site-scoped)
router.get('/hold-types', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  res.json({ items: holdTypes, total: holdTypes.length, nextCursor: null });
});

router.post('/hold-types', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newHt = {
    holdTypeId: holdTypes.length + 1,
    holdTypeCode: req.body.holdTypeCode || `HT_${holdTypes.length + 1}`,
    name: req.body.name || 'Custom Hold Type',
    blocksGateOut: req.body.blocksGateOut !== false,
    blocksYardMove: !!req.body.blocksYardMove,
    isActive: true,
    logInst: 1,
    ...req.body
  };
  holdTypes.push(newHt as any);
  res.status(201).json(newHt);
});

router.get('/hold-types/:holdTypeId', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const ht = holdTypes.find(h => String((h as any).holdTypeId) === req.params.holdTypeId || h.holdCode === req.params.holdTypeId);
  if (!ht) return res.status(404).json({ error: 'Hold type not found' });
  res.json(ht);
});

router.patch('/hold-types/:holdTypeId', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const ht = holdTypes.find(h => String((h as any).holdTypeId) === req.params.holdTypeId || h.holdCode === req.params.holdTypeId);
  if (!ht) return res.status(404).json({ error: 'Hold type not found' });
  Object.assign(ht, req.body);
  res.json(ht);
});

router.get('/holds', requireSite(false), requirePermission('consignment.view'), async (req, res) => {
  const { status, unitStayId } = req.query;
  let items = holds as any[];

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbHolds = await prisma.holds.findMany({
          include: {
            unit_stays: true,
            users_holds_placed_by_user_idTousers: true
          },
          orderBy: { hold_id: 'desc' }
        });

        if (dbHolds && dbHolds.length > 0) {
          const mapped = dbHolds.map(h => ({
            holdId: h.hold_id,
            unitStayId: h.unit_stay_id,
            unitNo: h.unit_stays?.unit_no || 'MSKU 882014 9',
            holdType: h.hold_type,
            holdTypeCode: h.hold_type,
            authorityRef: `AUTH-${h.hold_type}`,
            reason: h.reason,
            status: h.status || 'ACTIVE',
            placedAt: h.placed_at?.toISOString() || new Date().toISOString(),
            placedBy: h.users_holds_placed_by_user_idTousers?.user_name || 'Ashok Kumar'
          }));

          const dbIds = new Set(mapped.map(m => m.holdId));
          items = [...mapped, ...holds.filter(h => h.holdId ? !dbIds.has(h.holdId) : true)] as any;
        }
      } catch (err: any) {
        console.warn('[Holds API] DB query fallback:', err.message);
      }
    }
  }

  if (status) items = items.filter(h => h.status === status);
  if (unitStayId) items = items.filter(h => String(h.unitStayId) === String(unitStayId));
  res.json({ items, total: items.length, nextCursor: null });
});

router.post(['/holds', '/holds:place'], requireSite(false), requirePermission('customs.hold.place', 'DO'), (req, res) => {
  const newHold = {
    holdId: holds.length + 701,
    unitStayId: req.body.unitStayId || 5001,
    holdTypeCode: req.body.holdTypeCode || 'CUSTOMS',
    status: 'ACTIVE',
    placedAt: new Date().toISOString(),
    placedBy: req.user?.username || 'Customs Officer',
    reason: req.body.reason || 'Verification hold',
    authorityRef: req.body.authorityRef || 'HOLD-REF-2026',
    logInst: 1,
    ...req.body
  };
  holds.push(newHold as any);
  res.status(201).json(newHold);
});

router.get('/holds/:holdId', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const h = (holds as any[]).find(x => String(x.holdId) === req.params.holdId);
  if (!h) return res.status(404).json({ error: 'Hold not found' });
  res.json(h);
});

router.post('/holds/:holdId([0-9a-zA-Z_.-]+):lift', requireSite(false), requirePermission('customs.hold.lift', 'DO'), (req, res) => {
  const h = (holds as any[]).find(x => String(x.holdId) === req.params.holdId);
  if (!h) return res.status(404).json({ error: 'Hold not found' });
  h.status = 'LIFTED';
  h.liftedAt = new Date().toISOString();
  h.liftedBy = req.user?.username || 'Customs Supervisor';
  h.liftReason = req.body.reason || 'Inspection completed and cleared';
  res.json({ success: true, hold: h });
});

// ------------------------------------------------------------------ 3. Release (Site-scoped)
router.get('/release-conditions', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  res.json({ items: releaseConditions, total: releaseConditions.length, nextCursor: null });
});

router.get('/release-rules', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  res.json({ items: releaseRules, total: releaseRules.length, nextCursor: null });
});

router.post('/release-rules', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newRule = {
    releaseRuleId: releaseRules.length + 1,
    ruleCode: req.body.ruleCode || `RULE_${releaseRules.length + 1}`,
    ruleName: req.body.ruleName || 'Standard Clearance Check',
    conditionCode: req.body.conditionCode || 'CUSTOMS_CLEARED',
    isMandatory: true,
    isActive: true,
    logInst: 1,
    ...req.body
  };
  releaseRules.push(newRule as any);
  res.status(201).json(newRule);
});

router.get('/release-rules/:releaseRuleId', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const r = (releaseRules as any[]).find(x => String(x.releaseRuleId) === req.params.releaseRuleId || x.ruleCode === req.params.releaseRuleId);
  if (!r) return res.status(404).json({ error: 'Release rule not found' });
  res.json(r);
});

router.patch('/release-rules/:releaseRuleId', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const r = (releaseRules as any[]).find(x => String(x.releaseRuleId) === req.params.releaseRuleId || x.ruleCode === req.params.releaseRuleId);
  if (!r) return res.status(404).json({ error: 'Release rule not found' });
  Object.assign(r, req.body);
  res.json(r);
});

router.get('/release-orders', requireSite(false), requirePermission('consignment.view'), async (req, res) => {
  const { status, consignmentId } = req.query;
  let items = releaseOrders as any[];

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbRos = await prisma.release_orders.findMany({
          include: {
            consignments: true,
            parties: true,
            users: true
          },
          orderBy: { release_order_id: 'desc' }
        });

        if (dbRos && dbRos.length > 0) {
          const mapped = dbRos.map(ro => ({
            releaseOrderId: ro.release_order_id,
            releaseOrderNo: ro.release_no,
            releaseNo: ro.release_no,
            consignmentId: ro.consignment_id,
            consignmentRef: ro.consignments?.ref_no || 'BL-DAR-2026-9901',
            status: ro.status || 'APPROVED',
            requestedBy: ro.parties?.party_name || 'Bollore Logistics',
            approvedBy: ro.users?.user_name || 'Ashok Kumar',
            issuedAt: ro.issued_at?.toISOString() || new Date().toISOString(),
            expiresAt: ro.expires_at?.toISOString() || new Date(Date.now() + 72 * 3600000).toISOString()
          }));

          const dbRefs = new Set(mapped.map(m => m.releaseNo));
          items = [...mapped, ...releaseOrders.filter(r => !dbRefs.has((r as any).releaseOrderNo || (r as any).releaseNo))] as any;
        }
      } catch (err: any) {
        console.warn('[Release Orders API] DB query fallback:', err.message);
      }
    }
  }

  if (status) items = items.filter(r => r.status === status);
  if (consignmentId) items = items.filter(r => String(r.consignmentId) === String(consignmentId));
  res.json({ items, total: items.length, nextCursor: null });
});

router.post('/release-orders', requireSite(false), requirePermission('release.issue', 'DO'), (req, res) => {
  const newRo = {
    releaseOrderId: releaseOrders.length + 801,
    releaseOrderNo: `RO-DAR1-26-0${releaseOrders.length + 1943}`,
    consignmentId: req.body.consignmentId || 101,
    status: 'APPROVED',
    issuedAt: new Date().toISOString(),
    validTo: new Date(Date.now() + 172800000).toISOString(),
    qrToken: `RO-QR-${Date.now()}`,
    units: req.body.units || [],
    logInst: 1,
    ...req.body
  };
  releaseOrders.push(newRo as any);
  res.status(201).json(newRo);
});

router.get('/release-orders/:releaseOrderId', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const ro = (releaseOrders as any[]).find(r => String(r.releaseOrderId) === req.params.releaseOrderId || r.releaseOrderNo === req.params.releaseOrderId);
  if (!ro) return res.status(404).json({ error: 'Release order not found' });
  res.json(ro);
});

router.get('/release-qr/:qrToken', requireSite(false), requirePermission('gate.visit.checkout'), (req, res) => {
  const ro = (releaseOrders as any[]).find(r => r.qrToken === req.params.qrToken);
  res.json({
    qrToken: req.params.qrToken,
    isValid: true,
    releaseOrderNo: ro?.releaseOrderNo || 'RO-DAR1-26-01943',
    status: ro?.status || 'APPROVED',
    validTo: ro?.validTo || new Date(Date.now() + 86400000).toISOString(),
    units: ro?.units || ['MSKU 882014 9']
  });
});

router.post(['/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):evaluate', '/release-orders:evaluate'], requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const unitStayId = req.body.unitStayId || 5001;
  const stay = allStays.find(s => s.unitStayId === Number(unitStayId)) || allStays[0];
  const checks = evaluate(stay, 'PREVIEW');
  const canRelease = checks.every(c => c.result === 'PASS' || c.result === 'NOT_APPLIC');
  res.json({ unitStayId: stay.unitStayId, canRelease, checks });
});

router.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):approve', requireSite(false), requirePermission('release.issue', 'DO'), (req, res) => {
  const ro = (releaseOrders as any[]).find(r => String(r.releaseOrderId) === req.params.releaseOrderId);
  if (!ro) return res.status(404).json({ error: 'Release order not found' });
  ro.status = 'APPROVED';
  ro.approvedAt = new Date().toISOString();
  ro.approvedBy = req.user?.username || 'Release Officer';
  res.json({ success: true, releaseOrder: ro });
});

router.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):cancel', requireSite(false), requirePermission('release.issue', 'DO'), (req, res) => {
  const ro = (releaseOrders as any[]).find(r => String(r.releaseOrderId) === req.params.releaseOrderId);
  if (!ro) return res.status(404).json({ error: 'Release order not found' });
  ro.status = 'CANCELLED';
  res.json({ success: true, releaseOrder: ro });
});

router.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+):revalidate', requireSite(false), requirePermission('release.issue', 'DO'), (req, res) => {
  const ro = (releaseOrders as any[]).find(r => String(r.releaseOrderId) === req.params.releaseOrderId);
  if (!ro) return res.status(404).json({ error: 'Release order not found' });
  ro.validTo = new Date(Date.now() + 172800000).toISOString();
  ro.status = 'APPROVED';
  res.json({ success: true, releaseOrder: ro, message: 'Validity extended by 48 hours.' });
});

router.post('/release-orders/:releaseOrderId([0-9a-zA-Z_.-]+)/units:change', requireSite(false), requirePermission('release.issue', 'DO'), (req, res) => {
  const ro = (releaseOrders as any[]).find(r => String(r.releaseOrderId) === req.params.releaseOrderId);
  if (!ro) return res.status(404).json({ error: 'Release order not found' });
  ro.units = req.body.units || [];
  res.json({ success: true, releaseOrder: ro });
});

router.post('/gate-out-checks', requireSite(false), requirePermission('gate.visit.checkout'), (req, res) => {
  const { unitStayId, truckVisitId } = req.body;
  const stay = allStays.find(s => s.unitStayId === Number(unitStayId || 5001)) || allStays[0];
  const checks = evaluate(stay, 'GATE_OUT');
  const canExit = checks.every(c => c.result === 'PASS' || c.result === 'NOT_APPLIC');
  res.json({
    unitStayId,
    truckVisitId,
    canExit,
    reasons: checks.filter(c => c.result !== 'PASS' && c.result !== 'NOT_APPLIC').map(c => c.detail),
    checks
  });
});

router.get('/units/:unitStayId/gate-out-explanation', requireSite(false), requirePermission('consignment.view'), (req, res) => {
  const stay = allStays.find(s => String(s.unitStayId) === req.params.unitStayId) || allStays[0];
  const checks = evaluate(stay, 'GATE_OUT');
  res.json({ unitStayId: stay.unitStayId, checks });
});

// ------------------------------------------------------------------ 4. Approvals
router.get('/approvals', requireSite(true), (req, res) => {
  const { status, permissionCode, siteId } = req.query;
  const headerSite = req.headers['x-site-id'] as string | undefined;
  let items = approvals as any[];
  if (status) items = items.filter(a => a.status === status);
  if (permissionCode) items = items.filter(a => a.permissionCode === permissionCode);
  const targetSite = (siteId || headerSite) as string | undefined;
  if (targetSite && targetSite !== 'all' && targetSite !== 'ALL') {
    items = items.filter(a => a.siteId === null || String(a.siteId) === targetSite || (targetSite === 'DAR1' && a.siteId === 1));
  }
  res.json({ items, total: items.length, nextCursor: null });
});

router.get('/approvals/:approvalRequestId', requireSite(false), (req, res) => {
  const app = (approvals as any[]).find(a => String(a.approvalRequestId) === req.params.approvalRequestId);
  if (!app) return res.status(404).json({ error: 'Approval request not found' });
  res.json(app);
});

router.post('/approvals/:approvalRequestId([0-9a-zA-Z_.-]+):decide', requireSite(false), (req, res) => {
  const app = (approvals as any[]).find(a => String(a.approvalRequestId) === req.params.approvalRequestId);
  if (!app) return res.status(404).json({ error: 'Approval request not found' });
  const decision = req.body.decision || 'APPROVE';
  app.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  app.decidedAt = new Date().toISOString();
  app.decidedBy = req.user?.username || 'Approver';
  app.decisionNotes = req.body.notes || 'Approved per review';
  res.json({ success: true, approval: app });
});

router.post('/approvals/:approvalRequestId([0-9a-zA-Z_.-]+):cancel', requireSite(false), (req, res) => {
  const app = (approvals as any[]).find(a => String(a.approvalRequestId) === req.params.approvalRequestId);
  if (!app) return res.status(404).json({ error: 'Approval request not found' });
  app.status = 'CANCELLED';
  res.json({ success: true, approval: app });
});

router.get('/approval-policies', requireSite(false), requirePermission('admin.config.manage'), (req, res) => {
  res.json({ items: approvalPolicies, total: approvalPolicies.length, nextCursor: null });
});

router.post('/approval-policies', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newPol = {
    approvalPolicyId: approvalPolicies.length + 1,
    policyCode: req.body.policyCode || `POL_${approvalPolicies.length + 1}`,
    policyName: req.body.policyName || 'Custom Approval Policy',
    thresholdAmount: req.body.thresholdAmount || 1000,
    currency: 'USD',
    requiredRole: req.body.requiredRole || 'OPS_MANAGER',
    isActive: true,
    logInst: 1,
    ...req.body
  };
  approvalPolicies.push(newPol as any);
  res.status(201).json(newPol);
});

router.get('/approval-policies/:approvalPolicyId', requireSite(false), requirePermission('admin.config.manage'), (req, res) => {
  const p = (approvalPolicies as any[]).find(x => String(x.approvalPolicyId) === req.params.approvalPolicyId);
  if (!p) return res.status(404).json({ error: 'Approval policy not found' });
  res.json(p);
});

router.patch('/approval-policies/:approvalPolicyId', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const p = (approvalPolicies as any[]).find(x => String(x.approvalPolicyId) === req.params.approvalPolicyId);
  if (!p) return res.status(404).json({ error: 'Approval policy not found' });
  Object.assign(p, req.body);
  res.json(p);
});

router.get('/delegations', requireSite(false), (req, res) => {
  res.json({ items: delegations, total: delegations.length, nextCursor: null });
});

router.post('/delegations', requireSite(false), (req, res) => {
  const newDel = {
    delegationId: delegations.length + 1,
    fromUserSub: req.body.fromUserSub || 'u-daniel',
    fromUserName: req.body.fromUserName || 'Ops · Daniel K.',
    toUserSub: req.body.toUserSub || 'u-rehema',
    toUserName: req.body.toUserName || 'Doc & Clearance · Rehema K.',
    roles: req.body.roles || ['OPS_MANAGER'],
    validFrom: new Date().toISOString(),
    validTo: req.body.validTo || new Date(Date.now() + 604800000).toISOString(),
    status: 'ACTIVE',
    logInst: 1,
    ...req.body
  };
  delegations.push(newDel as any);
  res.status(201).json(newDel);
});

router.post('/delegations/:delegationId([0-9a-zA-Z_.-]+):revoke', requireSite(false), (req, res) => {
  const del = (delegations as any[]).find(d => String(d.delegationId) === req.params.delegationId);
  if (!del) return res.status(404).json({ error: 'Delegation not found' });
  del.status = 'REVOKED';
  res.json({ success: true, delegation: del });
});

// ------------------------------------------------------------------ 5. Exceptions (Site-scoped)
router.get('/exception-types', requireSite(false), requirePermission('exception.view'), (req, res) => {
  res.json({ items: exceptionTypes, total: exceptionTypes.length, nextCursor: null });
});

router.post('/exception-types', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newEt = {
    exceptionTypeId: exceptionTypes.length + 1,
    code: req.body.code || `EX_${exceptionTypes.length + 1}`,
    name: req.body.name || 'Custom Exception',
    severity: req.body.severity || 'MEDIUM',
    slaMinutes: req.body.slaMinutes || 120,
    isActive: true,
    logInst: 1,
    ...req.body
  };
  exceptionTypes.push(newEt as any);
  res.status(201).json(newEt);
});

router.get('/exception-types/:exceptionTypeId', requireSite(false), requirePermission('exception.view'), (req, res) => {
  const et = (exceptionTypes as any[]).find(x => String(x.exceptionTypeId) === req.params.exceptionTypeId || x.code === req.params.exceptionTypeId);
  if (!et) return res.status(404).json({ error: 'Exception type not found' });
  res.json(et);
});

router.patch('/exception-types/:exceptionTypeId', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const et = (exceptionTypes as any[]).find(x => String(x.exceptionTypeId) === req.params.exceptionTypeId || x.code === req.params.exceptionTypeId);
  if (!et) return res.status(404).json({ error: 'Exception type not found' });
  Object.assign(et, req.body);
  res.json(et);
});

router.get('/resolution-codes', requireSite(false), requirePermission('exception.view'), (req, res) => {
  res.json({ items: resolutionCodes, total: resolutionCodes.length, nextCursor: null });
});

router.post('/resolution-codes', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const newRc = {
    resolutionCodeId: resolutionCodes.length + 1,
    code: req.body.code || `RES_${resolutionCodes.length + 1}`,
    name: req.body.name || 'Custom Resolution',
    isActive: true,
    logInst: 1,
    ...req.body
  };
  resolutionCodes.push(newRc);
  res.status(201).json(newRc);
});

router.get('/resolution-codes/:resolutionCodeId', requireSite(false), requirePermission('exception.view'), (req, res) => {
  const rc = resolutionCodes.find(x => String(x.resolutionCodeId) === req.params.resolutionCodeId || x.code === req.params.resolutionCodeId);
  if (!rc) return res.status(404).json({ error: 'Resolution code not found' });
  res.json(rc);
});

router.patch('/resolution-codes/:resolutionCodeId', requireSite(false), requirePermission('admin.config.manage', 'DO'), (req, res) => {
  const rc = resolutionCodes.find(x => String(x.resolutionCodeId) === req.params.resolutionCodeId || x.code === req.params.resolutionCodeId);
  if (!rc) return res.status(404).json({ error: 'Resolution code not found' });
  Object.assign(rc, req.body);
  res.json(rc);
});

router.get('/exceptions', requireSite(false), requirePermission('exception.view'), (req, res) => {
  const { status, severity } = req.query;
  let items = exceptions as any[];
  if (status) items = items.filter(e => e.status === status);
  if (severity) items = items.filter(e => e.severity === severity);
  res.json({ items, total: items.length, nextCursor: null });
});

router.post('/exceptions', requireSite(false), requirePermission('exception.manage', 'DO'), (req, res) => {
  const newEx = {
    exceptionCaseId: exceptions.length + 1001,
    caseNo: `EX-26-0${exceptions.length + 882}`,
    exceptionType: req.body.exceptionType || 'SEAL_MISMATCH',
    severity: req.body.severity || 'HIGH',
    status: 'OPEN',
    entityName: req.body.entityName || 'unit_stay',
    entityId: req.body.entityId || '5001',
    description: req.body.description || 'Discrepancy observed at gate',
    openedAt: new Date().toISOString(),
    openedBy: req.user?.username || 'Gate Officer',
    assignedRole: 'OPS_MANAGER',
    logInst: 1,
    ...req.body
  };
  exceptions.push(newEx as any);
  res.status(201).json(newEx);
});

router.get('/exceptions/:exceptionCaseId', requireSite(false), requirePermission('exception.view'), (req, res) => {
  const ex = (exceptions as any[]).find(e => String(e.exceptionCaseId) === req.params.exceptionCaseId || e.caseNo === req.params.exceptionCaseId);
  if (!ex) return res.status(404).json({ error: 'Exception case not found' });
  res.json(ex);
});

router.post('/exceptions/:exceptionCaseId([0-9a-zA-Z_.-]+):assign', requireSite(false), requirePermission('exception.manage', 'DO'), (req, res) => {
  const ex = (exceptions as any[]).find(e => String(e.exceptionCaseId) === req.params.exceptionCaseId || e.caseNo === req.params.exceptionCaseId);
  if (!ex) return res.status(404).json({ error: 'Exception case not found' });
  ex.assignedTo = req.body.assignedTo || req.body.assignee;
  ex.assignedRole = req.body.assignedRole || 'OPS_MANAGER';
  res.json({ success: true, exception: ex });
});

router.get('/exceptions/:exceptionCaseId/comments', requireSite(false), requirePermission('exception.view'), (req, res) => {
  const comments = commentsStore[req.params.exceptionCaseId] || [
    { commentId: 1, exceptionCaseId: Number(req.params.exceptionCaseId), author: 'System', text: 'Case registered automatically from checkpoint alert', createdAt: new Date().toISOString() }
  ];
  res.json({ items: comments, total: comments.length, nextCursor: null });
});

router.post('/exceptions/:exceptionCaseId/comments', requireSite(false), requirePermission('exception.view'), (req, res) => {
  if (!commentsStore[req.params.exceptionCaseId]) commentsStore[req.params.exceptionCaseId] = [];
  const comment = {
    commentId: Date.now(),
    exceptionCaseId: Number(req.params.exceptionCaseId),
    author: req.user?.username || 'Current User',
    text: req.body.text || req.body.comment || '',
    createdAt: new Date().toISOString()
  };
  commentsStore[req.params.exceptionCaseId].push(comment);
  res.status(201).json(comment);
});

router.post('/exceptions/:exceptionCaseId([0-9a-zA-Z_.-]+):resolve', requireSite(false), requirePermission('exception.manage', 'DO'), (req, res) => {
  const ex = (exceptions as any[]).find(e => String(e.exceptionCaseId) === req.params.exceptionCaseId || e.caseNo === req.params.exceptionCaseId);
  if (!ex) return res.status(404).json({ error: 'Exception case not found' });
  ex.status = 'RESOLVED';
  ex.resolutionCode = req.body.resolutionCode || 'AUTHORIZED_EXCEPTION';
  ex.resolutionNotes = req.body.notes || 'Resolved and logged';
  ex.resolvedAt = new Date().toISOString();
  ex.resolvedBy = req.user?.username || 'OPS_MANAGER';
  res.json({ success: true, exception: ex });
});

router.post('/exceptions/:exceptionCaseId([0-9a-zA-Z_.-]+):close', requireSite(false), requirePermission('exception.manage', 'DO'), (req, res) => {
  const ex = (exceptions as any[]).find(e => String(e.exceptionCaseId) === req.params.exceptionCaseId || e.caseNo === req.params.exceptionCaseId);
  if (!ex) return res.status(404).json({ error: 'Exception case not found' });
  ex.status = 'CLOSED';
  ex.closedAt = new Date().toISOString();
  res.json({ success: true, exception: ex });
});

router.post('/exceptions/:exceptionCaseId([0-9a-zA-Z_.-]+):reopen', requireSite(false), requirePermission('exception.manage', 'DO'), (req, res) => {
  const ex = (exceptions as any[]).find(e => String(e.exceptionCaseId) === req.params.exceptionCaseId || e.caseNo === req.params.exceptionCaseId);
  if (!ex) return res.status(404).json({ error: 'Exception case not found' });
  ex.status = 'OPEN';
  res.json({ success: true, exception: ex });
});

// ------------------------------------------------------------------ Dangerous Goods (Global 🌐)
router.get(['/dg-classes', '/dg-lines'], requireSite(false), requirePermission('consignment.view'), async (req, res) => {
  let items: any[] = [];

  if (isDbLive()) {
    const prisma = getPrisma();
    if (prisma) {
      try {
        const dbDg = await prisma.dg_lines.findMany({
          include: {
            unit_stays: true
          },
          orderBy: { dg_line_id: 'desc' }
        });

        if (dbDg && dbDg.length > 0) {
          items = dbDg.map(dg => ({
            unitDgLineId: dg.dg_line_id,
            dgLineId: dg.dg_line_id,
            unitStayId: dg.unit_stay_id,
            unitNo: dg.unit_stays?.unit_no || 'MSKU 882014 9',
            unNo: dg.un_number.replace(/^UN\s*/, ''),
            unNumber: dg.un_number,
            imoClass: dg.imo_class,
            packingGroup: dg.packing_group || 'II',
            properShippingName: dg.proper_shipping_name || 'HAZARDOUS MATERIAL',
            emergencyContact: '+255 22 286 0011 (Chemtrec TZ)'
          }));
        }
      } catch (err: any) {
        console.warn('[DG API] DB query fallback:', err.message);
      }
    }
  }

  res.json({ items, total: items.length, nextCursor: null });
});

export const controlRouter = router;
