"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visit = exports.visits = exports.VISIT_TYPES = exports.CHECKPOINTS = void 0;
const core_1 = require("./core");
const gen_1 = require("./gen");
const search_1 = require("./search");
exports.CHECKPOINTS = [
    { code: 'OUTER_IN', name: 'Outer gate in', short: 'Outer in' },
    { code: 'INNER_IN', name: 'Inner gate in', short: 'Inner in' },
    { code: 'INNER_OUT', name: 'Inner gate out', short: 'Inner out' },
    { code: 'OUTER_OUT', name: 'Outer gate out', short: 'Outer out' },
];
exports.VISIT_TYPES = {
    IMPORT_PICKUP: 'Import pick-up', EXPORT_DROP: 'Export drop-off', EMPTY_RETURN: 'Empty return', EMPTY_PICKUP: 'Empty pick-up',
    VEHICLE_DELIVERY: 'Vehicle delivery', VEHICLE_RECEIPT: 'Vehicle receipt (self-driven)', TRANSFER_IN: 'Transfer from port',
};
const cp = (code, seq, hrs, result = 'PASSED', reason, offline) => ({
    checkpointCode: code, seqNo: seq, result, failureReason: reason, occurredAt: (0, gen_1.at)(hrs), by: seq % 2 ? 'Gate · Hamisi J.' : 'Gate · Rose A.', isOffline: offline,
});
const vu = (s, dir, status = 'PLANNED') => ({
    visitUnitTxnId: s.unitStayId * 10, unitStayId: s.unitStayId, unitNo: s.cargoUnit.unitNo, direction: dir, status,
    sealExpected: s.sealNo ?? undefined, eirNo: status === 'DONE' ? `EIR-DAR1-26-${s.unitStayId}` : undefined,
});
const inYard = core_1.allStays.filter((s) => s.physicalStatus === 'IN_YARD' && s.cargoUnit.category === 'CONTAINER');
exports.visits = [
    { truckVisitId: 4410, visitNo: 'TV-26-04410', visitTypeCode: 'TRANSFER_IN', conveyance: 'TRUCK', plateNo: 'T 902 DMB', driverName: 'Musa Rajabu', transporter: 'Simba Haulage Co.', status: 'HELD', currentSeqNo: 1, nextCheckpointCode: 'INNER_IN', arrivedAt: (0, gen_1.at)(0.6), waitingMin: 34, blockedReason: 'Seal mismatch: approval requested', lane: 'In 1', units: [vu(inYard[20], 'DROP', 'IN_PROGRESS')], checkpoints: [cp('OUTER_IN', 1, 0.6), cp('INNER_IN', 2, 0.4, 'FAILED', 'Seal found ML-7781208, expected ML-7781203')] },
    { truckVisitId: 4411, visitNo: 'TV-26-04411', visitTypeCode: 'IMPORT_PICKUP', conveyance: 'TRUCK', plateNo: 'T 412 DKL', driverName: 'Baraka Mwita', transporter: 'Upepo Transporters', status: 'AT_OUTER_GATE', currentSeqNo: 0, nextCheckpointCode: 'OUTER_IN', arrivedAt: (0, gen_1.at)(0.2), waitingMin: 12, lane: 'In 2', nominationRef: 'RO-DAR1-26-01942', units: [vu(core_1.HERO, 'PICK')], checkpoints: [] },
    { truckVisitId: 4412, visitNo: 'TV-26-04412', visitTypeCode: 'IMPORT_PICKUP', conveyance: 'TRUCK', plateNo: 'T 118 DPE', driverName: 'Said Omari', transporter: 'Simba Haulage Co.', status: 'WORKING', currentSeqNo: 2, nextCheckpointCode: 'INNER_OUT', arrivedAt: (0, gen_1.at)(1.4), admittedAt: (0, gen_1.at)(1.2), waitingMin: 72, units: [vu(inYard[2], 'PICK', 'IN_PROGRESS')], checkpoints: [cp('OUTER_IN', 1, 1.4), cp('INNER_IN', 2, 1.2)] },
    { truckVisitId: 4413, visitNo: 'TV-26-04413', visitTypeCode: 'EMPTY_RETURN', conveyance: 'TRUCK', plateNo: 'T 771 DGH', driverName: 'John Massawe', transporter: 'Upepo Transporters', status: 'ADMITTED', currentSeqNo: 2, nextCheckpointCode: 'INNER_OUT', arrivedAt: (0, gen_1.at)(0.9), admittedAt: (0, gen_1.at)(0.7), waitingMin: 41, units: [vu(inYard[30], 'DROP', 'IN_PROGRESS')], checkpoints: [cp('OUTER_IN', 1, 0.9), cp('INNER_IN', 2, 0.7)] },
    { truckVisitId: 4414, visitNo: 'TV-26-04414', visitTypeCode: 'IMPORT_PICKUP', conveyance: 'TRUCK', plateNo: 'T 230 DLX', driverName: 'Elia Mrema', transporter: 'Simba Haulage Co.', status: 'CHECKED_OUT', currentSeqNo: 3, nextCheckpointCode: 'OUTER_OUT', arrivedAt: (0, gen_1.at)(2.1), admittedAt: (0, gen_1.at)(1.9), checkedOutAt: (0, gen_1.at)(0.1), waitingMin: 8, gatePassNo: 'GP-26-08811', units: [vu(inYard[5], 'PICK', 'DONE')], checkpoints: [cp('OUTER_IN', 1, 2.1), cp('INNER_IN', 2, 1.9), cp('INNER_OUT', 3, 0.1)] },
    { truckVisitId: 4415, visitNo: 'TV-26-04415', visitTypeCode: 'EXPORT_DROP', conveyance: 'TRUCK', plateNo: 'T 655 DQA', driverName: 'Hassan Ali', transporter: 'Upepo Transporters', status: 'ANNOUNCED', currentSeqNo: 0, nextCheckpointCode: 'OUTER_IN', expectedFrom: (0, gen_1.at)(-0.5), expectedTo: (0, gen_1.at)(-2.5), waitingMin: 0, units: [], checkpoints: [] },
    { truckVisitId: 4416, visitNo: 'TV-26-04416', visitTypeCode: 'VEHICLE_DELIVERY', conveyance: 'CAR_CARRIER', plateNo: 'T 340 DRC', driverName: 'Abdul Kombo', transporter: 'Simba Haulage Co.', status: 'WORKING', currentSeqNo: 2, nextCheckpointCode: 'INNER_OUT', arrivedAt: (0, gen_1.at)(1.0), admittedAt: (0, gen_1.at)(0.8), waitingMin: 55, units: core_1.allStays.filter((s) => s.siteId === 2 && s.releaseStatus === 'APPROVED').slice(0, 3).map((s) => vu(s, 'PICK', 'IN_PROGRESS')), checkpoints: [cp('OUTER_IN', 1, 1.0), cp('INNER_IN', 2, 0.8)] },
    { truckVisitId: 4402, visitNo: 'TV-26-04402', visitTypeCode: 'IMPORT_PICKUP', conveyance: 'TRUCK', plateNo: 'T 505 DJN', driverName: 'Peter Lyimo', transporter: 'Pwani Hardware (own truck)', status: 'REJECTED', currentSeqNo: 2, nextCheckpointCode: 'INNER_OUT', arrivedAt: (0, gen_1.at)(3.4), admittedAt: (0, gen_1.at)(3.2), waitingMin: 0, blockedReason: 'Release order expired at 07:30', units: [vu(inYard[9], 'PICK', 'CANCELLED')], checkpoints: [cp('OUTER_IN', 1, 3.4), cp('INNER_IN', 2, 3.2), cp('INNER_OUT', 3, 3.0, 'FAILED', 'RELEASE_VALID: expired')] },
    { truckVisitId: 4398, visitNo: 'TV-26-04398', visitTypeCode: 'EMPTY_PICKUP', conveyance: 'TRUCK', plateNo: 'T 880 DFF', driverName: 'Yusuf Bakari', transporter: 'Upepo Transporters', status: 'EXITED', currentSeqNo: 4, arrivedAt: (0, gen_1.at)(5), admittedAt: (0, gen_1.at)(4.8), checkedOutAt: (0, gen_1.at)(4.2), exitedAt: (0, gen_1.at)(4.1), waitingMin: 0, gatePassNo: 'GP-26-08802', isOfflineEntry: true, units: [vu(inYard[33], 'PICK', 'DONE')], checkpoints: [cp('OUTER_IN', 1, 5, 'PASSED', undefined, true), cp('INNER_IN', 2, 4.8, 'PASSED', undefined, true), cp('INNER_OUT', 3, 4.2), cp('OUTER_OUT', 4, 4.1)] },
];
const visit = (id) => exports.visits.find((v) => v.truckVisitId === id);
exports.visit = visit;
(0, search_1.registerSearch)((q) => {
    const n = q.replace(/\s/g, '').toUpperCase();
    const hits = exports.visits.filter((v) => (v.plateNo ?? '').replace(/\s/g, '').includes(n) || (v.visitNo ?? '').includes(n)).slice(0, 5).map((v) => ({
        id: v.truckVisitId, title: `${v.plateNo} · ${v.visitNo}`, subtitle: `${exports.VISIT_TYPES[v.visitTypeCode]} · ${v.driverName}`, status: v.status,
        link: { entityName: 'truck_visit', entityId: v.truckVisitId }, to: `/gate/visits/${v.truckVisitId}`,
    }));
    return hits.length ? { entity: 'TRUCK_VISIT', label: 'Truck visits', hits } : null;
});
