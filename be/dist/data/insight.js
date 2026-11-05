"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partySync = exports.NG_MATCHES = exports.contactsOf = exports.serviceRequests = exports.SR_KINDS = exports.portalDocs = exports.appointments = exports.portalUnits = exports.PORTAL_PARTY = exports.balanceOf = exports.invoicesOf = exports.invoices = exports.AUDIT_SOURCES = exports.AUDIT_ACTIONS = exports.auditLog = exports.AUDIT_USERS = exports.suggestionLog = exports.forecastDates = exports.MODEL_VERSIONS = exports.exportLog = exports.savedReports = exports.REPORT_GROUPS = exports.reports = exports.kpiTiles = exports.kpiSeries = exports.kpiDates = void 0;
exports.occupancyFor = occupancyFor;
exports.controlTower = controlTower;
exports.reportPreview = reportPreview;
exports.occupancyForecast = occupancyForecast;
exports.dwellPredictions = dwellPredictions;
exports.plainStatus = plainStatus;
exports.whyCantCollect = whyCantCollect;
exports.slotsFor = slotsFor;
const core_1 = require("./core");
const control_1 = require("./control");
const gate_1 = require("./gate");
const gen_1 = require("./gen");
let seed = 4417;
const r = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const rp = (a) => a[Math.floor(r() * a.length)];
const round1 = (n) => Math.round(n * 10) / 10;
const live = gate_1.visits.filter((v) => !['EXITED', 'CANCELLED', 'EXPIRED'].includes(v.status));
const toRow = (v) => ({
    truckVisitId: v.truckVisitId, plateNo: v.plateNo, visitTypeCode: v.visitTypeCode, status: v.status,
    checkpointCode: v.nextCheckpointCode, waitingMinutes: v.waitingMin, units: v.units?.length ?? 0, blockedReason: v.blockedReason,
    driverName: v.driverName, transporter: v.transporter,
});
function occupancyFor(siteId) {
    return core_1.blocks.filter((b) => b.siteId === siteId).map((b) => {
        const usable = b.rows * b.bays * b.tiers;
        const occ = Math.min(usable, (0, core_1.staysAt)(siteId).filter((s) => s.physicalStatus === 'IN_YARD' && s.currentLocation?.fullCode.startsWith(b.code + '-')).length + (b.kind === 'EXAM' ? 7 : 0));
        return { yardLocationId: b.id, fullCode: b.code, usableSlots: usable, occupiedSlots: occ, occupancyPct: String(Math.round((occ / usable) * 100)), kind: b.kind };
    });
}
const EQUIP_STATE = {
    'RS-01': ['WORKING', 'Ibrahim N.', 34, 'Block A, picking for T 118 DPE'],
    'RS-02': ['WORKING', 'Kassim O.', 27, 'Block B, placing transfer-in'],
    'EH-01': ['DOWN', null, 6, 'Hydraulic leak, fitter called 09:10'],
    'FL-03': ['IDLE', 'Rehema L.', 11, 'CFS shed W1, waiting for destuff job'],
    'TT-01': ['WORKING', 'Selemani P.', 19, 'Shuttle to exam bay X'],
    'WB-01': ['IDLE', 'Ally S.', 23, 'No truck on the bridge'],
};
function controlTower(siteId) {
    const open = control_1.exceptions.filter((e) => !['RESOLVED', 'CLOSED'].includes(e.status));
    const count = (s) => open.filter((e) => e.severity === s).length;
    return {
        generatedAt: (0, gen_1.at)(0), siteId,
        exceptions: { critical: count('CRITICAL'), high: count('HIGH'), medium: count('MEDIUM'), low: count('LOW'), overdue: open.filter((e) => e.isOverdue).length },
        openExceptions: open,
        gateQueue: live.filter((v) => v.status !== 'ANNOUNCED').map(toRow),
        blockedTrucks: live.filter((v) => v.status === 'HELD' || v.status === 'REJECTED').map(toRow),
        yardOccupancy: occupancyFor(siteId),
        todayIn: 38, todayOut: 29, planIn: 52, planOut: 40, pendingMoves: 7,
        equipment: core_1.equipment.map((e) => {
            const [status, op, moves, note] = EQUIP_STATE[e.equipmentCode];
            return { equipmentId: e.equipmentId, equipmentCode: e.equipmentCode, equipmentType: e.equipmentType, name: e.equipmentName, operatorName: op, movesToday: moves, status, note };
        }),
        approvalsWaiting: control_1.approvals.filter((a) => a.status === 'PENDING'),
        hours: ['06', '07', '08', '09', '10'],
        hourlyIn: [2, 5, 7, 6, 9],
        hourlyOut: [0, 2, 4, 6, 8],
    };
}
/* ================================================================== KPIs */
const DAYS = 90;
exports.kpiDates = Array.from({ length: DAYS }, (_, i) => (0, gen_1.day)(i - DAYS + 1));
const walk = (start, drift, noise, lo, hi, weekly = 0) => {
    let v = start;
    return exports.kpiDates.map((d, i) => {
        v = Math.min(hi, Math.max(lo, v + drift + (r() - 0.5) * noise));
        const dow = new Date(d + 'T12:00:00Z').getUTCDay();
        return round1(v + (dow === 0 ? -weekly : dow === 6 ? -weekly / 2 : 0) + (i === DAYS - 1 ? 0 : 0));
    });
};
exports.kpiSeries = {
    gateIn: walk(44, 0.03, 9, 25, 70, 18).map(Math.round),
    gateOut: walk(38, 0.04, 9, 20, 64, 16).map(Math.round),
    dwellImport: walk(12.5, -0.035, 0.8, 7, 16),
    dwellTransit: walk(6.4, 0.01, 0.7, 4, 10),
    occDar1: walk(62, 0.05, 3.5, 45, 92).map(Math.round),
    occDar2: walk(48, 0.08, 4, 30, 90).map(Math.round),
    turnaround: walk(58, -0.12, 5, 35, 80).map(Math.round),
    revenue: walk(5200, 4, 1800, 2000, 11000).map(Math.round),
    collection: walk(31, -0.03, 2, 20, 45),
    sla: walk(82, 0.06, 7, 60, 99).map(Math.round),
};
// End the occupancy series at today's real figure so KPIs and the control tower agree.
for (const [k, site] of [['occDar1', 1], ['occDar2', 2]]) {
    const o = occupancyFor(site);
    const now = Math.round((o.reduce((a, b) => a + b.occupiedSlots, 0) / o.reduce((a, b) => a + b.usableSlots, 0)) * 100);
    const shift = now - exports.kpiSeries[k][DAYS - 1];
    exports.kpiSeries[k] = exports.kpiSeries[k].map((v) => Math.max(5, Math.min(100, v + shift)));
}
const pts = (vals, n = 30) => vals.slice(-n).map((v, i) => ({ date: exports.kpiDates[DAYS - n + i], value: String(v) }));
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const monthToDate = (vals) => vals.slice(-7).reduce((x, y) => x + y, 0); // 1–7 Oct
exports.kpiTiles = [
    { kpiCode: 'AVG_DWELL', label: 'Average dwell', value: String(round1(avg(exports.kpiSeries.dwellImport.slice(-30)))), unit: 'days', comparison: String(round1(avg(exports.kpiSeries.dwellImport.slice(-60, -30)))), comparisonLabel: 'previous 30 days', trend: pts(exports.kpiSeries.dwellImport), drillDownUrl: '/units', goodWhen: 'down', target: 10 },
    { kpiCode: 'TRUCK_TAT', label: 'Truck turnaround', value: String(Math.round(avg(exports.kpiSeries.turnaround.slice(-30)))), unit: 'min', comparison: String(Math.round(avg(exports.kpiSeries.turnaround.slice(-60, -30)))), comparisonLabel: 'previous 30 days', trend: pts(exports.kpiSeries.turnaround), drillDownUrl: '/gate', goodWhen: 'down', target: 45 },
    { kpiCode: 'GATE_MOVES', label: 'Gate moves per day', value: String(Math.round(avg(exports.kpiSeries.gateIn.slice(-30).map((v, i) => v + exports.kpiSeries.gateOut.slice(-30)[i])))), unit: 'moves', comparison: String(Math.round(avg(exports.kpiSeries.gateIn.slice(-60, -30).map((v, i) => v + exports.kpiSeries.gateOut.slice(-60, -30)[i])))), comparisonLabel: 'previous 30 days', trend: pts(exports.kpiSeries.gateIn.map((v, i) => v + exports.kpiSeries.gateOut[i])), drillDownUrl: '/gate', goodWhen: 'up' },
    { kpiCode: 'YARD_OCC', label: 'Yard occupancy', value: String(exports.kpiSeries.occDar1[DAYS - 1]), unit: '%', comparison: String(exports.kpiSeries.occDar1[DAYS - 31]), comparisonLabel: 'same day last month', trend: pts(exports.kpiSeries.occDar1), drillDownUrl: '/yard', goodWhen: 'down', target: 85 },
    { kpiCode: 'REVENUE_MTD', label: 'Revenue month to date', value: String(monthToDate(exports.kpiSeries.revenue)), unit: 'USD', comparison: String(exports.kpiSeries.revenue.slice(-38, -31).reduce((x, y) => x + y, 0)), comparisonLabel: '1–7 Sep', trend: pts(exports.kpiSeries.revenue), drillDownUrl: '/invoices', goodWhen: 'up', format: 'money' },
    { kpiCode: 'COLLECTION_DAYS', label: 'Collection days', value: String(round1(exports.kpiSeries.collection[DAYS - 1])), unit: 'days', comparison: String(round1(exports.kpiSeries.collection[DAYS - 31])), comparisonLabel: 'last month', trend: pts(exports.kpiSeries.collection), drillDownUrl: '/statements', goodWhen: 'down', target: 30 },
    { kpiCode: 'EXC_SLA', label: 'Exceptions resolved within SLA', value: String(Math.round(avg(exports.kpiSeries.sla.slice(-30)))), unit: '%', comparison: String(Math.round(avg(exports.kpiSeries.sla.slice(-60, -30)))), comparisonLabel: 'previous 30 days', trend: pts(exports.kpiSeries.sla), drillDownUrl: '/exceptions', goodWhen: 'up', target: 90 },
];
const P_RANGE = { name: 'Date range', type: 'dateRange', required: true };
const P_SITE = { name: 'Site', type: 'site', required: true };
const P_CUST = { name: 'Customer', type: 'party', required: false };
const rep = (reportCode, reportName, group, description, builder, extra = {}) => ({
    reportCode, reportName, group, description, builder,
    category: group === 'commercial' || group === 'finance' ? 'COMMERCIAL' : group === 'operations' ? 'OPERATIONAL' : 'COMPLIANCE',
    parameters: [P_RANGE, P_SITE, P_CUST], formats: ['XLSX', 'PDF'],
    permissionCode: group === 'commercial' || group === 'finance' ? 'reports.financial' : 'reports.operational', ...extra,
});
exports.reports = [
    rep('OPS_STOCK', 'Units in yard (stock list)', 'operations', 'Every unit on site now with location, flow, days in yard and holds.', 'stock', { parameters: [P_SITE, P_CUST] }),
    rep('OPS_GATE', 'Gate in and out register', 'operations', 'Every truck visit with times at each checkpoint, units and EIR numbers.', 'gate'),
    rep('OPS_DWELL', 'Dwell time by customer', 'operations', 'Average and longest days in yard per customer and flow.', 'dwell'),
    rep('OPS_EQUIP', 'Equipment moves and downtime', 'operations', 'Moves per machine and operator, idle and down hours.', 'equip', { parameters: [P_RANGE, P_SITE] }),
    rep('OPS_TAT', 'Truck turnaround', 'operations', 'Minutes from outer gate in to outer gate out, by visit type and hour.', 'tat', { parameters: [P_RANGE, P_SITE] }),
    rep('CUS_HOLDS', 'Active holds and exams', 'customs', 'Customs exams, queries and line holds open now, with authority references.', 'holds', { parameters: [P_SITE, P_CUST] }),
    rep('CUS_TRANSIT', 'Transit cargo and bonds', 'customs', 'Transit units with declaration, bond expiry and destination country.', 'transit'),
    rep('CUS_RELEASES', 'Release orders issued', 'customs', 'Release orders by status, with validity and units collected.', 'releases'),
    rep('COM_REVENUE', 'Revenue by charge', 'commercial', 'Invoiced revenue by charge group and customer, USD and TZS.', 'revenue'),
    rep('COM_WAIVERS', 'Waivers and free-day extensions', 'commercial', 'Every waiver and extension granted, who asked and who approved.', 'waivers'),
    rep('COM_ACCRUED', 'Accrued, not yet invoiced', 'commercial', 'Storage and handling earned but not invoiced, per customer.', 'accrued', { parameters: [P_SITE, P_CUST] }),
    rep('FIN_AGEING', 'Debtors ageing', 'finance', 'Open balances by customer in 30-day buckets.', 'ageing', { parameters: [P_SITE, P_CUST] }),
    rep('FIN_CASH', 'Cashier collections', 'finance', 'Receipts by cashier, method (cash, M-Pesa, bank) and shift.', 'cash', { parameters: [P_RANGE, P_SITE] }),
    rep('FIN_VFD', 'Fiscal receipts (VFD) status', 'finance', 'Invoices with their TRA receipt number, and any that failed.', 'vfd'),
    rep('AUD_OVERRIDES', 'Overrides and approvals', 'audit', 'Every override and approval decision with reason and evidence.', 'overrides', { parameters: [P_RANGE, P_SITE] }),
    rep('AUD_OFFLINE', 'Offline gate events and conflicts', 'audit', 'Events captured offline at the gate, when they synced and any conflicts.', 'offline', { parameters: [P_RANGE, P_SITE] }),
    rep('AUD_EXPORTS', 'Exports and prints log', 'audit', 'Who exported or printed what, when, from which device.', 'exports', { parameters: [P_RANGE] }),
];
exports.REPORT_GROUPS = [['operations', 'Operations'], ['customs', 'Customs'], ['commercial', 'Commercial'], ['finance', 'Finance'], ['audit', 'Audit']];
const cust = core_1.parties.filter((p) => p.roles.includes('CUSTOMER'));
function reportPreview(rp_, partyId) {
    seed = 900 + rp_.reportCode.length * 7; // same preview for the same report
    const stays = core_1.allStays.filter((s) => s.siteId === 1 && s.physicalStatus === 'IN_YARD' && (!partyId || core_1.consignments.find((c) => c.consignmentId === s.consignmentId)?.billToPartyId === partyId));
    switch (rp_.builder) {
        case 'stock':
        case 'holds':
        case 'transit': {
            const src = rp_.builder === 'holds' ? stays.filter((s) => (s.activeHoldCount ?? 0) > 0) : rp_.builder === 'transit' ? stays.filter((s) => s.flow === 'TRANSIT') : stays;
            return { total: src.length, cols: [{ key: 'unit', label: 'Unit' }, { key: 'type', label: 'Type' }, { key: 'flow', label: 'Flow' }, { key: 'loc', label: 'Location' }, { key: 'bl', label: 'Consignment' }, { key: 'note', label: rp_.builder === 'holds' ? 'Hold' : 'Customs' }, { key: 'days', label: 'Days', num: true }],
                rows: src.slice(0, 12).map((s) => ({ unit: s.cargoUnit.unitNo, type: s.cargoUnit.unitTypeCode, flow: s.flow.toLowerCase(), loc: s.currentLocation?.fullCode ?? '—', bl: s.unitSummary.consignmentRef ?? '—', note: rp_.builder === 'holds' ? (0, control_1.holdsOf)(s.unitStayId).filter((h) => h.status === 'ACTIVE').map((h) => (0, control_1.holdTypeName)(h.holdTypeCode)).join(', ') : (s.customsStatus ?? '').toLowerCase().replace('_', ' '), days: s.unitSummary.dwellDays ?? 0 })) };
        }
        case 'dwell':
        case 'accrued':
        case 'ageing':
        case 'revenue':
        case 'waivers': {
            const list = partyId ? cust.filter((p) => p.partyId === partyId) : cust;
            const money_ = rp_.builder !== 'dwell';
            const cols = rp_.builder === 'dwell'
                ? [{ key: 'name', label: 'Customer' }, { key: 'units', label: 'Units', num: true }, { key: 'avg', label: 'Average days', num: true }, { key: 'max', label: 'Longest', num: true }]
                : rp_.builder === 'ageing'
                    ? [{ key: 'name', label: 'Customer' }, { key: 'cur', label: 'Current', num: true }, { key: 'd30', label: '1–30', num: true }, { key: 'd60', label: '31–60', num: true }, { key: 'd90', label: 'Over 60', num: true }, { key: 'tot', label: 'Total USD', num: true }]
                    : [{ key: 'name', label: 'Customer' }, { key: 'storage', label: 'Storage USD', num: true }, { key: 'handling', label: 'Handling USD', num: true }, { key: 'other', label: 'Other USD', num: true }, { key: 'tot', label: 'Total USD', num: true }];
            const rows = list.map((p) => {
                if (!money_)
                    return { name: p.partyName, units: ri(3, 60), avg: round1(4 + r() * 12), max: ri(14, 48) };
                if (rp_.builder === 'ageing') {
                    const a = [ri(0, 9000), ri(0, 6000), ri(0, 3000), ri(0, 1500)];
                    return { name: p.partyName, cur: a[0].toLocaleString(), d30: a[1].toLocaleString(), d60: a[2].toLocaleString(), d90: a[3].toLocaleString(), tot: (a[0] + a[1] + a[2] + a[3]).toLocaleString() };
                }
                const a = [ri(500, 14000), ri(300, 9000), ri(0, 2000)];
                return { name: p.partyName, storage: a[0].toLocaleString(), handling: a[1].toLocaleString(), other: a[2].toLocaleString(), tot: (a[0] + a[1] + a[2]).toLocaleString() };
            });
            return { cols, rows, total: rows.length };
        }
        default: {
            const rows = gate_1.visits.slice(0, 9).map((v) => ({ ref: v.visitNo, plate: v.plateNo ?? '', who: v.transporter, when: v.arrivedAt ? new Date(v.arrivedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' }) : '—', status: (v.status ?? '').toLowerCase().replace('_', ' '), mins: v.waitingMin }));
            return { total: 214, rows, cols: [{ key: 'ref', label: 'Reference' }, { key: 'plate', label: 'Truck' }, { key: 'who', label: 'Transporter' }, { key: 'when', label: 'Arrived' }, { key: 'status', label: 'Status' }, { key: 'mins', label: 'Minutes', num: true }] };
        }
    }
}
exports.savedReports = [
    { savedReportId: 51, reportCode: 'OPS_DWELL', reportName: 'Weekly dwell by customer (DAR1)', isShared: true, siteId: 1, parameters: { range: 'last 7 days' }, scheduleCron: '0 7 * * 1', scheduleText: 'Every Monday 07:00', format: 'XLSX', recipients: 'ops-managers@ngicd.example, daniel.k@ngicd.example', isActive: true, nextRunAt: (0, gen_1.at)(-5 * 24 + 3.5), lastRunAt: (0, gen_1.at)(2 * 24 + 3.5), lastStatus: 'DONE', owner: 'Ops · Daniel K.' },
    { savedReportId: 52, reportCode: 'FIN_AGEING', reportName: 'Debtors ageing for finance meeting', isShared: true, siteId: 1, scheduleCron: '0 7 * * 1', scheduleText: 'Every Monday 07:00', format: 'PDF', recipients: 'finance@ngicd.example', isActive: true, nextRunAt: (0, gen_1.at)(-5 * 24 + 3.5), lastRunAt: (0, gen_1.at)(2 * 24 + 3.5), lastStatus: 'DONE', owner: 'Finance · Joseph N.' },
    { savedReportId: 53, reportCode: 'CUS_HOLDS', reportName: 'Open holds, Kilele units', isShared: false, siteId: 1, parameters: { customer: 2 }, scheduleCron: '30 6 * * *', scheduleText: 'Every day 06:30', format: 'XLSX', recipients: 'grace.p@ngicd.example', isActive: true, nextRunAt: (0, gen_1.at)(-20), lastRunAt: (0, gen_1.at)(4), lastStatus: 'DONE', owner: 'Customer service · Grace P.' },
    { savedReportId: 54, reportCode: 'FIN_VFD', reportName: 'Failed fiscal receipts', isShared: true, scheduleCron: '0 18 * * *', scheduleText: 'Every day 18:00', format: 'XLSX', recipients: 'billing@ngicd.example', isActive: true, nextRunAt: (0, gen_1.at)(-7.5), lastRunAt: (0, gen_1.at)(16.5), lastStatus: 'FAILED', owner: 'Billing · Amina S.' },
    { savedReportId: 55, reportCode: 'OPS_GATE', reportName: 'Gate register, last month', isShared: false, siteId: 1, parameters: { range: 'Sep 2026' }, isActive: true, owner: 'Ops · Daniel K.' },
];
exports.exportLog = [
    { id: 1, reportName: 'Units in yard (stock list)', format: 'XLSX', by: 'Ops · Daniel K.', at: (0, gen_1.at)(1.2), rows: 342, params: 'DAR1 · all customers', device: 'OFFICE-PC-04' },
    { id: 2, reportName: 'Debtors ageing', format: 'PDF', by: 'Finance · Joseph N.', at: (0, gen_1.at)(3.4), rows: 11, params: 'DAR1 · all customers', device: 'OFFICE-PC-09' },
    { id: 3, reportName: 'Active holds and exams', format: 'XLSX', by: 'Customer service · Grace P.', at: (0, gen_1.at)(4), rows: 38, params: 'DAR1 · Kilele Clearing & Forwarding', device: 'Scheduled job' },
    { id: 4, reportName: 'Revenue by charge', format: 'XLSX', by: 'Finance · Joseph N.', at: (0, gen_1.at)(26), rows: 11, params: '1–30 Sep · DAR1', device: 'OFFICE-PC-09' },
    { id: 5, reportName: 'Gate in and out register', format: 'PDF', by: 'Auditor · Esther W.', at: (0, gen_1.at)(49), rows: 1204, params: '1–30 Sep · DAR1', device: 'OFFICE-PC-12' },
];
/* ================================================================== forecasts */
exports.MODEL_VERSIONS = [
    { mlModelVersionId: 31, modelCode: 'OCC_FORECAST', name: 'Occupancy forecast', versionLabel: 'occ-2026.09.2', trainedAt: (0, gen_1.at)(9 * 24), isActive: true, metrics: { mae_pct: 3.1, coverage_80: 0.83 }, metricText: 'Off by 3.1 points on average; 83% of actuals inside the band' },
    { mlModelVersionId: 32, modelCode: 'DWELL', name: 'Dwell prediction', versionLabel: 'dwell-2026.09.1', trainedAt: (0, gen_1.at)(16 * 24), isActive: true, metrics: { mae_days: 1.8, p90_coverage: 0.88 }, metricText: 'Off by 1.8 days on average; 88% leave before the p90 date' },
    { mlModelVersionId: 33, modelCode: 'ALLOC', name: 'Slot suggestion', versionLabel: 'alloc-rules-1.4 + ml-2026.08', trainedAt: (0, gen_1.at)(40 * 24), isActive: true, metrics: { rank1_rate: 0.74, reshuffles_saved: 0.21 }, metricText: '74% of moves use rank 1; 21% fewer reshuffles than rules alone' },
    { mlModelVersionId: 29, modelCode: 'OCC_FORECAST', name: 'Occupancy forecast', versionLabel: 'occ-2026.08.1', trainedAt: (0, gen_1.at)(41 * 24), isActive: false, metrics: { mae_pct: 4.0 }, metricText: 'Retired 28 Sep; off by 4.0 points' },
];
exports.forecastDates = Array.from({ length: 14 }, (_, i) => (0, gen_1.day)(i + 1));
function occupancyForecast(siteId, block) {
    const occ = occupancyFor(siteId);
    const sel = block === 'ALL' ? occ : occ.filter((o) => o.fullCode === block);
    const usable = sel.reduce((a, o) => a + o.usableSlots, 0);
    const now = (sel.reduce((a, o) => a + o.occupiedSlots, 0) / Math.max(1, usable)) * 100;
    seed = 300 + siteId * 31 + (block === 'ALL' ? 0 : block.charCodeAt(0));
    // Vessel Cape Albatross arrives in ~30 h: imports rise days 2–5, then ease off.
    const bump = [1, 4, 7, 9, 10, 9, 7, 6, 4, 3, 2, 2, 1, 0];
    return exports.forecastDates.map((d, i) => {
        const p = Math.min(99, Math.max(5, now + bump[i] * (siteId === 1 ? 1 : 0.6) + (r() - 0.5) * 3));
        const spread = 2 + i * 0.7;
        return {
            siteId, fullCode: block === 'ALL' ? undefined : block, forecastDate: d, predictedPct: String(Math.round(p)),
            lowerPct: String(Math.max(0, Math.round(p - spread))), upperPct: String(Math.min(100, Math.round(p + spread))), modelVersion: 'occ-2026.09.2',
        };
    });
}
function dwellPredictions(siteId) {
    seed = 777 + siteId;
    return (0, core_1.staysAt)(siteId).filter((s) => s.physicalStatus === 'IN_YARD' && s.fullEmpty === 'F').slice(0, 24).map((s) => {
        const so = s.unitSummary.dwellDays ?? 0;
        const p50 = round1(so + 1 + r() * (s.customsStatus === 'CLEARED' ? 3 : 9));
        const p90 = round1(p50 + 2 + r() * 6);
        const toDate = (days) => new Date(Date.parse(s.storageStartAt ?? (0, gen_1.at)(0)) + days * 86400000).toISOString().slice(0, 10);
        return {
            unitStayId: s.unitStayId, stay: s, daysSoFar: so, p50Days: String(p50), p90Days: String(p90),
            predictedExitDate: toDate(p50), p90Date: toDate(p90), passesFree: !!s.freeUntil && toDate(p50) > s.freeUntil.slice(0, 10),
            modelVersion: 'dwell-2026.09.1', predictedAt: (0, gen_1.at)(4.5),
        };
    }).sort((a, b) => Number(b.p50Days) - Number(a.p50Days));
}
const OVERRIDES = ['Reach stacker cannot reach row 5 while RS-02 works B', 'Customer collects today: kept near the gate', 'Suggested stack has a reefer cable across it', 'Block A row 2 closed for paving', 'Grouped with the same BL for exam'];
exports.suggestionLog = (() => {
    seed = 1234;
    const inYard = core_1.allStays.filter((s) => s.siteId === 1 && s.currentLocation && s.cargoUnit.category === 'CONTAINER').slice(0, 40);
    return inYard.map((s, i) => {
        const ranked = r();
        const chosenRank = ranked < 0.74 ? 1 : ranked < 0.88 ? 2 : ranked < 0.93 ? 3 : null;
        const loc = s.currentLocation.fullCode;
        const top = chosenRank === 1 ? loc : `${loc.slice(0, 1)}-0${ri(1, 5)}-${String(ri(1, 10)).padStart(2, '0')}-${ri(1, 3)}`;
        return {
            yardSuggestionLogId: 6000 + i, unitStayId: s.unitStayId, unitNo: s.cargoUnit.unitNo, engine: i % 3 === 0 ? 'RULES' : 'ML', chosenRank,
            overrideReason: chosenRank === 1 ? null : rp(OVERRIDES), suggestedAt: (0, gen_1.at)(0.3 + i * 1.7), top, chosen: loc,
            by: rp(['Yard · Ibrahim N.', 'Yard · Kassim O.', 'Yard · Neema M.']),
        };
    });
})();
exports.AUDIT_USERS = ['Gate · Hamisi J.', 'Gate · Rose A.', 'Doc & clearance · Rehema K.', 'Billing · Amina S.', 'Finance · Joseph N.', 'Ops · Daniel K.', 'Cashier · Mary T.', 'Yard · Ibrahim N.', 'Customer service · Grace P.', 'Admin · Felix M.'];
exports.auditLog = (() => {
    const H = core_1.HERO;
    const base = [
        { occurredAt: (0, gen_1.at)(0.3), userSub: 'u-hamisi', userName: 'Gate · Hamisi J.', deviceId: 12, ipAddress: '10.20.1.31', siteId: 1, entityName: 'approval_request', entityId: '9003', action: 'CREATE', source: 'EDGE', summary: 'Asked to let T 902 DMB leave with seal mismatch', reason: 'Seal number on paper EIR mistyped', changes: [{ field: 'status', old: null, new: 'PENDING' }, { field: 'permissionCode', old: null, new: 'gate.checkout.override' }], to: '/approvals' },
        { occurredAt: (0, gen_1.at)(0.4), userSub: 'u-hamisi', userName: 'Gate · Hamisi J.', deviceId: 12, ipAddress: '10.20.1.31', siteId: 1, entityName: 'truck_visit', entityId: '4410', action: 'UPDATE', source: 'EDGE', summary: 'Inner gate in failed: seal mismatch', changes: [{ field: 'status', old: 'ADMITTED', new: 'HELD' }, { field: 'sealFound', old: null, new: 'ML-7781208' }], to: '/gate/visits/4410' },
        { occurredAt: (0, gen_1.at)(1.2), userSub: 'u-daniel', userName: 'Ops · Daniel K.', ipAddress: '10.20.0.44', siteId: 1, entityName: 'report_run', entityId: '88120', action: 'EXPORT', source: 'UI', summary: 'Exported "Units in yard (stock list)" to Excel, 342 rows', changes: [{ field: 'format', old: null, new: 'XLSX' }, { field: 'parameters', old: null, new: 'site=DAR1' }] },
        { occurredAt: (0, gen_1.at)(2.6), userSub: 'u-ibrahim', userName: 'Yard · Ibrahim N.', deviceId: 31, ipAddress: '10.20.3.17', siteId: 1, entityName: 'move_order', entityId: '33021', action: 'OVERRIDE', source: 'EDGE', summary: 'Placed at a slot other than the suggestion', reason: 'Customer collects today: kept near the gate', changes: [{ field: 'toLocation', old: 'A-04-09-2', new: 'A-01-02-1' }, { field: 'suggestionRank', old: 1, new: 3 }] },
        { occurredAt: (0, gen_1.at)(3), userSub: 'u-amina', userName: 'Billing · Amina S.', ipAddress: '10.20.0.52', siteId: 1, entityName: 'approval_request', entityId: '9001', action: 'CREATE', source: 'UI', summary: `Asked to waive 4 storage days on ${H.cargoUnit.unitNo}`, reason: 'Customs exam delayed by the authority', changes: [{ field: 'amount', old: null, new: 'USD 64.00' }], to: '/approvals' },
        { occurredAt: (0, gen_1.at)(3.1), userSub: 'system', userName: 'Release engine', siteId: 1, entityName: 'truck_visit', entityId: '4402', action: 'UPDATE', source: 'JOB', summary: 'Gate-out refused: release order expired', changes: [{ field: 'status', old: 'WORKING', new: 'REJECTED' }, { field: 'RELEASE_VALID', old: 'PASS', new: 'FAIL' }] },
        { occurredAt: (0, gen_1.at)(4), userSub: 'sync', userName: 'Lane 2 tablet sync', deviceId: 14, siteId: 1, entityName: 'unit_stay', entityId: String(core_1.allStays[12].unitStayId), action: 'SYNC', source: 'SYNC', summary: 'Offline gate-out synced; conflicts with a line hold', changes: [{ field: 'physicalStatus', old: 'IN_YARD', new: 'DEPARTED' }, { field: 'capturedOfflineAt', old: null, new: '07 Oct 06:12' }], to: `/units/${core_1.allStays[12].unitStayId}` },
        { occurredAt: (0, gen_1.at)(4.5), userSub: 'aiva', userName: 'Aiva for Grace P.', siteId: 1, entityName: 'service_request', entityId: '7104', action: 'CREATE', source: 'AIVA', summary: 'Drafted reply to Kilele about free-day extension (sent by Grace P.)', changes: [{ field: 'status', old: 'SUBMITTED', new: 'IN_REVIEW' }] },
        { occurredAt: (0, gen_1.at)(5.2), userSub: 'u-mary', userName: 'Cashier · Mary T.', deviceId: 21, ipAddress: '10.20.0.61', siteId: 1, entityName: 'payment', entityId: '55102', action: 'CREATE', source: 'UI', summary: 'Recorded M-Pesa payment TZS 1,180,000 from Mzizi Traders', changes: [{ field: 'method', old: null, new: 'MPESA' }, { field: 'amount', old: null, new: 'TZS 1,180,000' }, { field: 'reference', old: null, new: 'QJK7H2LM0P' }] },
        { occurredAt: (0, gen_1.at)(6), userSub: 'u-amina', userName: 'Billing · Amina S.', ipAddress: '10.20.0.52', siteId: 1, entityName: 'invoice', entityId: '3318', action: 'PRINT', source: 'UI', summary: 'Printed tax invoice INV-DAR1-26-003318', changes: [{ field: 'copyNo', old: 1, new: 2 }] },
        { occurredAt: (0, gen_1.at)(8), userSub: 'u-joseph', userName: 'Finance · Joseph N.', ipAddress: '10.20.0.58', siteId: 1, entityName: 'approval_request', entityId: '9002', action: 'APPROVE', source: 'UI', summary: 'Approved level 1 of credit note USD 1,240', reason: 'Checked against plug log', changes: [{ field: 'currentLevel', old: 0, new: 1 }] },
        { occurredAt: (0, gen_1.at)(20), userSub: 'u-felix', userName: 'Admin · Felix M.', ipAddress: '10.20.0.10', siteId: 1, entityName: 'tariff', entityId: 'STORAGE-40', action: 'UPDATE', source: 'UI', summary: 'Changed storage rate for 40 ft after day 7 (approval APR-26-00377)', changes: [{ field: 'unitRate', old: '14.00', new: '16.00' }, { field: 'validFrom', old: '2026-01-01', new: '2026-10-01' }] },
        { occurredAt: (0, gen_1.at)(22), userSub: 'u-rehema', userName: 'Doc & clearance · Rehema K.', ipAddress: '10.20.0.47', siteId: 1, entityName: 'release_order', entityId: '802', action: 'APPROVE', source: 'UI', summary: 'Approved release order RO-DAR1-26-01943', changes: [{ field: 'status', old: 'PENDING_CHECKS', new: 'APPROVED' }, { field: 'validTo', old: null, new: '09 Oct 12:30' }] },
        { occurredAt: (0, gen_1.at)(26), userSub: 'u-juma', userName: 'Inspection · Juma M.', deviceId: 33, siteId: 1, entityName: 'hold', entityId: '703', action: 'CREATE', source: 'EDGE', summary: 'Placed damage hold (side panel)', reason: 'Side panel damage, surveyor appointed', changes: [{ field: 'holdTypeCode', old: null, new: 'DAMAGE' }, { field: 'status', old: null, new: 'ACTIVE' }] },
        { occurredAt: (0, gen_1.at)(30), userSub: 'u-rehema', userName: 'Doc & clearance · Rehema K.', ipAddress: '10.20.0.47', siteId: 1, entityName: 'hold', entityId: '701', action: 'CREATE', source: 'UI', summary: `Placed customs exam hold on ${H.cargoUnit.unitNo}`, reason: 'Physical examination ordered on entry lodgement', changes: [{ field: 'authorityRef', old: null, new: 'EXN/DSM/26/04418' }], to: `/units/${H.unitStayId}` },
        { occurredAt: (0, gen_1.at)(33), userSub: 'ng-sync', userName: 'NG sync', siteId: 1, entityName: 'party', entityId: '2', action: 'SYNC', source: 'SYNC', summary: 'Kilele Clearing & Forwarding credit limit updated from NG', changes: [{ field: 'creditLimit', old: '35000.00', new: '40000.00' }], to: '/parties/2' },
        { occurredAt: (0, gen_1.at)(44), userSub: 'u-daniel', userName: 'Ops · Daniel K.', ipAddress: '10.20.0.44', siteId: 1, entityName: 'approval_request', entityId: '9005', action: 'APPROVE', source: 'UI', summary: 'Approved +3 free days for Zamlink transit units', changes: [{ field: 'status', old: 'PENDING', new: 'APPROVED' }] },
        { occurredAt: (0, gen_1.at)(49), userSub: 'u-esther', userName: 'Auditor · Esther W.', ipAddress: '10.20.0.71', siteId: 1, entityName: 'report_run', entityId: '88097', action: 'EXPORT', source: 'UI', summary: 'Exported "Gate in and out register" to PDF, 1,204 rows', changes: [{ field: 'format', old: null, new: 'PDF' }] },
        { occurredAt: (0, gen_1.at)(52), userSub: 'u-hamisi', userName: 'Gate · Hamisi J.', deviceId: 12, siteId: 1, entityName: 'party', entityId: '13', action: 'CREATE', source: 'EDGE', summary: 'Created provisional party Tanzanite Pharma Distributors at the gate', changes: [{ field: 'partyName', old: null, new: 'Tanzanite Pharma Distributors' }, { field: 'syncStatus', old: null, new: 'PROVISIONAL' }], to: '/parties/13' },
        { occurredAt: (0, gen_1.at)(60), userSub: 'u-joseph', userName: 'Finance · Joseph N.', ipAddress: '10.20.0.58', siteId: 1, entityName: 'approval_request', entityId: '9006', action: 'REJECT', source: 'UI', summary: 'Rejected refund USD 620 to Pwani Hardware', reason: 'Allocate to open invoice instead', changes: [{ field: 'status', old: 'PENDING', new: 'REJECTED' }] },
        { occurredAt: (0, gen_1.at)(70), userSub: 'u-felix', userName: 'Admin · Felix M.', ipAddress: '10.20.0.10', entityName: 'user', entityId: 'u-mary', action: 'UPDATE', source: 'UI', summary: 'Gave Mary T. the cashier role at DAR2', changes: [{ field: 'roles@DAR2', old: '[]', new: '["CASHIER"]' }] },
        { occurredAt: (0, gen_1.at)(71), userSub: 'u-daniel', userName: 'Ops · Daniel K.', ipAddress: '10.20.0.44', siteId: 1, entityName: 'unit_stay', entityId: String(H.unitStayId), action: 'VIEW_SENSITIVE', source: 'UI', summary: 'Opened customs valuation documents', changes: [] },
        { occurredAt: (0, gen_1.at)(90), userSub: 'api-kilele', userName: 'Kilele API key', siteId: 1, entityName: 'appointment', entityId: '4120', action: 'CREATE', source: 'API', summary: 'Booked truck appointment APT-26-04120 via API', changes: [{ field: 'slotStart', old: null, new: '08 Oct 08:00' }] },
    ];
    return base.map((e, i) => ({ ...e, auditLogId: 990000 - i }));
})();
exports.AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'OVERRIDE', 'PRINT', 'EXPORT', 'SYNC', 'VIEW_SENSITIVE', 'LOGIN'];
exports.AUDIT_SOURCES = [['UI', 'Screen'], ['EDGE', 'Gate or yard device'], ['API', 'API'], ['SYNC', 'Sync'], ['JOB', 'Scheduled job'], ['AIVA', 'Aiva']];
exports.invoices = (() => {
    seed = 5150;
    const out = [];
    let n = 3290;
    for (const p of cust) {
        const count = p.partyId === 2 ? 8 : ri(1, 4);
        for (let i = 0; i < count; i++) {
            const cons = core_1.consignments.find((c) => c.billToPartyId === p.partyId);
            const subtotal = ri(180, 4200);
            const tax = subtotal * 0.18;
            const total = subtotal + tax;
            const statusPick = p.syncStatus !== 'SYNCED' ? 'DRAFT' : i === 0 && p.partyId === 2 ? 'ISSUED' : rp(['POSTED', 'PAID', 'PAID', 'PART_PAID', 'POSTED']);
            const paid = statusPick === 'PAID' ? total : statusPick === 'PART_PAID' ? Math.round(total * 0.5) : 0;
            const ago = ri(1, 50);
            out.push({
                invoiceId: ++n, docKind: statusPick === 'ISSUED' || statusPick === 'DRAFT' ? 'PROFORMA' : 'TAX_INVOICE', invoiceNo: `${statusPick === 'ISSUED' || statusPick === 'DRAFT' ? 'PRO' : 'INV'}-DAR1-26-00${n}`, status: statusPick,
                billToPartyId: p.partyId, consignmentId: cons?.consignmentId, consignmentRef: cons?.refNo, currency: 'USD', invoiceDate: (0, gen_1.day)(-ago), dueDate: (0, gen_1.day)(-ago + 14),
                subtotal: (0, gen_1.money)(subtotal), taxTotal: (0, gen_1.money)(tax), total: (0, gen_1.money)(total), amountPaid: (0, gen_1.money)(paid), balance: (0, gen_1.money)(total - paid),
            });
        }
    }
    return out.sort((a, b) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''));
})();
const invoicesOf = (partyId) => exports.invoices.filter((i) => i.billToPartyId === partyId);
exports.invoicesOf = invoicesOf;
const balanceOf = (partyId) => (0, exports.invoicesOf)(partyId).reduce((a, i) => a + Number(i.balance), 0);
exports.balanceOf = balanceOf;
/* ================================================================== portal */
exports.PORTAL_PARTY = 2; // Kilele Clearing & Forwarding
const HOLD_PLAIN = {
    SCAN: ['Customs examination', 'Attend the examination at the time customs set. We move the unit to the exam bay.'],
    CUSTOMS: ['Customs query', 'Answer the customs query on your entry. The hold lifts when customs records the answer.'],
    LINE: ['Shipping line hold', 'Settle with the shipping line and ask them to send us their release.'],
    ICD_COMMERCIAL: ['Unpaid charges', 'Pay the overdue charges. The hold lifts once payment is confirmed.'],
    DAMAGE: ['Damage survey', 'A surveyor is checking the unit. We will contact you with the result.'],
    SECURITY: ['Security check', 'Our security team is checking the unit. Call customer service for details.'],
    COURT: ['Legal order', 'A court or government order stops this unit. Contact the issuing office.'],
};
function plainStatus(s) {
    const hs = (0, control_1.holdsOf)(s.unitStayId).filter((h) => h.status === 'ACTIVE');
    const due = Number(s.accruedCharges?.total ?? 0);
    if (s.physicalStatus === 'DEPARTED')
        return { key: 'collected', label: 'Collected', tone: 'idle', detail: 'Left the depot' };
    if (s.physicalStatus === 'EXPECTED')
        return { key: 'expected', label: 'On the way from port', tone: 'idle', detail: 'We will tell you when it arrives' };
    if (hs.length)
        return { key: 'hold', label: `On hold: ${HOLD_PLAIN[hs[0].holdTypeCode]?.[0].toLowerCase() ?? 'hold'}`, tone: 'stop', detail: HOLD_PLAIN[hs[0].holdTypeCode]?.[1] ?? '' };
    if (s.customsStatus === 'QUERY')
        return { key: 'customs', label: 'Customs query', tone: 'stop', detail: 'Customs needs an answer from you' };
    if (s.customsStatus !== 'CLEARED' && s.customsStatus !== 'NOT_REQUIRED')
        return { key: 'customs', label: 'Waiting for customs', tone: 'customs', detail: s.customsStatus === 'UNDER_EXAM' ? 'Under examination' : s.customsStatus === 'NOT_LODGED' ? 'Entry not lodged yet' : 'Entry lodged, not yet released' };
    if (s.billingStatus === 'ACCRUING' || s.billingStatus === 'PROFORMA')
        return { key: 'charges', label: `Charges due USD ${due.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, tone: 'wait', detail: 'Pay to get your delivery order' };
    if (s.releaseStatus === 'APPROVED')
        return { key: 'ready', label: 'Ready to collect', tone: 'go', detail: 'Book a truck and bring the delivery order' };
    if (s.releaseStatus === 'REQUESTED')
        return { key: 'request', label: 'Delivery order being prepared', tone: 'wait', detail: 'Usually within 2 working hours' };
    return { key: 'request', label: 'Ready to request delivery', tone: 'wait', detail: 'Customs cleared and charges settled' };
}
/** Customer wording for the release conditions from evaluate(). */
function whyCantCollect(s) {
    const checks = (0, control_1.evaluate)(s, 'PREVIEW');
    const hs = (0, control_1.holdsOf)(s.unitStayId).filter((h) => h.status === 'ACTIVE');
    const total = Number(s.accruedCharges?.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    return checks.filter((c) => c.conditionCode !== 'IDENTITY').map((c) => {
        const pass = c.result === 'PASS';
        switch (c.conditionCode) {
            case 'NO_HOLD': return pass ? { code: c.conditionCode, ok: true, title: 'No holds on the unit', detail: 'Nothing is stopping it from our side' }
                : { code: c.conditionCode, ok: false, title: `There is a hold: ${hs.map((h) => HOLD_PLAIN[h.holdTypeCode]?.[0] ?? h.holdTypeCode).join(', ').toLowerCase()}`, detail: hs.map((h) => HOLD_PLAIN[h.holdTypeCode]?.[1]).join(' '), next: 'contact' };
            case 'CUSTOMS': return pass ? { code: c.conditionCode, ok: true, title: 'Customs has released it', detail: 'Release recorded' }
                : { code: c.conditionCode, ok: false, title: 'Customs has not released it yet', detail: s.customsStatus === 'UNDER_EXAM' ? 'It is under examination. When customs records the result we update this page.' : s.customsStatus === 'QUERY' ? 'Customs raised a query on your entry. Answer it with customs.' : s.customsStatus === 'NOT_LODGED' ? 'No customs entry is recorded yet. Lodge the entry and send us the number.' : 'The entry is lodged and waiting for customs release.', next: s.customsStatus === 'NOT_LODGED' ? 'request' : undefined };
            case 'COMMERCIAL': return pass ? { code: c.conditionCode, ok: true, title: s.billingStatus === 'CREDIT' ? 'Charges go on your credit account' : 'Charges are paid', detail: s.billingStatus === 'CREDIT' ? 'Within your credit limit' : 'Paid up to the planned collection date' }
                : { code: c.conditionCode, ok: false, title: `Charges of USD ${total} are unpaid`, detail: 'Storage keeps adding up each day after free time. Pay now or ask for more free days if the delay was not yours.', next: 'pay' };
            case 'RELEASE_VALID': return s.releaseStatus === 'APPROVED' ? { code: c.conditionCode, ok: true, title: 'Delivery order is valid', detail: c.detail ?? '' }
                : { code: c.conditionCode, ok: false, title: s.releaseStatus === 'REQUESTED' ? 'Delivery order is being prepared' : 'No delivery order yet', detail: s.releaseStatus === 'REQUESTED' ? 'We check customs and charges, then issue it. Usually within 2 working hours.' : 'Request delivery once customs has released and charges are paid.', next: s.releaseStatus === 'REQUESTED' ? undefined : 'request' };
            case 'PHYSICAL': return pass ? { code: c.conditionCode, ok: true, title: 'The unit is in our yard', detail: 'Ready to load when the truck arrives' }
                : { code: c.conditionCode, ok: false, title: s.physicalStatus === 'EXPECTED' ? 'Not arrived from port yet' : 'At an activity (exam or inspection)', detail: 'We will tell you when it is back in the yard.' };
            case 'COLLECTOR': return { code: c.conditionCode, ok: null, title: 'Truck and driver must match the delivery order', detail: 'Checked at the gate. Book an appointment to skip the queue.', next: 'book' };
            default: return { code: c.conditionCode, ok: null, title: 'Vehicle keys are handed over at the gate', detail: c.detail ?? '' };
        }
    }).filter((w) => !(w.code === 'KEYS' && s.cargoUnit.category !== 'VEHICLE'));
}
const portalUnits = (partyId) => core_1.allStays.filter((s) => {
    const c = core_1.consignments.find((k) => k.consignmentId === s.consignmentId);
    return c && (c.agentPartyId === partyId || c.consigneePartyId === partyId || c.billToPartyId === partyId);
});
exports.portalUnits = portalUnits;
exports.appointments = [
    { appointmentId: 4120, appointmentNo: 'APT-26-04120', visitTypeCode: 'IMPORT_PICKUP', slotStart: '2026-10-08T05:00:00Z', slotEnd: '2026-10-08T06:00:00Z', transporterPartyId: 7, status: 'BOOKED', bookedVia: 'API', plate: 'T 412 DKL', driver: 'Baraka Mwita', unitNos: [core_1.HERO.cargoUnit.unitNo], releaseNo: 'RO-DAR1-26-01942', consignmentId: 101 },
    { appointmentId: 4117, appointmentNo: 'APT-26-04117', visitTypeCode: 'IMPORT_PICKUP', slotStart: '2026-10-07T08:00:00Z', slotEnd: '2026-10-07T09:00:00Z', transporterPartyId: 8, status: 'BOOKED', bookedVia: 'PORTAL', plate: 'T 118 DPE', driver: 'Said Omari', unitNos: [control_1.releaseOrders[1]?.units?.[0]?.unitNo ?? ''], releaseNo: control_1.releaseOrders[1]?.releaseNo },
    { appointmentId: 4109, appointmentNo: 'APT-26-04109', visitTypeCode: 'VEHICLE_DELIVERY', slotStart: '2026-10-07T06:00:00Z', slotEnd: '2026-10-07T07:00:00Z', transporterPartyId: 8, status: 'ARRIVED', bookedVia: 'PORTAL', truckVisitId: 4416, plate: 'T 340 DRC', driver: 'Abdul Kombo', unitNos: [], consignmentId: 105 },
    { appointmentId: 4098, appointmentNo: 'APT-26-04098', visitTypeCode: 'IMPORT_PICKUP', slotStart: '2026-10-06T07:00:00Z', slotEnd: '2026-10-06T08:00:00Z', transporterPartyId: 7, status: 'MISSED', bookedVia: 'PORTAL', plate: 'T 655 DQA', driver: 'Hassan Ali', unitNos: [] },
];
/** Slots for the next days: capacity per hour and how many are booked. */
function slotsFor(dateIso) {
    seed = 60 + Number(dateIso.slice(-2));
    return [7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((h) => {
        const capacity = h === 12 ? 4 : 8;
        const booked = Math.min(capacity, ri(h < 10 ? 5 : 1, capacity));
        const start = new Date(`${dateIso}T${String(h).padStart(2, '0')}:00:00+03:00`).toISOString();
        const end = new Date(`${dateIso}T${String(h + 1).padStart(2, '0')}:00:00+03:00`).toISOString();
        return { slotStart: start, slotEnd: end, capacity, booked, available: capacity - booked };
    });
}
exports.portalDocs = [
    { documentId: 1, docTypeCode: 'RELEASE_ORDER', entityName: 'release_order', entityId: 801, title: 'Delivery order', ref: 'RO-DAR1-26-01942', fileName: 'RO-DAR1-26-01942.pdf', sizeBytes: 88_000, capturedAt: (0, gen_1.at)(5), status: 'PENDING_APPROVAL' },
    { documentId: 2, docTypeCode: 'TAX_INVOICE', entityName: 'invoice', entityId: exports.invoices.find((i) => i.billToPartyId === 2 && i.docKind === 'TAX_INVOICE')?.invoiceId ?? 0, title: 'Tax invoice', ref: exports.invoices.find((i) => i.billToPartyId === 2 && i.docKind === 'TAX_INVOICE')?.invoiceNo ?? '', fileName: 'invoice.pdf', sizeBytes: 124_000, capturedAt: (0, gen_1.at)(30), status: 'ACTIVE' },
    { documentId: 3, docTypeCode: 'EIR', entityName: 'unit_stay', entityId: core_1.HERO.unitStayId, title: 'Interchange receipt (EIR), gate-in', ref: `EIR-DAR1-26-${core_1.HERO.unitStayId}`, fileName: 'eir.pdf', sizeBytes: 310_000, capturedAt: core_1.HERO.gatedInAt, status: 'ACTIVE' },
    { documentId: 4, docTypeCode: 'GATE_PASS', entityName: 'truck_visit', entityId: 4414, title: 'Gate pass', ref: 'GP-26-08811', fileName: 'gatepass.pdf', sizeBytes: 64_000, capturedAt: (0, gen_1.at)(0.1), status: 'ACTIVE' },
    { documentId: 5, docTypeCode: 'STATEMENT', entityName: 'party', entityId: 2, title: 'Statement of account, September', ref: 'STM-C-KILELE-2026-09', fileName: 'statement.pdf', sizeBytes: 140_000, capturedAt: (0, gen_1.at)(6 * 24), status: 'ACTIVE' },
    { documentId: 6, docTypeCode: 'DAMAGE_REPORT', entityName: 'inspection', entityId: 1201, title: 'Damage report with photos', ref: 'DMG-DAR1-26-0311', fileName: 'damage.pdf', sizeBytes: 2_400_000, capturedAt: (0, gen_1.at)(26), status: 'ACTIVE' },
];
exports.SR_KINDS = {
    DELIVERY: { label: 'Delivery', slaHours: 4 }, EMPTY_RETURN: { label: 'Empty return', slaHours: 8 }, DOCUMENT_SUBMISSION: { label: 'Document', slaHours: 8 },
    FREE_DAY_EXTENSION: { label: 'Free-day extension', slaHours: 24 }, INVOICE_QUERY: { label: 'Invoice query', slaHours: 48 }, DAMAGE_CLAIM: { label: 'Damage claim', slaHours: 72 },
    COMPLAINT: { label: 'Complaint', slaHours: 24 }, OTHER: { label: 'Other', slaHours: 48 },
};
const sr = (id, kind, partyId, hrs, status, subject, details, o = {}) => ({
    serviceRequestId: id, requestNo: `SR-26-0${id}`, requestKind: kind, partyId, partyName: core_1.parties.find((p) => p.partyId === partyId).partyName,
    subject, details, status, createdAt: (0, gen_1.at)(hrs), slaDueAt: (0, gen_1.at)(hrs - exports.SR_KINDS[kind].slaHours),
    messages: [{ from: 'customer', who: o.createdBy ?? 'Kilele · Agnes M.', at: (0, gen_1.at)(hrs), text: details }], ...o,
});
const unitA = core_1.allStays.filter((s) => s.consignmentId === 103 && s.physicalStatus === 'IN_YARD');
exports.serviceRequests = [
    sr(7104, 'FREE_DAY_EXTENSION', 2, 26, 'IN_REVIEW', '+3 free days for Zamlink transit units', 'Tunduma border was closed 3–5 Oct; trucks could not leave. Letter from the border office attached. Please extend free time for the 6 units on IOSL0926S0441.', { consignmentId: 103, consignmentRef: 'IOSL0926S0441', assignedTo: 'Grace P.', payload: { days: 3, units: 6 },
        messages: [
            { from: 'customer', who: 'Kilele · Agnes M.', at: (0, gen_1.at)(26), text: 'Tunduma border was closed 3–5 Oct; trucks could not leave. Letter from the border office attached. Please extend free time for the 6 units on IOSL0926S0441.' },
            { from: 'staff', who: 'Customer service · Grace P.', at: (0, gen_1.at)(4.5), text: 'Thank you Agnes. We have the letter. The extension needs approval from operations; we will reply today.' },
        ] }),
    sr(7111, 'DELIVERY', 2, 1.5, 'SUBMITTED', `Deliver ${core_1.HERO.cargoUnit.unitNo} to Mzizi warehouse, Mikocheni`, 'Please arrange delivery after the exam today. Truck T 412 DKL booked for tomorrow 08:00.', { consignmentId: 101, consignmentRef: 'BMLU2409881', unitStayId: core_1.HERO.unitStayId, unitNo: core_1.HERO.cargoUnit.unitNo }),
    sr(7110, 'INVOICE_QUERY', 2, 6, 'NEEDS_INFO', 'Reefer plug-in charged twice on PRO invoice', 'Plug-in for 6 reefer units appears twice. Please correct.', { consignmentId: 108, consignmentRef: 'BMLU2410017', assignedTo: 'Amina S.',
        messages: [
            { from: 'customer', who: 'Kilele · Agnes M.', at: (0, gen_1.at)(6), text: 'Plug-in for 6 reefer units appears twice. Please correct.' },
            { from: 'staff', who: 'Billing · Amina S.', at: (0, gen_1.at)(3), text: 'Which invoice number? We see two invoices for this BL.' },
        ] }),
    sr(7108, 'DOCUMENT_SUBMISSION', 2, 9, 'APPROVED', 'Customs release for BMLU2409902', 'Attached customs release REL-DSM-26-31007.', { consignmentId: 102, consignmentRef: 'BMLU2409902', assignedTo: 'Rehema K.', respondedAt: (0, gen_1.at)(7), resultEntity: 'customs_ref', resultId: 5,
        messages: [
            { from: 'customer', who: 'Kilele · Agnes M.', at: (0, gen_1.at)(9), text: 'Attached customs release REL-DSM-26-31007.' },
            { from: 'staff', who: 'Doc & clearance · Rehema K.', at: (0, gen_1.at)(7), text: 'Recorded. Customs is now cleared on both units.' },
        ] }),
    sr(7106, 'DAMAGE_CLAIM', 1, 30, 'IN_REVIEW', 'Dent on container door found at our warehouse', 'Door dent and broken lock rod found on arrival. Photos attached.', { createdBy: 'Mzizi · Hamida S.', assignedTo: 'Daniel K.', unitStayId: unitA[0]?.unitStayId, unitNo: unitA[0]?.cargoUnit.unitNo }),
    sr(7103, 'DELIVERY', 9, 40, 'CLOSED', 'Transit units to Lusaka: release 4 units', 'Please release 4 units for transit to Lusaka.', { createdBy: 'Zamlink · Mwansa C.', closedAt: (0, gen_1.at)(30) }),
    sr(7101, 'INVOICE_QUERY', 11, 55, 'REJECTED', 'Storage charged during public holiday', 'We think storage should not count on the public holiday.', { createdBy: 'Pwani HW · Peter L.', respondedAt: (0, gen_1.at)(40),
        messages: [
            { from: 'customer', who: 'Pwani HW · Peter L.', at: (0, gen_1.at)(55), text: 'We think storage should not count on the public holiday.' },
            { from: 'staff', who: 'Billing · Amina S.', at: (0, gen_1.at)(40), text: 'Free days are calendar days, Sundays and public holidays included, as in the tariff. The charge stays.' },
        ] }),
    sr(7112, 'EMPTY_RETURN', 3, 0.8, 'SUBMITTED', 'Return 2 empties after unstuffing', 'Two 40 ft empties to return this afternoon.', { createdBy: 'Bahari · Joseph K.' }),
    sr(7109, 'COMPLAINT', 14, 8, 'SUBMITTED', 'Truck waited 2 hours at inner gate', 'Our truck T 771 DGH waited from 07:10 to 09:15 yesterday.', { createdBy: 'Kagera · Ruth N.' }),
];
const CONTACTS = {
    1: [
        { partyContactId: 101, contactName: 'Hamida Salum', jobTitle: 'Import manager', phone: '+255 754 210 401', email: 'hamida@mzizi.example', preferredLanguage: 'en', isPrimary: true, notifyEmail: true, notifySms: true, notifyWhatsapp: false, isActive: true },
        { partyContactId: 102, contactName: 'Omari Juma', jobTitle: 'Accounts', phone: '+255 713 880 221', email: 'accounts@mzizi.example', preferredLanguage: 'sw', isPrimary: false, notifyEmail: true, notifySms: false, notifyWhatsapp: true, isActive: true },
    ],
    2: [
        { partyContactId: 201, contactName: 'Agnes Mollel', jobTitle: 'Operations lead', phone: '+255 765 330 112', email: 'agnes@kilele.example', preferredLanguage: 'en', isPrimary: true, notifyEmail: true, notifySms: true, notifyWhatsapp: true, isActive: true },
        { partyContactId: 202, contactName: 'Baraka Mwita', jobTitle: 'Field clerk', phone: '+255 689 004 551', preferredLanguage: 'sw', isPrimary: false, notifyEmail: false, notifySms: true, notifyWhatsapp: true, isActive: true },
        { partyContactId: 203, contactName: 'Lucy Kimaro', jobTitle: 'Finance', phone: '+255 754 771 090', email: 'finance@kilele.example', preferredLanguage: 'en', isPrimary: false, notifyEmail: true, notifySms: false, notifyWhatsapp: false, isActive: true },
    ],
    13: [
        { partyContactId: 1301, contactName: 'Dr. Salma Nyirenda', jobTitle: 'Logistics', phone: '+255 744 515 300', preferredLanguage: 'sw', isPrimary: true, notifyEmail: false, notifySms: true, notifyWhatsapp: true, isActive: true },
    ],
};
const contactsOf = (partyId) => CONTACTS[partyId] ?? [
    { partyContactId: partyId * 100 + 1, contactName: rp(['Grace Mushi', 'John Mrema', 'Fatma Ally', 'Peter Lyimo', 'Rose Kweka']), jobTitle: 'Operations', phone: `+255 7${ri(10, 89)} ${ri(100, 999)} ${ri(100, 999)}`, email: core_1.parties.find((p) => p.partyId === partyId)?.email ?? undefined, preferredLanguage: rp(['en', 'sw']), isPrimary: true, notifyEmail: true, notifySms: r() < 0.5, notifyWhatsapp: r() < 0.4, isActive: true },
];
exports.contactsOf = contactsOf;
exports.NG_MATCHES = [
    { ngRefId: 'NG-C1188', name: 'Tanzanite Pharmaceutical Distributors Ltd', tin: '134-882-019', city: 'Dar es Salaam', score: 94 },
    { ngRefId: 'NG-C0942', name: 'Tanzanite Pharma (Arusha)', tin: '127-110-443', city: 'Arusha', score: 71 },
    { ngRefId: 'NG-C1201', name: 'Tanzania Pharma Distributors', tin: '140-031-778', city: 'Mwanza', score: 63 },
];
exports.partySync = {
    2: [{ at: (0, gen_1.at)(33), title: 'Credit limit updated from NG', detail: 'USD 35,000 → 40,000', tone: 'go' }, { at: (0, gen_1.at)(24 * 40), title: 'Synced from NG', detail: 'NG-C1002', tone: 'go' }],
    13: [{ at: (0, gen_1.at)(52), title: 'Created locally at the gate (provisional)', detail: 'Gate · Hamisi J. on lane In 1 tablet, while NG was unreachable', tone: 'wait' }, { at: (0, gen_1.at)(51), title: 'NG lookup by name found 3 possible matches', detail: 'Waiting for someone to choose the right record', tone: 'wait' }],
};
