"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vesselCalls = exports.consignments = exports.notifications = exports.entityLink = exports.allExceptions = exports.SLA_MIN = exports.ROLE_NAME = exports.EXCEPTION_NAME = exports.RESOLUTION_CODES = exports.exceptionComments = exports.delegations = exports.sessionApprovals = exports.allApprovals = exports.moreApprovals = exports.APPROVAL_LIMITS = exports.ME = exports.SEG_DEMO = exports.dgLines = exports.IMO_CLASSES = exports.checksFor = exports.RO_KIND = exports.releasesFor = exports.releaseOrder = exports.allReleaseOrders = exports.UNIT_TYPES = exports.ISO_TYPE = exports.sampleManifestLines = exports.manifests = exports.EXAM_BAYS = exports.examsWaiting = exports.exams = exports.REF_TYPES = exports.allCustomsRefs = exports.moreCustomsRefs = exports.unitStays = exports.hoursUntil = void 0;
exports.untilText = untilText;
exports.linesOf = linesOf;
exports.documentsOf = documentsOf;
exports.segregationWarnings = segregationWarnings;
exports.raiseApproval = raiseApproval;
const core_1 = require("./core");
Object.defineProperty(exports, "consignments", { enumerable: true, get: function () { return core_1.consignments; } });
Object.defineProperty(exports, "vesselCalls", { enumerable: true, get: function () { return core_1.vesselCalls; } });
const control_1 = require("./control");
const gen_1 = require("./gen");
const search_1 = require("./search");
/* ------------------------------------------------------------------ helpers */
const hoursUntil = (iso) => (iso ? (Date.parse(iso) - Date.parse((0, gen_1.at)(0))) / 3600_000 : 0);
exports.hoursUntil = hoursUntil;
/** "2 h 10 min", "3 days" — for countdowns against the demo clock. */
function untilText(iso) {
    if (!iso)
        return '—';
    const h = (0, exports.hoursUntil)(iso);
    const a = Math.abs(h);
    const txt = a < 1 ? `${Math.round(a * 60)} min` : a < 48 ? `${Math.floor(a)} h ${Math.round((a % 1) * 60)} min` : `${Math.round(a / 24)} days`;
    return h < 0 ? `${txt} ago` : txt;
}
exports.unitStays = core_1.allStays;
/* ------------------------------------------------------------------ consignment lines */
function linesOf(consignmentId) {
    const c = (0, core_1.consignment)(consignmentId);
    const us = (0, core_1.unitsOf)(consignmentId);
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
function documentsOf(consignmentId) {
    const c = (0, core_1.consignment)(consignmentId);
    if (!c)
        return [];
    const base = consignmentId * 100;
    const d = [];
    if (c.refType === 'BL') {
        d.push({ id: base + 1, name: `Bill of lading ${c.refNo}.pdf`, kind: 'Bill of lading', at: (0, gen_1.at)(200), by: 'Manifest import', status: 'ACTIVE' });
        d.push({ id: base + 2, name: `Delivery order ${(0, core_1.partyName)(c.shippingLinePartyId).split(' ')[0]}.pdf`, kind: 'Delivery order', at: (0, gen_1.at)(60), by: 'Kilele Clearing & Forwarding', status: 'ACTIVE' });
        d.push({ id: base + 3, name: 'Commercial invoice and packing list.pdf', kind: 'Packing list', at: (0, gen_1.at)(58), by: 'Kilele Clearing & Forwarding', status: 'ACTIVE' });
    }
    if (c.refType === 'BOOKING')
        d.push({ id: base + 4, name: `Booking confirmation ${c.refNo}.pdf`, kind: 'Booking', at: (0, gen_1.at)(90), by: 'Southern Cross Lines', status: 'ACTIVE' });
    if (c.refType === 'EMPTY_RELEASE')
        d.push({ id: base + 5, name: `Empty release ${c.refNo}.pdf`, kind: 'Empty release', at: (0, gen_1.at)(18), by: 'Blue Meridian Line', status: 'ACTIVE' });
    if (exports.allCustomsRefs.some((r) => r.consignmentId === consignmentId && r.refTypeCode === 'ENTRY_NO'))
        d.push({ id: base + 6, name: 'Customs entry (TANCIS).pdf', kind: 'Customs entry', at: (0, gen_1.at)(70), by: 'Doc & clearance · Rehema K.', status: 'ACTIVE' });
    if (c.cargoRegimeCode === 'TRANSIT')
        d.push({ id: base + 7, name: 'Transit bond certificate.pdf', kind: 'Transit bond', at: (0, gen_1.at)(95), by: 'Doc & clearance · Rehema K.', status: 'PENDING_APPROVAL' });
    return d;
}
/* ------------------------------------------------------------------ customs refs (extra) */
const exam = core_1.allStays.filter((s) => s.customsStatus === 'UNDER_EXAM' && s !== core_1.HERO && s.physicalStatus !== 'EXPECTED');
exports.moreCustomsRefs = [
    { customsRefId: 6, refTypeCode: 'ENTRY_NO', consignmentId: 103, refNo: 'TZDL-26-0417790', refDate: (0, gen_1.day)(-5), status: 'ACTIVE', source: 'MANUAL' },
    { customsRefId: 7, refTypeCode: 'ENTRY_NO', consignmentId: 105, refNo: 'TZDL-26-0419204', refDate: (0, gen_1.day)(-2), status: 'ACTIVE', source: 'INTEGRATION' },
    { customsRefId: 8, refTypeCode: 'TRANSIT_DECL', consignmentId: 106, refNo: 'T1-DSM-26-77461', refDate: (0, gen_1.day)(-2), validTo: (0, gen_1.day)(12), status: 'ACTIVE', source: 'MANUAL' },
    { customsRefId: 9, refTypeCode: 'TRANSIT_BOND', consignmentId: 106, refNo: 'BND-55388-CRDB', refDate: (0, gen_1.day)(-2), validTo: (0, gen_1.day)(3), amount: '36500.00', amountCurrency: 'USD', status: 'ACTIVE', source: 'MANUAL' },
    { customsRefId: 10, refTypeCode: 'TRANSIT_BOND', consignmentId: 103, refNo: 'BND-54012-NMB', refDate: (0, gen_1.day)(-34), validTo: (0, gen_1.day)(-1), amount: '22000.00', amountCurrency: 'USD', status: 'EXPIRED', source: 'MANUAL', remarks: 'Replaced by BND-55120-KCB' },
    { customsRefId: 11, refTypeCode: 'ENTRY_NO', consignmentId: 109, refNo: 'TZDL-26-0420115', refDate: (0, gen_1.day)(-1), status: 'ACTIVE', source: 'MANUAL' },
    { customsRefId: 12, refTypeCode: 'EXPORT_ENTRY', consignmentId: 107, refNo: 'TZEX-26-0088341', refDate: (0, gen_1.day)(-1), status: 'ACTIVE', source: 'MANUAL' },
    ...exam.slice(0, 3).map((s, i) => ({ customsRefId: 13 + i, refTypeCode: 'EXAM_NOTICE', unitStayId: s.unitStayId, refNo: `EXN/DSM/26/0${4420 + i * 3}`, refDate: (0, gen_1.day)(-1), status: 'ACTIVE', source: 'CUSTOMS_OFFICER' })),
    { customsRefId: 16, refTypeCode: 'CUSTOMS_RELEASE', consignmentId: 104, refNo: 'REL-DSM-26-30988', refDate: (0, gen_1.day)(-6), status: 'CANCELLED', source: 'MANUAL', remarks: 'Entered on the wrong BL; re-recorded' },
];
exports.allCustomsRefs = [...control_1.customsRefs, ...exports.moreCustomsRefs];
exports.REF_TYPES = [
    { code: 'ENTRY_NO', name: 'Customs entry', hasValidity: false, hasAmount: false, sets: 'LODGED', evidence: 'Entry printout (TANCIS)', attachTo: 'consignment' },
    { code: 'EXAM_NOTICE', name: 'Examination notice', hasValidity: false, hasAmount: false, sets: 'UNDER_EXAM', evidence: 'Exam notice', attachTo: 'unit' },
    { code: 'TRANSIT_DECL', name: 'Transit declaration', hasValidity: true, hasAmount: false, evidence: 'T1 declaration', attachTo: 'consignment' },
    { code: 'TRANSIT_BOND', name: 'Transit bond', hasValidity: true, hasAmount: true, evidence: 'Bond certificate', attachTo: 'consignment' },
    { code: 'CUSTOMS_RELEASE', name: 'Customs release', hasValidity: false, hasAmount: false, sets: 'CLEARED', evidence: 'Release order from customs', attachTo: 'either' },
    { code: 'EXPORT_ENTRY', name: 'Export entry', hasValidity: false, hasAmount: false, sets: 'LODGED', evidence: 'Export entry', attachTo: 'consignment' },
];
const examUnits = exam.slice(0, 6);
const ex = (i, o) => {
    const s = examUnits[i] ?? core_1.HERO;
    return { examId: 600 + i, unitStayId: s.unitStayId, unitNo: s.cargoUnit.unitNo, examType: 'PHYSICAL', authority: 'CUSTOMS', bay: 'X-01', status: 'SCHEDULED', ...o };
};
exports.exams = [
    ex(0, { bay: 'X-03', status: 'COMPLETED', scheduledAt: (0, gen_1.at)(2.5), startedAt: (0, gen_1.at)(2.4), completedAt: (0, gen_1.at)(1.4), result: 'PASSED', officersPresent: 'TRA officer J. Mrema', sealRemoved: 'ML-4410298', sealApplied: 'TRA-0088123', noticeRef: 'EXN/DSM/26/04420', officer: 'J. Mrema' }),
    ex(1, { bay: 'X-02', status: 'IN_PROGRESS', scheduledAt: (0, gen_1.at)(1), startedAt: (0, gen_1.at)(0.8), noticeRef: 'EXN/DSM/26/04423', officer: 'A. Kweka' }),
    ex(2, { bay: 'X-04', scheduledAt: (0, gen_1.at)(-1), noticeRef: 'EXN/DSM/26/04426', examType: 'PHYSICAL' }),
    { examId: 699, unitStayId: core_1.HERO.unitStayId, unitNo: core_1.HERO.cargoUnit.unitNo, examType: 'PHYSICAL', authority: 'CUSTOMS', bay: 'X-01', status: 'SCHEDULED', scheduledAt: (0, gen_1.at)(-3.5), noticeRef: 'EXN/DSM/26/04418' },
    ex(3, { bay: 'X-05', examType: 'SCAN', scheduledAt: (0, gen_1.at)(-5), authority: 'CUSTOMS' }),
    ex(4, { bay: 'X-06', examType: 'DOCUMENT', authority: 'STANDARDS', scheduledAt: (0, gen_1.at)(-2), remarks: 'TBS sampling of tiles' }),
];
exports.examsWaiting = [ex(5, { examId: 640, bay: '', status: 'REQUESTED', noticeRef: 'EXN/DSM/26/04431' })].filter((e) => e.unitStayId !== core_1.HERO.unitStayId);
exports.EXAM_BAYS = ['X-01', 'X-02', 'X-03', 'X-04', 'X-05', 'X-06'];
const vcLabel = (id) => { const v = core_1.vesselCalls.find((x) => x.vesselCallId === id); return v ? `${v.vesselName} ${v.voyageNo}` : '—'; };
exports.manifests = [
    { manifestId: 505, vesselCallId: 13, manifestRef: 'HTZ112-RORO-B', source: 'EXCEL', importedAt: (0, gen_1.at)(64), lineCount: 6, createdCount: 0, matchedCount: 4, errorCount: 2, status: 'PARTIAL', fileName: 'HTZ112_vehicles_supplement.xlsx', importedBy: 'Rehema K.', vesselLabel: vcLabel(13) },
    { manifestId: 504, vesselCallId: 13, manifestRef: 'HTZ112-RORO', source: 'EXCEL', importedAt: (0, gen_1.at)(69), lineCount: 24, createdCount: 22, matchedCount: 2, errorCount: 0, status: 'APPLIED', fileName: 'HTZ112_discharge_list.xlsx', importedBy: 'Rehema K.', vesselLabel: vcLabel(13) },
    { manifestId: 503, vesselCallId: 12, manifestRef: 'IOS0926S-CUSCAR', source: 'CSV', importedAt: (0, gen_1.at)(141), lineCount: 118, createdCount: 113, matchedCount: 3, errorCount: 2, status: 'APPLIED', fileName: 'IOS0926S_CUSCAR.edi', importedBy: 'Neema M.', vesselLabel: vcLabel(12) },
    { manifestId: 502, vesselCallId: 12, manifestRef: 'IOS0926S-CUSCAR', source: 'CSV', importedAt: (0, gen_1.at)(142), lineCount: 118, createdCount: 0, matchedCount: 0, errorCount: 118, status: 'REJECTED', fileName: 'IOS0926S_CUSCAR_v1.edi', importedBy: 'Neema M.', vesselLabel: vcLabel(12) },
    { manifestId: 501, vesselCallId: 11, manifestRef: 'BML241W-DSCH', source: 'API', importedAt: (0, gen_1.at)(238), lineCount: 96, createdCount: 96, matchedCount: 0, errorCount: 0, status: 'APPLIED', fileName: 'NG sync (Blue Meridian Line)', importedBy: 'System', vesselLabel: vcLabel(11) },
];
const fixCd = (p) => p + (0, gen_1.iso6346)(p);
const badCd = (p) => p + String((Number((0, gen_1.iso6346)(p)) + 3) % 10);
const dupe = core_1.allStays.find((s) => s.physicalStatus === 'IN_YARD' && s.cargoUnit.category === 'CONTAINER' && s.flow === 'IMPORT');
const L = (n, unit, type, bl, consignee, o = {}) => ({
    manifestLineId: 90000 + n, lineNo: n, unitNoRaw: unit, unitNo: unit, unitTypeRaw: type, blNo: bl, consigneeRaw: consignee,
    agentRaw: 'Kilele Clearing & Forwarding', regimeRaw: 'IM4', fullEmpty: 'F', sealNo: `SCL${(1188200 + n * 37).toString()}`,
    grossWeightKg: String(14000 + n * 613), commodityRaw: 'General cargo', matchStatus: 'NEW', consigneePartyId: 1, ...o,
});
/** The file the wizard "uploads": Cape Albatross 318N import discharge list. */
exports.sampleManifestLines = [
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
exports.ISO_TYPE = { '22G1': '20GP', '42G1': '40GP', '45G1': '40HC', '45R1': '40RH', '22R1': '20RF' };
exports.UNIT_TYPES = ['20GP', '40GP', '40HC', '20RF', '40RH', '20TK', '40FR'];
const extraRo = (id, no, consId, status, o) => {
    const us = (0, core_1.unitsOf)(consId).filter((s) => s.physicalStatus !== 'EXPECTED').slice(0, o.unitsTotal ?? 2);
    return {
        releaseOrderId: id, releaseNo: no, releaseKind: 'DELIVERY', consignmentId: consId, status, requestedByPartyId: (0, core_1.consignment)(consId)?.agentPartyId ?? 2,
        requestedAt: (0, gen_1.at)(8), plannedExitDate: (0, gen_1.day)(2), unitsTotal: us.length, unitsOut: 0, transporterPartyId: 7, collectorName: 'Hassani Mohamed', collectorIdType: 'National ID (NIDA)', collectorIdNo: '19850312-11104-00002-17',
        units: us.map((s) => ({ unitStayId: s.unitStayId, unitNo: s.cargoUnit.unitNo, status: 'PENDING' })), ...o,
    };
};
exports.allReleaseOrders = [
    ...control_1.releaseOrders.map((r) => {
        if (r.releaseOrderId === 899) {
            const us = (0, core_1.unitsOf)(102).filter((s) => s.physicalStatus !== 'EXPECTED').slice(0, 2);
            return { ...r, transporterPartyId: 8, plannedExitDate: (0, gen_1.day)(-1), paidThrough: (0, gen_1.at)(14), units: us.map((s, i) => ({ unitStayId: s.unitStayId, unitNo: s.cargoUnit.unitNo, status: i === 0 ? 'OUT' : 'RELEASED', outAt: i === 0 ? (0, gen_1.at)(30) : undefined })) };
        }
        if (r.status === 'APPROVED')
            return { ...r, paidThrough: r.validTo, qrToken: `Q${r.releaseOrderId}${(r.releaseNo ?? '').slice(-4)}` };
        return { ...r, units: [...(r.units ?? []), ...(0, core_1.unitsOf)(101).filter((s) => s !== core_1.HERO && s.physicalStatus === 'IN_YARD').slice(0, 2).map((s) => ({ unitStayId: s.unitStayId, unitNo: s.cargoUnit.unitNo, status: 'PENDING' }))] };
    }),
    extraRo(901, 'RO-DAR1-26-01951', 109, 'REQUESTED', { requestedAt: (0, gen_1.at)(1.2), plannedExitDate: (0, gen_1.day)(1), unitsTotal: 3, collectorName: undefined, collectorIdType: undefined, collectorIdNo: undefined }),
    extraRo(902, 'RO-DAR2-26-00388', 105, 'PARTLY_USED', { requestedAt: (0, gen_1.at)(48), validFrom: (0, gen_1.at)(46), validTo: (0, gen_1.at)(-26), approvedAt: (0, gen_1.at)(46), approvedBy: 'Doc & clearance · Rehema K.', unitsTotal: 3, unitsOut: 1, paidThrough: (0, gen_1.at)(-26), qrToken: 'Q902R388', validityHistory: [{ changeKind: 'INITIAL', newValidTo: (0, gen_1.at)(22), changedAt: (0, gen_1.at)(46) }, { changeKind: 'REVALIDATED', oldValidTo: (0, gen_1.at)(22), newValidTo: (0, gen_1.at)(-26), invoiceId: 3321, reason: 'Paid storage to 8 Oct (INV-DAR1-26-003321)', changedAt: (0, gen_1.at)(20) }] }),
    extraRo(903, 'RO-DAR1-26-01902', 104, 'CANCELLED', { requestedAt: (0, gen_1.at)(90), unitsTotal: 1, collectorName: 'Ally Juma' }),
    extraRo(904, 'RO-DAR1-26-01866', 101, 'USED', { requestedAt: (0, gen_1.at)(160), validFrom: (0, gen_1.at)(150), validTo: (0, gen_1.at)(100), approvedAt: (0, gen_1.at)(150), approvedBy: 'Doc & clearance · Rehema K.', unitsTotal: 1, unitsOut: 1, validityHistory: [{ changeKind: 'INITIAL', newValidTo: (0, gen_1.at)(100), changedAt: (0, gen_1.at)(150) }] }),
    extraRo(905, 'RO-DAR1-26-01955', 103, 'REJECTED', { requestedAt: (0, gen_1.at)(6), unitsTotal: 2, collectorName: 'Mulenga Banda', collectorIdType: 'Passport (ZM)', collectorIdNo: 'ZN0441872' }),
];
{
    const i = exports.allReleaseOrders.findIndex((r) => r.releaseOrderId === 902);
    const r = exports.allReleaseOrders[i];
    exports.allReleaseOrders[i] = { ...r, units: (r.units ?? []).map((u, k) => (k === 0 ? { ...u, status: 'OUT', outAt: (0, gen_1.at)(5) } : { ...u, status: 'RELEASED' })) };
}
const releaseOrder = (id) => exports.allReleaseOrders.find((r) => r.releaseOrderId === id);
exports.releaseOrder = releaseOrder;
const releasesFor = (consignmentId) => exports.allReleaseOrders.filter((r) => r.consignmentId === consignmentId);
exports.releasesFor = releasesFor;
exports.RO_KIND = { DELIVERY: 'Delivery', EMPTY_RELEASE: 'Empty release', EXPORT_TO_PORT: 'Export to port', TRANSFER: 'Transfer' };
const checksFor = (r, stage = 'APPROVAL') => (r.units ?? []).map((u) => { const s = core_1.allStays.find((x) => x.unitStayId === u.unitStayId); return { unit: u, stay: s, checks: s ? (0, control_1.evaluate)(s, stage) : [] }; });
exports.checksFor = checksFor;
(0, search_1.registerSearch)((q) => {
    const n = q.replace(/[\s-]/g, '').toUpperCase();
    const hits = exports.allReleaseOrders.filter((r) => (r.releaseNo ?? '').replace(/-/g, '').includes(n)).slice(0, 5).map((r) => ({
        id: r.releaseOrderId, title: r.releaseNo, status: r.status, subtitle: `${(0, core_1.consignment)(r.consignmentId)?.refNo ?? ''} · ${r.unitsTotal} unit${r.unitsTotal === 1 ? '' : 's'}`,
        link: { entityName: 'release_order', entityId: r.releaseOrderId }, to: `/releases/${r.releaseOrderId}`,
    }));
    return hits.length ? { entity: 'RELEASE_ORDER', label: 'Release orders', hits } : null;
});
exports.IMO_CLASSES = [
    ['1', 'Explosives'], ['2.1', 'Flammable gas'], ['2.2', 'Non-flammable gas'], ['2.3', 'Toxic gas'], ['3', 'Flammable liquid'],
    ['4.1', 'Flammable solid'], ['4.2', 'Spontaneously combustible'], ['4.3', 'Dangerous when wet'], ['5.1', 'Oxidizer'], ['5.2', 'Organic peroxide'],
    ['6.1', 'Toxic'], ['6.2', 'Infectious'], ['7', 'Radioactive'], ['8', 'Corrosive'], ['9', 'Miscellaneous'],
];
const rowKey = (s) => s.currentLocation?.fullCode.split('-').slice(0, 2).join('-');
const dgBase = core_1.allStays.filter((s) => s.imoClass && s.physicalStatus === 'IN_YARD');
const firstDg = dgBase[0];
const neighbour = firstDg ? core_1.allStays.find((s) => s !== firstDg && s.physicalStatus === 'IN_YARD' && !s.imoClass && rowKey(s) === rowKey(firstDg)) : undefined;
const someInYard = core_1.allStays.filter((s) => s.physicalStatus === 'IN_YARD' && s.cargoUnit.category === 'CONTAINER' && s.fullEmpty === 'F' && !s.imoClass && s !== neighbour);
const DG_TEMPLATES = [
    { unNo: '1263', imoClass: '3', packingGroup: 'II', properShippingName: 'Paint', flashpointC: '-4', marinePollutant: false, grossWeightKg: '16200' },
    { unNo: '1993', imoClass: '3', packingGroup: 'III', properShippingName: 'Flammable liquid, n.o.s. (solvent blend)', flashpointC: '38', marinePollutant: false, grossWeightKg: '18800' },
    { unNo: '1942', imoClass: '5.1', packingGroup: 'III', properShippingName: 'Ammonium nitrate (fertiliser grade)', marinePollutant: false, grossWeightKg: '24500' },
    { unNo: '1789', imoClass: '8', packingGroup: 'II', properShippingName: 'Hydrochloric acid', marinePollutant: false, grossWeightKg: '21000' },
    { unNo: '1075', imoClass: '2.1', properShippingName: 'Petroleum gases, liquefied (LPG cylinders)', marinePollutant: false, grossWeightKg: '9800' },
    { unNo: '2588', imoClass: '6.1', packingGroup: 'III', properShippingName: 'Pesticide, solid, toxic, n.o.s.', marinePollutant: true, grossWeightKg: '17400' },
    { unNo: '3480', imoClass: '9', packingGroup: 'II', properShippingName: 'Lithium ion batteries', marinePollutant: false, grossWeightKg: '12300' },
];
let dgId = 3000;
exports.dgLines = [
    ...dgBase.map((s, i) => ({ ...DG_TEMPLATES[i % 2], unitDgLineId: ++dgId, unitStayId: s.unitStayId, emergencyContact: '+255 22 286 0011 (Chemtrec TZ)' })),
    ...(neighbour ? [{ ...DG_TEMPLATES[2], unitDgLineId: ++dgId, unitStayId: neighbour.unitStayId, emergencyContact: '+255 754 300 120' }] : []),
    ...[3, 4, 5, 6].map((t, i) => ({ ...DG_TEMPLATES[t], unitDgLineId: ++dgId, unitStayId: someInYard[i * 7 + 3].unitStayId, emergencyContact: '+255 754 300 120' })),
];
// a second line on one unit: mixed load
exports.dgLines.push({ ...DG_TEMPLATES[6], unitDgLineId: ++dgId, unitStayId: exports.dgLines[exports.dgLines.length - 1].unitStayId, unNo: '3481', properShippingName: 'Lithium ion batteries packed with equipment', grossWeightKg: '2100' });
/* Demo rules only. The real table is the IMDG Code 7.2.4 segregation table,
   loaded by an admin; nothing is seeded. */
exports.SEG_DEMO = [
    { a: '3', b: '5.1', req: 'SEPARATED', label: 'Separated from' },
    { a: '2.1', b: '5.1', req: 'SEPARATED', label: 'Separated from' },
    { a: '3', b: '2.1', req: 'AWAY_FROM', label: 'Away from' },
    { a: '8', b: '5.1', req: 'AWAY_FROM', label: 'Away from' },
    { a: '6.1', b: '3', req: 'AWAY_FROM', label: 'Away from' },
];
function segregationWarnings(lines) {
    const units = [...new Set(lines.map((l) => l.unitStayId))].map((id) => core_1.allStays.find((s) => s.unitStayId === id)).filter((s) => s?.currentLocation);
    const out = [];
    for (let i = 0; i < units.length; i++)
        for (let j = i + 1; j < units.length; j++) {
            const a = units[i], b = units[j];
            const sameRow = rowKey(a) === rowKey(b);
            const sameBlock = a.currentLocation.fullCode.split('-')[0] === b.currentLocation.fullCode.split('-')[0];
            if (!sameBlock)
                continue;
            for (const la of lines.filter((l) => l.unitStayId === a.unitStayId))
                for (const lb of lines.filter((l) => l.unitStayId === b.unitStayId)) {
                    const rule = exports.SEG_DEMO.find((r) => (r.a === la.imoClass && r.b === lb.imoClass) || (r.b === la.imoClass && r.a === lb.imoClass));
                    if (rule && (sameRow || rule.req === 'SEPARATED'))
                        out.push({ a, b, ca: la.imoClass, cb: lb.imoClass, rule, where: sameRow ? `same row ${rowKey(a)}` : `same block ${a.currentLocation.fullCode.split('-')[0]}` });
                }
        }
    return out;
}
exports.ME = 'Neema M.';
exports.APPROVAL_LIMITS = {
    'billing.waiver': { label: 'Waive charges', limit: 500, levels: 'Up to USD 500: 1 level. Above: finance manager too.' },
    'billing.creditnote': { label: 'Credit note', limit: 1000, levels: 'Above USD 1,000: 2 levels (billing lead, then finance manager).' },
    'gate.checkout.override': { label: 'Gate-out override', levels: 'Duty ops manager, 1 level. Expires in 2 h.' },
    'customs.hold.lift': { label: 'Lift a hold', levels: 'Damage, security and court holds: ops manager, 1 level.' },
    'billing.freeday.extend': { label: 'Extra free days', limit: 5, levels: 'Up to 5 days: 1 level.' },
    'payment.refund': { label: 'Refund', limit: 500, levels: 'Above USD 500: 2 levels.' },
    'release.exception.approve': { label: 'Release with a failed condition', levels: 'Commercial condition only. 1 level, never the requester.' },
};
exports.moreApprovals = [
    { approvalRequestId: 9010, requestNo: 'APR-26-00415', permissionCode: 'release.exception.approve', entityName: 'release_order', entityId: 801, summary: 'Approve RO-DAR1-26-01942 with charges unpaid', reason: 'Bill-to Kilele is on credit; payment by CRDB transfer promised today. Customer needs the units before the exam slot closes.', amount: core_1.HERO.accruedCharges?.total, amountCurrency: 'USD', levelsRequired: 1, currentLevel: 0, status: 'PENDING', requestedBy: `Doc & clearance · ${exports.ME}`, requestedAt: (0, gen_1.at)(1.5), expiresAt: (0, gen_1.at)(-22.5), canDecide: false, mine: true, evidence: ['Email from Kilele finance (promise to pay).pdf'] },
    { approvalRequestId: 9011, requestNo: 'APR-26-00407', permissionCode: 'billing.freeday.extend', entityName: 'consignment', entityId: 105, summary: '+2 free days on HTZ112-0087 (Bahari Motors)', reason: 'Vessel discharge finished late Sunday; customer could not clear on a weekend.', levelsRequired: 1, currentLevel: 1, status: 'APPROVED', requestedBy: `Doc & clearance · ${exports.ME}`, requestedAt: (0, gen_1.at)(30), decidedAt: (0, gen_1.at)(27), canDecide: false, mine: true, steps: [{ levelNo: 1, decision: 'APPROVE', decidedBy: 'Finance · Joseph N.', note: 'OK, one-off', decidedAt: (0, gen_1.at)(27) }] },
];
exports.allApprovals = [
    ...control_1.approvals.map((a) => ({
        ...a,
        evidence: a.approvalRequestId === 9001 ? ['Exam notice EXN-DSM-26-04418.pdf', 'Storage calculation.pdf'] : a.approvalRequestId === 9002 ? ['Reefer plug log 01–05 Oct.xlsx', 'INV-DAR1-26-003310.pdf'] : a.approvalRequestId === 9003 ? ['Seal photo (gate-out).jpg', 'Paper EIR scan.pdf'] : a.approvalRequestId === 9004 ? ['Survey report SR-2210.pdf'] : [],
    })),
    ...exports.moreApprovals,
];
/** Requests raised while clicking through the prototype (hold lift, release override). */
exports.sessionApprovals = [];
let aprNo = 430;
function raiseApproval(a) {
    const r = { approvalRequestId: 9100 + aprNo, requestNo: `APR-26-00${++aprNo}`, levelsRequired: 1, currentLevel: 0, status: 'PENDING', requestedBy: `Doc & clearance · ${exports.ME}`, requestedAt: (0, gen_1.at)(0), expiresAt: (0, gen_1.at)(-24), canDecide: false, mine: true, ...a };
    exports.sessionApprovals.unshift(r);
    return r;
}
exports.delegations = [
    { approvalDelegationId: 41, fromUserId: 12, toUserId: 7, fromName: 'Joseph N. (Finance)', toName: 'Daniel K. (Ops)', permissionCode: 'billing.creditnote', permName: 'Credit notes', siteId: 1, validFrom: (0, gen_1.at)(48), validTo: (0, gen_1.at)(-24 * 5), reason: 'Annual leave 5–12 Oct' },
    { approvalDelegationId: 42, fromUserId: 7, toUserId: 15, fromName: 'Daniel K. (Ops)', toName: 'Rehema K. (Doc & clearance)', permissionCode: 'gate.checkout.override', permName: 'Gate-out overrides', siteId: 1, validFrom: (0, gen_1.at)(-24 * 3), validTo: (0, gen_1.at)(-24 * 4), reason: 'Training in Arusha on 10 Oct' },
    { approvalDelegationId: 40, fromUserId: 12, toUserId: 7, fromName: 'Joseph N. (Finance)', toName: 'Daniel K. (Ops)', permissionCode: null, permName: 'All approvals', siteId: null, validFrom: (0, gen_1.at)(24 * 30), validTo: (0, gen_1.at)(24 * 26), reason: 'Sick leave', revokedAt: (0, gen_1.at)(24 * 27) },
];
exports.exceptionComments = {
    301: [
        { exceptionCommentId: 1, kind: 'SYSTEM', text: 'Raised at gate-in lane 1: seal ML-7781208 does not match manifest ML-7781203.', createdAt: (0, gen_1.at)(0.4), createdBy: 'System' },
        { exceptionCommentId: 2, kind: 'COMMENT', text: 'Photo of the seal attached. Last digit looks like a typo on the paper EIR. Asked the line to confirm.', createdAt: (0, gen_1.at)(0.3), createdBy: 'Gate · Hamisi J.' },
        { exceptionCommentId: 3, kind: 'STATUS', text: 'Approval APR-26-00414 requested to let the truck leave.', createdAt: (0, gen_1.at)(0.3), createdBy: 'Gate · Hamisi J.' },
    ],
    302: [
        { exceptionCommentId: 4, kind: 'SYSTEM', text: 'Gate-out refused: release RO-DAR1-26-01877 expired 14 h ago.', createdAt: (0, gen_1.at)(3), createdBy: 'System' },
        { exceptionCommentId: 5, kind: 'ASSIGN', text: 'Assigned to Grace P. (customer service).', createdAt: (0, gen_1.at)(2.9), createdBy: 'System' },
        { exceptionCommentId: 6, kind: 'ESCALATE', text: 'SLA passed (2 h). Escalated to level 1: customer service lead.', createdAt: (0, gen_1.at)(1), createdBy: 'System' },
        { exceptionCommentId: 7, kind: 'COMMENT', text: 'Called Pwani Hardware. They will pay one more storage day by M-Pesa, then we revalidate.', createdAt: (0, gen_1.at)(0.6), createdBy: 'Customer service · Grace P.' },
    ],
    303: [
        { exceptionCommentId: 8, kind: 'SYSTEM', text: 'Major damage recorded at gate-in inspection. Damage hold placed.', createdAt: (0, gen_1.at)(26), createdBy: 'System' },
        { exceptionCommentId: 9, kind: 'COMMENT', text: 'Surveyor from Indian Ocean Shipping booked for tomorrow 09:00.', createdAt: (0, gen_1.at)(20), createdBy: 'Ops · Daniel K.' },
    ],
    304: [
        { exceptionCommentId: 10, kind: 'SYSTEM', text: 'Offline gate-out from lane 2 synced at 06:40; a line hold was placed at 06:05.', createdAt: (0, gen_1.at)(4), createdBy: 'System' },
        { exceptionCommentId: 11, kind: 'ESCALATE', text: 'SLA passed. Escalated to level 1: ops manager.', createdAt: (0, gen_1.at)(3), createdBy: 'System' },
        { exceptionCommentId: 12, kind: 'ESCALATE', text: 'Still open. Escalated to level 2: general manager.', createdAt: (0, gen_1.at)(2), createdBy: 'System' },
    ],
    305: [{ exceptionCommentId: 13, kind: 'STATUS', text: 'Resolved: declaration amended.', createdAt: (0, gen_1.at)(12), createdBy: 'Ops · Daniel K.' }],
    306: [{ exceptionCommentId: 14, kind: 'SYSTEM', text: 'VFD returned error 503 twice. Retry scheduled every 15 minutes.', createdAt: (0, gen_1.at)(6), createdBy: 'System' }],
    307: [],
};
exports.RESOLUTION_CODES = [
    ['DECLARATION_AMENDED', 'Declaration amended'], ['DATA_CORRECTED', 'Data corrected in the system'], ['APPROVED_OVERRIDE', 'Allowed by approved override'],
    ['CUSTOMER_PAID', 'Customer paid'], ['CHARGED_TO_CUSTOMER', 'Charged to customer'], ['CLAIM_RAISED', 'Claim raised with line or insurer'],
    ['NO_ACTION', 'No action needed'], ['DUPLICATE', 'Duplicate case'],
];
exports.EXCEPTION_NAME = {
    SEAL_MISMATCH: 'Seal mismatch', GATE_OUT_BLOCKED: 'Gate-out blocked', DAMAGE_MAJOR: 'Major damage', OFFLINE_CONFLICT: 'Offline sync conflict',
    WEIGHT_VARIANCE: 'Weight variance', FISCAL_FAILED: 'Fiscal receipt failed', NO_SHOW: 'No-show',
};
exports.ROLE_NAME = {
    OPS_MANAGER: 'Ops manager', CUSTOMER_SERVICE: 'Customer service', BILLING_OFFICER: 'Billing officer', GATE_OFFICER: 'Gate officer', DOC_CLEARANCE: 'Doc & clearance',
};
exports.SLA_MIN = { SEAL_MISMATCH: 120, GATE_OUT_BLOCKED: 120, DAMAGE_MAJOR: 48 * 60, OFFLINE_CONFLICT: 60, WEIGHT_VARIANCE: 24 * 60, FISCAL_FAILED: 24 * 60, NO_SHOW: 24 * 60 };
exports.allExceptions = control_1.exceptions;
const entityLink = (name, id, unitStayId) => {
    if (unitStayId) {
        const s = core_1.allStays.find((x) => x.unitStayId === unitStayId);
        return [s ? `Unit ${s.cargoUnit.unitNo}` : `Unit ${unitStayId}`, `/units/${unitStayId}`];
    }
    switch (name) {
        case 'truck_visit': return [`Truck visit ${id}`, `/gate/visits/${id}`];
        case 'invoice': return [`Invoice INV-DAR1-26-00${id}`, `/invoices/${id}`];
        case 'unit_stay': return [`Unit ${id}`, `/units/${id}`];
        case 'release_order': return [(0, exports.releaseOrder)(id)?.releaseNo ?? `Release ${id}`, `/releases/${id}`];
        case 'consignment': return [(0, core_1.consignment)(id)?.refNo ?? `Consignment ${id}`, `/consignments/${id}`];
        case 'hold': return [`Hold ${id}`, '/holds'];
        default: return [`${name.replace(/_/g, ' ')} ${id}`, undefined];
    }
};
exports.entityLink = entityLink;
const firstApproved = exports.allReleaseOrders.find((r) => r.status === 'APPROVED' && r.releaseOrderId !== 801);
const heldOther = control_1.holds.find((h) => h.status === 'ACTIVE' && h.holdTypeCode === 'LINE');
exports.notifications = [
    { notificationId: 1, kind: 'APPROVAL', subject: 'Approval waiting: gate-out override', body: 'Hamisi J. asks to let T 902 DMB leave with a seal mismatch. Expires in 1 h 40 min.', createdAt: (0, gen_1.at)(0.3), link: { entityName: 'approval', entityId: 9003 }, to: '/approvals' },
    { notificationId: 2, kind: 'EXCEPTION', subject: 'Exception assigned to Doc & clearance', body: 'EX-26-00870 Offline gate-out conflicts with a hold placed meanwhile. Critical, escalated to level 2.', createdAt: (0, gen_1.at)(2), link: { entityName: 'exception_case', entityId: 304 }, to: '/exceptions/304' },
    { notificationId: 3, kind: 'FREE_TIME', subject: 'Free time ends tomorrow for 6 units', body: 'HTZ112-0087 (Bahari Motors): storage starts at 00:00 on 9 Oct. Ask the agent to clear or pay ahead.', createdAt: (0, gen_1.at)(2.5), link: { entityName: 'consignment', entityId: 105 }, to: '/consignments/105' },
    { notificationId: 4, kind: 'HOLD', subject: 'Hold placed: shipping line hold', body: `${heldOther?.unitNo ?? 'A unit'}: freight not settled with the line (BML/DO-HOLD/882).`, createdAt: (0, gen_1.at)(4), link: { entityName: 'unit_stay', entityId: heldOther?.unitStayId ?? core_1.HERO.unitStayId }, to: `/units/${heldOther?.unitStayId ?? core_1.HERO.unitStayId}` },
    { notificationId: 5, kind: 'PAYMENT', subject: 'Payment received USD 1,416.00', body: 'Mzizi Traders paid by CRDB transfer, ref. CRDB-TT-884120. Allocated to INV-DAR1-26-003302.', createdAt: (0, gen_1.at)(5), readAt: (0, gen_1.at)(4.5), link: { entityName: 'invoice', entityId: 3302 }, to: '/invoices' },
    { notificationId: 6, kind: 'RELEASE', subject: `Release approved: ${firstApproved.releaseNo}`, body: `${firstApproved.units?.[0]?.unitNo} can leave until ${new Date(firstApproved.validTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}. QR sent to the collector by SMS.`, createdAt: (0, gen_1.at)(22), readAt: (0, gen_1.at)(21), link: { entityName: 'release_order', entityId: firstApproved.releaseOrderId }, to: `/releases/${firstApproved.releaseOrderId}` },
    { notificationId: 7, kind: 'CUSTOMS', subject: 'Customs release recorded', body: 'REL-DSM-26-31007 on BMLU2409902: units set to cleared.', createdAt: (0, gen_1.at)(48), readAt: (0, gen_1.at)(46), link: { entityName: 'consignment', entityId: 102 }, to: '/consignments/102' },
    { notificationId: 8, kind: 'RELEASE', subject: 'Release expired: RO-DAR1-26-01877', body: 'Paid through yesterday 20:30. Revalidate after the customer pays more storage.', createdAt: (0, gen_1.at)(14), readAt: (0, gen_1.at)(10), link: { entityName: 'release_order', entityId: 899 }, to: '/releases/899' },
    { notificationId: 9, kind: 'MANIFEST', subject: 'Manifest applied with 2 errors', body: 'HTZ112_vehicles_supplement.xlsx: 4 matched, 2 lines need fixing.', createdAt: (0, gen_1.at)(64), readAt: (0, gen_1.at)(60), link: { entityName: 'manifest', entityId: 505 }, to: '/manifests' },
    { notificationId: 10, kind: 'APPROVAL', subject: 'Your request was approved', body: 'APR-26-00407 +2 free days on HTZ112-0087 approved by Joseph N.', createdAt: (0, gen_1.at)(27), readAt: (0, gen_1.at)(26), link: { entityName: 'approval', entityId: 9011 }, to: '/approvals' },
];
