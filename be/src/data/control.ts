/* Control sample data: holds, customs references, release orders and
   their checks, approvals, exceptions. */
import type { S } from '../types';
import { HERO, allStays, consignments } from './core';
import { at, day } from './gen';

/* ------------------------------------------------------------------ hold types */
export const holdTypes: S<'HoldType'>[] = [
  { holdCode: 'SCAN', holdName: 'Scan / examination hold', authority: 'CUSTOMS', blocksGateOut: true, blocksRelease: true, blocksMove: false, blocksStuffing: true, liftNeedsApproval: false, liftNeedsEvidence: true, moveToTagCode: 'EXAM' },
  { holdCode: 'CUSTOMS', holdName: 'Customs hold', authority: 'CUSTOMS', blocksGateOut: true, blocksRelease: true, blocksMove: false, blocksStuffing: true, liftNeedsApproval: false, liftNeedsEvidence: true },
  { holdCode: 'LINE', holdName: 'Shipping line hold', authority: 'SHIPPING_LINE', blocksGateOut: true, blocksRelease: true, blocksMove: false, blocksStuffing: false, liftNeedsApproval: false, liftNeedsEvidence: true },
  { holdCode: 'ICD_COMMERCIAL', holdName: 'Depot commercial hold', authority: 'ICD', blocksGateOut: true, blocksRelease: true, blocksMove: false, blocksStuffing: false, liftNeedsApproval: true, liftNeedsEvidence: false },
  { holdCode: 'DAMAGE', holdName: 'Damage under survey', authority: 'ICD', blocksGateOut: true, blocksRelease: false, blocksMove: true, blocksStuffing: true, liftNeedsApproval: true, liftNeedsEvidence: true },
  { holdCode: 'SECURITY', holdName: 'Security investigation', authority: 'ICD', blocksGateOut: true, blocksRelease: true, blocksMove: true, blocksStuffing: true, liftNeedsApproval: true, liftNeedsEvidence: true },
  { holdCode: 'COURT', holdName: 'Court / legal order', authority: 'OTHER_GOVT', blocksGateOut: true, blocksRelease: true, blocksMove: true, blocksStuffing: true, liftNeedsApproval: true, liftNeedsEvidence: true },
];
export const holdTypeName = (c: string) => holdTypes.find((h) => h.holdCode === c)?.holdName ?? c;

/* ------------------------------------------------------------------ holds */
let holdId = 700;
export const holds: S<'Hold'>[] = [
  { holdId: ++holdId, unitStayId: HERO.unitStayId!, unitNo: HERO.cargoUnit.unitNo, holdTypeCode: 'SCAN', status: 'ACTIVE', authorityRef: 'EXN/DSM/26/04418', reason: 'Physical examination ordered on entry lodgement', placedAt: at(30), placedBy: 'Doc & clearance · Rehema K.' },
];
for (const s of allStays.filter((x) => (x.activeHoldCount ?? 0) > 0 && x !== HERO)) {
  const code = s.cargoUnit.category === 'VEHICLE' ? 'CUSTOMS' : (['LINE', 'ICD_COMMERCIAL', 'DAMAGE', 'CUSTOMS'] as const)[holdId % 4];
  holds.push({
    holdId: ++holdId, unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, holdTypeCode: code, status: 'ACTIVE',
    authorityRef: code === 'LINE' ? 'BML/DO-HOLD/882' : code.startsWith('CUSTOMS') ? `QRY/DSM/26/${1200 + holdId}` : undefined,
    reason: ({ LINE: 'Freight not settled with the line', ICD_COMMERCIAL: 'Storage overdue more than 30 days', DAMAGE: 'Side panel damage, surveyor appointed', CUSTOMS: 'Valuation query on declared value', SCAN: 'Scan image needs physical check' } as Record<string, string>)[code],
    placedAt: at(20 + (holdId % 7) * 11), placedBy: code === 'DAMAGE' ? 'Inspection · Juma M.' : 'Doc & clearance · Rehema K.',
  });
}
holds.push({ holdId: ++holdId, unitStayId: allStays[3].unitStayId!, unitNo: allStays[3].cargoUnit.unitNo, holdTypeCode: 'LINE', status: 'LIFTED', reason: 'Freight not settled with the line', placedAt: at(150), placedBy: 'Doc & clearance · Rehema K.', liftedAt: at(40), liftedBy: 'Doc & clearance · Rehema K.', liftReason: 'Line release BML/REL/7712 received' });
export const holdsOf = (unitStayId: number) => holds.filter((h) => h.unitStayId === unitStayId);

/* ------------------------------------------------------------------ customs refs */
export const customsRefs: S<'CustomsRef'>[] = [
  { customsRefId: 1, refTypeCode: 'ENTRY_NO', consignmentId: 101, refNo: 'TZDL-26-0418832', refDate: day(-3), status: 'ACTIVE', source: 'MANUAL' },
  { customsRefId: 2, refTypeCode: 'EXAM_NOTICE', unitStayId: HERO.unitStayId!, refNo: 'EXN/DSM/26/04418', refDate: day(-1), status: 'ACTIVE', source: 'MANUAL' },
  { customsRefId: 3, refTypeCode: 'TRANSIT_DECL', consignmentId: 103, refNo: 'T1-DSM-26-77120', refDate: day(-4), validTo: day(10), status: 'ACTIVE', source: 'MANUAL' },
  { customsRefId: 4, refTypeCode: 'TRANSIT_BOND', consignmentId: 103, refNo: 'BND-55120-KCB', refDate: day(-4), validTo: day(26), amount: '48000.00', amountCurrency: 'USD', status: 'ACTIVE', source: 'MANUAL' },
  { customsRefId: 5, refTypeCode: 'CUSTOMS_RELEASE', consignmentId: 102, refNo: 'REL-DSM-26-31007', refDate: day(-2), status: 'ACTIVE', source: 'MANUAL' },
];
export const REF_TYPE_NAME: Record<string, string> = {
  ENTRY_NO: 'Customs entry', EXAM_NOTICE: 'Examination notice', TRANSIT_DECL: 'Transit declaration', TRANSIT_BOND: 'Transit bond',
  CUSTOMS_RELEASE: 'Customs release', EXPORT_ENTRY: 'Export entry',
};

export interface CustomsDeclaration {
  declarationId: number;
  declarationNo: string;
  refType: string;
  consignmentId: number;
  status: 'SUBMITTED' | 'QUERY' | 'EXAM_REQUESTED' | 'CLEARED' | 'REJECTED';
  lodgedAt: string;
  clearedAt?: string;
}

export const customsDeclarations: CustomsDeclaration[] = [
  { declarationId: 1, declarationNo: 'TANSAD-26-004128', refType: 'TANSAD', consignmentId: 101, status: 'CLEARED', lodgedAt: at(48), clearedAt: at(24) },
  { declarationId: 2, declarationNo: 'TANSAD-26-004129', refType: 'TANSAD', consignmentId: 102, status: 'EXAM_REQUESTED', lodgedAt: at(30) },
  { declarationId: 3, declarationNo: 'TRANSIT-26-001099', refType: 'TRANSIT_DECL', consignmentId: 103, status: 'CLEARED', lodgedAt: at(72), clearedAt: at(50) },
];

/* ------------------------------------------------------------------ release engine */
export const CONDITIONS: [code: string, name: string][] = [
  ['IDENTITY', 'Right unit'], ['RELEASE_VALID', 'Release order valid'], ['NO_HOLD', 'No blocking hold'], ['CUSTOMS', 'Customs cleared'],
  ['COMMERCIAL', 'Charges paid or on credit'], ['COLLECTOR', 'Collector matches'], ['KEYS', 'Keys handed over'], ['PHYSICAL', 'Unit ready in yard'],
];
export function evaluate(s: S<'UnitStay'>, stage: 'PREVIEW' | 'APPROVAL' | 'GATE_OUT' = 'PREVIEW'): S<'ReleaseCheck'>[] {
  const hs = holdsOf(s.unitStayId!).filter((h) => h.status === 'ACTIVE');
  const r = (code: string, ok: boolean | null, detail: string): S<'ReleaseCheck'> => ({
    conditionCode: code, conditionName: CONDITIONS.find((c) => c[0] === code)![1], result: ok === null ? 'NOT_APPLIC' : ok ? 'PASS' : 'FAIL',
    detail, unitStayId: s.unitStayId!, stage, evaluatedAt: at(0), canOverride: code === 'COMMERCIAL',
  });
  const veh = s.cargoUnit.category === 'VEHICLE';
  const paid = s.billingStatus === 'PAID' || s.billingStatus === 'CREDIT';
  return [
    r('IDENTITY', true, `${s.cargoUnit.unitNo} matches the order`),
    r('RELEASE_VALID', s.releaseStatus === 'APPROVED' ? true : stage === 'PREVIEW' ? null : false,
      s.releaseStatus === 'APPROVED' ? 'Valid to 9 Oct' : s.releaseStatus === 'EXPIRED' ? 'Expired: pay storage to the new date' : 'No approved release order yet'),
    r('NO_HOLD', hs.length === 0, hs.length ? hs.map((h) => holdTypeName(h.holdTypeCode)).join(', ') : 'No active holds'),
    r('CUSTOMS', s.customsStatus === 'CLEARED' || s.customsStatus === 'NOT_REQUIRED', s.customsStatus === 'CLEARED' ? 'Release REL-DSM-26-31007 recorded' : `Customs status: ${s.customsStatus?.toLowerCase().replace('_', ' ')}`),
    r('COMMERCIAL', paid, paid ? (s.billingStatus === 'CREDIT' ? 'Bill-to on credit, within limit' : 'Paid through 9 Oct') : `USD ${s.accruedCharges?.total} unpaid to today`),
    r('COLLECTOR', stage === 'GATE_OUT' ? true : null, stage === 'GATE_OUT' ? 'Truck T 412 DKL and driver on the order' : 'Checked at the gate'),
    r('KEYS', veh ? (stage === 'GATE_OUT' ? true : null) : null, veh ? 'Key tag K-0412 in cabinet' : 'Not a vehicle'),
    r('PHYSICAL', s.physicalStatus === 'IN_YARD', s.currentLocation ? `At ${s.currentLocation.fullCode}` : 'Not in the yard'),
  ];
}

export const releaseOrders: S<'ReleaseOrder'>[] = [
  {
    releaseOrderId: 801, releaseNo: 'RO-DAR1-26-01942', releaseKind: 'DELIVERY', consignmentId: 101, status: 'PENDING_CHECKS', requestedByPartyId: 2,
    requestedAt: at(5), plannedExitDate: day(1), unitsTotal: 3, unitsOut: 0, transporterPartyId: 7, collectorName: 'Baraka Mwita', collectorIdType: 'Driving licence', collectorIdNo: '4003218876',
    units: [{ unitStayId: HERO.unitStayId!, unitNo: HERO.cargoUnit.unitNo, status: 'PENDING' }],
    lastChecks: evaluate(HERO, 'APPROVAL'), amountDue: HERO.accruedCharges,
  },
];
let ro = 1942;
for (const s of allStays.filter((x) => x.releaseStatus === 'APPROVED').slice(0, 9)) {
  const c = consignments.find((k) => k.consignmentId === s.consignmentId);
  releaseOrders.push({
    releaseOrderId: 801 + releaseOrders.length, releaseNo: `RO-${s.siteId === 2 ? 'DAR2' : 'DAR1'}-26-0${++ro}`, releaseKind: 'DELIVERY',
    consignmentId: c?.consignmentId, status: 'APPROVED', requestedByPartyId: c?.agentPartyId ?? 2, requestedAt: at(30), plannedExitDate: day(1),
    validFrom: at(24), validTo: new Date(Date.parse(at(-50))).toISOString(), approvedAt: at(22), approvedBy: 'Doc & clearance · Rehema K.',
    unitsTotal: 1, unitsOut: 0, transporterPartyId: 8, collectorName: 'Said Omari', units: [{ unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, status: 'RELEASED' }],
    validityHistory: [{ changeKind: 'INITIAL', newValidTo: at(-50), changedAt: at(22) }],
  });
}
releaseOrders.push({
  releaseOrderId: 899, releaseNo: 'RO-DAR1-26-01877', releaseKind: 'DELIVERY', consignmentId: 102, status: 'EXPIRED', requestedByPartyId: 11, requestedAt: at(120),
  validFrom: at(110), validTo: at(14), unitsTotal: 2, unitsOut: 1, collectorName: 'Peter Lyimo',
  validityHistory: [{ changeKind: 'INITIAL', newValidTo: at(14), changedAt: at(110) }],
});

/* ------------------------------------------------------------------ approvals */
export const approvals: S<'ApprovalRequest'>[] = [
  { approvalRequestId: 9001, requestNo: 'APR-26-00412', permissionCode: 'billing.waiver', entityName: 'charge', entityId: 61221, summary: 'Waive 4 storage days on BMLU 402117', reason: 'Customs exam delayed by the authority, not the customer. Exam notice attached.', amount: '64.00', amountCurrency: 'USD', levelsRequired: 1, currentLevel: 0, status: 'PENDING', requestedBy: 'Billing · Amina S.', requestedAt: at(3), expiresAt: at(-69), canDecide: true },
  { approvalRequestId: 9002, requestNo: 'APR-26-00413', permissionCode: 'billing.creditnote', entityName: 'invoice', entityId: 3310, summary: 'Credit note USD 1,240 on INV-DAR1-26-003310', reason: 'Reefer plug-in charged twice for 6 units (duplicate billable events).', amount: '1240.00', amountCurrency: 'USD', levelsRequired: 2, currentLevel: 1, status: 'PENDING', requestedBy: 'Billing · Amina S.', requestedAt: at(20), expiresAt: at(-52), canDecide: true, steps: [{ levelNo: 1, decision: 'APPROVE', decidedBy: 'Finance · Joseph N.', note: 'Checked against plug log', decidedAt: at(8) }] },
  { approvalRequestId: 9003, requestNo: 'APR-26-00414', permissionCode: 'gate.checkout.override', entityName: 'truck_visit', entityId: 4410, summary: 'Let T 902 DMB leave with seal mismatch', reason: 'Seal number on paper EIR mistyped; photo shows seal ML-7781203 intact.', levelsRequired: 1, currentLevel: 0, status: 'PENDING', requestedBy: 'Gate · Hamisi J.', requestedAt: at(0.3), expiresAt: at(-2), canDecide: true },
  { approvalRequestId: 9004, requestNo: 'APR-26-00409', permissionCode: 'customs.hold.lift', entityName: 'hold', entityId: 703, summary: 'Lift damage hold on IOSU 7731…', reason: 'Survey completed, liability accepted by line.', levelsRequired: 1, currentLevel: 0, status: 'PENDING', requestedBy: 'Inspection · Juma M.', requestedAt: at(26), expiresAt: at(-46), canDecide: false },
  { approvalRequestId: 9005, requestNo: 'APR-26-00401', permissionCode: 'billing.freeday.extend', entityName: 'unit_stay', entityId: 5012, summary: '+3 free days for Zamlink transit units', reason: 'Border closure at Tunduma, letter from TRA attached.', levelsRequired: 1, currentLevel: 1, status: 'APPROVED', requestedBy: 'Customer service · Grace P.', requestedAt: at(50), decidedAt: at(44), canDecide: false, steps: [{ levelNo: 1, decision: 'APPROVE', decidedBy: 'Ops · Daniel K.', decidedAt: at(44) }] },
  { approvalRequestId: 9006, requestNo: 'APR-26-00398', permissionCode: 'payment.refund', entityName: 'refund', entityId: 77, summary: 'Refund USD 620 overpayment to Pwani Hardware', reason: 'Paid twice by bank transfer (same reference).', amount: '620.00', amountCurrency: 'USD', levelsRequired: 2, currentLevel: 0, status: 'REJECTED', requestedBy: 'Cashier · Mary T.', requestedAt: at(70), decidedAt: at(60), canDecide: false, steps: [{ levelNo: 1, decision: 'REJECT', decidedBy: 'Finance · Joseph N.', note: 'Allocate to open invoice INV-…3290 instead', decidedAt: at(60) }] },
];

/* ------------------------------------------------------------------ exceptions */
export const exceptions: S<'ExceptionCase'>[] = [
  { exceptionCaseId: 301, caseNo: 'EX-26-00881', exceptionCode: 'SEAL_MISMATCH', severity: 'HIGH', status: 'OPEN', title: 'Seal mismatch at gate-in', description: 'Seal found ML-7781208, manifest says ML-7781203.', entityName: 'truck_visit', entityId: 4410, raisedBy: 'Gate · Hamisi J.', raisedAt: at(0.4), assignedRoleCode: 'OPS_MANAGER', dueAt: at(-1.6), isOverdue: false, escalationLevel: 0, approvalRequestId: 9003 },
  { exceptionCaseId: 302, caseNo: 'EX-26-00879', exceptionCode: 'GATE_OUT_BLOCKED', severity: 'MEDIUM', status: 'ASSIGNED', title: 'Truck turned back: release expired', entityName: 'truck_visit', entityId: 4402, raisedBy: 'System', raisedAt: at(3), assignedRoleCode: 'CUSTOMER_SERVICE', assignedTo: 'Grace P.', dueAt: at(1), isOverdue: true, escalationLevel: 1 },
  { exceptionCaseId: 303, caseNo: 'EX-26-00874', exceptionCode: 'DAMAGE_MAJOR', severity: 'HIGH', status: 'IN_PROGRESS', title: 'Major damage found at gate-in (side panel)', entityName: 'inspection', entityId: 1201, unitStayId: allStays[8].unitStayId, raisedBy: 'Inspection · Juma M.', raisedAt: at(26), assignedRoleCode: 'OPS_MANAGER', assignedTo: 'Daniel K.', dueAt: at(-22), isOverdue: false, escalationLevel: 0 },
  { exceptionCaseId: 304, caseNo: 'EX-26-00870', exceptionCode: 'OFFLINE_CONFLICT', severity: 'CRITICAL', status: 'OPEN', title: 'Offline gate-out conflicts with a hold placed meanwhile', description: 'Lane 2 tablet synced a gate-out made at 06:12 while offline. A line hold was placed at 06:05.', entityName: 'unit_stay', entityId: allStays[12].unitStayId!, unitStayId: allStays[12].unitStayId, raisedBy: 'System', raisedAt: at(4), assignedRoleCode: 'OPS_MANAGER', dueAt: at(2), isOverdue: true, escalationLevel: 2 },
  { exceptionCaseId: 305, caseNo: 'EX-26-00866', exceptionCode: 'WEIGHT_VARIANCE', severity: 'MEDIUM', status: 'RESOLVED', title: 'Gross weight 9% above declared', entityName: 'weighing', entityId: 5510, raisedBy: 'Weighbridge · Ally S.', raisedAt: at(30), assignedRoleCode: 'OPS_MANAGER', assignedTo: 'Daniel K.', isOverdue: false, escalationLevel: 0, resolutionCode: 'DECLARATION_AMENDED', resolutionNote: 'Agent amended VGM; within tolerance now.', resolvedAt: at(12) },
  { exceptionCaseId: 306, caseNo: 'EX-26-00861', exceptionCode: 'FISCAL_FAILED', severity: 'LOW', status: 'OPEN', title: 'Fiscal receipt failed for INV-DAR1-26-003318', entityName: 'invoice', entityId: 3318, raisedBy: 'System', raisedAt: at(6), assignedRoleCode: 'BILLING_OFFICER', dueAt: at(-18), isOverdue: false, escalationLevel: 0 },
  { exceptionCaseId: 307, caseNo: 'EX-26-00858', exceptionCode: 'NO_SHOW', severity: 'LOW', status: 'CLOSED', title: 'Announced truck did not arrive', entityName: 'truck_visit', entityId: 4380, raisedBy: 'System', raisedAt: at(40), assignedRoleCode: 'GATE_OFFICER', isOverdue: false, escalationLevel: 0, resolutionCode: 'NO_ACTION', closedAt: at(30) },
];
