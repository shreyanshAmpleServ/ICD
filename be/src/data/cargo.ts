/* Cargo and control sample data owned by the cargo screens: consignment lines
   and documents, manifests, exams, extra customs refs, release orders,
   dangerous goods, delegations, exception comments and the in-app inbox.
   Built on top of core.ts and control.ts (which are not edited).
   Note: this file does not call rnd()/pick()/int() from gen.ts so that it
   cannot shift the shared random sequence other modules depend on; variety
   comes from record indexes instead, which is just as deterministic. */
import type { S } from '../types';
import { HERO, allStays, consignment, consignments, partyName, unitsOf, vesselCalls, type Stay } from './core';
import { approvals, customsRefs, evaluate, exceptions, holds, releaseOrders } from './control';
import { at, day, iso6346 } from './gen';
import { registerSearch } from './search';

/* ------------------------------------------------------------------ helpers */
export const hoursUntil = (iso?: string | null) => (iso ? (Date.parse(iso) - Date.parse(at(0))) / 3600_000 : 0);
/** "2 h 10 min", "3 days" — for countdowns against the demo clock. */
export function untilText(iso?: string | null) {
  if (!iso) return '—';
  const h = hoursUntil(iso);
  const a = Math.abs(h);
  const txt = a < 1 ? `${Math.round(a * 60)} min` : a < 48 ? `${Math.floor(a)} h ${Math.round((a % 1) * 60)} min` : `${Math.round(a / 24)} days`;
  return h < 0 ? `${txt} ago` : txt;
}
export const unitStays = allStays;

/* ------------------------------------------------------------------ consignment lines */
export function linesOf(consignmentId: number): S<'ConsignmentLine'>[] {
  const c = consignment(consignmentId);
  const us = unitsOf(consignmentId);
  if (!us.length) {
    // nothing physical yet: empty release and the like
    return [{ consignmentLineId: consignmentId * 10 + 1, lineNo: 1, unitTypeCode: '20GP', unitGrade: 'B', qtyExpected: String(c?.unitsExpected ?? 4), qtyReceived: '0', qtyDelivered: '0', uom: 'UNIT', description: c?.cargoDescription ?? undefined }];
  }
  const types = [...new Set(us.map((u) => u.cargoUnit.unitTypeCode))];
  return types.map((t, i) => {
    const of = us.filter((u) => u.cargoUnit.unitTypeCode === t);
    return {
      consignmentLineId: consignmentId * 10 + i + 1, lineNo: i + 1, unitTypeCode: t, qtyExpected: String(of.length),
      qtyReceived: String(of.filter((u) => u.physicalStatus !== 'EXPECTED').length),
      qtyDelivered: String(of.filter((u) => u.physicalStatus === 'DEPARTED').length),
      uom: t === 'LOT' ? 'PKG' : 'UNIT',
      weightKg: of.reduce((n, u) => n + Number(u.grossWeightKg ?? 0), 0).toFixed(0),
      description: t === 'LOT' ? 'Loose cargo lots (LCL)' : c?.cargoDescription ?? undefined,
    };
  });
}

export interface DocRow { id: number; name: string; kind: string; at: string; by: string; status: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUPERSEDED' }
export function documentsOf(consignmentId: number): DocRow[] {
  const c = consignment(consignmentId);
  if (!c) return [];
  const base = consignmentId * 100;
  const d: DocRow[] = [];
  if (c.refType === 'BL') {
    d.push({ id: base + 1, name: `Bill of lading ${c.refNo}.pdf`, kind: 'Bill of lading', at: at(200), by: 'Manifest import', status: 'ACTIVE' });
    d.push({ id: base + 2, name: `Delivery order ${partyName(c.shippingLinePartyId).split(' ')[0]}.pdf`, kind: 'Delivery order', at: at(60), by: 'Kilele Clearing & Forwarding', status: 'ACTIVE' });
    d.push({ id: base + 3, name: 'Commercial invoice and packing list.pdf', kind: 'Packing list', at: at(58), by: 'Kilele Clearing & Forwarding', status: 'ACTIVE' });
  }
  if (c.refType === 'BOOKING') d.push({ id: base + 4, name: `Booking confirmation ${c.refNo}.pdf`, kind: 'Booking', at: at(90), by: 'Southern Cross Lines', status: 'ACTIVE' });
  if (c.refType === 'EMPTY_RELEASE') d.push({ id: base + 5, name: `Empty release ${c.refNo}.pdf`, kind: 'Empty release', at: at(18), by: 'Blue Meridian Line', status: 'ACTIVE' });
  if (allCustomsRefs.some((r) => r.consignmentId === consignmentId && r.refTypeCode === 'ENTRY_NO')) d.push({ id: base + 6, name: 'Customs entry (TANCIS).pdf', kind: 'Customs entry', at: at(70), by: 'Doc & clearance · Rehema K.', status: 'ACTIVE' });
  if (c.cargoRegimeCode === 'TRANSIT') d.push({ id: base + 7, name: 'Transit bond certificate.pdf', kind: 'Transit bond', at: at(95), by: 'Doc & clearance · Rehema K.', status: 'PENDING_APPROVAL' });
  return d;
}

/* ------------------------------------------------------------------ customs refs (extra) */
const exam = allStays.filter((s) => s.customsStatus === 'UNDER_EXAM' && s !== HERO && s.physicalStatus !== 'EXPECTED');
export const moreCustomsRefs: S<'CustomsRef'>[] = [
  { customsRefId: 6, refTypeCode: 'ENTRY_NO', consignmentId: 103, refNo: 'TZDL-26-0417790', refDate: day(-5), status: 'ACTIVE', source: 'MANUAL' },
  { customsRefId: 7, refTypeCode: 'ENTRY_NO', consignmentId: 105, refNo: 'TZDL-26-0419204', refDate: day(-2), status: 'ACTIVE', source: 'INTEGRATION' },
  { customsRefId: 8, refTypeCode: 'TRANSIT_DECL', consignmentId: 106, refNo: 'T1-DSM-26-77461', refDate: day(-2), validTo: day(12), status: 'ACTIVE', source: 'MANUAL' },
  { customsRefId: 9, refTypeCode: 'TRANSIT_BOND', consignmentId: 106, refNo: 'BND-55388-CRDB', refDate: day(-2), validTo: day(3), amount: '36500.00', amountCurrency: 'USD', status: 'ACTIVE', source: 'MANUAL' },
  { customsRefId: 10, refTypeCode: 'TRANSIT_BOND', consignmentId: 103, refNo: 'BND-54012-NMB', refDate: day(-34), validTo: day(-1), amount: '22000.00', amountCurrency: 'USD', status: 'EXPIRED', source: 'MANUAL', remarks: 'Replaced by BND-55120-KCB' },
  { customsRefId: 11, refTypeCode: 'ENTRY_NO', consignmentId: 109, refNo: 'TZDL-26-0420115', refDate: day(-1), status: 'ACTIVE', source: 'MANUAL' },
  { customsRefId: 12, refTypeCode: 'EXPORT_ENTRY', consignmentId: 107, refNo: 'TZEX-26-0088341', refDate: day(-1), status: 'ACTIVE', source: 'MANUAL' },
  ...exam.slice(0, 3).map((s, i): S<'CustomsRef'> => ({ customsRefId: 13 + i, refTypeCode: 'EXAM_NOTICE', unitStayId: s.unitStayId!, refNo: `EXN/DSM/26/0${4420 + i * 3}`, refDate: day(-1), status: 'ACTIVE', source: 'CUSTOMS_OFFICER' })),
  { customsRefId: 16, refTypeCode: 'CUSTOMS_RELEASE', consignmentId: 104, refNo: 'REL-DSM-26-30988', refDate: day(-6), status: 'CANCELLED', source: 'MANUAL', remarks: 'Entered on the wrong BL; re-recorded' },
];
export const allCustomsRefs = [...customsRefs, ...moreCustomsRefs];

export interface RefTypeDef { code: string; name: string; hasValidity: boolean; hasAmount: boolean; sets?: string; evidence: string; attachTo: 'consignment' | 'unit' | 'either' }
export const REF_TYPES: RefTypeDef[] = [
  { code: 'ENTRY_NO', name: 'Customs entry', hasValidity: false, hasAmount: false, sets: 'LODGED', evidence: 'Entry printout (TANCIS)', attachTo: 'consignment' },
  { code: 'EXAM_NOTICE', name: 'Examination notice', hasValidity: false, hasAmount: false, sets: 'UNDER_EXAM', evidence: 'Exam notice', attachTo: 'unit' },
  { code: 'TRANSIT_DECL', name: 'Transit declaration', hasValidity: true, hasAmount: false, evidence: 'T1 declaration', attachTo: 'consignment' },
  { code: 'TRANSIT_BOND', name: 'Transit bond', hasValidity: true, hasAmount: true, evidence: 'Bond certificate', attachTo: 'consignment' },
  { code: 'CUSTOMS_RELEASE', name: 'Customs release', hasValidity: false, hasAmount: false, sets: 'CLEARED', evidence: 'Release order from customs', attachTo: 'either' },
  { code: 'EXPORT_ENTRY', name: 'Export entry', hasValidity: false, hasAmount: false, sets: 'LODGED', evidence: 'Export entry', attachTo: 'consignment' },
];

/* ------------------------------------------------------------------ exams (today, bays X-01..X-06) */
export type ExamRow = S<'Exam'> & { unitNo: string; bay: string; officer?: string };
const examUnits = exam.slice(0, 6);
const ex = (i: number, o: Partial<ExamRow>): ExamRow => {
  const s = examUnits[i] ?? HERO;
  return { examId: 600 + i, unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, examType: 'PHYSICAL', authority: 'CUSTOMS', bay: 'X-01', status: 'SCHEDULED', ...o };
};
export const exams: ExamRow[] = [
  ex(0, { bay: 'X-03', status: 'COMPLETED', scheduledAt: at(2.5), startedAt: at(2.4), completedAt: at(1.4), result: 'PASSED', officersPresent: 'TRA officer J. Mrema', sealRemoved: 'ML-4410298', sealApplied: 'TRA-0088123', noticeRef: 'EXN/DSM/26/04420', officer: 'J. Mrema' }),
  ex(1, { bay: 'X-02', status: 'IN_PROGRESS', scheduledAt: at(1), startedAt: at(0.8), noticeRef: 'EXN/DSM/26/04423', officer: 'A. Kweka' }),
  ex(2, { bay: 'X-04', scheduledAt: at(-1), noticeRef: 'EXN/DSM/26/04426', examType: 'PHYSICAL' }),
  { examId: 699, unitStayId: HERO.unitStayId!, unitNo: HERO.cargoUnit.unitNo, examType: 'PHYSICAL', authority: 'CUSTOMS', bay: 'X-01', status: 'SCHEDULED', scheduledAt: at(-3.5), noticeRef: 'EXN/DSM/26/04418' },
  ex(3, { bay: 'X-05', examType: 'SCAN', scheduledAt: at(-5), authority: 'CUSTOMS' }),
  ex(4, { bay: 'X-06', examType: 'DOCUMENT', authority: 'STANDARDS', scheduledAt: at(-2), remarks: 'TBS sampling of tiles' }),
];
export const examsWaiting: ExamRow[] = [ex(5, { examId: 640, bay: '', status: 'REQUESTED', noticeRef: 'EXN/DSM/26/04431' })].filter((e) => e.unitStayId !== HERO.unitStayId);
export const EXAM_BAYS = ['X-01', 'X-02', 'X-03', 'X-04', 'X-05', 'X-06'];

/* ------------------------------------------------------------------ manifests */
export type ManifestRow = S<'Manifest'> & { fileName: string; importedBy: string; vesselLabel: string };
const vcLabel = (id: number) => { const v = vesselCalls.find((x) => x.vesselCallId === id); return v ? `${v.vesselName} ${v.voyageNo}` : '—'; };
export const manifests: ManifestRow[] = [
  { manifestId: 505, vesselCallId: 13, manifestRef: 'HTZ112-RORO-B', source: 'EXCEL', importedAt: at(64), lineCount: 6, createdCount: 0, matchedCount: 4, errorCount: 2, status: 'PARTIAL', fileName: 'HTZ112_vehicles_supplement.xlsx', importedBy: 'Rehema K.', vesselLabel: vcLabel(13) },
  { manifestId: 504, vesselCallId: 13, manifestRef: 'HTZ112-RORO', source: 'EXCEL', importedAt: at(69), lineCount: 24, createdCount: 22, matchedCount: 2, errorCount: 0, status: 'APPLIED', fileName: 'HTZ112_discharge_list.xlsx', importedBy: 'Rehema K.', vesselLabel: vcLabel(13) },
  { manifestId: 503, vesselCallId: 12, manifestRef: 'IOS0926S-CUSCAR', source: 'CSV', importedAt: at(141), lineCount: 118, createdCount: 113, matchedCount: 3, errorCount: 2, status: 'APPLIED', fileName: 'IOS0926S_CUSCAR.edi', importedBy: 'Neema M.', vesselLabel: vcLabel(12) },
  { manifestId: 502, vesselCallId: 12, manifestRef: 'IOS0926S-CUSCAR', source: 'CSV', importedAt: at(142), lineCount: 118, createdCount: 0, matchedCount: 0, errorCount: 118, status: 'REJECTED', fileName: 'IOS0926S_CUSCAR_v1.edi', importedBy: 'Neema M.', vesselLabel: vcLabel(12) },
  { manifestId: 501, vesselCallId: 11, manifestRef: 'BML241W-DSCH', source: 'API', importedAt: at(238), lineCount: 96, createdCount: 96, matchedCount: 0, errorCount: 0, status: 'APPLIED', fileName: 'NG sync (Blue Meridian Line)', importedBy: 'System', vesselLabel: vcLabel(11) },
];

export type IssueKind = 'CHECK_DIGIT' | 'UNKNOWN_CONSIGNEE' | 'DUPLICATE' | 'UNKNOWN_TYPE';
export type MLine = S<'ManifestLine'> & { issue?: IssueKind; suggestion?: string; consigneePartyId?: number };
const fixCd = (p: string) => p + iso6346(p);
const badCd = (p: string) => p + String((Number(iso6346(p)) + 3) % 10);
const dupe = allStays.find((s) => s.physicalStatus === 'IN_YARD' && s.cargoUnit.category === 'CONTAINER' && s.flow === 'IMPORT')!;
const L = (n: number, unit: string, type: string, bl: string, consignee: string, o: Partial<MLine> = {}): MLine => ({
  manifestLineId: 90000 + n, lineNo: n, unitNoRaw: unit, unitNo: unit, unitTypeRaw: type, blNo: bl, consigneeRaw: consignee,
  agentRaw: 'Kilele Clearing & Forwarding', regimeRaw: 'IM4', fullEmpty: 'F', sealNo: `SCL${(1188200 + n * 37).toString()}`,
  grossWeightKg: String(14000 + n * 613), commodityRaw: 'General cargo', matchStatus: 'NEW', consigneePartyId: 1, ...o,
});
/** The file the wizard "uploads": Cape Albatross 318N import discharge list. */
export const sampleManifestLines: MLine[] = [
  L(1, fixCd('SCLU482201'), '45G1', 'SCLB318N3301', 'MZIZI TRADERS LTD', { commodityRaw: 'Ceramic sanitary ware' }),
  L(2, fixCd('SCLU482219'), '45G1', 'SCLB318N3301', 'MZIZI TRADERS LTD', { commodityRaw: 'Ceramic sanitary ware' }),
  L(3, badCd('SCLU447123'), '22G1', 'SCLB318N3302', 'PWANI HARDWARE WHOLESALERS', { consigneePartyId: 11, matchStatus: 'INVALID', issue: 'CHECK_DIGIT', suggestion: fixCd('SCLU447123'), errorText: 'Check digit does not match (ISO 6346)' }),
  L(4, fixCd('SCLU447131'), '22G1', 'SCLB318N3302', 'PWANI HARDWARE WHOLESALERS', { consigneePartyId: 11 }),
  L(5, fixCd('SCLU500144'), '45G1', 'SCLB318N3307', 'MWAMBAO FOODS LIMITED', { consigneePartyId: undefined, matchStatus: 'INVALID', issue: 'UNKNOWN_CONSIGNEE', errorText: 'Consignee not found in parties', commodityRaw: 'Rice in 50 kg bags' }),
  L(6, fixCd('SCLU500152'), '45G1', 'SCLB318N3307', 'MWAMBAO FOODS LIMITED', { consigneePartyId: undefined, matchStatus: 'INVALID', issue: 'UNKNOWN_CONSIGNEE', errorText: 'Consignee not found in parties', commodityRaw: 'Rice in 50 kg bags' }),
  L(7, dupe.cargoUnit.unitNo, '45G1', 'SCLB318N3310', 'ZAMLINK DISTRIBUTORS', { consigneePartyId: 9, regimeRaw: 'TR', matchStatus: 'DUPLICATE', issue: 'DUPLICATE', unitStayId: dupe.unitStayId, errorText: `Already in the yard at ${dupe.currentLocation?.fullCode ?? 'the yard'} on ${dupe.unitSummary.consignmentRef}` }),
  L(8, fixCd('SCLU510020'), '42GX', 'SCLB318N3311', 'KAGERA BUILDERS SUPPLY', { consigneePartyId: 14, matchStatus: 'INVALID', issue: 'UNKNOWN_TYPE', suggestion: '40GP', errorText: 'Unit type 42GX is not in the unit type list' }),
  L(9, fixCd('SCLU510038'), '42G1', 'SCLB318N3311', 'KAGERA BUILDERS SUPPLY', { consigneePartyId: 14 }),
  L(10, fixCd('SCLU610305'), '45R1', 'SCLB318N3315', 'TANZANITE PHARMA DISTRIBUTORS', { consigneePartyId: 13, commodityRaw: 'Vaccines (+2 to +8 °C)' }),
  L(11, fixCd('SCLU610313'), '22G1', 'SCLB318N3316', 'MZIZI TRADERS LTD', { commodityRaw: 'Floor tiles' }),
  L(12, fixCd('SCLU610321'), '22G1', 'SCLB318N3316', 'MZIZI TRADERS LTD', { commodityRaw: 'Floor tiles' }),
];
export const ISO_TYPE: Record<string, string> = { '22G1': '20GP', '42G1': '40GP', '45G1': '40HC', '45R1': '40RH', '22R1': '20RF' };
export const UNIT_TYPES = ['20GP', '40GP', '40HC', '20RF', '40RH', '20TK', '40FR'];

/* ------------------------------------------------------------------ release orders */
export type RO = S<'ReleaseOrder'> & { paidThrough?: string };
const extraRo = (id: number, no: string, consId: number, status: RO['status'], o: Partial<RO>): RO => {
  const us = unitsOf(consId).filter((s) => s.physicalStatus !== 'EXPECTED').slice(0, o.unitsTotal ?? 2);
  return {
    releaseOrderId: id, releaseNo: no, releaseKind: 'DELIVERY', consignmentId: consId, status, requestedByPartyId: consignment(consId)?.agentPartyId ?? 2,
    requestedAt: at(8), plannedExitDate: day(2), unitsTotal: us.length, unitsOut: 0, transporterPartyId: 7, collectorName: 'Hassani Mohamed', collectorIdType: 'National ID (NIDA)', collectorIdNo: '19850312-11104-00002-17',
    units: us.map((s) => ({ unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, status: 'PENDING' as const })), ...o,
  };
};
export const allReleaseOrders: RO[] = [
  ...releaseOrders.map((r): RO => {
    if (r.releaseOrderId === 899) {
      const us = unitsOf(102).filter((s) => s.physicalStatus !== 'EXPECTED').slice(0, 2);
      return { ...r, transporterPartyId: 8, plannedExitDate: day(-1), paidThrough: at(14), units: us.map((s, i) => ({ unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, status: i === 0 ? 'OUT' as const : 'RELEASED' as const, outAt: i === 0 ? at(30) : undefined })) };
    }
    if (r.status === 'APPROVED') return { ...r, paidThrough: r.validTo, qrToken: `Q${r.releaseOrderId}${(r.releaseNo ?? '').slice(-4)}` };
    return { ...r, units: [...(r.units ?? []), ...unitsOf(101).filter((s) => s !== HERO && s.physicalStatus === 'IN_YARD').slice(0, 2).map((s) => ({ unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, status: 'PENDING' as const }))] };
  }),
  extraRo(901, 'RO-DAR1-26-01951', 109, 'REQUESTED', { requestedAt: at(1.2), plannedExitDate: day(1), unitsTotal: 3, collectorName: undefined, collectorIdType: undefined, collectorIdNo: undefined }),
  extraRo(902, 'RO-DAR2-26-00388', 105, 'PARTLY_USED', { requestedAt: at(48), validFrom: at(46), validTo: at(-26), approvedAt: at(46), approvedBy: 'Doc & clearance · Rehema K.', unitsTotal: 3, unitsOut: 1, paidThrough: at(-26), qrToken: 'Q902R388', validityHistory: [{ changeKind: 'INITIAL', newValidTo: at(22), changedAt: at(46) }, { changeKind: 'REVALIDATED', oldValidTo: at(22), newValidTo: at(-26), invoiceId: 3321, reason: 'Paid storage to 8 Oct (INV-DAR1-26-003321)', changedAt: at(20) }] }),
  extraRo(903, 'RO-DAR1-26-01902', 104, 'CANCELLED', { requestedAt: at(90), unitsTotal: 1, collectorName: 'Ally Juma' }),
  extraRo(904, 'RO-DAR1-26-01866', 101, 'USED', { requestedAt: at(160), validFrom: at(150), validTo: at(100), approvedAt: at(150), approvedBy: 'Doc & clearance · Rehema K.', unitsTotal: 1, unitsOut: 1, validityHistory: [{ changeKind: 'INITIAL', newValidTo: at(100), changedAt: at(150) }] }),
  extraRo(905, 'RO-DAR1-26-01955', 103, 'REJECTED', { requestedAt: at(6), unitsTotal: 2, collectorName: 'Mulenga Banda', collectorIdType: 'Passport (ZM)', collectorIdNo: 'ZN0441872' }),
];
{
  const i = allReleaseOrders.findIndex((r) => r.releaseOrderId === 902);
  const r = allReleaseOrders[i];
  allReleaseOrders[i] = { ...r, units: (r.units ?? []).map((u, k) => (k === 0 ? { ...u, status: 'OUT' as const, outAt: at(5) } : { ...u, status: 'RELEASED' as const })) };
}
export const releaseOrder = (id: number) => allReleaseOrders.find((r) => r.releaseOrderId === id);
export const releasesFor = (consignmentId: number) => allReleaseOrders.filter((r) => r.consignmentId === consignmentId);
export const RO_KIND: Record<string, string> = { DELIVERY: 'Delivery', EMPTY_RELEASE: 'Empty release', EXPORT_TO_PORT: 'Export to port', TRANSFER: 'Transfer' };
export const checksFor = (r: RO, stage: 'PREVIEW' | 'APPROVAL' = 'APPROVAL') =>
  (r.units ?? []).map((u) => { const s = allStays.find((x) => x.unitStayId === u.unitStayId); return { unit: u, stay: s, checks: s ? evaluate(s, stage) : [] }; });

registerSearch((q) => {
  const n = q.replace(/[\s-]/g, '').toUpperCase();
  const hits = allReleaseOrders.filter((r) => (r.releaseNo ?? '').replace(/-/g, '').includes(n)).slice(0, 5).map((r) => ({
    id: r.releaseOrderId!, title: r.releaseNo!, status: r.status, subtitle: `${consignment(r.consignmentId)?.refNo ?? ''} · ${r.unitsTotal} unit${r.unitsTotal === 1 ? '' : 's'}`,
    link: { entityName: 'release_order', entityId: r.releaseOrderId! }, to: `/releases/${r.releaseOrderId}`,
  }));
  return hits.length ? { entity: 'RELEASE_ORDER', label: 'Release orders', hits } : null;
});

/* ------------------------------------------------------------------ dangerous goods */
export type DgRow = S<'DgLine'> & { unitStayId: number };
export const IMO_CLASSES: [string, string][] = [
  ['1', 'Explosives'], ['2.1', 'Flammable gas'], ['2.2', 'Non-flammable gas'], ['2.3', 'Toxic gas'], ['3', 'Flammable liquid'],
  ['4.1', 'Flammable solid'], ['4.2', 'Spontaneously combustible'], ['4.3', 'Dangerous when wet'], ['5.1', 'Oxidizer'], ['5.2', 'Organic peroxide'],
  ['6.1', 'Toxic'], ['6.2', 'Infectious'], ['7', 'Radioactive'], ['8', 'Corrosive'], ['9', 'Miscellaneous'],
];
const rowKey = (s: Stay) => s.currentLocation?.fullCode.split('-').slice(0, 2).join('-');
const dgBase = allStays.filter((s) => s.imoClass && s.physicalStatus === 'IN_YARD');
const firstDg = dgBase[0];
const neighbour = firstDg ? allStays.find((s) => s !== firstDg && s.physicalStatus === 'IN_YARD' && !s.imoClass && rowKey(s) === rowKey(firstDg)) : undefined;
const someInYard = allStays.filter((s) => s.physicalStatus === 'IN_YARD' && s.cargoUnit.category === 'CONTAINER' && s.fullEmpty === 'F' && !s.imoClass && s !== neighbour);
const DG_TEMPLATES: Omit<S<'DgLine'>, 'unitDgLineId'>[] = [
  { unNo: '1263', imoClass: '3', packingGroup: 'II', properShippingName: 'Paint', flashpointC: '-4', marinePollutant: false, grossWeightKg: '16200' },
  { unNo: '1993', imoClass: '3', packingGroup: 'III', properShippingName: 'Flammable liquid, n.o.s. (solvent blend)', flashpointC: '38', marinePollutant: false, grossWeightKg: '18800' },
  { unNo: '1942', imoClass: '5.1', packingGroup: 'III', properShippingName: 'Ammonium nitrate (fertiliser grade)', marinePollutant: false, grossWeightKg: '24500' },
  { unNo: '1789', imoClass: '8', packingGroup: 'II', properShippingName: 'Hydrochloric acid', marinePollutant: false, grossWeightKg: '21000' },
  { unNo: '1075', imoClass: '2.1', properShippingName: 'Petroleum gases, liquefied (LPG cylinders)', marinePollutant: false, grossWeightKg: '9800' },
  { unNo: '2588', imoClass: '6.1', packingGroup: 'III', properShippingName: 'Pesticide, solid, toxic, n.o.s.', marinePollutant: true, grossWeightKg: '17400' },
  { unNo: '3480', imoClass: '9', packingGroup: 'II', properShippingName: 'Lithium ion batteries', marinePollutant: false, grossWeightKg: '12300' },
];
let dgId = 3000;
export const dgLines: DgRow[] = [
  ...dgBase.map((s, i) => ({ ...DG_TEMPLATES[i % 2], unitDgLineId: ++dgId, unitStayId: s.unitStayId!, emergencyContact: '+255 22 286 0011 (Chemtrec TZ)' })),
  ...(neighbour ? [{ ...DG_TEMPLATES[2], unitDgLineId: ++dgId, unitStayId: neighbour.unitStayId!, emergencyContact: '+255 754 300 120' }] : []),
  ...[3, 4, 5, 6].map((t, i) => ({ ...DG_TEMPLATES[t], unitDgLineId: ++dgId, unitStayId: someInYard[i * 7 + 3].unitStayId!, emergencyContact: '+255 754 300 120' })),
];
// a second line on one unit: mixed load
dgLines.push({ ...DG_TEMPLATES[6], unitDgLineId: ++dgId, unitStayId: dgLines[dgLines.length - 1].unitStayId, unNo: '3481', properShippingName: 'Lithium ion batteries packed with equipment', grossWeightKg: '2100' });

/* Demo rules only. The real table is the IMDG Code 7.2.4 segregation table,
   loaded by an admin; nothing is seeded. */
export const SEG_DEMO: { a: string; b: string; req: S<'SegregationRule'>['requirement']; label: string }[] = [
  { a: '3', b: '5.1', req: 'SEPARATED', label: 'Separated from' },
  { a: '2.1', b: '5.1', req: 'SEPARATED', label: 'Separated from' },
  { a: '3', b: '2.1', req: 'AWAY_FROM', label: 'Away from' },
  { a: '8', b: '5.1', req: 'AWAY_FROM', label: 'Away from' },
  { a: '6.1', b: '3', req: 'AWAY_FROM', label: 'Away from' },
];
export function segregationWarnings(lines: DgRow[]) {
  const units = [...new Set(lines.map((l) => l.unitStayId))].map((id) => allStays.find((s) => s.unitStayId === id)!).filter((s) => s?.currentLocation);
  const out: { a: Stay; b: Stay; ca: string; cb: string; rule: (typeof SEG_DEMO)[number]; where: string }[] = [];
  for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
    const a = units[i], b = units[j];
    const sameRow = rowKey(a) === rowKey(b);
    const sameBlock = a.currentLocation!.fullCode.split('-')[0] === b.currentLocation!.fullCode.split('-')[0];
    if (!sameBlock) continue;
    for (const la of lines.filter((l) => l.unitStayId === a.unitStayId)) for (const lb of lines.filter((l) => l.unitStayId === b.unitStayId)) {
      const rule = SEG_DEMO.find((r) => (r.a === la.imoClass && r.b === lb.imoClass) || (r.b === la.imoClass && r.a === lb.imoClass));
      if (rule && (sameRow || rule.req === 'SEPARATED')) out.push({ a, b, ca: la.imoClass, cb: lb.imoClass, rule, where: sameRow ? `same row ${rowKey(a)}` : `same block ${a.currentLocation!.fullCode.split('-')[0]}` });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ approvals (extra) and delegations */
export type Apr = S<'ApprovalRequest'> & { mine?: boolean; evidence?: string[]; limit?: string };
export const ME = 'Neema M.';
export const APPROVAL_LIMITS: Record<string, { label: string; limit?: number; levels: string }> = {
  'billing.waiver': { label: 'Waive charges', limit: 500, levels: 'Up to USD 500: 1 level. Above: finance manager too.' },
  'billing.creditnote': { label: 'Credit note', limit: 1000, levels: 'Above USD 1,000: 2 levels (billing lead, then finance manager).' },
  'gate.checkout.override': { label: 'Gate-out override', levels: 'Duty ops manager, 1 level. Expires in 2 h.' },
  'customs.hold.lift': { label: 'Lift a hold', levels: 'Damage, security and court holds: ops manager, 1 level.' },
  'billing.freeday.extend': { label: 'Extra free days', limit: 5, levels: 'Up to 5 days: 1 level.' },
  'payment.refund': { label: 'Refund', limit: 500, levels: 'Above USD 500: 2 levels.' },
  'release.exception.approve': { label: 'Release with a failed condition', levels: 'Commercial condition only. 1 level, never the requester.' },
};
export const moreApprovals: Apr[] = [
  { approvalRequestId: 9010, requestNo: 'APR-26-00415', permissionCode: 'release.exception.approve', entityName: 'release_order', entityId: 801, summary: 'Approve RO-DAR1-26-01942 with charges unpaid', reason: 'Bill-to Kilele is on credit; payment by CRDB transfer promised today. Customer needs the units before the exam slot closes.', amount: HERO.accruedCharges?.total, amountCurrency: 'USD', levelsRequired: 1, currentLevel: 0, status: 'PENDING', requestedBy: `Doc & clearance · ${ME}`, requestedAt: at(1.5), expiresAt: at(-22.5), canDecide: false, mine: true, evidence: ['Email from Kilele finance (promise to pay).pdf'] },
  { approvalRequestId: 9011, requestNo: 'APR-26-00407', permissionCode: 'billing.freeday.extend', entityName: 'consignment', entityId: 105, summary: '+2 free days on HTZ112-0087 (Bahari Motors)', reason: 'Vessel discharge finished late Sunday; customer could not clear on a weekend.', levelsRequired: 1, currentLevel: 1, status: 'APPROVED', requestedBy: `Doc & clearance · ${ME}`, requestedAt: at(30), decidedAt: at(27), canDecide: false, mine: true, steps: [{ levelNo: 1, decision: 'APPROVE', decidedBy: 'Finance · Joseph N.', note: 'OK, one-off', decidedAt: at(27) }] },
];
export const allApprovals: Apr[] = [
  ...approvals.map((a): Apr => ({
    ...a,
    evidence: a.approvalRequestId === 9001 ? ['Exam notice EXN-DSM-26-04418.pdf', 'Storage calculation.pdf'] : a.approvalRequestId === 9002 ? ['Reefer plug log 01–05 Oct.xlsx', 'INV-DAR1-26-003310.pdf'] : a.approvalRequestId === 9003 ? ['Seal photo (gate-out).jpg', 'Paper EIR scan.pdf'] : a.approvalRequestId === 9004 ? ['Survey report SR-2210.pdf'] : [],
  })),
  ...moreApprovals,
];
/** Requests raised while clicking through the prototype (hold lift, release override). */
export const sessionApprovals: Apr[] = [];
let aprNo = 430;
export function raiseApproval(a: Pick<Apr, 'permissionCode' | 'entityName' | 'entityId' | 'summary' | 'reason'> & Partial<Apr>): Apr {
  const r: Apr = { approvalRequestId: 9100 + aprNo, requestNo: `APR-26-00${++aprNo}`, levelsRequired: 1, currentLevel: 0, status: 'PENDING', requestedBy: `Doc & clearance · ${ME}`, requestedAt: at(0), expiresAt: at(-24), canDecide: false, mine: true, ...a };
  sessionApprovals.unshift(r);
  return r;
}

export type DelegationRow = S<'Delegation'> & { fromName: string; toName: string; permName: string };
export const delegations: DelegationRow[] = [
  { approvalDelegationId: 41, fromUserId: 12, toUserId: 7, fromName: 'Joseph N. (Finance)', toName: 'Daniel K. (Ops)', permissionCode: 'billing.creditnote', permName: 'Credit notes', siteId: 1, validFrom: at(48), validTo: at(-24 * 5), reason: 'Annual leave 5–12 Oct' },
  { approvalDelegationId: 42, fromUserId: 7, toUserId: 15, fromName: 'Daniel K. (Ops)', toName: 'Rehema K. (Doc & clearance)', permissionCode: 'gate.checkout.override', permName: 'Gate-out overrides', siteId: 1, validFrom: at(-24 * 3), validTo: at(-24 * 4), reason: 'Training in Arusha on 10 Oct' },
  { approvalDelegationId: 40, fromUserId: 12, toUserId: 7, fromName: 'Joseph N. (Finance)', toName: 'Daniel K. (Ops)', permissionCode: null, permName: 'All approvals', siteId: null, validFrom: at(24 * 30), validTo: at(24 * 26), reason: 'Sick leave', revokedAt: at(24 * 27) },
];

/* ------------------------------------------------------------------ exceptions: comments, resolution codes, SLA */
export type Cmt = S<'ExceptionComment'>;
export const exceptionComments: Record<number, Cmt[]> = {
  301: [
    { exceptionCommentId: 1, kind: 'SYSTEM', text: 'Raised at gate-in lane 1: seal ML-7781208 does not match manifest ML-7781203.', createdAt: at(0.4), createdBy: 'System' },
    { exceptionCommentId: 2, kind: 'COMMENT', text: 'Photo of the seal attached. Last digit looks like a typo on the paper EIR. Asked the line to confirm.', createdAt: at(0.3), createdBy: 'Gate · Hamisi J.' },
    { exceptionCommentId: 3, kind: 'STATUS', text: 'Approval APR-26-00414 requested to let the truck leave.', createdAt: at(0.3), createdBy: 'Gate · Hamisi J.' },
  ],
  302: [
    { exceptionCommentId: 4, kind: 'SYSTEM', text: 'Gate-out refused: release RO-DAR1-26-01877 expired 14 h ago.', createdAt: at(3), createdBy: 'System' },
    { exceptionCommentId: 5, kind: 'ASSIGN', text: 'Assigned to Grace P. (customer service).', createdAt: at(2.9), createdBy: 'System' },
    { exceptionCommentId: 6, kind: 'ESCALATE', text: 'SLA passed (2 h). Escalated to level 1: customer service lead.', createdAt: at(1), createdBy: 'System' },
    { exceptionCommentId: 7, kind: 'COMMENT', text: 'Called Pwani Hardware. They will pay one more storage day by M-Pesa, then we revalidate.', createdAt: at(0.6), createdBy: 'Customer service · Grace P.' },
  ],
  303: [
    { exceptionCommentId: 8, kind: 'SYSTEM', text: 'Major damage recorded at gate-in inspection. Damage hold placed.', createdAt: at(26), createdBy: 'System' },
    { exceptionCommentId: 9, kind: 'COMMENT', text: 'Surveyor from Indian Ocean Shipping booked for tomorrow 09:00.', createdAt: at(20), createdBy: 'Ops · Daniel K.' },
  ],
  304: [
    { exceptionCommentId: 10, kind: 'SYSTEM', text: 'Offline gate-out from lane 2 synced at 06:40; a line hold was placed at 06:05.', createdAt: at(4), createdBy: 'System' },
    { exceptionCommentId: 11, kind: 'ESCALATE', text: 'SLA passed. Escalated to level 1: ops manager.', createdAt: at(3), createdBy: 'System' },
    { exceptionCommentId: 12, kind: 'ESCALATE', text: 'Still open. Escalated to level 2: general manager.', createdAt: at(2), createdBy: 'System' },
  ],
  305: [{ exceptionCommentId: 13, kind: 'STATUS', text: 'Resolved: declaration amended.', createdAt: at(12), createdBy: 'Ops · Daniel K.' }],
  306: [{ exceptionCommentId: 14, kind: 'SYSTEM', text: 'VFD returned error 503 twice. Retry scheduled every 15 minutes.', createdAt: at(6), createdBy: 'System' }],
  307: [],
};
export const RESOLUTION_CODES: [string, string][] = [
  ['DECLARATION_AMENDED', 'Declaration amended'], ['DATA_CORRECTED', 'Data corrected in the system'], ['APPROVED_OVERRIDE', 'Allowed by approved override'],
  ['CUSTOMER_PAID', 'Customer paid'], ['CHARGED_TO_CUSTOMER', 'Charged to customer'], ['CLAIM_RAISED', 'Claim raised with line or insurer'],
  ['NO_ACTION', 'No action needed'], ['DUPLICATE', 'Duplicate case'],
];
export const EXCEPTION_NAME: Record<string, string> = {
  SEAL_MISMATCH: 'Seal mismatch', GATE_OUT_BLOCKED: 'Gate-out blocked', DAMAGE_MAJOR: 'Major damage', OFFLINE_CONFLICT: 'Offline sync conflict',
  WEIGHT_VARIANCE: 'Weight variance', FISCAL_FAILED: 'Fiscal receipt failed', NO_SHOW: 'No-show',
};
export const ROLE_NAME: Record<string, string> = {
  OPS_MANAGER: 'Ops manager', CUSTOMER_SERVICE: 'Customer service', BILLING_OFFICER: 'Billing officer', GATE_OFFICER: 'Gate officer', DOC_CLEARANCE: 'Doc & clearance',
};
export const SLA_MIN: Record<string, number> = { SEAL_MISMATCH: 120, GATE_OUT_BLOCKED: 120, DAMAGE_MAJOR: 48 * 60, OFFLINE_CONFLICT: 60, WEIGHT_VARIANCE: 24 * 60, FISCAL_FAILED: 24 * 60, NO_SHOW: 24 * 60 };
export const allExceptions = exceptions;
export const entityLink = (name: string, id: number, unitStayId?: number | null): [string, string | undefined] => {
  if (unitStayId) { const s = allStays.find((x) => x.unitStayId === unitStayId); return [s ? `Unit ${s.cargoUnit.unitNo}` : `Unit ${unitStayId}`, `/units/${unitStayId}`]; }
  switch (name) {
    case 'truck_visit': return [`Truck visit ${id}`, `/gate/visits/${id}`];
    case 'invoice': return [`Invoice INV-DAR1-26-00${id}`, `/invoices/${id}`];
    case 'unit_stay': return [`Unit ${id}`, `/units/${id}`];
    case 'release_order': return [releaseOrder(id)?.releaseNo ?? `Release ${id}`, `/releases/${id}`];
    case 'consignment': return [consignment(id)?.refNo ?? `Consignment ${id}`, `/consignments/${id}`];
    case 'hold': return [`Hold ${id}`, '/holds'];
    default: return [`${name.replace(/_/g, ' ')} ${id}`, undefined];
  }
};

/* ------------------------------------------------------------------ inbox */
export type Note = S<'InboxNotification'> & { kind: 'RELEASE' | 'FREE_TIME' | 'EXCEPTION' | 'HOLD' | 'PAYMENT' | 'APPROVAL' | 'CUSTOMS' | 'MANIFEST'; to?: string };
const firstApproved = allReleaseOrders.find((r) => r.status === 'APPROVED' && r.releaseOrderId !== 801)!;
const heldOther = holds.find((h) => h.status === 'ACTIVE' && h.holdTypeCode === 'LINE');
export const notifications: Note[] = [
  { notificationId: 1, kind: 'APPROVAL', subject: 'Approval waiting: gate-out override', body: 'Hamisi J. asks to let T 902 DMB leave with a seal mismatch. Expires in 1 h 40 min.', createdAt: at(0.3), link: { entityName: 'approval', entityId: 9003 }, to: '/approvals' },
  { notificationId: 2, kind: 'EXCEPTION', subject: 'Exception assigned to Doc & clearance', body: 'EX-26-00870 Offline gate-out conflicts with a hold placed meanwhile. Critical, escalated to level 2.', createdAt: at(2), link: { entityName: 'exception_case', entityId: 304 }, to: '/exceptions/304' },
  { notificationId: 3, kind: 'FREE_TIME', subject: 'Free time ends tomorrow for 6 units', body: 'HTZ112-0087 (Bahari Motors): storage starts at 00:00 on 9 Oct. Ask the agent to clear or pay ahead.', createdAt: at(2.5), link: { entityName: 'consignment', entityId: 105 }, to: '/consignments/105' },
  { notificationId: 4, kind: 'HOLD', subject: 'Hold placed: shipping line hold', body: `${heldOther?.unitNo ?? 'A unit'}: freight not settled with the line (BML/DO-HOLD/882).`, createdAt: at(4), link: { entityName: 'unit_stay', entityId: heldOther?.unitStayId ?? HERO.unitStayId! }, to: `/units/${heldOther?.unitStayId ?? HERO.unitStayId}` },
  { notificationId: 5, kind: 'PAYMENT', subject: 'Payment received USD 1,416.00', body: 'Mzizi Traders paid by CRDB transfer, ref. CRDB-TT-884120. Allocated to INV-DAR1-26-003302.', createdAt: at(5), readAt: at(4.5), link: { entityName: 'invoice', entityId: 3302 }, to: '/invoices' },
  { notificationId: 6, kind: 'RELEASE', subject: `Release approved: ${firstApproved.releaseNo}`, body: `${firstApproved.units?.[0]?.unitNo} can leave until ${new Date(firstApproved.validTo!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}. QR sent to the collector by SMS.`, createdAt: at(22), readAt: at(21), link: { entityName: 'release_order', entityId: firstApproved.releaseOrderId! }, to: `/releases/${firstApproved.releaseOrderId}` },
  { notificationId: 7, kind: 'CUSTOMS', subject: 'Customs release recorded', body: 'REL-DSM-26-31007 on BMLU2409902: units set to cleared.', createdAt: at(48), readAt: at(46), link: { entityName: 'consignment', entityId: 102 }, to: '/consignments/102' },
  { notificationId: 8, kind: 'RELEASE', subject: 'Release expired: RO-DAR1-26-01877', body: 'Paid through yesterday 20:30. Revalidate after the customer pays more storage.', createdAt: at(14), readAt: at(10), link: { entityName: 'release_order', entityId: 899 }, to: '/releases/899' },
  { notificationId: 9, kind: 'MANIFEST', subject: 'Manifest applied with 2 errors', body: 'HTZ112_vehicles_supplement.xlsx: 4 matched, 2 lines need fixing.', createdAt: at(64), readAt: at(60), link: { entityName: 'manifest', entityId: 505 }, to: '/manifests' },
  { notificationId: 10, kind: 'APPROVAL', subject: 'Your request was approved', body: 'APR-26-00407 +2 free days on HTZ112-0087 approved by Joseph N.', createdAt: at(27), readAt: at(26), link: { entityName: 'approval', entityId: 9011 }, to: '/approvals' },
];

export { consignments, vesselCalls };
