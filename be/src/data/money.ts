/* Money sample data (M3 commercial): exchange rates, tariffs and the rating
   engine, uninvoiced charges, invoices and notes with fiscal receipts,
   payments, cashier shifts, refunds, disbursements, statements, GL postings
   to NG and accounting periods. All companies and people are fictional.

   The rating engine here stands in for POST /rating/preview: the charges
   list, the invoice flow and the tariff preview all call the same function,
   so the numbers agree everywhere. */
import type { S } from '../types';
import { allStays, consignment, consignments, party, partyName, parties, vesselCalls, type Stay } from './core';
import { at, containerNo, day, int, pick, rnd } from './gen';
import { registerSearch } from './search';

/* ------------------------------------------------------------------ dates (EAT) */
const EAT = 3 * 3600_000;
/** yyyy-mm-dd of an ISO timestamp in Dar es Salaam time. */
export const eatDate = (iso: string) => new Date(Date.parse(iso) + EAT).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400_000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400_000);
export const isSunday = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay() === 0;
export const TODAY = day(0);
export const dShort = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const dLong = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Public holidays in the site calendar (Field rules & calendars). */
export const HOLIDAYS: Record<string, string> = {
  '2026-07-07': 'Saba Saba', '2026-08-08': 'Nane Nane', '2026-08-26': 'Maulid', '2026-10-14': 'Nyerere Day',
  '2026-12-09': 'Independence Day', '2026-12-25': 'Christmas Day', '2026-12-26': 'Boxing Day', '2027-01-01': "New Year's Day",
};

const r2 = (n: number) => Math.round(n * 100) / 100;
export const m2 = (n: number) => r2(n).toFixed(2);
export const num = (s: string | number | null | undefined) => (s === null || s === undefined || s === '' ? 0 : Number(s));

/* ------------------------------------------------------------------ company */
export const COMPANY = {
  legalName: 'Bandari Kavu Depots Ltd', tradingName: 'Bandari Kavu ICD', tin: '128-406-733', vrn: '40-031288-K',
  address: 'Plot 112, Nelson Mandela Road, P.O. Box 45210, Dar es Salaam', phone: '+255 22 286 4410', email: 'billing@bandarikavu.example',
  baseCurrency: 'TZS', bank: 'CRDB USD 0250-4471-8800 · NMB TZS 2071-0033-412', vfdSerial: '10TZ100877',
};

/* ------------------------------------------------------------------ approval limits (maker-checker) */
export const LIMITS = {
  waiverTwoLevelsUsd: 1000, creditNoteTwoLevelsUsd: 1000, refundApprovalUsd: 500,
  /** What a user may waive or credit without asking, by grant on billing.waiver / billing.creditnote. */
  ownLimitUsd: { APPR: 1000, DO: 250, REQ: 0, VIEW: 0 } as Record<string, number>,
};
export const APPROVERS = { l1: 'Grace Mrema · Finance manager', l2: 'Peter Lyimo · General manager' };
export const ME = 'Neema Mushi';

/* ------------------------------------------------------------------ exchange rates */
export type Rate = S<'ExchangeRate'> & { exchangeRateId: number; usedBy: number; enteredAt: string; enteredBy: string };
export const rates: Rate[] = [];
{
  let id = 400;
  for (const [d, r] of [['2026-07-01', '2618.40'], ['2026-08-01', '2641.75'], ['2026-09-01', '2652.10'], ['2026-10-01', '2661.30']] as const) {
    rates.push({ exchangeRateId: ++id, companyId: 1, fromCurrency: 'USD', toCurrency: 'TZS', rateDate: d, rate: r, rateKind: 'MONTHLY', sourceNote: 'Bank of Tanzania month-opening mean rate', usedBy: 0, enteredAt: at(daysBetween(d, TODAY) * 24 + 1.5), enteredBy: 'Grace Mrema' });
  }
  for (let i = 59; i >= 0; i--) {
    const d = day(-i);
    if (isSunday(d) || HOLIDAYS[d]) continue;
    const t = 59 - i;
    const v = 2646 + t * 0.32 + 6.5 * Math.sin(t / 7) + (rnd() - 0.5) * 3;
    rates.push({ exchangeRateId: ++id, companyId: 1, fromCurrency: 'USD', toCurrency: 'TZS', rateDate: d, rate: v.toFixed(2), rateKind: 'DAILY', sourceNote: pick(['BoT mean rate 09:00', 'BoT mean rate 09:00', 'CRDB treasury buying rate']), usedBy: 0, enteredAt: at(i * 24 + 2.4), enteredBy: i === 0 ? 'Grace Mrema' : pick(['Grace Mrema', 'Halima Said']) });
  }
}
/** The rate in force on a date: that day's daily rate, else the latest earlier daily rate in the month, else the monthly rate. */
export function rateOn(date: string): { rate: Rate; note: string } {
  const daily = rates.filter((r) => r.rateKind === 'DAILY' && r.rateDate <= date).sort((a, b) => b.rateDate.localeCompare(a.rateDate))[0];
  if (daily && daily.rateDate === date) return { rate: daily, note: 'Daily rate for this date' };
  if (daily && daily.rateDate.slice(0, 7) === date.slice(0, 7)) return { rate: daily, note: `No rate on ${dShort(date)}${isSunday(date) ? ' (Sunday)' : HOLIDAYS[date] ? ` (${HOLIDAYS[date]})` : ''}; last daily rate carries forward` };
  const monthly = rates.filter((r) => r.rateKind === 'MONTHLY' && r.rateDate <= date).sort((a, b) => b.rateDate.localeCompare(a.rateDate))[0];
  return { rate: monthly ?? rates[0], note: 'No daily rate; monthly rate used' };
}
export const fx = (date: string) => num(rateOn(date).rate.rate);

/* ------------------------------------------------------------------ charge and tax codes */
export const CHARGE_NAMES: Record<string, string> = {
  LIFT_ON_OFF: 'Lift on / lift off', STORAGE_IMPORT: 'Storage', STORAGE_TRANSIT: 'Storage (transit)', STORAGE_EMPTY: 'Empty storage',
  STORAGE_VEHICLE: 'Vehicle storage', REEFER_POWER: 'Reefer power', EXAM_HANDLING: 'Customs exam handling', HAZ_SURCHARGE: 'Dangerous goods surcharge',
  DOC_FEE: 'Documentation fee', CFS_HANDLING: 'CFS handling', VEH_HANDLING: 'Vehicle handling', WEIGHING: 'Weighbridge ticket',
  DISB_PORT: 'Port charges (paid on your behalf)', DISB_LINE: 'Shipping line charges (paid on your behalf)', DISB_DUTY: 'Customs duty (paid on your behalf)',
  DISB_HANDLING_FEE: 'Disbursement handling fee', MANUAL: 'Manual charge',
};
export const CHARGE_GROUP: Record<string, string> = {
  LIFT_ON_OFF: 'HANDLING', STORAGE_IMPORT: 'STORAGE', STORAGE_TRANSIT: 'STORAGE', STORAGE_EMPTY: 'STORAGE', STORAGE_VEHICLE: 'STORAGE',
  REEFER_POWER: 'REEFER', EXAM_HANDLING: 'INSPECTION', HAZ_SURCHARGE: 'SPECIAL', DOC_FEE: 'DOCUMENTATION', CFS_HANDLING: 'HANDLING',
  VEH_HANDLING: 'VEHICLE', WEIGHING: 'WEIGHING', DISB_PORT: 'DISBURSEMENT', DISB_LINE: 'DISBURSEMENT', DISB_DUTY: 'DISBURSEMENT', DISB_HANDLING_FEE: 'OTHER',
};
export const REVENUE_GL: Record<string, string> = {
  STORAGE: '4100 Storage income', HANDLING: '4110 Handling income', REEFER: '4120 Reefer income', INSPECTION: '4130 Exam & inspection income',
  DOCUMENTATION: '4140 Documentation income', VEHICLE: '4150 Vehicle yard income', SPECIAL: '4160 Special services income', WEIGHING: '4170 Weighing income',
  OTHER: '4190 Other operating income', DISBURSEMENT: '1450 Disbursement clearing',
};
export const TAX: Record<string, { name: string; pct: number }> = {
  VAT18: { name: 'VAT 18%', pct: 18 }, VAT0: { name: 'Zero-rated (transit)', pct: 0 }, OOS: { name: 'Outside VAT scope', pct: 0 }, EXEMPT: { name: 'Exempt', pct: 0 },
};
export const UOM: Record<string, string> = {
  PER_UNIT_DAY: 'day', PER_TEU_DAY: 'TEU-day', PER_UNIT: 'unit', PER_TEU: 'TEU', PER_MOVE: 'move', PER_VISIT: 'visit', PER_TONNE: 'tonne',
  PER_KWH: 'kWh', PER_HOUR: 'hour', PER_PACKAGE: 'package', FLAT: 'each',
};
export const BASIS_LABEL: Record<string, string> = {
  PER_UNIT_DAY: 'Per unit per day', PER_TEU_DAY: 'Per TEU per day', PER_UNIT: 'Per unit', PER_TEU: 'Per TEU', PER_MOVE: 'Per move', PER_VISIT: 'Per visit',
  PER_TONNE: 'Per tonne', PER_KWH: 'Per kWh', PER_HOUR: 'Per hour', PER_PACKAGE: 'Per package', FLAT: 'Flat',
};

/* ------------------------------------------------------------------ tariffs */
export type Rule = Omit<S<'TariffRule'>, 'slabs' | 'tariffRuleId'> & { tariffRuleId: number; slabs: S<'TariffSlab'>[] };
export type Tariff = Omit<S<'Tariff'>, 'rules'> & {
  tariffId: number; versionNo: number; status: NonNullable<S<'Tariff'>['status']>; rules: Rule[];
  updatedBy: string; submittedBy?: string; approvalNote?: string;
};
let ruleId = 6000;
const sl = (...rows: [number, number | null, number][]): S<'TariffSlab'>[] => rows.map(([f, t, r]) => ({ fromQty: String(f), toQty: t === null ? null : String(t), rate: m2(r) }));
const R = (chargeCode: string, basis: Rule['basis'], o: Partial<Rule> = {}): Rule => ({
  tariffRuleId: ++ruleId, chargeCode, basis, freeExclSundays: false, freeExclHolidays: false, taxCode: 'VAT18', sortOrder: ruleId, slabs: [], ...o,
});
function siteRules(storageUp = 1, vat = 'VAT18'): Rule[] {
  const s = (v: number) => r2(v * storageUp);
  return [
    R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', lengthFt: 20, flatRate: '60.00', taxCode: vat }),
    R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', lengthFt: 40, flatRate: '90.00', taxCode: vat }),
    R('STORAGE_IMPORT', 'PER_UNIT_DAY', { unitCategory: 'CONTAINER', lengthFt: 20, fullEmpty: 'F', clockStart: 'DISCHARGE', freeDays: 7, taxCode: vat, slabs: sl([1, 7, 0], [8, 14, s(8)], [15, 30, s(12)], [31, null, s(20)]) }),
    R('STORAGE_IMPORT', 'PER_UNIT_DAY', { unitCategory: 'CONTAINER', lengthFt: 40, fullEmpty: 'F', clockStart: 'DISCHARGE', freeDays: 7, taxCode: vat, slabs: sl([1, 7, 0], [8, 14, s(16)], [15, 30, s(24)], [31, null, s(40)]) }),
    R('STORAGE_EMPTY', 'PER_TEU_DAY', { unitCategory: 'CONTAINER', fullEmpty: 'E', clockStart: 'GATE_IN', freeDays: 5, taxCode: vat, slabs: sl([1, 5, 0], [6, null, s(3)]) }),
    R('REEFER_POWER', 'PER_KWH', { unitCategory: 'CONTAINER', isReefer: true, flatRate: '0.42', minCharge: '15.00', taxCode: vat }),
    R('EXAM_HANDLING', 'PER_UNIT', { unitCategory: 'CONTAINER', lengthFt: 20, flatRate: '80.00', taxCode: vat }),
    R('EXAM_HANDLING', 'PER_UNIT', { unitCategory: 'CONTAINER', lengthFt: 40, flatRate: '120.00', taxCode: vat }),
    R('HAZ_SURCHARGE', 'PER_UNIT', { isHazardous: true, flatRate: '75.00', taxCode: vat }),
    R('CFS_HANDLING', 'PER_TONNE', { unitCategory: 'LOT', flatRate: '12.00', minCharge: '25.00', taxCode: vat }),
    R('DOC_FEE', 'FLAT', { flatRate: '50.00', taxCode: vat }),
  ];
}
function vehicleRules(vat = 'VAT18', free = 7): Rule[] {
  return [
    R('VEH_HANDLING', 'PER_UNIT', { unitCategory: 'VEHICLE', flatRate: '45.00', taxCode: vat }),
    R('STORAGE_VEHICLE', 'PER_UNIT_DAY', { unitCategory: 'VEHICLE', vehicleClass: 'CAR_SUV', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 10], [15 + free - 7, null, 15]) }),
    R('STORAGE_VEHICLE', 'PER_UNIT_DAY', { unitCategory: 'VEHICLE', vehicleClass: 'TRUCK_LIGHT', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 15], [15 + free - 7, null, 25]) }),
    R('STORAGE_VEHICLE', 'PER_UNIT_DAY', { unitCategory: 'VEHICLE', vehicleClass: 'TRACTOR', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 15], [15 + free - 7, null, 25]) }),
    R('DOC_FEE', 'FLAT', { flatRate: '35.00', taxCode: vat }),
  ];
}
const transitRules = (): Rule[] => [
  R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', lengthFt: 20, flatRate: '60.00', taxCode: 'VAT0' }),
  R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', lengthFt: 40, flatRate: '90.00', taxCode: 'VAT0' }),
  R('STORAGE_TRANSIT', 'PER_UNIT_DAY', { unitCategory: 'CONTAINER', lengthFt: 20, clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 30, 10], [31, null, 20]) }),
  R('STORAGE_TRANSIT', 'PER_UNIT_DAY', { unitCategory: 'CONTAINER', lengthFt: 40, clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 30, 20], [31, null, 40]) }),
  R('EXAM_HANDLING', 'PER_UNIT', { unitCategory: 'CONTAINER', flatRate: '100.00', taxCode: 'VAT0' }),
  ...vehicleRules('VAT0', 14),
  R('DOC_FEE', 'FLAT', { flatRate: '50.00', taxCode: 'VAT0' }),
].filter((r, i, a) => !(r.chargeCode === 'DOC_FEE' && a.findIndex((x) => x.chargeCode === 'DOC_FEE') !== i));

export const tariffs: Tariff[] = [
  { tariffId: 31, tariffCode: 'TRF-DAR1-STD', tariffName: 'Main yard standard tariff', level: 'SITE', companyId: 1, siteId: 1, currency: 'USD', versionNo: 3, effectiveFrom: '2026-07-01', status: 'ACTIVE', regulatorRef: 'Published tariff book 2026/27', rules: siteRules(), updatedBy: 'Grace Mrema', remarks: 'Free days count Sundays and public holidays.' },
  { tariffId: 32, tariffCode: 'TRF-DAR1-STD', tariffName: 'Main yard standard tariff', level: 'SITE', companyId: 1, siteId: 1, currency: 'USD', versionNo: 4, effectiveFrom: '2027-01-01', status: 'DRAFT', rules: siteRules(1.1), updatedBy: 'Neema Mushi', remarks: 'Storage slabs up 10% from 1 Jan 2027. Handling unchanged.' },
  { tariffId: 30, tariffCode: 'TRF-DAR1-STD', tariffName: 'Main yard standard tariff', level: 'SITE', companyId: 1, siteId: 1, currency: 'USD', versionNo: 2, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', status: 'RETIRED', rules: siteRules(0.9), updatedBy: 'Grace Mrema' },
  { tariffId: 41, tariffCode: 'TRF-TRANSIT', tariffName: 'Transit cargo (Zambia, DRC, Rwanda, Uganda)', level: 'REGIME', companyId: 1, regimeCode: 'TRANSIT', currency: 'USD', versionNo: 2, effectiveFrom: '2026-07-01', status: 'ACTIVE', rules: transitRules(), updatedBy: 'Grace Mrema', remarks: '14 free days. Services zero-rated for VAT: verify with tax adviser.' },
  { tariffId: 51, tariffCode: 'TRF-DAR2-VEH', tariffName: 'Vehicle yard standard tariff', level: 'SITE', companyId: 1, siteId: 2, currency: 'USD', versionNo: 1, effectiveFrom: '2026-07-01', status: 'ACTIVE', rules: vehicleRules(), updatedBy: 'Grace Mrema' },
  { tariffId: 61, tariffCode: 'TRF-BML-EMPTY', tariffName: 'Blue Meridian Line empties', level: 'LINE', companyId: 1, partyId: 4, currency: 'USD', versionNo: 1, effectiveFrom: '2026-04-01', status: 'ACTIVE', updatedBy: 'Grace Mrema', rules: [
    R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', fullEmpty: 'E', flatRate: '35.00' }),
    R('STORAGE_EMPTY', 'PER_TEU_DAY', { unitCategory: 'CONTAINER', fullEmpty: 'E', clockStart: 'GATE_IN', freeDays: 10, slabs: sl([1, 10, 0], [11, null, 2.5]) }),
  ] },
  { tariffId: 71, tariffCode: 'TRF-KILELE-26', tariffName: 'Kilele contract rates 2026/27', level: 'CUSTOMER', companyId: 1, partyId: 2, currency: 'USD', versionNo: 1, effectiveFrom: '2026-11-01', effectiveTo: '2027-10-31', status: 'PENDING_APPROVAL', updatedBy: 'Neema Mushi', submittedBy: 'Neema Mushi', approvalNote: 'Waiting for Grace Mrema (finance manager) since 5 Oct', remarks: 'Volume contract: 10 free days, Sundays and holidays do not count.', rules: [
    R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', lengthFt: 20, flatRate: '55.00' }),
    R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', lengthFt: 40, flatRate: '80.00' }),
    R('STORAGE_IMPORT', 'PER_UNIT_DAY', { unitCategory: 'CONTAINER', lengthFt: 20, fullEmpty: 'F', clockStart: 'DISCHARGE', freeDays: 10, freeExclSundays: true, freeExclHolidays: true, slabs: sl([1, 10, 0], [11, 30, 7], [31, null, 15]) }),
    R('STORAGE_IMPORT', 'PER_UNIT_DAY', { unitCategory: 'CONTAINER', lengthFt: 40, fullEmpty: 'F', clockStart: 'DISCHARGE', freeDays: 10, freeExclSundays: true, freeExclHolidays: true, slabs: sl([1, 10, 0], [11, 30, 14], [31, null, 30]) }),
  ] },
  { tariffId: 81, tariffCode: 'TRF-KBH1-WH', tariffName: 'Kibaha warehouse tariff', level: 'SITE', companyId: 1, siteId: 3, currency: 'USD', versionNo: 1, effectiveFrom: '2026-07-01', status: 'ACTIVE', updatedBy: 'Grace Mrema', rules: [
    R('CFS_HANDLING', 'PER_TONNE', { unitCategory: 'LOT', flatRate: '10.00', minCharge: '20.00' }),
    R('DOC_FEE', 'FLAT', { flatRate: '30.00' }),
  ] },
];
export const tariff = (id: number) => tariffs.find((t) => t.tariffId === id);

/* ------------------------------------------------------------------ rating engine */
export type Line = S<'ChargeLine'> & {
  key: string; chargeName: string; unitCategory?: string; consignmentId?: number | null; billToPartyId: number;
  taxCode: string; taxPct: number; how: string[]; ruleId?: number; kind?: 'NORMAL' | 'MANUAL' | 'DISBURSEMENT';
};
const lengthOf = (t: string) => (t.startsWith('2') ? 20 : t.startsWith('4') ? 40 : undefined);
export const billToOf = (s: Stay) => consignment(s.consignmentId)?.billToPartyId ?? s.linePartyId ?? 2;

/** Which active tariff rates this stay: customer, then line, then regime, then site. */
export function tariffFor(s: Stay, opts: { includePending?: boolean } = {}): Tariff {
  const ok = (t: Tariff) => t.status === 'ACTIVE' || (opts.includePending && t.status === 'PENDING_APPROVAL');
  const bill = billToOf(s);
  return tariffs.find((t) => ok(t) && t.level === 'CUSTOMER' && t.partyId === bill)
    ?? (s.fullEmpty === 'E' ? tariffs.find((t) => ok(t) && t.level === 'LINE' && t.partyId === s.linePartyId) : undefined)
    ?? (s.cargoRegimeCode === 'TRANSIT' ? tariffs.find((t) => ok(t) && t.level === 'REGIME' && t.regimeCode === 'TRANSIT') : undefined)
    ?? tariffs.find((t) => ok(t) && t.level === 'SITE' && t.siteId === s.siteId)!;
}
function ruleMatches(r: Rule, s: Stay) {
  const u = s.cargoUnit;
  if (r.unitCategory && r.unitCategory !== u.category) return false;
  if (r.lengthFt && r.lengthFt !== lengthOf(u.unitTypeCode)) return false;
  if (r.fullEmpty && r.fullEmpty !== s.fullEmpty) return false;
  if (r.isReefer && !u.unitTypeCode.includes('R')) return false;
  if (r.isHazardous && !s.imoClass) return false;
  if (r.vehicleClass && r.vehicleClass !== u.unitTypeCode) return false;
  return true;
}
const kwhPerDay = (s: Stay) => 38 + ((s.unitStayId ?? 0) % 14);
const tonnes = (s: Stay) => 3 + ((s.unitStayId ?? 0) % 9);

/** Storage clock start, free window and the chargeable calendar days. */
export function storageClock(s: Stay, r: Rule) {
  const startIso = r.clockStart === 'GATE_IN' ? s.gatedInAt : s.dischargeAt ?? s.gatedInAt;
  if (!startIso) return null;
  const start = eatDate(startIso);
  const free = r.freeDays ?? 0;
  let counted = 0, dayNo = 0, sundays = 0, hols: string[] = [];
  let d = start;
  while (counted < free) {
    dayNo++;
    const sun = isSunday(d), hol = HOLIDAYS[d];
    if (sun) sundays++;
    if (hol) hols.push(hol);
    const skip = (sun && r.freeExclSundays) || (hol && r.freeExclHolidays);
    if (!skip) counted++;
    if (counted < free) d = addDays(d, 1);
  }
  hols = [...new Set(hols)];
  return { start, freeEnd: d, freeEndDayNo: dayNo, sundays, hols, extended: dayNo - free };
}

export function rateStay(s: Stay, through: string, opts: { includePending?: boolean; tariffOverride?: Tariff } = {}): Line[] {
  const t = opts.tariffOverride ?? tariffFor(s, opts);
  const out: Line[] = [];
  const u = s.cargoUnit;
  const bill = billToOf(s);
  const base = (r: Rule, extra: Partial<Line>): Line => {
    const qty = num(extra.quantity);
    const rate = num(extra.unitRate);
    let amount = r2(qty * rate);
    const how = [...(extra.how ?? [])];
    if (r.minCharge && amount < num(r.minCharge)) { how.push(`Minimum charge USD ${r.minCharge} applies`); amount = num(r.minCharge); }
    if (r.maxCharge && amount > num(r.maxCharge)) { how.push(`Capped at maximum USD ${r.maxCharge}`); amount = num(r.maxCharge); }
    const taxCode = r.taxCode ?? 'VAT18';
    const pct = TAX[taxCode]?.pct ?? 18;
    return {
      key: `${s.unitStayId}-${r.tariffRuleId}-${extra.serviceFrom ?? ''}`, unitStayId: s.unitStayId, unitNo: u.unitNo, unitCategory: u.category,
      consignmentId: s.consignmentId, billToPartyId: bill, chargeCode: r.chargeCode, chargeName: CHARGE_NAMES[r.chargeCode] ?? r.chargeCode,
      description: CHARGE_NAMES[r.chargeCode] ?? r.chargeCode, uom: UOM[r.basis], tariffCode: t.tariffCode, tariffVersion: t.versionNo, ruleId: r.tariffRuleId,
      taxCode, taxPct: pct, kind: 'NORMAL',
      ...extra, how, amount: m2(amount), taxAmount: m2((amount * pct) / 100), quantity: String(qty), unitRate: m2(rate),
    };
  };
  const gateIn = s.gatedInAt ? eatDate(s.gatedInAt) : null;
  for (const r of t.rules.filter((x) => x.chargeCode !== 'DOC_FEE' && ruleMatches(x, s))) {
    if (r.basis === 'PER_UNIT_DAY' || r.basis === 'PER_TEU_DAY') {
      const c = storageClock(s, r);
      if (!c || c.start > through) continue;
      const totalDays = daysBetween(c.start, through) + 1;
      const teu = r.basis === 'PER_TEU_DAY' ? (lengthOf(u.unitTypeCode) === 40 ? 2 : 1) : 1;
      const clockHow = `Clock starts at ${r.clockStart === 'GATE_IN' ? 'gate-in' : 'vessel discharge'} ${dShort(c.start)}`;
      const freeHow = `Free days 1–${c.freeEndDayNo}: ${dShort(c.start)}–${dShort(c.freeEnd)}` +
        (r.freeExclSundays || r.freeExclHolidays
          ? ` (${r.freeDays} free days; ${c.extended} Sunday${c.extended === 1 ? '' : 's'}/holiday${c.extended === 1 ? '' : 's'} skipped)`
          : `; Sundays${c.sundays ? ` (${c.sundays})` : ''} and holidays${c.hols.length ? ` (${c.hols.join(', ')})` : ''} count as free days`);
      if (totalDays <= c.freeEndDayNo) {
        out.push(base(r, { serviceFrom: c.start, serviceTo: through, quantity: '0', unitRate: '0', description: `${CHARGE_NAMES[r.chargeCode]}: within free days`, how: [clockHow, freeHow, `Day ${totalDays} of ${c.freeEndDayNo} free: nothing to pay yet`] }));
        continue;
      }
      for (const sb of r.slabs.filter((x) => num(x.rate) > 0)) {
        const from = Math.max(num(sb.fromQty), c.freeEndDayNo + 1);
        const to = Math.min(sb.toQty === null || sb.toQty === undefined ? Infinity : num(sb.toQty), totalDays);
        if (to < from) continue;
        const days = to - from + 1;
        out.push(base(r, {
          serviceFrom: addDays(c.start, from - 1), serviceTo: addDays(c.start, to - 1), quantity: String(days * teu), unitRate: sb.rate,
          description: `${CHARGE_NAMES[r.chargeCode]}, days ${from}–${to}`,
          how: [clockHow, freeHow, `Slab days ${sb.fromQty}–${sb.toQty ?? '…'} at USD ${sb.rate}${teu > 1 ? ` × ${teu} TEU` : ''}: ${days} day${days === 1 ? '' : 's'}`],
        }));
      }
    } else if (r.basis === 'PER_MOVE') {
      if (!gateIn || gateIn > through) continue;
      out.push(base(r, { serviceFrom: gateIn, serviceTo: gateIn, quantity: '1', unitRate: r.flatRate ?? '0', how: [`Lift off at gate-in ${dShort(gateIn)}; lift on at delivery included`, `${BASIS_LABEL[r.basis]} at USD ${r.flatRate}`] }));
    } else if (r.basis === 'PER_KWH') {
      if (!gateIn) continue;
      const days = Math.max(1, daysBetween(gateIn, through) + 1);
      const k = kwhPerDay(s) * days;
      out.push(base(r, { serviceFrom: gateIn, serviceTo: through, quantity: String(k), unitRate: r.flatRate ?? '0', how: [`Plugged in ${dShort(gateIn)}; meter readings ${days} day${days === 1 ? '' : 's'}, about ${kwhPerDay(s)} kWh a day`, `USD ${r.flatRate} per kWh`] }));
    } else if (r.basis === 'PER_UNIT') {
      const exam = r.chargeCode === 'EXAM_HANDLING';
      if (exam && !(s.customsStatus === 'UNDER_EXAM' || (s.customsStatus === 'CLEARED' && (s.unitStayId ?? 0) % 3 === 0))) continue;
      if (!gateIn) continue;
      out.push(base(r, { serviceFrom: gateIn, serviceTo: gateIn, quantity: '1', unitRate: r.flatRate ?? '0', how: [exam ? 'Unit moved to exam bay for customs examination' : r.chargeCode === 'HAZ_SURCHARGE' ? `IMO class ${s.imoClass} cargo` : 'Vehicle received and parked', `${BASIS_LABEL[r.basis]} at USD ${r.flatRate}`] }));
    } else if (r.basis === 'PER_TONNE') {
      if (!gateIn) continue;
      out.push(base(r, { serviceFrom: gateIn, serviceTo: gateIn, quantity: String(tonnes(s)), unitRate: r.flatRate ?? '0', how: [`${tonnes(s)} revenue tonnes tallied at CFS receipt`, `USD ${r.flatRate} per tonne`] }));
    }
  }
  return out;
}

/** Rate several stays to a date: adds one documentation fee per consignment. */
export function rateStays(stays: Stay[], through: string, opts: { includePending?: boolean } = {}): Line[] {
  const lines = stays.flatMap((s) => rateStay(s, through, opts));
  const byCons = new Map<number, Stay>();
  for (const s of stays) if (s.consignmentId && !byCons.has(s.consignmentId)) byCons.set(s.consignmentId, s);
  for (const [cid, s] of byCons) {
    const t = tariffFor(s, opts);
    const r = t.rules.find((x) => x.chargeCode === 'DOC_FEE');
    if (!r) continue;
    const pct = TAX[r.taxCode ?? 'VAT18'].pct;
    const amt = num(r.flatRate);
    lines.push({
      key: `doc-${cid}`, consignmentId: cid, billToPartyId: billToOf(s), chargeCode: 'DOC_FEE', chargeName: CHARGE_NAMES.DOC_FEE,
      description: `Documentation fee, ${consignment(cid)?.refNo}`, serviceFrom: through, serviceTo: through, quantity: '1', uom: 'each',
      unitRate: m2(amt), amount: m2(amt), taxCode: r.taxCode ?? 'VAT18', taxPct: pct, taxAmount: m2((amt * pct) / 100), tariffCode: t.tariffCode,
      tariffVersion: t.versionNo, ruleId: r.tariffRuleId, how: ['One documentation fee per consignment per invoice', `USD ${r.flatRate} flat`], kind: 'NORMAL',
    });
  }
  return lines.filter((l) => num(l.amount) > 0 || l.chargeCode.startsWith('STORAGE'));
}
export const sumLines = (ls: { amount: string; taxAmount: string }[]) => {
  const sub = r2(ls.reduce((a, l) => a + num(l.amount), 0));
  const tax = r2(ls.reduce((a, l) => a + num(l.taxAmount), 0));
  return { subtotal: sub, tax, total: r2(sub + tax) };
};
/** Release validity a payment through this date gives: end of that day. */
export const releaseValidTo = (through: string) => `${dLong(through)}, 23:59`;

/* ------------------------------------------------------------------ uninvoiced charges */
export type ChargeRow = Line & { chargeId: number; status: 'OPEN' | 'WAIVER_PENDING'; ratedAt: string; waiverNote?: string };
let chargeId = 70000;
const billable = allStays.filter((s) => s.billingStatus === 'ACCRUING' && s.physicalStatus !== 'EXPECTED' && s.physicalStatus !== 'DEPARTED');
export const charges: ChargeRow[] = rateStays(billable, TODAY)
  .filter((l) => num(l.amount) > 0)
  .map((l) => ({ ...l, chargeId: ++chargeId, status: 'OPEN' as const, ratedAt: at(int(1, 30)) }));
// two manual charges and one waiver waiting for approval, so the rules show
{
  const hero = allStays[0];
  charges.push({
    key: 'man-1', chargeId: ++chargeId, status: 'OPEN', ratedAt: at(4), unitStayId: hero.unitStayId, unitNo: hero.cargoUnit.unitNo, unitCategory: 'CONTAINER',
    consignmentId: hero.consignmentId, billToPartyId: billToOf(hero), chargeCode: 'WEIGHING', chargeName: CHARGE_NAMES.WEIGHING, description: 'Weighbridge ticket WB-DAR1-26-08812 (customer request)',
    serviceFrom: day(-1), serviceTo: day(-1), quantity: '1', uom: 'visit', unitRate: '25.00', amount: '25.00', taxCode: 'VAT18', taxPct: 18, taxAmount: '4.50',
    how: ['Manual charge by Neema Mushi', 'Approved by Grace Mrema · 6 Oct 15:12'], kind: 'MANUAL',
  });
  const big = charges.find((c) => c.chargeCode === 'STORAGE_IMPORT');
  if (big) Object.assign(big, { status: 'WAIVER_PENDING', waiverNote: '50% waiver requested by Neema Mushi: customs exam delay' });
}
export const openCharges = (siteId: number) => charges.filter((c) => {
  const s = c.unitStayId ? allStays.find((x) => x.unitStayId === c.unitStayId) : undefined;
  return s ? s.siteId === siteId : consignment(c.consignmentId)?.vesselCallId !== 13 ? siteId === 1 : siteId === 2;
});

/* ------------------------------------------------------------------ invoices */
export type DocKind = NonNullable<S<'Invoice'>['docKind']>;
export type FiscalStatus = 'PENDING' | 'ISSUED' | 'FAILED';
export type GlStatus = 'PENDING' | 'POSTED' | 'FAILED';
export type InvLine = S<'InvoiceLine'> & { lineNo: number; description: string; quantity: string; unitRate: string; amount: string; taxAmount: string; lineTotal: string; taxCode: string; taxRatePct: string; uom: string; how?: string[] };
export type Invoice = Omit<S<'Invoice'>, 'lines'> & {
  invoiceId: number; invoiceNo: string; docKind: DocKind; status: NonNullable<S<'Invoice'>['status']>; siteId: number;
  invoiceDate: string; exchangeRate: string; exchangeRateDate: string; subtotal: string; taxTotal: string; total: string; totalBase: string;
  amountPaid: string; amountCredited: string; balance: string; lines: InvLine[]; glStatus: GlStatus | null; createdBy: string;
  consignmentRef?: string; releaseValidTo?: string; zeroRated?: boolean;
};
const SITE_CODE: Record<number, string> = { 1: 'DAR1', 2: 'DAR2', 3: 'KBH1' };
const PREFIX: Record<DocKind, string> = { PROFORMA: 'PRO', TAX_INVOICE: 'INV', CREDIT_NOTE: 'CN', DEBIT_NOTE: 'DN' };

function toInvLines(ls: Line[], currency: string, rate: number): InvLine[] {
  return ls.filter((l) => num(l.amount) > 0).map((l, i) => {
    const k = currency === 'TZS' ? rate : 1;
    const amount = r2(num(l.amount) * k);
    const tax = r2((amount * l.taxPct) / 100);
    return {
      lineNo: i + 1, chargeCode: l.chargeCode, unitStayId: l.unitStayId ?? undefined, unitNo: l.unitNo ?? undefined, description: l.description,
      serviceFrom: l.serviceFrom ?? undefined, serviceTo: l.serviceTo ?? undefined, quantity: l.quantity, uom: l.uom, unitRate: m2(num(l.unitRate) * k),
      amount: m2(amount), taxCode: l.taxCode, taxRatePct: String(l.taxPct), taxAmount: m2(tax), lineTotal: m2(amount + tax), how: l.how,
    };
  });
}
/** Synthetic lines for older invoices whose units have left the depot. */
function historicLines(n: number, through: string, transit: boolean): Line[] {
  const out: Line[] = [];
  for (let i = 0; i < n; i++) {
    const unitNo = containerNo(pick(['BMLU', 'IOSU', 'SCLU']));
    const forty = rnd() < 0.6;
    const v = transit ? 'VAT0' : 'VAT18', pct = transit ? 0 : 18;
    const start = addDays(through, -int(9, 26));
    const add = (code: string, desc: string, qty: number, rate: number, from: string, to: string) => {
      const amt = r2(qty * rate);
      out.push({ key: `${unitNo}-${code}-${from}`, unitNo, unitCategory: 'CONTAINER', billToPartyId: 0, chargeCode: code, chargeName: CHARGE_NAMES[code], description: desc, serviceFrom: from, serviceTo: to, quantity: String(qty), uom: code.startsWith('STORAGE') ? 'day' : 'move', unitRate: m2(rate), amount: m2(amt), taxCode: v, taxPct: pct, taxAmount: m2((amt * pct) / 100), how: [] });
    };
    add('LIFT_ON_OFF', CHARGE_NAMES.LIFT_ON_OFF, 1, forty ? 90 : 60, start, start);
    const days = daysBetween(start, through) + 1;
    const free = transit ? 14 : 7;
    if (days > free) {
      const s1 = Math.min(days, transit ? 30 : 14);
      if (s1 > free) add(transit ? 'STORAGE_TRANSIT' : 'STORAGE_IMPORT', `Storage, days ${free + 1}–${s1}`, s1 - free, transit ? (forty ? 20 : 10) : forty ? 16 : 8, addDays(start, free), addDays(start, s1 - 1));
      if (!transit && days > 14) add('STORAGE_IMPORT', `Storage, days 15–${days}`, days - 14, forty ? 24 : 12, addDays(start, 14), through);
    }
  }
  return out;
}

interface Spec {
  id: number; no: number; kind: DocKind; status: Invoice['status']; site?: number; bill: number; cons?: number; date: number; through?: number;
  units?: number; hist?: number; cur?: 'USD' | 'TZS'; paid?: number; fiscal?: FiscalStatus | null; gl?: GlStatus | null; disb?: boolean;
  orig?: number; proforma?: number; reason?: string; by?: string; creditPart?: number;
}
const specs: Spec[] = [
  // older posted invoices (statement history and ageing)
  { id: 1201, no: 3268, kind: 'TAX_INVOICE', status: 'POSTED', bill: 2, cons: 103, date: -104, hist: 3, paid: 0, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1202, no: 3274, kind: 'TAX_INVOICE', status: 'PART_PAID', bill: 2, cons: 101, date: -78, hist: 2, paid: 0.4, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1203, no: 3279, kind: 'TAX_INVOICE', status: 'PAID', bill: 1, cons: 109, date: -66, hist: 3, paid: 1, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1204, no: 3283, kind: 'TAX_INVOICE', status: 'POSTED', bill: 1, cons: 109, date: -47, hist: 2, paid: 0, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1205, no: 3287, kind: 'TAX_INVOICE', status: 'PAID', bill: 2, cons: 101, date: -40, hist: 4, paid: 1, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1206, no: 3291, kind: 'TAX_INVOICE', status: 'PART_PAID', bill: 2, cons: 103, date: -29, hist: 3, paid: 0.5, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1207, no: 3295, kind: 'TAX_INVOICE', status: 'PAID', bill: 11, cons: 102, date: -22, hist: 2, paid: 1, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1208, no: 3298, kind: 'TAX_INVOICE', status: 'POSTED', bill: 1, cons: 109, date: -18, hist: 2, paid: 0, fiscal: 'ISSUED', gl: 'FAILED' },
  { id: 1209, no: 3301, kind: 'TAX_INVOICE', status: 'PAID', bill: 14, cons: 104, date: -15, hist: 2, paid: 1, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1210, no: 3304, kind: 'TAX_INVOICE', status: 'POSTED', bill: 2, cons: 101, date: -12, hist: 3, paid: 0, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1211, no: 3306, kind: 'TAX_INVOICE', status: 'PAID', bill: 10, cons: 107, date: -9, hist: 2, paid: 1, fiscal: 'ISSUED', gl: 'POSTED', cur: 'TZS' },
  { id: 1212, no: 3308, kind: 'TAX_INVOICE', status: 'POSTED', bill: 1, cons: 109, date: -6, hist: 2, paid: 0, fiscal: 'ISSUED', gl: 'POSTED' },
  // the hero invoice: converted from a paid proforma, storage paid through 10 Oct
  { id: 1220, no: 3310, kind: 'TAX_INVOICE', status: 'PART_PAID', bill: 2, cons: 101, date: -1, through: 3, units: 3, paid: 0.6, fiscal: 'ISSUED', gl: 'POSTED', disb: true, proforma: 1240 },
  { id: 1221, no: 3312, kind: 'TAX_INVOICE', status: 'PAID', bill: 11, cons: 102, date: -1, through: 1, units: 2, paid: 1, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1222, no: 3314, kind: 'TAX_INVOICE', status: 'POSTED', bill: 2, cons: 103, date: -1, through: 4, units: 3, paid: 0, fiscal: 'ISSUED', gl: 'POSTED' },
  { id: 1223, no: 3316, kind: 'TAX_INVOICE', status: 'PAID', bill: 13, cons: 108, date: 0, through: 1, units: 2, paid: 1, fiscal: 'ISSUED', gl: 'PENDING' },
  { id: 1224, no: 3318, kind: 'TAX_INVOICE', status: 'POSTED', bill: 11, cons: 102, date: 0, through: 2, units: 1, paid: 0, fiscal: 'FAILED', gl: 'PENDING' },
  { id: 1225, no: 3319, kind: 'TAX_INVOICE', status: 'POSTED', bill: 1, cons: 109, date: 0, through: 2, units: 2, paid: 0, fiscal: 'PENDING', gl: 'PENDING' },
  { id: 1226, no: 3320, kind: 'TAX_INVOICE', status: 'DRAFT', bill: 2, cons: 103, date: 0, through: 5, units: 2, fiscal: null, gl: null, by: 'Neema Mushi' },
  { id: 1230, no: 841, kind: 'TAX_INVOICE', status: 'PAID', site: 2, bill: 3, cons: 105, date: -1, through: 2, units: 3, paid: 1, fiscal: 'ISSUED', gl: 'POSTED', proforma: 1243 },
  { id: 1231, no: 844, kind: 'TAX_INVOICE', status: 'POSTED', site: 2, bill: 2, cons: 106, date: 0, through: 3, units: 2, paid: 0, fiscal: 'ISSUED', gl: 'PENDING' },
  // proformas
  { id: 1240, no: 2051, kind: 'PROFORMA', status: 'CONVERTED', bill: 2, cons: 101, date: -2, through: 3, units: 3, paid: 0, fiscal: null, gl: null, disb: true },
  { id: 1241, no: 2058, kind: 'PROFORMA', status: 'ISSUED', bill: 14, cons: 104, date: -1, through: 2, units: 3, paid: 0, fiscal: null, gl: null },
  { id: 1242, no: 2060, kind: 'PROFORMA', status: 'ISSUED', bill: 13, cons: 108, date: 0, through: 3, units: 1, paid: 1, fiscal: null, gl: null },
  { id: 1243, no: 2049, kind: 'PROFORMA', status: 'CONVERTED', site: 2, bill: 3, cons: 105, date: -2, through: 2, units: 3, paid: 0, fiscal: null, gl: null },
  { id: 1244, no: 2061, kind: 'PROFORMA', status: 'ISSUED', site: 2, bill: 3, cons: 105, date: 0, through: 4, units: 2, paid: 0, fiscal: null, gl: null },
  { id: 1245, no: 2062, kind: 'PROFORMA', status: 'ISSUED', bill: 10, cons: 107, date: 0, through: 6, units: 2, paid: 0, fiscal: null, gl: null, cur: 'TZS' },
  // notes
  { id: 1250, no: 212, kind: 'CREDIT_NOTE', status: 'POSTED', bill: 2, cons: 101, date: -8, orig: 1210, creditPart: 0.25, fiscal: 'ISSUED', gl: 'POSTED', reason: 'Storage waived 3 days: depot reach stacker breakdown delayed delivery' },
  { id: 1251, no: 48, kind: 'DEBIT_NOTE', status: 'POSTED', bill: 1, cons: 109, date: -5, orig: 1204, creditPart: 0.12, fiscal: 'ISSUED', gl: 'POSTED', reason: 'CFS handling under-charged: 4 revenue tonnes missed at tally' },
];

const invById = new Map<number, Invoice>();
export const invoices: Invoice[] = [];
for (const sp of specs) {
  const site = sp.site ?? 1;
  const date = day(sp.date);
  const cur = sp.cur ?? 'USD';
  const rate = fx(date);
  const rRec = rateOn(date).rate;
  const through = sp.through !== undefined ? day(sp.through) : date;
  const cons = sp.cons ? consignment(sp.cons) : undefined;
  let lines: InvLine[] = [];
  let reason = sp.reason;
  if (sp.orig) {
    const o = invById.get(sp.orig)!;
    const part = sp.creditPart ?? 0.2;
    const src = o.lines.filter((l) => l.chargeCode?.startsWith('STORAGE') || l.chargeCode === 'CFS_HANDLING' || l.chargeCode === 'LIFT_ON_OFF').slice(0, 2);
    lines = src.map((l, i) => {
      const amt = r2(num(l.amount) * part * 2);
      const tax = r2((amt * num(l.taxRatePct)) / 100);
      return { ...l, lineNo: i + 1, description: `${sp.kind === 'CREDIT_NOTE' ? 'Credit' : 'Additional charge'}: ${l.description}`, quantity: '1', unitRate: m2(amt), amount: m2(amt), taxAmount: m2(tax), lineTotal: m2(amt + tax) };
    });
  } else if (sp.units) {
    const stays = allStays.filter((s) => s.consignmentId === sp.cons && s.physicalStatus !== 'EXPECTED' && s.siteId === site);
    const pickS = (sp.id === 1220 ? [allStays[0], ...stays.filter((s) => s !== allStays[0])] : stays).slice(0, sp.units);
    let ls = rateStays(pickS, through);
    if (sp.disb) {
      const amt = 145.0, fee = 15.0;
      ls = ls.concat([
        { key: 'd1', billToPartyId: sp.bill, chargeCode: 'DISB_PORT', chargeName: CHARGE_NAMES.DISB_PORT, description: 'Port charges paid on your behalf, receipt PA-DSM-26-551902', serviceFrom: day(-4), serviceTo: day(-4), quantity: '1', uom: 'each', unitRate: m2(amt), amount: m2(amt), taxCode: 'OOS', taxPct: 0, taxAmount: '0.00', how: ['Re-billed at cost; outside VAT scope'] },
        { key: 'd2', billToPartyId: sp.bill, chargeCode: 'DISB_HANDLING_FEE', chargeName: CHARGE_NAMES.DISB_HANDLING_FEE, description: 'Disbursement handling fee', serviceFrom: day(-4), serviceTo: day(-4), quantity: '1', uom: 'each', unitRate: m2(fee), amount: m2(fee), taxCode: 'VAT18', taxPct: 18, taxAmount: m2(fee * 0.18), how: ['Handling fee on disbursement DSB-DAR1-26-0187'] },
      ]);
    }
    lines = toInvLines(ls, cur, rate);
  } else {
    lines = toInvLines(historicLines(sp.hist ?? 2, date, cons?.cargoRegimeCode === 'TRANSIT'), cur, rate);
  }
  const sub = r2(lines.reduce((a, l) => a + num(l.amount), 0));
  const tax = r2(lines.reduce((a, l) => a + num(l.taxAmount), 0));
  const total = r2(sub + tax);
  const paidAmt = r2(total * (sp.paid ?? 0));
  const credited = 0;
  const posted = sp.status !== 'DRAFT' && sp.kind !== 'PROFORMA';
  const inv: Invoice = {
    invoiceId: sp.id, invoiceNo: `${PREFIX[sp.kind]}-${SITE_CODE[site]}-26-${String(sp.no).padStart(6, '0')}`, docKind: sp.kind, status: sp.status, siteId: site,
    billToPartyId: sp.bill, consignmentId: sp.cons, consignmentRef: cons?.refNo, currency: cur, baseCurrency: 'TZS',
    exchangeRate: rRec.rate, exchangeRateDate: rRec.rateDate, invoiceDate: date, dueDate: party(sp.bill)?.creditStatus === 'CREDIT' && sp.kind !== 'PROFORMA' ? addDays(date, 30) : date,
    serviceToDate: through, subtotal: m2(sub), taxTotal: m2(tax), total: m2(total), totalBase: m2(cur === 'TZS' ? total : total * rate),
    amountPaid: m2(paidAmt), amountCredited: m2(credited), balance: m2(sp.kind === 'PROFORMA' && sp.status === 'CONVERTED' ? 0 : total - paidAmt - credited),
    proformaInvoiceId: sp.proforma, originalInvoiceId: sp.orig, reason, postedAt: posted ? at(-sp.date * 24 + 3 - (sp.id % 5) * 0.4) : undefined,
    fiscalReceipt: sp.fiscal ? {
      provider: 'VFD · TRA EFD gateway', status: sp.fiscal, attempts: sp.fiscal === 'FAILED' ? 3 : sp.fiscal === 'PENDING' ? 1 : 1,
      receiptNo: sp.fiscal === 'ISSUED' ? `${COMPANY.vfdSerial}-${String(48800 + (sp.id % 1000)).padStart(6, '0')}` : null,
      verificationCode: sp.fiscal === 'ISSUED' ? `${(sp.id * 7919).toString(16).toUpperCase().slice(0, 4)}${(sp.no * 104729).toString(16).toUpperCase().slice(0, 6)}` : null,
      verificationUrl: sp.fiscal === 'ISSUED' ? 'https://verify.tra.go.tz/…' : null,
      issuedAt: sp.fiscal === 'ISSUED' ? at(-sp.date * 24 + 2.9) : null,
      lastError: sp.fiscal === 'FAILED' ? 'VFD provider did not answer within 30 s (HTTP 504). Will retry automatically every 15 minutes.' : null,
    } : undefined,
    glStatus: sp.gl ?? null, createdBy: sp.by ?? pick(['Neema Mushi', 'Halima Said', 'Joseph Kweka']), lines,
    releaseValidTo: sp.through !== undefined ? through : undefined, zeroRated: cons?.cargoRegimeCode === 'TRANSIT',
  };
  invById.set(sp.id, inv);
  invoices.push(inv);
}
// apply notes to their originals
for (const n of invoices.filter((i) => i.docKind === 'CREDIT_NOTE')) {
  const o = invById.get(n.originalInvoiceId!)!;
  const cr = num(n.total);
  Object.assign(o, { amountCredited: m2(cr), balance: m2(num(o.total) - num(o.amountPaid) - cr) });
  Object.assign(n, { balance: '0.00' });
}
for (const n of invoices.filter((i) => i.docKind === 'DEBIT_NOTE')) Object.assign(n, { balance: n.total });
// a paid proforma waiting to be converted
{ const p = invById.get(1242)!; Object.assign(p, { amountPaid: p.total, balance: '0.00' }); }
{ const p = invById.get(1240)!; Object.assign(p, { amountPaid: p.total }); }
{ const p = invById.get(1243)!; Object.assign(p, { amountPaid: p.total }); }
export const invoice = (id: number) => invById.get(id);
export const invoiceByNo = (no: string) => invoices.find((i) => i.invoiceNo === no);
for (const r of rates) r.usedBy = invoices.filter((i) => i.exchangeRateDate === r.rateDate && i.status !== 'DRAFT' && i.docKind !== 'PROFORMA').length;

export const DOC_KIND: Record<DocKind, string> = { PROFORMA: 'Proforma', TAX_INVOICE: 'Tax invoice', CREDIT_NOTE: 'Credit note', DEBIT_NOTE: 'Debit note' };

/* ------------------------------------------------------------------ payment channels */
export type Channel = S<'PaymentChannel'> & { paymentChannelId: number };
export const channels: Channel[] = [
  { paymentChannelId: 1, companyId: 1, channelCode: 'CASH_USD', channelName: 'Cash USD', method: 'CASH', currency: 'USD', glAccount: '1011 Cash on hand USD', isActive: true },
  { paymentChannelId: 2, companyId: 1, channelCode: 'CASH_TZS', channelName: 'Cash TZS', method: 'CASH', currency: 'TZS', glAccount: '1010 Cash on hand TZS', isActive: true },
  { paymentChannelId: 3, companyId: 1, channelCode: 'CRDB_USD', channelName: 'CRDB transfer (USD)', method: 'BANK_TRANSFER', provider: 'CRDB', currency: 'USD', glAccount: '1020 CRDB USD', referencePattern: 'FT reference', isActive: true },
  { paymentChannelId: 4, companyId: 1, channelCode: 'NMB_TZS', channelName: 'NMB transfer (TZS)', method: 'BANK_TRANSFER', provider: 'NMB', currency: 'TZS', glAccount: '1030 NMB TZS', referencePattern: 'Bank reference', isActive: true },
  { paymentChannelId: 5, companyId: 1, channelCode: 'MPESA', channelName: 'M-Pesa', method: 'MOBILE_MONEY', provider: 'M-Pesa', currency: 'TZS', glAccount: '1041 M-Pesa till', referencePattern: '10 characters, e.g. SJ47KQ2ZP1', isActive: true },
  { paymentChannelId: 6, companyId: 1, channelCode: 'TIGO', channelName: 'Tigo Pesa', method: 'MOBILE_MONEY', provider: 'Tigo Pesa', currency: 'TZS', glAccount: '1042 Tigo Pesa till', referencePattern: 'Transaction ID', isActive: true },
  { paymentChannelId: 7, companyId: 1, channelCode: 'AIRTEL', channelName: 'Airtel Money', method: 'MOBILE_MONEY', provider: 'Airtel Money', currency: 'TZS', glAccount: '1043 Airtel Money till', referencePattern: 'Transaction ID', isActive: true },
  { paymentChannelId: 8, companyId: 1, channelCode: 'CHEQUE', channelName: 'Cheque', method: 'CHEQUE', currency: 'TZS', glAccount: '1025 Cheques in hand', referencePattern: 'Cheque number and bank', isActive: true },
];
export const channel = (code: string) => channels.find((c) => c.channelCode === code);

/* ------------------------------------------------------------------ payments */
export type Payment = S<'Payment'> & {
  paymentId: number; receiptNo: string; channelCode: string; status: NonNullable<S<'Payment'>['status']>; amountAllocated: string; unallocated: string;
  exchangeRate: string; amountBase: string; allocations: S<'Allocation'>[]; cashier: string; siteId: number; payerName?: string;
};
let payId = 3100, rctNo = 18840, allocId = 52000;
export const payments: Payment[] = [];
function mkPayment(o: { partyId: number; channelCode: string; currency: 'USD' | 'TZS'; amount: number; hoursAgo: number; ref?: string; alloc: [Invoice, number][]; cashier?: string; payer?: string; status?: Payment['status'] }) {
  const date = eatDate(at(o.hoursAgo));
  const rate = fx(date);
  const allocs: S<'Allocation'>[] = o.alloc.map(([inv, amtPayCcy]) => {
    const invRate = num(inv.exchangeRate);
    const inInvCcy = inv.currency === o.currency ? amtPayCcy : o.currency === 'TZS' ? amtPayCcy / invRate : amtPayCcy * invRate;
    const fxDiff = inv.currency === 'USD' ? r2(inInvCcy * (rate - invRate)) : 0;
    return { paymentAllocationId: ++allocId, invoiceId: inv.invoiceId, invoiceNo: inv.invoiceNo, amount: m2(amtPayCcy), amountInvoiceCcy: m2(inInvCcy), fxDifferenceBase: m2(fxDiff), allocatedAt: at(o.hoursAgo - 0.02) };
  });
  const allocated = r2(allocs.reduce((a, x) => a + num(x.amount), 0));
  const p: Payment = {
    paymentId: ++payId, receiptNo: `RCT-DAR1-26-${String(++rctNo).padStart(6, '0')}`, partyId: o.partyId, channelCode: o.channelCode, externalRef: o.ref ?? null,
    currency: o.currency, amount: m2(o.amount), exchangeRate: m2(rate), amountBase: m2(o.currency === 'TZS' ? o.amount : o.amount * rate),
    amountAllocated: m2(allocated), unallocated: m2(o.amount - allocated), receivedAt: at(o.hoursAgo), valueDate: date,
    status: o.status ?? (allocated >= o.amount - 0.005 ? 'ALLOCATED' : allocated > 0 ? 'PART_ALLOC' : 'RECEIVED'), allocations: allocs,
    cashier: o.cashier ?? ME, siteId: 1, payerName: o.payer,
  };
  payments.push(p);
  return p;
}
// payments behind the paid and part-paid invoices
for (const inv of invoices.filter((i) => i.docKind === 'TAX_INVOICE' && num(i.amountPaid) > 0 && i.invoiceId !== 1220 && i.invoiceId !== 1242)) {
  const hrs = Math.max(1, -daysBetween(TODAY, inv.invoiceDate) * 24 - 2) + (inv.invoiceDate === TODAY ? 0 : 0);
  const usd = inv.currency === 'USD';
  const chan = usd ? pick(['CRDB_USD', 'CRDB_USD', 'CASH_USD']) : pick(['NMB_TZS', 'MPESA']);
  mkPayment({ partyId: inv.billToPartyId, channelCode: chan, currency: usd ? 'USD' : 'TZS', amount: num(inv.amountPaid), hoursAgo: inv.invoiceDate === TODAY ? 2.2 : hrs, ref: chan.startsWith('CASH') ? undefined : chan === 'CRDB_USD' ? `CRDB/FT/26${int(200, 280)}/${int(10000, 99999)}` : `NMB${int(10000000, 99999999)}`, alloc: [[inv, num(inv.amountPaid)]], cashier: pick(['Mary Temba', 'Joseph Kweka', ME]) });
}
// today at the counter: the hero invoice paid partly by M-Pesa in TZS, an overpayment, and an unallocated transfer
{
  const hero = invById.get(1220)!;
  const part = num(hero.amountPaid);
  const r = fx(TODAY);
  mkPayment({ partyId: 2, channelCode: 'CRDB_USD', currency: 'USD', amount: r2(part - 200), hoursAgo: 26, ref: 'CRDB/FT/26279/44812', alloc: [[hero, r2(part - 200)]], cashier: 'Mary Temba' });
  mkPayment({ partyId: 2, channelCode: 'MPESA', currency: 'TZS', amount: Math.round(200 * r), hoursAgo: 1.4, ref: 'SJ47KQ2ZP1', alloc: [[hero, Math.round(200 * r)]], payer: 'Baraka Mwita (collector)' });
  const pro = invById.get(1242)!;
  mkPayment({ partyId: 13, channelCode: 'CASH_USD', currency: 'USD', amount: num(pro.total) + 640, hoursAgo: 3.1, alloc: [[pro, num(pro.total)]], payer: 'Tanzanite Pharma, A. Msuya' });
  mkPayment({ partyId: 1, channelCode: 'NMB_TZS', currency: 'TZS', amount: 1850000, hoursAgo: 0.8, ref: 'NMB60228814', alloc: [] });
  mkPayment({ partyId: 3, channelCode: 'TIGO', currency: 'TZS', amount: 265000, hoursAgo: 2.6, ref: '8F21KX09TA', alloc: [], payer: 'Bahari Motors, yard clerk' });
  mkPayment({ partyId: 10, channelCode: 'CASH_TZS', currency: 'TZS', amount: 412000, hoursAgo: 0.5, alloc: [], payer: 'Nyota Agro, driver' });
}
export const payment = (id: number) => payments.find((p) => p.paymentId === id);
export const usedRefs = () => payments.filter((p) => p.externalRef).map((p) => ({ ref: p.externalRef!, channel: p.channelCode, receiptNo: p.receiptNo, at: p.receivedAt }));
export const normRef = (s: string) => s.replace(/[\s/\-.]/g, '').toUpperCase();
export function findDuplicateRef(channelCode: string, ref: string) {
  const n = normRef(ref);
  if (n.length < 4) return undefined;
  return usedRefs().find((u) => u.channel === channelCode && normRef(u.ref) === n);
}

/* ------------------------------------------------------------------ cashier shifts */
export type Shift = S<'CashierShift'> & {
  cashierShiftId: number; cashier: string; currency: string; status: NonNullable<S<'CashierShift'>['status']>; openingFloat: string;
  expectedCash: string; receiptsCount: number; nonCash: string; note?: string; approvedBy?: string;
};
const cashIn = (cur: string, who: string, since: number) => payments.filter((p) => p.cashier === who && p.channelCode === `CASH_${cur}` && Date.parse(p.receivedAt!) >= Date.parse(at(since)));
function mkShift(id: number, who: string, cur: 'USD' | 'TZS', openHrs: number, float: number, o: { closeHrs?: number; diff?: number; status?: Shift['status']; note?: string; extra?: number; approvedBy?: string } = {}): Shift {
  const cash = cashIn(cur, who, openHrs).reduce((a, p) => a + num(p.amount), 0) + (o.extra ?? 0);
  const expected = float + cash;
  const nonCash = payments.filter((p) => p.cashier === who && p.currency === cur && !p.channelCode.startsWith('CASH') && Date.parse(p.receivedAt!) >= Date.parse(at(openHrs))).reduce((a, p) => a + num(p.amount), 0);
  return {
    cashierShiftId: id, siteId: 1, cashierSub: who, cashier: who, currency: cur, openedAt: at(openHrs), closedAt: o.closeHrs !== undefined ? at(o.closeHrs) : undefined,
    openingFloat: m2(float), expectedCash: m2(expected), countedCash: o.diff !== undefined ? m2(expected + o.diff) : undefined,
    difference: o.diff !== undefined ? m2(o.diff) : undefined, status: o.status ?? 'OPEN', receiptsCount: payments.filter((p) => p.cashier === who && p.currency === cur && Date.parse(p.receivedAt!) >= Date.parse(at(openHrs))).length + (o.extra ? 6 : 0),
    nonCash: m2(nonCash), note: o.note, approvedBy: o.approvedBy,
  };
}
export const shifts: Shift[] = [
  mkShift(901, ME, 'USD', 3.5, 200),
  mkShift(902, ME, 'TZS', 3.5, 300000),
  mkShift(895, 'Mary Temba', 'TZS', 27, 300000, { closeHrs: 18, extra: 2_316_000, diff: -4000, status: 'CLOSED', note: 'Short TZS 4,000. Recounted twice; one TZS 5,000 note given as change for TZS 1,000.' }),
  mkShift(896, 'Mary Temba', 'USD', 27, 200, { closeHrs: 18, extra: 1840, diff: 0, status: 'CLOSED', note: 'Balanced.' }),
  mkShift(897, 'Joseph Kweka', 'USD', 26, 200, { closeHrs: 17, extra: 3120, diff: 20, status: 'CLOSED', note: 'Over USD 20; customer left before change was given, name noted.' }),
  mkShift(890, 'Joseph Kweka', 'TZS', 50, 300000, { closeHrs: 41, extra: 1_904_500, diff: 0, status: 'APPROVED', approvedBy: 'Grace Mrema' }),
];

/* ------------------------------------------------------------------ refunds */
export type RefundStatus = 'PENDING_L1' | 'PENDING_L2' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type Refund = Omit<S<'Refund'>, 'status'> & {
  refundId: number; refundNo: string; status: RefundStatus; partyId: number; requestedBy: string; requestedAt: string; method: string;
  levels: { level: number; who: string; at?: string; decision?: 'APPROVED' | 'REJECTED' }[];
};
export const refunds: Refund[] = (() => {
  const over = payments.find((p) => p.partyId === 13 && num(p.unallocated) > 0)!;
  const p2 = payments.find((p) => p.partyId === 3 && p.channelCode === 'TIGO')!;
  const p3 = payments.find((p) => p.partyId === 11)!;
  const p4 = payments.find((p) => p.partyId === 10 && p.status === 'ALLOCATED') ?? payments[0];
  return [
    { refundId: 61, refundNo: 'RFD-DAR1-26-000071', paymentId: over.paymentId, partyId: 13, currency: 'USD', amount: '640.00', reason: 'Paid proforma PRO-DAR1-26-002060 plus USD 640 for a second container that was not released to them. Customer asks for the balance back to their CRDB account.', status: 'PENDING_L1', requestedBy: 'Neema Mushi', requestedAt: at(2.2), method: 'Bank transfer CRDB', levels: [{ level: 1, who: APPROVERS.l1 }, { level: 2, who: APPROVERS.l2 }] },
    { refundId: 60, refundNo: 'RFD-DAR1-26-000070', paymentId: p3.paymentId, partyId: 11, currency: 'USD', amount: '1180.00', reason: 'Invoice INV-DAR1-26-003295 paid twice: by CRDB transfer and again by the clearing agent.', status: 'PENDING_L2', requestedBy: 'Halima Said', requestedAt: at(22), method: 'Bank transfer CRDB', levels: [{ level: 1, who: APPROVERS.l1, at: at(6), decision: 'APPROVED' }, { level: 2, who: APPROVERS.l2 }] },
    { refundId: 59, refundNo: 'RFD-DAR1-26-000069', paymentId: p2.paymentId, partyId: 3, currency: 'TZS', amount: '265000.00', reason: 'Tigo Pesa payment sent to our till by mistake; Bahari Motors had no invoice open.', status: 'APPROVED', requestedBy: 'Neema Mushi', requestedAt: at(5), method: 'Tigo Pesa reversal', levels: [] },
    { refundId: 58, refundNo: 'RFD-DAR1-26-000068', paymentId: p4.paymentId, partyId: 10, currency: 'USD', amount: '320.00', reason: 'Export cancelled; documentation and lift charges credited on CN-DAR1-26-000209.', status: 'PAID', requestedBy: 'Halima Said', requestedAt: at(120), method: 'Bank transfer CRDB', paidAt: at(70), paidReference: 'CRDB/FT/26276/10988', levels: [] },
    { refundId: 57, refundNo: 'RFD-DAR1-26-000067', paymentId: p4.paymentId, partyId: 1, currency: 'USD', amount: '2400.00', reason: 'Customer asked for advance back; later agreed to keep it on account.', status: 'CANCELLED', requestedBy: 'Joseph Kweka', requestedAt: at(200), method: 'Bank transfer CRDB', levels: [{ level: 1, who: APPROVERS.l1, at: at(190), decision: 'APPROVED' }, { level: 2, who: APPROVERS.l2 }] },
  ];
})();

/* ------------------------------------------------------------------ disbursements */
export type Disb = S<'Disbursement'> & {
  disbursementId: number; disbNo: string; status: NonNullable<S<'Disbursement'>['status']>; payeeName: string; invoiceId?: number; recordedBy: string;
};
export const disbursements: Disb[] = [
  { disbursementId: 187, disbNo: 'DSB-DAR1-26-0187', consignmentId: 101, billToPartyId: 2, payeeName: 'Port authority, Dar es Salaam port', chargeCode: 'DISB_PORT', description: 'Port charges: wharfage and removal to ICD', currency: 'USD', amountPaid: '145.00', paidAt: day(-4), payeeReceiptNo: 'PA-DSM-26-551902', rebillMode: 'COST_PLUS_FEE', handlingFee: '15.00', status: 'INVOICED', invoiceId: 1220, recordedBy: 'Halima Said' },
  { disbursementId: 188, disbNo: 'DSB-DAR1-26-0188', consignmentId: 103, billToPartyId: 2, payeePartyId: 5, payeeName: partyName(5), chargeCode: 'DISB_LINE', description: 'Delivery order fee and container deposit handling', currency: 'USD', amountPaid: '380.00', paidAt: day(-3), payeeReceiptNo: 'IOS-DSM-DO-77120', rebillMode: 'COST_PLUS_FEE', handlingFee: '25.00', status: 'RECORDED', recordedBy: 'Halima Said' },
  { disbursementId: 189, disbNo: 'DSB-DAR1-26-0189', consignmentId: 109, billToPartyId: 1, payeeName: 'TRA customs (duty and taxes)', chargeCode: 'DISB_DUTY', description: 'Import duty and VAT on entry TZDL-26-0418877', currency: 'TZS', amountPaid: '18450000.00', paidAt: day(-2), payeeReceiptNo: 'TRA-CN-99128834', rebillMode: 'COST_PLUS_FEE', handlingFee: '150000.00', status: 'RECORDED', recordedBy: 'Joseph Kweka' },
  { disbursementId: 181, disbNo: 'DSB-DAR1-26-0181', consignmentId: 102, billToPartyId: 11, payeePartyId: 4, payeeName: partyName(4), chargeCode: 'DISB_LINE', description: 'Line demurrage settled to release the hold', currency: 'USD', amountPaid: '620.00', paidAt: day(-21), payeeReceiptNo: 'BML-DSM-RCT-30017', rebillMode: 'AT_COST', handlingFee: '0.00', status: 'INVOICED', invoiceId: 1207, recordedBy: 'Halima Said' },
  { disbursementId: 176, disbNo: 'DSB-DAR1-26-0176', consignmentId: 104, billToPartyId: 14, payeeName: 'Port authority, Dar es Salaam port', chargeCode: 'DISB_PORT', description: 'Port storage before transfer to ICD', currency: 'USD', amountPaid: '210.00', paidAt: day(-38), payeeReceiptNo: 'PA-DSM-26-540118', rebillMode: 'AT_COST', handlingFee: '0.00', status: 'WRITTEN_OFF', recordedBy: 'Joseph Kweka' },
  { disbursementId: 183, disbNo: 'DSB-DAR1-26-0183', consignmentId: 101, billToPartyId: 2, payeeName: 'Port authority, Dar es Salaam port', chargeCode: 'DISB_PORT', description: 'Port charges: second batch', currency: 'USD', amountPaid: '96.00', paidAt: day(-13), payeeReceiptNo: 'PA-DSM-26-549330', rebillMode: 'COST_PLUS_FEE', handlingFee: '10.00', status: 'INVOICED', invoiceId: 1210, recordedBy: 'Halima Said' },
];

/* ------------------------------------------------------------------ statements */
export interface StmtLine { date: string; docKind: string; docNo: string; reference?: string; debit: number; credit: number; balance: number; to?: string; due?: string }
export function statement(partyId: number, from = day(-60), to = TODAY) {
  const usd = (amt: number, cur: string, rate: number) => (cur === 'USD' ? amt : amt / rate);
  type Ev = Omit<StmtLine, 'balance'>;
  const ev: Ev[] = [];
  for (const i of invoices.filter((x) => x.billToPartyId === partyId && x.docKind !== 'PROFORMA' && x.status !== 'DRAFT' && x.status !== 'CANCELLED')) {
    const amt = usd(num(i.total), i.currency, num(i.exchangeRate));
    const credit = i.docKind === 'CREDIT_NOTE';
    ev.push({ date: i.invoiceDate, docKind: DOC_KIND[i.docKind], docNo: i.invoiceNo, reference: i.consignmentRef, debit: credit ? 0 : amt, credit: credit ? amt : 0, to: `/invoices/${i.invoiceId}`, due: i.dueDate ?? undefined });
  }
  for (const p of payments.filter((x) => x.partyId === partyId && x.status !== 'REVERSED')) {
    ev.push({ date: p.valueDate ?? eatDate(p.receivedAt!), docKind: 'Payment', docNo: p.receiptNo, reference: [channel(p.channelCode)?.channelName, p.externalRef].filter(Boolean).join(' · '), debit: 0, credit: usd(num(p.amount), p.currency, num(p.exchangeRate)) });
  }
  for (const r of refunds.filter((x) => x.partyId === partyId && x.status === 'PAID')) {
    ev.push({ date: eatDate(r.paidAt!), docKind: 'Refund', docNo: r.refundNo, reference: r.paidReference ?? undefined, debit: usd(num(r.amount), r.currency, fx(eatDate(r.paidAt!))), credit: 0 });
  }
  ev.sort((a, b) => a.date.localeCompare(b.date) || a.docNo.localeCompare(b.docNo));
  const opening = r2(ev.filter((e) => e.date < from).reduce((a, e) => a + e.debit - e.credit, 0));
  let bal = opening;
  const lines: StmtLine[] = ev.filter((e) => e.date >= from && e.date <= to).map((e) => { bal = r2(bal + e.debit - e.credit); return { ...e, debit: r2(e.debit), credit: r2(e.credit), balance: bal }; });
  // ageing of open documents by days past due
  const ageing = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0 };
  for (const i of invoices.filter((x) => x.billToPartyId === partyId && (x.docKind === 'TAX_INVOICE' || x.docKind === 'DEBIT_NOTE') && num(x.balance) > 0 && x.status !== 'DRAFT')) {
    const b = usd(num(i.balance), i.currency, num(i.exchangeRate));
    const late = daysBetween(i.dueDate ?? i.invoiceDate, to);
    if (late <= 0) ageing.current += b; else if (late <= 30) ageing.d1_30 += b; else if (late <= 60) ageing.d31_60 += b; else if (late <= 90) ageing.d61_90 += b; else ageing.over90 += b;
  }
  const unallocated = payments.filter((p) => p.partyId === partyId).reduce((a, p) => a + usd(num(p.unallocated), p.currency, num(p.exchangeRate)), 0);
  const outstanding = r2(Object.values(ageing).reduce((a, b) => a + b, 0));
  return {
    partyId, currency: 'USD', fromDate: from, toDate: to, openingBalance: opening, lines, closingBalance: bal,
    ageing: Object.fromEntries(Object.entries(ageing).map(([k, v]) => [k, r2(v)])) as typeof ageing, outstanding, unallocated: r2(unallocated),
  };
}
export const customers = parties.filter((p) => p.roles.includes('CUSTOMER') || p.roles.includes('SHIPPING_LINE')).filter((p) => invoices.some((i) => i.billToPartyId === p.partyId) || p.roles.includes('CUSTOMER'));
export function openBalanceUsd(partyId: number) { return statement(partyId).outstanding; }

/* ------------------------------------------------------------------ GL postings and periods */
export interface JLine { account: string; description: string; debit: number; credit: number }
export type GlPost = S<'GlPosting'> & { sourceNo: string; sourceKind: string; journalLines: JLine[]; to?: string; amountBase: number };
let glId = 88000;
function journalForInvoice(i: Invoice): JLine[] {
  const rate = i.currency === 'TZS' ? 1 : num(i.exchangeRate);
  const credit = i.docKind === 'CREDIT_NOTE';
  const lines: JLine[] = [];
  const byAcc = new Map<string, number>();
  for (const l of i.lines) {
    const acc = REVENUE_GL[CHARGE_GROUP[l.chargeCode ?? ''] ?? 'OTHER'];
    byAcc.set(acc, (byAcc.get(acc) ?? 0) + Math.round(num(l.amount) * rate));
  }
  const vat = Math.round(num(i.taxTotal) * rate);
  for (const [acc, v] of byAcc) lines.push({ account: acc, description: credit ? 'Revenue reversed' : 'Revenue', debit: credit ? v : 0, credit: credit ? 0 : v });
  if (vat) lines.push({ account: '2310 VAT output', description: 'VAT 18%', debit: credit ? vat : 0, credit: credit ? 0 : vat });
  const total = [...byAcc.values()].reduce((a, b) => a + b, 0) + vat;
  lines.unshift({ account: '1200 Trade receivables (AR control)', description: `${partyName(i.billToPartyId)}`, debit: credit ? 0 : total, credit: credit ? total : 0 });
  return lines;
}
function journalForPayment(p: Payment): JLine[] {
  const base = Math.round(num(p.amountBase));
  const fxd = Math.round(p.allocations.reduce((a, x) => a + num(x.fxDifferenceBase), 0));
  const lines: JLine[] = [{ account: channel(p.channelCode)?.glAccount ?? '1010 Cash', description: `${p.receiptNo} ${p.externalRef ?? ''}`.trim(), debit: base, credit: 0 }];
  const unalloc = Math.round(num(p.unallocated) * (p.currency === 'USD' ? num(p.exchangeRate) : 1));
  const toAr = base - unalloc;
  if (toAr) lines.push({ account: '1200 Trade receivables (AR control)', description: partyName(p.partyId), debit: 0, credit: toAr - fxd });
  if (fxd > 0) lines.push({ account: '7100 Exchange gain', description: 'Rate moved since invoice', debit: 0, credit: fxd });
  if (fxd < 0) lines.push({ account: '7110 Exchange loss', description: 'Rate moved since invoice', debit: -fxd, credit: 0 });
  if (unalloc) lines.push({ account: '2150 Unallocated receipts', description: 'Kept on account', debit: 0, credit: unalloc });
  return lines;
}
export const glPostings: GlPost[] = [];
for (const i of invoices.filter((x) => x.glStatus)) {
  const jl = journalForInvoice(i);
  const failedReason = i.invoiceId === 1208 ? 'NG Billing refused: account 4120 Reefer income is blocked for posting in NG (code GL-ACC-BLOCKED).' : null;
  glPostings.push({
    glPostingId: ++glId, sourceEntity: 'invoice', sourceId: i.invoiceId, sourceNo: i.invoiceNo, sourceKind: DOC_KIND[i.docKind], destination: 'NG_BILLING',
    postingDate: i.invoiceDate, status: i.glStatus!, externalRef: i.glStatus === 'POSTED' ? `NG-JV-26-${String(40100 + (glId % 1000)).padStart(6, '0')}` : null,
    attempts: i.glStatus === 'FAILED' ? 4 : i.glStatus === 'PENDING' ? 0 : 1, lastError: failedReason, postedAt: i.glStatus === 'POSTED' ? i.postedAt : null,
    journalLines: jl, to: `/invoices/${i.invoiceId}`, amountBase: jl.reduce((a, l) => a + l.debit, 0),
  });
}
for (const p of payments) {
  const today = eatDate(p.receivedAt!) === TODAY;
  const jl = journalForPayment(p);
  const fail = p.channelCode === 'TIGO';
  glPostings.push({
    glPostingId: ++glId, sourceEntity: 'payment', sourceId: p.paymentId, sourceNo: p.receiptNo, sourceKind: 'Payment', destination: 'NG_BILLING',
    postingDate: p.valueDate!, status: fail ? 'FAILED' : today ? (p.paymentId % 2 ? 'PENDING' : 'POSTED') : 'POSTED',
    externalRef: !fail && !(today && p.paymentId % 2) ? `NG-RV-26-${String(20500 + (glId % 1000)).padStart(6, '0')}` : null,
    attempts: fail ? 2 : 1, lastError: fail ? 'Timed out waiting for NG Billing after 30 s. The journal was not received; safe to retry.' : null,
    postedAt: !fail && !(today && p.paymentId % 2) ? p.receivedAt : null, journalLines: jl, amountBase: jl.reduce((a, l) => a + l.debit, 0),
  });
}
glPostings.sort((a, b) => b.postingDate.localeCompare(a.postingDate) || b.glPostingId - a.glPostingId);

export type Period = S<'AccountingPeriod'> & { accountingPeriodId: number; status: 'OPEN' | 'CLOSED' };
export const periods: Period[] = [
  { accountingPeriodId: 26, companyId: 1, periodKey: '2026-10', periodStart: '2026-10-01', periodEnd: '2026-10-31', status: 'OPEN' },
  { accountingPeriodId: 25, companyId: 1, periodKey: '2026-09', periodStart: '2026-09-01', periodEnd: '2026-09-30', status: 'OPEN' },
  { accountingPeriodId: 24, companyId: 1, periodKey: '2026-08', periodStart: '2026-08-01', periodEnd: '2026-08-31', status: 'CLOSED', closedAt: at(24 * 30), closedBy: 'Grace Mrema' },
  { accountingPeriodId: 23, companyId: 1, periodKey: '2026-07', periodStart: '2026-07-01', periodEnd: '2026-07-31', status: 'CLOSED', closedAt: at(24 * 62), closedBy: 'Grace Mrema' },
  { accountingPeriodId: 22, companyId: 1, periodKey: '2026-06', periodStart: '2026-06-01', periodEnd: '2026-06-30', status: 'CLOSED', closedAt: at(24 * 95), closedBy: 'Grace Mrema' },
];

/* ------------------------------------------------------------------ helpers for screens */
export const stayById = (id?: number | null) => allStays.find((s) => s.unitStayId === id);
export const vesselOf = (s: Stay) => vesselCalls.find((v) => v.vesselCallId === consignment(s.consignmentId)?.vesselCallId);
export const consignmentsFor = (partyId: number, siteId?: number) => consignments.filter((c) => c.billToPartyId === partyId && (siteId === undefined || allStays.some((s) => s.consignmentId === c.consignmentId && s.siteId === siteId)));

/* ------------------------------------------------------------------ search */
registerSearch((q) => {
  const n = q.replace(/[\s-]/g, '').toUpperCase();
  if (n.length < 3) return null;
  const hits = invoices.filter((i) => i.invoiceNo.replace(/-/g, '').includes(n)).slice(0, 6).map((i) => ({
    id: i.invoiceId, title: i.invoiceNo, status: i.status,
    subtitle: `${DOC_KIND[i.docKind]} · ${partyName(i.billToPartyId)} · ${i.currency} ${Number(i.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    link: { entityName: 'invoice', entityId: i.invoiceId }, to: `/invoices/${i.invoiceId}`,
  }));
  return hits.length ? { entity: 'INVOICE' as const, label: 'Invoices', hits } : null;
});
