/* Insight sample data: control tower, KPIs, reports, forecasts, audit trail,
   customer portal, service requests and party details. Built on top of the
   core, control and gate data so the numbers agree across screens.

   Uses its own seeded generator so importing this file never shifts the
   shared sequence in gen.ts (other modules' data stays the same). */
import type { S } from '../types';
import { HERO, allStays, blocks, consignments, equipment, parties, staysAt, type Stay } from './core';
import { approvals, evaluate, exceptions, holdTypeName, holdsOf, releaseOrders } from './control';
import { visits } from './gate';
import { at, day, money } from './gen';

let seed = 4417;
const r = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ri = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const rp = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
const round1 = (n: number) => Math.round(n * 10) / 10;

/* ================================================================== control tower */
type Row = S<'GateQueueRow'>;
const live = visits.filter((v) => !['EXITED', 'CANCELLED', 'EXPIRED'].includes(v.status!));
const toRow = (v: (typeof visits)[number]): Row & { driverName?: string; transporter: string } => ({
  truckVisitId: v.truckVisitId!, plateNo: v.plateNo, visitTypeCode: v.visitTypeCode, status: v.status!,
  checkpointCode: v.nextCheckpointCode, waitingMinutes: v.waitingMin, units: v.units?.length ?? 0, blockedReason: v.blockedReason,
  driverName: v.driverName, transporter: v.transporter,
});

export function occupancyFor(siteId: number): (S<'OccupancySummary'> & { kind: string })[] {
  return blocks.filter((b) => b.siteId === siteId).map((b) => {
    const usable = b.rows * b.bays * b.tiers;
    const occ = Math.min(usable, staysAt(siteId).filter((s) => s.physicalStatus === 'IN_YARD' && s.currentLocation?.fullCode.startsWith(b.code + '-')).length + (b.kind === 'EXAM' ? 7 : 0));
    return { yardLocationId: b.id, fullCode: b.code, usableSlots: usable, occupiedSlots: occ, occupancyPct: String(Math.round((occ / usable) * 100)), kind: b.kind };
  });
}

export type EquipRow = S<'EquipmentStatus'> & { name: string; note?: string; since?: string };
const EQUIP_STATE: Record<string, [S<'EquipmentStatus'>['status'], string | null, number, string?]> = {
  'RS-01': ['WORKING', 'Ibrahim N.', 34, 'Block A, picking for T 118 DPE'],
  'RS-02': ['WORKING', 'Kassim O.', 27, 'Block B, placing transfer-in'],
  'EH-01': ['DOWN', null, 6, 'Hydraulic leak, fitter called 09:10'],
  'FL-03': ['IDLE', 'Rehema L.', 11, 'CFS shed W1, waiting for destuff job'],
  'TT-01': ['WORKING', 'Selemani P.', 19, 'Shuttle to exam bay X'],
  'WB-01': ['IDLE', 'Ally S.', 23, 'No truck on the bridge'],
};

export type ControlTowerData = Omit<S<'ControlTower'>, 'gateQueue' | 'blockedTrucks' | 'equipment' | 'yardOccupancy'> & {
  gateQueue: (Row & { transporter: string })[]; blockedTrucks: (Row & { transporter: string; driverName?: string })[];
  yardOccupancy: (S<'OccupancySummary'> & { kind: string })[];
  equipment: EquipRow[]; approvalsWaiting: S<'ApprovalRequest'>[]; hourlyIn: number[]; hourlyOut: number[]; hours: string[];
  openExceptions: S<'ExceptionCase'>[];
};

export function controlTower(siteId: number): ControlTowerData {
  const open = exceptions.filter((e) => !['RESOLVED', 'CLOSED'].includes(e.status!));
  const count = (s: string) => open.filter((e) => e.severity === s).length;
  return {
    generatedAt: at(0), siteId,
    exceptions: { critical: count('CRITICAL'), high: count('HIGH'), medium: count('MEDIUM'), low: count('LOW'), overdue: open.filter((e) => e.isOverdue).length },
    openExceptions: open,
    gateQueue: live.filter((v) => v.status !== 'ANNOUNCED').map(toRow),
    blockedTrucks: live.filter((v) => v.status === 'HELD' || v.status === 'REJECTED').map(toRow),
    yardOccupancy: occupancyFor(siteId),
    todayIn: 38, todayOut: 29, planIn: 52, planOut: 40, pendingMoves: 7,
    equipment: equipment.map((e) => {
      const [status, op, moves, note] = EQUIP_STATE[e.equipmentCode];
      return { equipmentId: e.equipmentId!, equipmentCode: e.equipmentCode, equipmentType: e.equipmentType, name: e.equipmentName, operatorName: op, movesToday: moves, status, note };
    }),
    approvalsWaiting: approvals.filter((a) => a.status === 'PENDING'),
    hours: ['06', '07', '08', '09', '10'],
    hourlyIn: [2, 5, 7, 6, 9],
    hourlyOut: [0, 2, 4, 6, 8],
  };
}

/* ================================================================== KPIs */
const DAYS = 90;
export const kpiDates = Array.from({ length: DAYS }, (_, i) => day(i - DAYS + 1));
const walk = (start: number, drift: number, noise: number, lo: number, hi: number, weekly = 0) => {
  let v = start;
  return kpiDates.map((d, i) => {
    v = Math.min(hi, Math.max(lo, v + drift + (r() - 0.5) * noise));
    const dow = new Date(d + 'T12:00:00Z').getUTCDay();
    return round1(v + (dow === 0 ? -weekly : dow === 6 ? -weekly / 2 : 0) + (i === DAYS - 1 ? 0 : 0));
  });
};
export const kpiSeries = {
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
for (const [k, site] of [['occDar1', 1], ['occDar2', 2]] as const) {
  const o = occupancyFor(site);
  const now = Math.round((o.reduce((a, b) => a + b.occupiedSlots, 0) / o.reduce((a, b) => a + b.usableSlots, 0)) * 100);
  const shift = now - kpiSeries[k][DAYS - 1];
  kpiSeries[k] = kpiSeries[k].map((v) => Math.max(5, Math.min(100, v + shift)));
}

export type Tile = S<'KpiTile'> & { goodWhen: 'up' | 'down'; target?: number; format?: 'money' };
const pts = (vals: number[], n = 30): S<'KpiPoint'>[] => vals.slice(-n).map((v, i) => ({ date: kpiDates[DAYS - n + i], value: String(v) }));
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const monthToDate = (vals: number[]) => vals.slice(-7).reduce((x, y) => x + y, 0); // 1–7 Oct
export const kpiTiles: Tile[] = [
  { kpiCode: 'AVG_DWELL', label: 'Average dwell', value: String(round1(avg(kpiSeries.dwellImport.slice(-30)))), unit: 'days', comparison: String(round1(avg(kpiSeries.dwellImport.slice(-60, -30)))), comparisonLabel: 'previous 30 days', trend: pts(kpiSeries.dwellImport), drillDownUrl: '/units', goodWhen: 'down', target: 10 },
  { kpiCode: 'TRUCK_TAT', label: 'Truck turnaround', value: String(Math.round(avg(kpiSeries.turnaround.slice(-30)))), unit: 'min', comparison: String(Math.round(avg(kpiSeries.turnaround.slice(-60, -30)))), comparisonLabel: 'previous 30 days', trend: pts(kpiSeries.turnaround), drillDownUrl: '/gate', goodWhen: 'down', target: 45 },
  { kpiCode: 'GATE_MOVES', label: 'Gate moves per day', value: String(Math.round(avg(kpiSeries.gateIn.slice(-30).map((v, i) => v + kpiSeries.gateOut.slice(-30)[i])))), unit: 'moves', comparison: String(Math.round(avg(kpiSeries.gateIn.slice(-60, -30).map((v, i) => v + kpiSeries.gateOut.slice(-60, -30)[i])))), comparisonLabel: 'previous 30 days', trend: pts(kpiSeries.gateIn.map((v, i) => v + kpiSeries.gateOut[i])), drillDownUrl: '/gate', goodWhen: 'up' },
  { kpiCode: 'YARD_OCC', label: 'Yard occupancy', value: String(kpiSeries.occDar1[DAYS - 1]), unit: '%', comparison: String(kpiSeries.occDar1[DAYS - 31]), comparisonLabel: 'same day last month', trend: pts(kpiSeries.occDar1), drillDownUrl: '/yard', goodWhen: 'down', target: 85 },
  { kpiCode: 'REVENUE_MTD', label: 'Revenue month to date', value: String(monthToDate(kpiSeries.revenue)), unit: 'USD', comparison: String(kpiSeries.revenue.slice(-38, -31).reduce((x, y) => x + y, 0)), comparisonLabel: '1–7 Sep', trend: pts(kpiSeries.revenue), drillDownUrl: '/invoices', goodWhen: 'up', format: 'money' },
  { kpiCode: 'COLLECTION_DAYS', label: 'Collection days', value: String(round1(kpiSeries.collection[DAYS - 1])), unit: 'days', comparison: String(round1(kpiSeries.collection[DAYS - 31])), comparisonLabel: 'last month', trend: pts(kpiSeries.collection), drillDownUrl: '/statements', goodWhen: 'down', target: 30 },
  { kpiCode: 'EXC_SLA', label: 'Exceptions resolved within SLA', value: String(Math.round(avg(kpiSeries.sla.slice(-30)))), unit: '%', comparison: String(Math.round(avg(kpiSeries.sla.slice(-60, -30)))), comparisonLabel: 'previous 30 days', trend: pts(kpiSeries.sla), drillDownUrl: '/exceptions', goodWhen: 'up', target: 90 },
];

/* ================================================================== reports */
export type ReportGroup = 'operations' | 'customs' | 'commercial' | 'finance' | 'audit';
export type Report = S<'ReportDefinition'> & { group: ReportGroup; description: string; builder: string };
const P_RANGE: S<'ReportParam'> = { name: 'Date range', type: 'dateRange', required: true };
const P_SITE: S<'ReportParam'> = { name: 'Site', type: 'site', required: true };
const P_CUST: S<'ReportParam'> = { name: 'Customer', type: 'party', required: false };
const rep = (reportCode: string, reportName: string, group: ReportGroup, description: string, builder: string, extra: Partial<Report> = {}): Report => ({
  reportCode, reportName, group, description, builder,
  category: group === 'commercial' || group === 'finance' ? 'COMMERCIAL' : group === 'operations' ? 'OPERATIONAL' : 'COMPLIANCE',
  parameters: [P_RANGE, P_SITE, P_CUST], formats: ['XLSX', 'PDF'],
  permissionCode: group === 'commercial' || group === 'finance' ? 'reports.financial' : 'reports.operational', ...extra,
});
export const reports: Report[] = [
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
export const REPORT_GROUPS: [ReportGroup, string][] = [['operations', 'Operations'], ['customs', 'Customs'], ['commercial', 'Commercial'], ['finance', 'Finance'], ['audit', 'Audit']];

export interface Preview { cols: { key: string; label: string; num?: boolean }[]; rows: Record<string, string | number | undefined>[]; total: number }
const cust = parties.filter((p) => p.roles.includes('CUSTOMER'));
export function reportPreview(rp_: Report, partyId?: number): Preview {
  seed = 900 + rp_.reportCode.length * 7; // same preview for the same report
  const stays = allStays.filter((s) => s.siteId === 1 && s.physicalStatus === 'IN_YARD' && (!partyId || consignments.find((c) => c.consignmentId === s.consignmentId)?.billToPartyId === partyId));
  switch (rp_.builder) {
    case 'stock': case 'holds': case 'transit': {
      const src = rp_.builder === 'holds' ? stays.filter((s) => (s.activeHoldCount ?? 0) > 0) : rp_.builder === 'transit' ? stays.filter((s) => s.flow === 'TRANSIT') : stays;
      return { total: src.length, cols: [{ key: 'unit', label: 'Unit' }, { key: 'type', label: 'Type' }, { key: 'flow', label: 'Flow' }, { key: 'loc', label: 'Location' }, { key: 'bl', label: 'Consignment' }, { key: 'note', label: rp_.builder === 'holds' ? 'Hold' : 'Customs' }, { key: 'days', label: 'Days', num: true }],
        rows: src.slice(0, 12).map((s) => ({ unit: s.cargoUnit.unitNo, type: s.cargoUnit.unitTypeCode, flow: s.flow.toLowerCase(), loc: s.currentLocation?.fullCode ?? '—', bl: s.unitSummary.consignmentRef ?? '—', note: rp_.builder === 'holds' ? holdsOf(s.unitStayId!).filter((h) => h.status === 'ACTIVE').map((h) => holdTypeName(h.holdTypeCode)).join(', ') : (s.customsStatus ?? '').toLowerCase().replace('_', ' '), days: s.unitSummary.dwellDays ?? 0 })) };
    }
    case 'dwell': case 'accrued': case 'ageing': case 'revenue': case 'waivers': {
      const list = partyId ? cust.filter((p) => p.partyId === partyId) : cust;
      const money_ = rp_.builder !== 'dwell';
      const cols = rp_.builder === 'dwell'
        ? [{ key: 'name', label: 'Customer' }, { key: 'units', label: 'Units', num: true }, { key: 'avg', label: 'Average days', num: true }, { key: 'max', label: 'Longest', num: true }]
        : rp_.builder === 'ageing'
          ? [{ key: 'name', label: 'Customer' }, { key: 'cur', label: 'Current', num: true }, { key: 'd30', label: '1–30', num: true }, { key: 'd60', label: '31–60', num: true }, { key: 'd90', label: 'Over 60', num: true }, { key: 'tot', label: 'Total USD', num: true }]
          : [{ key: 'name', label: 'Customer' }, { key: 'storage', label: 'Storage USD', num: true }, { key: 'handling', label: 'Handling USD', num: true }, { key: 'other', label: 'Other USD', num: true }, { key: 'tot', label: 'Total USD', num: true }];
      const rows = list.map((p) => {
        if (!money_) return { name: p.partyName, units: ri(3, 60), avg: round1(4 + r() * 12), max: ri(14, 48) };
        if (rp_.builder === 'ageing') { const a = [ri(0, 9000), ri(0, 6000), ri(0, 3000), ri(0, 1500)]; return { name: p.partyName, cur: a[0].toLocaleString(), d30: a[1].toLocaleString(), d60: a[2].toLocaleString(), d90: a[3].toLocaleString(), tot: (a[0] + a[1] + a[2] + a[3]).toLocaleString() }; }
        const a = [ri(500, 14000), ri(300, 9000), ri(0, 2000)]; return { name: p.partyName, storage: a[0].toLocaleString(), handling: a[1].toLocaleString(), other: a[2].toLocaleString(), tot: (a[0] + a[1] + a[2]).toLocaleString() };
      });
      return { cols, rows, total: rows.length };
    }
    default: {
      const rows = visits.slice(0, 9).map((v) => ({ ref: v.visitNo!, plate: v.plateNo ?? '', who: v.transporter, when: v.arrivedAt ? new Date(v.arrivedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' }) : '—', status: (v.status ?? '').toLowerCase().replace('_', ' '), mins: v.waitingMin }));
      return { total: 214, rows, cols: [{ key: 'ref', label: 'Reference' }, { key: 'plate', label: 'Truck' }, { key: 'who', label: 'Transporter' }, { key: 'when', label: 'Arrived' }, { key: 'status', label: 'Status' }, { key: 'mins', label: 'Minutes', num: true }] };
    }
  }
}

export type Saved = S<'SavedReport'> & { scheduleText?: string; nextRunAt?: string; lastRunAt?: string; lastStatus?: S<'ReportRun'>['status']; owner: string; format?: 'XLSX' | 'PDF' };
export const savedReports: Saved[] = [
  { savedReportId: 51, reportCode: 'OPS_DWELL', reportName: 'Weekly dwell by customer (DAR1)', isShared: true, siteId: 1, parameters: { range: 'last 7 days' }, scheduleCron: '0 7 * * 1', scheduleText: 'Every Monday 07:00', format: 'XLSX', recipients: 'ops-managers@ngicd.example, daniel.k@ngicd.example', isActive: true, nextRunAt: at(-5 * 24 + 3.5), lastRunAt: at(2 * 24 + 3.5), lastStatus: 'DONE', owner: 'Ops · Daniel K.' },
  { savedReportId: 52, reportCode: 'FIN_AGEING', reportName: 'Debtors ageing for finance meeting', isShared: true, siteId: 1, scheduleCron: '0 7 * * 1', scheduleText: 'Every Monday 07:00', format: 'PDF', recipients: 'finance@ngicd.example', isActive: true, nextRunAt: at(-5 * 24 + 3.5), lastRunAt: at(2 * 24 + 3.5), lastStatus: 'DONE', owner: 'Finance · Joseph N.' },
  { savedReportId: 53, reportCode: 'CUS_HOLDS', reportName: 'Open holds, Kilele units', isShared: false, siteId: 1, parameters: { customer: 2 }, scheduleCron: '30 6 * * *', scheduleText: 'Every day 06:30', format: 'XLSX', recipients: 'grace.p@ngicd.example', isActive: true, nextRunAt: at(-20), lastRunAt: at(4), lastStatus: 'DONE', owner: 'Customer service · Grace P.' },
  { savedReportId: 54, reportCode: 'FIN_VFD', reportName: 'Failed fiscal receipts', isShared: true, scheduleCron: '0 18 * * *', scheduleText: 'Every day 18:00', format: 'XLSX', recipients: 'billing@ngicd.example', isActive: true, nextRunAt: at(-7.5), lastRunAt: at(16.5), lastStatus: 'FAILED', owner: 'Billing · Amina S.' },
  { savedReportId: 55, reportCode: 'OPS_GATE', reportName: 'Gate register, last month', isShared: false, siteId: 1, parameters: { range: 'Sep 2026' }, isActive: true, owner: 'Ops · Daniel K.' },
];

export type ExportLog = { id: number; reportName: string; format: 'XLSX' | 'PDF' | 'CSV'; by: string; at: string; rows: number; params: string; device: string };
export const exportLog: ExportLog[] = [
  { id: 1, reportName: 'Units in yard (stock list)', format: 'XLSX', by: 'Ops · Daniel K.', at: at(1.2), rows: 342, params: 'DAR1 · all customers', device: 'OFFICE-PC-04' },
  { id: 2, reportName: 'Debtors ageing', format: 'PDF', by: 'Finance · Joseph N.', at: at(3.4), rows: 11, params: 'DAR1 · all customers', device: 'OFFICE-PC-09' },
  { id: 3, reportName: 'Active holds and exams', format: 'XLSX', by: 'Customer service · Grace P.', at: at(4), rows: 38, params: 'DAR1 · Kilele Clearing & Forwarding', device: 'Scheduled job' },
  { id: 4, reportName: 'Revenue by charge', format: 'XLSX', by: 'Finance · Joseph N.', at: at(26), rows: 11, params: '1–30 Sep · DAR1', device: 'OFFICE-PC-09' },
  { id: 5, reportName: 'Gate in and out register', format: 'PDF', by: 'Auditor · Esther W.', at: at(49), rows: 1204, params: '1–30 Sep · DAR1', device: 'OFFICE-PC-12' },
];

/* ================================================================== forecasts */
export const MODEL_VERSIONS: (S<'ModelVersion'> & { name: string; metricText: string })[] = [
  { mlModelVersionId: 31, modelCode: 'OCC_FORECAST', name: 'Occupancy forecast', versionLabel: 'occ-2026.09.2', trainedAt: at(9 * 24), isActive: true, metrics: { mae_pct: 3.1, coverage_80: 0.83 }, metricText: 'Off by 3.1 points on average; 83% of actuals inside the band' },
  { mlModelVersionId: 32, modelCode: 'DWELL', name: 'Dwell prediction', versionLabel: 'dwell-2026.09.1', trainedAt: at(16 * 24), isActive: true, metrics: { mae_days: 1.8, p90_coverage: 0.88 }, metricText: 'Off by 1.8 days on average; 88% leave before the p90 date' },
  { mlModelVersionId: 33, modelCode: 'ALLOC', name: 'Slot suggestion', versionLabel: 'alloc-rules-1.4 + ml-2026.08', trainedAt: at(40 * 24), isActive: true, metrics: { rank1_rate: 0.74, reshuffles_saved: 0.21 }, metricText: '74% of moves use rank 1; 21% fewer reshuffles than rules alone' },
  { mlModelVersionId: 29, modelCode: 'OCC_FORECAST', name: 'Occupancy forecast', versionLabel: 'occ-2026.08.1', trainedAt: at(41 * 24), isActive: false, metrics: { mae_pct: 4.0 }, metricText: 'Retired 28 Sep; off by 4.0 points' },
];

export const forecastDates = Array.from({ length: 14 }, (_, i) => day(i + 1));
export function occupancyForecast(siteId: number, block: string | 'ALL'): S<'OccupancyForecast'>[] {
  const occ = occupancyFor(siteId);
  const sel = block === 'ALL' ? occ : occ.filter((o) => o.fullCode === block);
  const usable = sel.reduce((a, o) => a + o.usableSlots, 0);
  const now = (sel.reduce((a, o) => a + o.occupiedSlots, 0) / Math.max(1, usable)) * 100;
  seed = 300 + siteId * 31 + (block === 'ALL' ? 0 : block.charCodeAt(0));
  // Vessel Cape Albatross arrives in ~30 h: imports rise days 2–5, then ease off.
  const bump = [1, 4, 7, 9, 10, 9, 7, 6, 4, 3, 2, 2, 1, 0];
  return forecastDates.map((d, i) => {
    const p = Math.min(99, Math.max(5, now + bump[i] * (siteId === 1 ? 1 : 0.6) + (r() - 0.5) * 3));
    const spread = 2 + i * 0.7;
    return {
      siteId, fullCode: block === 'ALL' ? undefined : block, forecastDate: d, predictedPct: String(Math.round(p)),
      lowerPct: String(Math.max(0, Math.round(p - spread))), upperPct: String(Math.min(100, Math.round(p + spread))), modelVersion: 'occ-2026.09.2',
    };
  });
}

export type Dwell = S<'DwellPrediction'> & { stay: Stay; daysSoFar: number; p90Date: string; passesFree: boolean };
export function dwellPredictions(siteId: number): Dwell[] {
  seed = 777 + siteId;
  return staysAt(siteId).filter((s) => s.physicalStatus === 'IN_YARD' && s.fullEmpty === 'F').slice(0, 24).map((s) => {
    const so = s.unitSummary.dwellDays ?? 0;
    const p50 = round1(so + 1 + r() * (s.customsStatus === 'CLEARED' ? 3 : 9));
    const p90 = round1(p50 + 2 + r() * 6);
    const toDate = (days: number) => new Date(Date.parse(s.storageStartAt ?? at(0)) + days * 86400000).toISOString().slice(0, 10);
    return {
      unitStayId: s.unitStayId!, stay: s, daysSoFar: so, p50Days: String(p50), p90Days: String(p90),
      predictedExitDate: toDate(p50), p90Date: toDate(p90), passesFree: !!s.freeUntil && toDate(p50) > s.freeUntil.slice(0, 10),
      modelVersion: 'dwell-2026.09.1', predictedAt: at(4.5),
    };
  }).sort((a, b) => Number(b.p50Days) - Number(a.p50Days));
}

export type Suggestion = S<'YardSuggestionLog'> & { unitNo: string; top: string; chosen: string; by: string };
const OVERRIDES = ['Reach stacker cannot reach row 5 while RS-02 works B', 'Customer collects today: kept near the gate', 'Suggested stack has a reefer cable across it', 'Block A row 2 closed for paving', 'Grouped with the same BL for exam'];
export const suggestionLog: Suggestion[] = (() => {
  seed = 1234;
  const inYard = allStays.filter((s) => s.siteId === 1 && s.currentLocation && s.cargoUnit.category === 'CONTAINER').slice(0, 40);
  return inYard.map((s, i) => {
    const ranked = r();
    const chosenRank = ranked < 0.74 ? 1 : ranked < 0.88 ? 2 : ranked < 0.93 ? 3 : null;
    const loc = s.currentLocation!.fullCode;
    const top = chosenRank === 1 ? loc : `${loc.slice(0, 1)}-0${ri(1, 5)}-${String(ri(1, 10)).padStart(2, '0')}-${ri(1, 3)}`;
    return {
      yardSuggestionLogId: 6000 + i, unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, engine: i % 3 === 0 ? 'RULES' : 'ML', chosenRank,
      overrideReason: chosenRank === 1 ? null : rp(OVERRIDES), suggestedAt: at(0.3 + i * 1.7), top, chosen: loc,
      by: rp(['Yard · Ibrahim N.', 'Yard · Kassim O.', 'Yard · Neema M.']),
    };
  });
})();

/* ================================================================== audit */
export type Audit = S<'AuditEntry'> & { summary: string; to?: string };
export const AUDIT_USERS = ['Gate · Hamisi J.', 'Gate · Rose A.', 'Doc & clearance · Rehema K.', 'Billing · Amina S.', 'Finance · Joseph N.', 'Ops · Daniel K.', 'Cashier · Mary T.', 'Yard · Ibrahim N.', 'Customer service · Grace P.', 'Admin · Felix M.'];
export const auditLog: Audit[] = (() => {
  const H = HERO;
  const base: Omit<Audit, 'auditLogId'>[] = [
    { occurredAt: at(0.3), userSub: 'u-hamisi', userName: 'Gate · Hamisi J.', deviceId: 12, ipAddress: '10.20.1.31', siteId: 1, entityName: 'approval_request', entityId: '9003', action: 'CREATE', source: 'EDGE', summary: 'Asked to let T 902 DMB leave with seal mismatch', reason: 'Seal number on paper EIR mistyped', changes: [{ field: 'status', old: null, new: 'PENDING' }, { field: 'permissionCode', old: null, new: 'gate.checkout.override' }], to: '/approvals' },
    { occurredAt: at(0.4), userSub: 'u-hamisi', userName: 'Gate · Hamisi J.', deviceId: 12, ipAddress: '10.20.1.31', siteId: 1, entityName: 'truck_visit', entityId: '4410', action: 'UPDATE', source: 'EDGE', summary: 'Inner gate in failed: seal mismatch', changes: [{ field: 'status', old: 'ADMITTED', new: 'HELD' }, { field: 'sealFound', old: null, new: 'ML-7781208' }], to: '/gate/visits/4410' },
    { occurredAt: at(1.2), userSub: 'u-daniel', userName: 'Ops · Daniel K.', ipAddress: '10.20.0.44', siteId: 1, entityName: 'report_run', entityId: '88120', action: 'EXPORT', source: 'UI', summary: 'Exported "Units in yard (stock list)" to Excel, 342 rows', changes: [{ field: 'format', old: null, new: 'XLSX' }, { field: 'parameters', old: null, new: 'site=DAR1' }] },
    { occurredAt: at(2.6), userSub: 'u-ibrahim', userName: 'Yard · Ibrahim N.', deviceId: 31, ipAddress: '10.20.3.17', siteId: 1, entityName: 'move_order', entityId: '33021', action: 'OVERRIDE', source: 'EDGE', summary: 'Placed at a slot other than the suggestion', reason: 'Customer collects today: kept near the gate', changes: [{ field: 'toLocation', old: 'A-04-09-2', new: 'A-01-02-1' }, { field: 'suggestionRank', old: 1, new: 3 }] },
    { occurredAt: at(3), userSub: 'u-amina', userName: 'Billing · Amina S.', ipAddress: '10.20.0.52', siteId: 1, entityName: 'approval_request', entityId: '9001', action: 'CREATE', source: 'UI', summary: `Asked to waive 4 storage days on ${H.cargoUnit.unitNo}`, reason: 'Customs exam delayed by the authority', changes: [{ field: 'amount', old: null, new: 'USD 64.00' }], to: '/approvals' },
    { occurredAt: at(3.1), userSub: 'system', userName: 'Release engine', siteId: 1, entityName: 'truck_visit', entityId: '4402', action: 'UPDATE', source: 'JOB', summary: 'Gate-out refused: release order expired', changes: [{ field: 'status', old: 'WORKING', new: 'REJECTED' }, { field: 'RELEASE_VALID', old: 'PASS', new: 'FAIL' }] },
    { occurredAt: at(4), userSub: 'sync', userName: 'Lane 2 tablet sync', deviceId: 14, siteId: 1, entityName: 'unit_stay', entityId: String(allStays[12].unitStayId), action: 'SYNC', source: 'SYNC', summary: 'Offline gate-out synced; conflicts with a line hold', changes: [{ field: 'physicalStatus', old: 'IN_YARD', new: 'DEPARTED' }, { field: 'capturedOfflineAt', old: null, new: '07 Oct 06:12' }], to: `/units/${allStays[12].unitStayId}` },
    { occurredAt: at(4.5), userSub: 'aiva', userName: 'Aiva for Grace P.', siteId: 1, entityName: 'service_request', entityId: '7104', action: 'CREATE', source: 'AIVA', summary: 'Drafted reply to Kilele about free-day extension (sent by Grace P.)', changes: [{ field: 'status', old: 'SUBMITTED', new: 'IN_REVIEW' }] },
    { occurredAt: at(5.2), userSub: 'u-mary', userName: 'Cashier · Mary T.', deviceId: 21, ipAddress: '10.20.0.61', siteId: 1, entityName: 'payment', entityId: '55102', action: 'CREATE', source: 'UI', summary: 'Recorded M-Pesa payment TZS 1,180,000 from Mzizi Traders', changes: [{ field: 'method', old: null, new: 'MPESA' }, { field: 'amount', old: null, new: 'TZS 1,180,000' }, { field: 'reference', old: null, new: 'QJK7H2LM0P' }] },
    { occurredAt: at(6), userSub: 'u-amina', userName: 'Billing · Amina S.', ipAddress: '10.20.0.52', siteId: 1, entityName: 'invoice', entityId: '3318', action: 'PRINT', source: 'UI', summary: 'Printed tax invoice INV-DAR1-26-003318', changes: [{ field: 'copyNo', old: 1, new: 2 }] },
    { occurredAt: at(8), userSub: 'u-joseph', userName: 'Finance · Joseph N.', ipAddress: '10.20.0.58', siteId: 1, entityName: 'approval_request', entityId: '9002', action: 'APPROVE', source: 'UI', summary: 'Approved level 1 of credit note USD 1,240', reason: 'Checked against plug log', changes: [{ field: 'currentLevel', old: 0, new: 1 }] },
    { occurredAt: at(20), userSub: 'u-felix', userName: 'Admin · Felix M.', ipAddress: '10.20.0.10', siteId: 1, entityName: 'tariff', entityId: 'STORAGE-40', action: 'UPDATE', source: 'UI', summary: 'Changed storage rate for 40 ft after day 7 (approval APR-26-00377)', changes: [{ field: 'unitRate', old: '14.00', new: '16.00' }, { field: 'validFrom', old: '2026-01-01', new: '2026-10-01' }] },
    { occurredAt: at(22), userSub: 'u-rehema', userName: 'Doc & clearance · Rehema K.', ipAddress: '10.20.0.47', siteId: 1, entityName: 'release_order', entityId: '802', action: 'APPROVE', source: 'UI', summary: 'Approved release order RO-DAR1-26-01943', changes: [{ field: 'status', old: 'PENDING_CHECKS', new: 'APPROVED' }, { field: 'validTo', old: null, new: '09 Oct 12:30' }] },
    { occurredAt: at(26), userSub: 'u-juma', userName: 'Inspection · Juma M.', deviceId: 33, siteId: 1, entityName: 'hold', entityId: '703', action: 'CREATE', source: 'EDGE', summary: 'Placed damage hold (side panel)', reason: 'Side panel damage, surveyor appointed', changes: [{ field: 'holdTypeCode', old: null, new: 'DAMAGE' }, { field: 'status', old: null, new: 'ACTIVE' }] },
    { occurredAt: at(30), userSub: 'u-rehema', userName: 'Doc & clearance · Rehema K.', ipAddress: '10.20.0.47', siteId: 1, entityName: 'hold', entityId: '701', action: 'CREATE', source: 'UI', summary: `Placed customs exam hold on ${H.cargoUnit.unitNo}`, reason: 'Physical examination ordered on entry lodgement', changes: [{ field: 'authorityRef', old: null, new: 'EXN/DSM/26/04418' }], to: `/units/${H.unitStayId}` },
    { occurredAt: at(33), userSub: 'ng-sync', userName: 'NG sync', siteId: 1, entityName: 'party', entityId: '2', action: 'SYNC', source: 'SYNC', summary: 'Kilele Clearing & Forwarding credit limit updated from NG', changes: [{ field: 'creditLimit', old: '35000.00', new: '40000.00' }], to: '/parties/2' },
    { occurredAt: at(44), userSub: 'u-daniel', userName: 'Ops · Daniel K.', ipAddress: '10.20.0.44', siteId: 1, entityName: 'approval_request', entityId: '9005', action: 'APPROVE', source: 'UI', summary: 'Approved +3 free days for Zamlink transit units', changes: [{ field: 'status', old: 'PENDING', new: 'APPROVED' }] },
    { occurredAt: at(49), userSub: 'u-esther', userName: 'Auditor · Esther W.', ipAddress: '10.20.0.71', siteId: 1, entityName: 'report_run', entityId: '88097', action: 'EXPORT', source: 'UI', summary: 'Exported "Gate in and out register" to PDF, 1,204 rows', changes: [{ field: 'format', old: null, new: 'PDF' }] },
    { occurredAt: at(52), userSub: 'u-hamisi', userName: 'Gate · Hamisi J.', deviceId: 12, siteId: 1, entityName: 'party', entityId: '13', action: 'CREATE', source: 'EDGE', summary: 'Created provisional party Tanzanite Pharma Distributors at the gate', changes: [{ field: 'partyName', old: null, new: 'Tanzanite Pharma Distributors' }, { field: 'syncStatus', old: null, new: 'PROVISIONAL' }], to: '/parties/13' },
    { occurredAt: at(60), userSub: 'u-joseph', userName: 'Finance · Joseph N.', ipAddress: '10.20.0.58', siteId: 1, entityName: 'approval_request', entityId: '9006', action: 'REJECT', source: 'UI', summary: 'Rejected refund USD 620 to Pwani Hardware', reason: 'Allocate to open invoice instead', changes: [{ field: 'status', old: 'PENDING', new: 'REJECTED' }] },
    { occurredAt: at(70), userSub: 'u-felix', userName: 'Admin · Felix M.', ipAddress: '10.20.0.10', entityName: 'user', entityId: 'u-mary', action: 'UPDATE', source: 'UI', summary: 'Gave Mary T. the cashier role at DAR2', changes: [{ field: 'roles@DAR2', old: '[]', new: '["CASHIER"]' }] },
    { occurredAt: at(71), userSub: 'u-daniel', userName: 'Ops · Daniel K.', ipAddress: '10.20.0.44', siteId: 1, entityName: 'unit_stay', entityId: String(H.unitStayId), action: 'VIEW_SENSITIVE', source: 'UI', summary: 'Opened customs valuation documents', changes: [] },
    { occurredAt: at(90), userSub: 'api-kilele', userName: 'Kilele API key', siteId: 1, entityName: 'appointment', entityId: '4120', action: 'CREATE', source: 'API', summary: 'Booked truck appointment APT-26-04120 via API', changes: [{ field: 'slotStart', old: null, new: '08 Oct 08:00' }] },
  ];
  return base.map((e, i) => ({ ...e, auditLogId: 990000 - i }));
})();
export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'OVERRIDE', 'PRINT', 'EXPORT', 'SYNC', 'VIEW_SENSITIVE', 'LOGIN'] as const;
export const AUDIT_SOURCES: [S<'AuditEntry'>['source'], string][] = [['UI', 'Screen'], ['EDGE', 'Gate or yard device'], ['API', 'API'], ['SYNC', 'Sync'], ['JOB', 'Scheduled job'], ['AIVA', 'Aiva']];

/* ================================================================== invoices (portal & parties) */
export type Inv = S<'Invoice'> & { consignmentRef?: string };
export const invoices: Inv[] = (() => {
  seed = 5150;
  const out: Inv[] = [];
  let n = 3290;
  for (const p of cust) {
    const count = p.partyId === 2 ? 8 : ri(1, 4);
    for (let i = 0; i < count; i++) {
      const cons = consignments.find((c) => c.billToPartyId === p.partyId);
      const subtotal = ri(180, 4200);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;
      const statusPick = p.syncStatus !== 'SYNCED' ? 'DRAFT' : i === 0 && p.partyId === 2 ? 'ISSUED' : rp(['POSTED', 'PAID', 'PAID', 'PART_PAID', 'POSTED'] as const) as Inv['status'];
      const paid = statusPick === 'PAID' ? total : statusPick === 'PART_PAID' ? Math.round(total * 0.5) : 0;
      const ago = ri(1, 50);
      out.push({
        invoiceId: ++n, docKind: statusPick === 'ISSUED' || statusPick === 'DRAFT' ? 'PROFORMA' : 'TAX_INVOICE', invoiceNo: `${statusPick === 'ISSUED' || statusPick === 'DRAFT' ? 'PRO' : 'INV'}-DAR1-26-00${n}`, status: statusPick,
        billToPartyId: p.partyId!, consignmentId: cons?.consignmentId, consignmentRef: cons?.refNo, currency: 'USD', invoiceDate: day(-ago), dueDate: day(-ago + 14),
        subtotal: money(subtotal), taxTotal: money(tax), total: money(total), amountPaid: money(paid), balance: money(total - paid),
      });
    }
  }
  return out.sort((a, b) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''));
})();
export const invoicesOf = (partyId: number) => invoices.filter((i) => i.billToPartyId === partyId);
export const balanceOf = (partyId: number) => invoicesOf(partyId).reduce((a, i) => a + Number(i.balance), 0);

/* ================================================================== portal */
export const PORTAL_PARTY = 2; // Kilele Clearing & Forwarding

export type Plain = { label: string; tone: 'go' | 'stop' | 'customs' | 'wait' | 'idle'; detail: string; key: 'ready' | 'customs' | 'charges' | 'hold' | 'request' | 'expected' | 'collected' };
const HOLD_PLAIN: Record<string, [string, string]> = {
  SCAN: ['Customs examination', 'Attend the examination at the time customs set. We move the unit to the exam bay.'],
  CUSTOMS: ['Customs query', 'Answer the customs query on your entry. The hold lifts when customs records the answer.'],
  LINE: ['Shipping line hold', 'Settle with the shipping line and ask them to send us their release.'],
  ICD_COMMERCIAL: ['Unpaid charges', 'Pay the overdue charges. The hold lifts once payment is confirmed.'],
  DAMAGE: ['Damage survey', 'A surveyor is checking the unit. We will contact you with the result.'],
  SECURITY: ['Security check', 'Our security team is checking the unit. Call customer service for details.'],
  COURT: ['Legal order', 'A court or government order stops this unit. Contact the issuing office.'],
};
export function plainStatus(s: Stay): Plain {
  const hs = holdsOf(s.unitStayId!).filter((h) => h.status === 'ACTIVE');
  const due = Number(s.accruedCharges?.total ?? 0);
  if (s.physicalStatus === 'DEPARTED') return { key: 'collected', label: 'Collected', tone: 'idle', detail: 'Left the depot' };
  if (s.physicalStatus === 'EXPECTED') return { key: 'expected', label: 'On the way from port', tone: 'idle', detail: 'We will tell you when it arrives' };
  if (hs.length) return { key: 'hold', label: `On hold: ${HOLD_PLAIN[hs[0].holdTypeCode]?.[0].toLowerCase() ?? 'hold'}`, tone: 'stop', detail: HOLD_PLAIN[hs[0].holdTypeCode]?.[1] ?? '' };
  if (s.customsStatus === 'QUERY') return { key: 'customs', label: 'Customs query', tone: 'stop', detail: 'Customs needs an answer from you' };
  if (s.customsStatus !== 'CLEARED' && s.customsStatus !== 'NOT_REQUIRED') return { key: 'customs', label: 'Waiting for customs', tone: 'customs', detail: s.customsStatus === 'UNDER_EXAM' ? 'Under examination' : s.customsStatus === 'NOT_LODGED' ? 'Entry not lodged yet' : 'Entry lodged, not yet released' };
  if (s.billingStatus === 'ACCRUING' || s.billingStatus === 'PROFORMA') return { key: 'charges', label: `Charges due USD ${due.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, tone: 'wait', detail: 'Pay to get your delivery order' };
  if (s.releaseStatus === 'APPROVED') return { key: 'ready', label: 'Ready to collect', tone: 'go', detail: 'Book a truck and bring the delivery order' };
  if (s.releaseStatus === 'REQUESTED') return { key: 'request', label: 'Delivery order being prepared', tone: 'wait', detail: 'Usually within 2 working hours' };
  return { key: 'request', label: 'Ready to request delivery', tone: 'wait', detail: 'Customs cleared and charges settled' };
}

export type Why = { code: string; ok: boolean | null; title: string; detail: string; next?: 'pay' | 'extend' | 'request' | 'book' | 'contact' };
/** Customer wording for the release conditions from evaluate(). */
export function whyCantCollect(s: Stay): Why[] {
  const checks = evaluate(s, 'PREVIEW');
  const hs = holdsOf(s.unitStayId!).filter((h) => h.status === 'ACTIVE');
  const total = Number(s.accruedCharges?.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  return checks.filter((c) => c.conditionCode !== 'IDENTITY').map((c): Why => {
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

export const portalUnits = (partyId: number) => allStays.filter((s) => {
  const c = consignments.find((k) => k.consignmentId === s.consignmentId);
  return c && (c.agentPartyId === partyId || c.consigneePartyId === partyId || c.billToPartyId === partyId);
});

export type Appt = S<'Appointment'> & { plate: string; driver: string; unitNos: string[]; releaseNo?: string };
export const appointments: Appt[] = [
  { appointmentId: 4120, appointmentNo: 'APT-26-04120', visitTypeCode: 'IMPORT_PICKUP', slotStart: '2026-10-08T05:00:00Z', slotEnd: '2026-10-08T06:00:00Z', transporterPartyId: 7, status: 'BOOKED', bookedVia: 'API', plate: 'T 412 DKL', driver: 'Baraka Mwita', unitNos: [HERO.cargoUnit.unitNo], releaseNo: 'RO-DAR1-26-01942', consignmentId: 101 },
  { appointmentId: 4117, appointmentNo: 'APT-26-04117', visitTypeCode: 'IMPORT_PICKUP', slotStart: '2026-10-07T08:00:00Z', slotEnd: '2026-10-07T09:00:00Z', transporterPartyId: 8, status: 'BOOKED', bookedVia: 'PORTAL', plate: 'T 118 DPE', driver: 'Said Omari', unitNos: [releaseOrders[1]?.units?.[0]?.unitNo ?? ''], releaseNo: releaseOrders[1]?.releaseNo },
  { appointmentId: 4109, appointmentNo: 'APT-26-04109', visitTypeCode: 'VEHICLE_DELIVERY', slotStart: '2026-10-07T06:00:00Z', slotEnd: '2026-10-07T07:00:00Z', transporterPartyId: 8, status: 'ARRIVED', bookedVia: 'PORTAL', truckVisitId: 4416, plate: 'T 340 DRC', driver: 'Abdul Kombo', unitNos: [], consignmentId: 105 },
  { appointmentId: 4098, appointmentNo: 'APT-26-04098', visitTypeCode: 'IMPORT_PICKUP', slotStart: '2026-10-06T07:00:00Z', slotEnd: '2026-10-06T08:00:00Z', transporterPartyId: 7, status: 'MISSED', bookedVia: 'PORTAL', plate: 'T 655 DQA', driver: 'Hassan Ali', unitNos: [] },
];
/** Slots for the next days: capacity per hour and how many are booked. */
export function slotsFor(dateIso: string): S<'SlotAvailability'>[] {
  seed = 60 + Number(dateIso.slice(-2));
  return [7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((h) => {
    const capacity = h === 12 ? 4 : 8;
    const booked = Math.min(capacity, ri(h < 10 ? 5 : 1, capacity));
    const start = new Date(`${dateIso}T${String(h).padStart(2, '0')}:00:00+03:00`).toISOString();
    const end = new Date(`${dateIso}T${String(h + 1).padStart(2, '0')}:00:00+03:00`).toISOString();
    return { slotStart: start, slotEnd: end, capacity, booked, available: capacity - booked };
  });
}

export type PortalDoc = S<'Document'> & { title: string; ref: string };
export const portalDocs: PortalDoc[] = [
  { documentId: 1, docTypeCode: 'RELEASE_ORDER', entityName: 'release_order', entityId: 801, title: 'Delivery order', ref: 'RO-DAR1-26-01942', fileName: 'RO-DAR1-26-01942.pdf', sizeBytes: 88_000, capturedAt: at(5), status: 'PENDING_APPROVAL' },
  { documentId: 2, docTypeCode: 'TAX_INVOICE', entityName: 'invoice', entityId: invoices.find((i) => i.billToPartyId === 2 && i.docKind === 'TAX_INVOICE')?.invoiceId ?? 0, title: 'Tax invoice', ref: invoices.find((i) => i.billToPartyId === 2 && i.docKind === 'TAX_INVOICE')?.invoiceNo ?? '', fileName: 'invoice.pdf', sizeBytes: 124_000, capturedAt: at(30), status: 'ACTIVE' },
  { documentId: 3, docTypeCode: 'EIR', entityName: 'unit_stay', entityId: HERO.unitStayId!, title: 'Interchange receipt (EIR), gate-in', ref: `EIR-DAR1-26-${HERO.unitStayId}`, fileName: 'eir.pdf', sizeBytes: 310_000, capturedAt: HERO.gatedInAt, status: 'ACTIVE' },
  { documentId: 4, docTypeCode: 'GATE_PASS', entityName: 'truck_visit', entityId: 4414, title: 'Gate pass', ref: 'GP-26-08811', fileName: 'gatepass.pdf', sizeBytes: 64_000, capturedAt: at(0.1), status: 'ACTIVE' },
  { documentId: 5, docTypeCode: 'STATEMENT', entityName: 'party', entityId: 2, title: 'Statement of account, September', ref: 'STM-C-KILELE-2026-09', fileName: 'statement.pdf', sizeBytes: 140_000, capturedAt: at(6 * 24), status: 'ACTIVE' },
  { documentId: 6, docTypeCode: 'DAMAGE_REPORT', entityName: 'inspection', entityId: 1201, title: 'Damage report with photos', ref: 'DMG-DAR1-26-0311', fileName: 'damage.pdf', sizeBytes: 2_400_000, capturedAt: at(26), status: 'ACTIVE' },
];

/* ================================================================== service requests */
export type Msg = { from: 'customer' | 'staff' | 'system'; who: string; at: string; text: string };
export type SR = S<'ServiceRequest'> & { partyName: string; unitNo?: string; consignmentRef?: string; slaDueAt: string; messages: Msg[] };
export const SR_KINDS: Record<S<'ServiceRequest'>['requestKind'], { label: string; slaHours: number }> = {
  DELIVERY: { label: 'Delivery', slaHours: 4 }, EMPTY_RETURN: { label: 'Empty return', slaHours: 8 }, DOCUMENT_SUBMISSION: { label: 'Document', slaHours: 8 },
  FREE_DAY_EXTENSION: { label: 'Free-day extension', slaHours: 24 }, INVOICE_QUERY: { label: 'Invoice query', slaHours: 48 }, DAMAGE_CLAIM: { label: 'Damage claim', slaHours: 72 },
  COMPLAINT: { label: 'Complaint', slaHours: 24 }, OTHER: { label: 'Other', slaHours: 48 },
};
const sr = (id: number, kind: S<'ServiceRequest'>['requestKind'], partyId: number, hrs: number, status: S<'ServiceRequest'>['status'], subject: string, details: string, o: Partial<SR> = {}): SR => ({
  serviceRequestId: id, requestNo: `SR-26-0${id}`, requestKind: kind, partyId, partyName: parties.find((p) => p.partyId === partyId)!.partyName,
  subject, details, status, createdAt: at(hrs), slaDueAt: at(hrs - SR_KINDS[kind].slaHours),
  messages: [{ from: 'customer', who: o.createdBy ?? 'Kilele · Agnes M.', at: at(hrs), text: details }], ...o,
});
const unitA = allStays.filter((s) => s.consignmentId === 103 && s.physicalStatus === 'IN_YARD');
export const serviceRequests: SR[] = [
  sr(7104, 'FREE_DAY_EXTENSION', 2, 26, 'IN_REVIEW', '+3 free days for Zamlink transit units', 'Tunduma border was closed 3–5 Oct; trucks could not leave. Letter from the border office attached. Please extend free time for the 6 units on IOSL0926S0441.', { consignmentId: 103, consignmentRef: 'IOSL0926S0441', assignedTo: 'Grace P.', payload: { days: 3, units: 6 },
    messages: [
      { from: 'customer', who: 'Kilele · Agnes M.', at: at(26), text: 'Tunduma border was closed 3–5 Oct; trucks could not leave. Letter from the border office attached. Please extend free time for the 6 units on IOSL0926S0441.' },
      { from: 'staff', who: 'Customer service · Grace P.', at: at(4.5), text: 'Thank you Agnes. We have the letter. The extension needs approval from operations; we will reply today.' },
    ] }),
  sr(7111, 'DELIVERY', 2, 1.5, 'SUBMITTED', `Deliver ${HERO.cargoUnit.unitNo} to Mzizi warehouse, Mikocheni`, 'Please arrange delivery after the exam today. Truck T 412 DKL booked for tomorrow 08:00.', { consignmentId: 101, consignmentRef: 'BMLU2409881', unitStayId: HERO.unitStayId, unitNo: HERO.cargoUnit.unitNo }),
  sr(7110, 'INVOICE_QUERY', 2, 6, 'NEEDS_INFO', 'Reefer plug-in charged twice on PRO invoice', 'Plug-in for 6 reefer units appears twice. Please correct.', { consignmentId: 108, consignmentRef: 'BMLU2410017', assignedTo: 'Amina S.',
    messages: [
      { from: 'customer', who: 'Kilele · Agnes M.', at: at(6), text: 'Plug-in for 6 reefer units appears twice. Please correct.' },
      { from: 'staff', who: 'Billing · Amina S.', at: at(3), text: 'Which invoice number? We see two invoices for this BL.' },
    ] }),
  sr(7108, 'DOCUMENT_SUBMISSION', 2, 9, 'APPROVED', 'Customs release for BMLU2409902', 'Attached customs release REL-DSM-26-31007.', { consignmentId: 102, consignmentRef: 'BMLU2409902', assignedTo: 'Rehema K.', respondedAt: at(7), resultEntity: 'customs_ref', resultId: 5,
    messages: [
      { from: 'customer', who: 'Kilele · Agnes M.', at: at(9), text: 'Attached customs release REL-DSM-26-31007.' },
      { from: 'staff', who: 'Doc & clearance · Rehema K.', at: at(7), text: 'Recorded. Customs is now cleared on both units.' },
    ] }),
  sr(7106, 'DAMAGE_CLAIM', 1, 30, 'IN_REVIEW', 'Dent on container door found at our warehouse', 'Door dent and broken lock rod found on arrival. Photos attached.', { createdBy: 'Mzizi · Hamida S.', assignedTo: 'Daniel K.', unitStayId: unitA[0]?.unitStayId, unitNo: unitA[0]?.cargoUnit.unitNo }),
  sr(7103, 'DELIVERY', 9, 40, 'CLOSED', 'Transit units to Lusaka: release 4 units', 'Please release 4 units for transit to Lusaka.', { createdBy: 'Zamlink · Mwansa C.', closedAt: at(30) }),
  sr(7101, 'INVOICE_QUERY', 11, 55, 'REJECTED', 'Storage charged during public holiday', 'We think storage should not count on the public holiday.', { createdBy: 'Pwani HW · Peter L.', respondedAt: at(40),
    messages: [
      { from: 'customer', who: 'Pwani HW · Peter L.', at: at(55), text: 'We think storage should not count on the public holiday.' },
      { from: 'staff', who: 'Billing · Amina S.', at: at(40), text: 'Free days are calendar days, Sundays and public holidays included, as in the tariff. The charge stays.' },
    ] }),
  sr(7112, 'EMPTY_RETURN', 3, 0.8, 'SUBMITTED', 'Return 2 empties after unstuffing', 'Two 40 ft empties to return this afternoon.', { createdBy: 'Bahari · Joseph K.' }),
  sr(7109, 'COMPLAINT', 14, 8, 'SUBMITTED', 'Truck waited 2 hours at inner gate', 'Our truck T 771 DGH waited from 07:10 to 09:15 yesterday.', { createdBy: 'Kagera · Ruth N.' }),
];

/* ================================================================== parties */
type Contact = S<'PartyContact'>;
const CONTACTS: Record<number, Contact[]> = {
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
export const contactsOf = (partyId: number): Contact[] => CONTACTS[partyId] ?? [
  { partyContactId: partyId * 100 + 1, contactName: rp(['Grace Mushi', 'John Mrema', 'Fatma Ally', 'Peter Lyimo', 'Rose Kweka']), jobTitle: 'Operations', phone: `+255 7${ri(10, 89)} ${ri(100, 999)} ${ri(100, 999)}`, email: parties.find((p) => p.partyId === partyId)?.email ?? undefined, preferredLanguage: rp(['en', 'sw'] as const), isPrimary: true, notifyEmail: true, notifySms: r() < 0.5, notifyWhatsapp: r() < 0.4, isActive: true },
];
export const NG_MATCHES = [
  { ngRefId: 'NG-C1188', name: 'Tanzanite Pharmaceutical Distributors Ltd', tin: '134-882-019', city: 'Dar es Salaam', score: 94 },
  { ngRefId: 'NG-C0942', name: 'Tanzanite Pharma (Arusha)', tin: '127-110-443', city: 'Arusha', score: 71 },
  { ngRefId: 'NG-C1201', name: 'Tanzania Pharma Distributors', tin: '140-031-778', city: 'Mwanza', score: 63 },
];
export const partySync: Record<number, { at: string; title: string; detail?: string; tone?: 'go' | 'wait' | 'stop' }[]> = {
  2: [{ at: at(33), title: 'Credit limit updated from NG', detail: 'USD 35,000 → 40,000', tone: 'go' }, { at: at(24 * 40), title: 'Synced from NG', detail: 'NG-C1002', tone: 'go' }],
  13: [{ at: at(52), title: 'Created locally at the gate (provisional)', detail: 'Gate · Hamisi J. on lane In 1 tablet, while NG was unreachable', tone: 'wait' }, { at: at(51), title: 'NG lookup by name found 3 possible matches', detail: 'Waiting for someone to choose the right record', tone: 'wait' }],
};
