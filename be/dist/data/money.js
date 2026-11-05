"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consignmentsFor = exports.vesselOf = exports.stayById = exports.periods = exports.glPostings = exports.customers = exports.disbursements = exports.refunds = exports.shifts = exports.normRef = exports.usedRefs = exports.payment = exports.payments = exports.channel = exports.channels = exports.DOC_KIND = exports.invoiceByNo = exports.invoice = exports.invoices = exports.openCharges = exports.charges = exports.releaseValidTo = exports.sumLines = exports.billToOf = exports.tariff = exports.tariffs = exports.BASIS_LABEL = exports.UOM = exports.TAX = exports.REVENUE_GL = exports.CHARGE_GROUP = exports.CHARGE_NAMES = exports.fx = exports.rates = exports.ME = exports.APPROVERS = exports.LIMITS = exports.COMPANY = exports.num = exports.m2 = exports.HOLIDAYS = exports.dLong = exports.dShort = exports.TODAY = exports.isSunday = exports.daysBetween = exports.addDays = exports.eatDate = void 0;
exports.rateOn = rateOn;
exports.tariffFor = tariffFor;
exports.storageClock = storageClock;
exports.rateStay = rateStay;
exports.rateStays = rateStays;
exports.findDuplicateRef = findDuplicateRef;
exports.statement = statement;
exports.openBalanceUsd = openBalanceUsd;
const core_1 = require("./core");
const gen_1 = require("./gen");
const search_1 = require("./search");
/* ------------------------------------------------------------------ dates (EAT) */
const EAT = 3 * 3600_000;
/** yyyy-mm-dd of an ISO timestamp in Dar es Salaam time. */
const eatDate = (iso) => new Date(Date.parse(iso) + EAT).toISOString().slice(0, 10);
exports.eatDate = eatDate;
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400_000).toISOString().slice(0, 10);
exports.addDays = addDays;
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400_000);
exports.daysBetween = daysBetween;
const isSunday = (d) => new Date(d + 'T00:00:00Z').getUTCDay() === 0;
exports.isSunday = isSunday;
exports.TODAY = (0, gen_1.day)(0);
const dShort = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
exports.dShort = dShort;
const dLong = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
exports.dLong = dLong;
/** Public holidays in the site calendar (Field rules & calendars). */
exports.HOLIDAYS = {
    '2026-07-07': 'Saba Saba', '2026-08-08': 'Nane Nane', '2026-08-26': 'Maulid', '2026-10-14': 'Nyerere Day',
    '2026-12-09': 'Independence Day', '2026-12-25': 'Christmas Day', '2026-12-26': 'Boxing Day', '2027-01-01': "New Year's Day",
};
const r2 = (n) => Math.round(n * 100) / 100;
const m2 = (n) => r2(n).toFixed(2);
exports.m2 = m2;
const num = (s) => (s === null || s === undefined || s === '' ? 0 : Number(s));
exports.num = num;
/* ------------------------------------------------------------------ company */
exports.COMPANY = {
    legalName: 'Bandari Kavu Depots Ltd', tradingName: 'Bandari Kavu ICD', tin: '128-406-733', vrn: '40-031288-K',
    address: 'Plot 112, Nelson Mandela Road, P.O. Box 45210, Dar es Salaam', phone: '+255 22 286 4410', email: 'billing@bandarikavu.example',
    baseCurrency: 'TZS', bank: 'CRDB USD 0250-4471-8800 · NMB TZS 2071-0033-412', vfdSerial: '10TZ100877',
};
/* ------------------------------------------------------------------ approval limits (maker-checker) */
exports.LIMITS = {
    waiverTwoLevelsUsd: 1000, creditNoteTwoLevelsUsd: 1000, refundApprovalUsd: 500,
    /** What a user may waive or credit without asking, by grant on billing.waiver / billing.creditnote. */
    ownLimitUsd: { APPR: 1000, DO: 250, REQ: 0, VIEW: 0 },
};
exports.APPROVERS = { l1: 'Grace Mrema · Finance manager', l2: 'Peter Lyimo · General manager' };
exports.ME = 'Neema Mushi';
exports.rates = [];
{
    let id = 400;
    for (const [d, r] of [['2026-07-01', '2618.40'], ['2026-08-01', '2641.75'], ['2026-09-01', '2652.10'], ['2026-10-01', '2661.30']]) {
        exports.rates.push({ exchangeRateId: ++id, companyId: 1, fromCurrency: 'USD', toCurrency: 'TZS', rateDate: d, rate: r, rateKind: 'MONTHLY', sourceNote: 'Bank of Tanzania month-opening mean rate', usedBy: 0, enteredAt: (0, gen_1.at)((0, exports.daysBetween)(d, exports.TODAY) * 24 + 1.5), enteredBy: 'Grace Mrema' });
    }
    for (let i = 59; i >= 0; i--) {
        const d = (0, gen_1.day)(-i);
        if ((0, exports.isSunday)(d) || exports.HOLIDAYS[d])
            continue;
        const t = 59 - i;
        const v = 2646 + t * 0.32 + 6.5 * Math.sin(t / 7) + ((0, gen_1.rnd)() - 0.5) * 3;
        exports.rates.push({ exchangeRateId: ++id, companyId: 1, fromCurrency: 'USD', toCurrency: 'TZS', rateDate: d, rate: v.toFixed(2), rateKind: 'DAILY', sourceNote: (0, gen_1.pick)(['BoT mean rate 09:00', 'BoT mean rate 09:00', 'CRDB treasury buying rate']), usedBy: 0, enteredAt: (0, gen_1.at)(i * 24 + 2.4), enteredBy: i === 0 ? 'Grace Mrema' : (0, gen_1.pick)(['Grace Mrema', 'Halima Said']) });
    }
}
/** The rate in force on a date: that day's daily rate, else the latest earlier daily rate in the month, else the monthly rate. */
function rateOn(date) {
    const daily = exports.rates.filter((r) => r.rateKind === 'DAILY' && r.rateDate <= date).sort((a, b) => b.rateDate.localeCompare(a.rateDate))[0];
    if (daily && daily.rateDate === date)
        return { rate: daily, note: 'Daily rate for this date' };
    if (daily && daily.rateDate.slice(0, 7) === date.slice(0, 7))
        return { rate: daily, note: `No rate on ${(0, exports.dShort)(date)}${(0, exports.isSunday)(date) ? ' (Sunday)' : exports.HOLIDAYS[date] ? ` (${exports.HOLIDAYS[date]})` : ''}; last daily rate carries forward` };
    const monthly = exports.rates.filter((r) => r.rateKind === 'MONTHLY' && r.rateDate <= date).sort((a, b) => b.rateDate.localeCompare(a.rateDate))[0];
    return { rate: monthly ?? exports.rates[0], note: 'No daily rate; monthly rate used' };
}
const fx = (date) => (0, exports.num)(rateOn(date).rate.rate);
exports.fx = fx;
/* ------------------------------------------------------------------ charge and tax codes */
exports.CHARGE_NAMES = {
    LIFT_ON_OFF: 'Lift on / lift off', STORAGE_IMPORT: 'Storage', STORAGE_TRANSIT: 'Storage (transit)', STORAGE_EMPTY: 'Empty storage',
    STORAGE_VEHICLE: 'Vehicle storage', REEFER_POWER: 'Reefer power', EXAM_HANDLING: 'Customs exam handling', HAZ_SURCHARGE: 'Dangerous goods surcharge',
    DOC_FEE: 'Documentation fee', CFS_HANDLING: 'CFS handling', VEH_HANDLING: 'Vehicle handling', WEIGHING: 'Weighbridge ticket',
    DISB_PORT: 'Port charges (paid on your behalf)', DISB_LINE: 'Shipping line charges (paid on your behalf)', DISB_DUTY: 'Customs duty (paid on your behalf)',
    DISB_HANDLING_FEE: 'Disbursement handling fee', MANUAL: 'Manual charge',
};
exports.CHARGE_GROUP = {
    LIFT_ON_OFF: 'HANDLING', STORAGE_IMPORT: 'STORAGE', STORAGE_TRANSIT: 'STORAGE', STORAGE_EMPTY: 'STORAGE', STORAGE_VEHICLE: 'STORAGE',
    REEFER_POWER: 'REEFER', EXAM_HANDLING: 'INSPECTION', HAZ_SURCHARGE: 'SPECIAL', DOC_FEE: 'DOCUMENTATION', CFS_HANDLING: 'HANDLING',
    VEH_HANDLING: 'VEHICLE', WEIGHING: 'WEIGHING', DISB_PORT: 'DISBURSEMENT', DISB_LINE: 'DISBURSEMENT', DISB_DUTY: 'DISBURSEMENT', DISB_HANDLING_FEE: 'OTHER',
};
exports.REVENUE_GL = {
    STORAGE: '4100 Storage income', HANDLING: '4110 Handling income', REEFER: '4120 Reefer income', INSPECTION: '4130 Exam & inspection income',
    DOCUMENTATION: '4140 Documentation income', VEHICLE: '4150 Vehicle yard income', SPECIAL: '4160 Special services income', WEIGHING: '4170 Weighing income',
    OTHER: '4190 Other operating income', DISBURSEMENT: '1450 Disbursement clearing',
};
exports.TAX = {
    VAT18: { name: 'VAT 18%', pct: 18 }, VAT0: { name: 'Zero-rated (transit)', pct: 0 }, OOS: { name: 'Outside VAT scope', pct: 0 }, EXEMPT: { name: 'Exempt', pct: 0 },
};
exports.UOM = {
    PER_UNIT_DAY: 'day', PER_TEU_DAY: 'TEU-day', PER_UNIT: 'unit', PER_TEU: 'TEU', PER_MOVE: 'move', PER_VISIT: 'visit', PER_TONNE: 'tonne',
    PER_KWH: 'kWh', PER_HOUR: 'hour', PER_PACKAGE: 'package', FLAT: 'each',
};
exports.BASIS_LABEL = {
    PER_UNIT_DAY: 'Per unit per day', PER_TEU_DAY: 'Per TEU per day', PER_UNIT: 'Per unit', PER_TEU: 'Per TEU', PER_MOVE: 'Per move', PER_VISIT: 'Per visit',
    PER_TONNE: 'Per tonne', PER_KWH: 'Per kWh', PER_HOUR: 'Per hour', PER_PACKAGE: 'Per package', FLAT: 'Flat',
};
let ruleId = 6000;
const sl = (...rows) => rows.map(([f, t, r]) => ({ fromQty: String(f), toQty: t === null ? null : String(t), rate: (0, exports.m2)(r) }));
const R = (chargeCode, basis, o = {}) => ({
    tariffRuleId: ++ruleId, chargeCode, basis, freeExclSundays: false, freeExclHolidays: false, taxCode: 'VAT18', sortOrder: ruleId, slabs: [], ...o,
});
function siteRules(storageUp = 1, vat = 'VAT18') {
    const s = (v) => r2(v * storageUp);
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
function vehicleRules(vat = 'VAT18', free = 7) {
    return [
        R('VEH_HANDLING', 'PER_UNIT', { unitCategory: 'VEHICLE', flatRate: '45.00', taxCode: vat }),
        R('STORAGE_VEHICLE', 'PER_UNIT_DAY', { unitCategory: 'VEHICLE', vehicleClass: 'CAR_SUV', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 10], [15 + free - 7, null, 15]) }),
        R('STORAGE_VEHICLE', 'PER_UNIT_DAY', { unitCategory: 'VEHICLE', vehicleClass: 'TRUCK_LIGHT', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 15], [15 + free - 7, null, 25]) }),
        R('STORAGE_VEHICLE', 'PER_UNIT_DAY', { unitCategory: 'VEHICLE', vehicleClass: 'TRACTOR', clockStart: 'DISCHARGE', freeDays: free, taxCode: vat, slabs: sl([1, free, 0], [free + 1, 14 + free - 7, 15], [15 + free - 7, null, 25]) }),
        R('DOC_FEE', 'FLAT', { flatRate: '35.00', taxCode: vat }),
    ];
}
const transitRules = () => [
    R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', lengthFt: 20, flatRate: '60.00', taxCode: 'VAT0' }),
    R('LIFT_ON_OFF', 'PER_MOVE', { unitCategory: 'CONTAINER', lengthFt: 40, flatRate: '90.00', taxCode: 'VAT0' }),
    R('STORAGE_TRANSIT', 'PER_UNIT_DAY', { unitCategory: 'CONTAINER', lengthFt: 20, clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 30, 10], [31, null, 20]) }),
    R('STORAGE_TRANSIT', 'PER_UNIT_DAY', { unitCategory: 'CONTAINER', lengthFt: 40, clockStart: 'DISCHARGE', freeDays: 14, taxCode: 'VAT0', slabs: sl([1, 14, 0], [15, 30, 20], [31, null, 40]) }),
    R('EXAM_HANDLING', 'PER_UNIT', { unitCategory: 'CONTAINER', flatRate: '100.00', taxCode: 'VAT0' }),
    ...vehicleRules('VAT0', 14),
    R('DOC_FEE', 'FLAT', { flatRate: '50.00', taxCode: 'VAT0' }),
].filter((r, i, a) => !(r.chargeCode === 'DOC_FEE' && a.findIndex((x) => x.chargeCode === 'DOC_FEE') !== i));
exports.tariffs = [
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
const tariff = (id) => exports.tariffs.find((t) => t.tariffId === id);
exports.tariff = tariff;
const lengthOf = (t) => (t.startsWith('2') ? 20 : t.startsWith('4') ? 40 : undefined);
const billToOf = (s) => (0, core_1.consignment)(s.consignmentId)?.billToPartyId ?? s.linePartyId ?? 2;
exports.billToOf = billToOf;
/** Which active tariff rates this stay: customer, then line, then regime, then site. */
function tariffFor(s, opts = {}) {
    const ok = (t) => t.status === 'ACTIVE' || (opts.includePending && t.status === 'PENDING_APPROVAL');
    const bill = (0, exports.billToOf)(s);
    return exports.tariffs.find((t) => ok(t) && t.level === 'CUSTOMER' && t.partyId === bill)
        ?? (s.fullEmpty === 'E' ? exports.tariffs.find((t) => ok(t) && t.level === 'LINE' && t.partyId === s.linePartyId) : undefined)
        ?? (s.cargoRegimeCode === 'TRANSIT' ? exports.tariffs.find((t) => ok(t) && t.level === 'REGIME' && t.regimeCode === 'TRANSIT') : undefined)
        ?? exports.tariffs.find((t) => ok(t) && t.level === 'SITE' && t.siteId === s.siteId);
}
function ruleMatches(r, s) {
    const u = s.cargoUnit;
    if (r.unitCategory && r.unitCategory !== u.category)
        return false;
    if (r.lengthFt && r.lengthFt !== lengthOf(u.unitTypeCode))
        return false;
    if (r.fullEmpty && r.fullEmpty !== s.fullEmpty)
        return false;
    if (r.isReefer && !u.unitTypeCode.includes('R'))
        return false;
    if (r.isHazardous && !s.imoClass)
        return false;
    if (r.vehicleClass && r.vehicleClass !== u.unitTypeCode)
        return false;
    return true;
}
const kwhPerDay = (s) => 38 + ((s.unitStayId ?? 0) % 14);
const tonnes = (s) => 3 + ((s.unitStayId ?? 0) % 9);
/** Storage clock start, free window and the chargeable calendar days. */
function storageClock(s, r) {
    const startIso = r.clockStart === 'GATE_IN' ? s.gatedInAt : s.dischargeAt ?? s.gatedInAt;
    if (!startIso)
        return null;
    const start = (0, exports.eatDate)(startIso);
    const free = r.freeDays ?? 0;
    let counted = 0, dayNo = 0, sundays = 0, hols = [];
    let d = start;
    while (counted < free) {
        dayNo++;
        const sun = (0, exports.isSunday)(d), hol = exports.HOLIDAYS[d];
        if (sun)
            sundays++;
        if (hol)
            hols.push(hol);
        const skip = (sun && r.freeExclSundays) || (hol && r.freeExclHolidays);
        if (!skip)
            counted++;
        if (counted < free)
            d = (0, exports.addDays)(d, 1);
    }
    hols = [...new Set(hols)];
    return { start, freeEnd: d, freeEndDayNo: dayNo, sundays, hols, extended: dayNo - free };
}
function rateStay(s, through, opts = {}) {
    const t = opts.tariffOverride ?? tariffFor(s, opts);
    const out = [];
    const u = s.cargoUnit;
    const bill = (0, exports.billToOf)(s);
    const base = (r, extra) => {
        const qty = (0, exports.num)(extra.quantity);
        const rate = (0, exports.num)(extra.unitRate);
        let amount = r2(qty * rate);
        const how = [...(extra.how ?? [])];
        if (r.minCharge && amount < (0, exports.num)(r.minCharge)) {
            how.push(`Minimum charge USD ${r.minCharge} applies`);
            amount = (0, exports.num)(r.minCharge);
        }
        if (r.maxCharge && amount > (0, exports.num)(r.maxCharge)) {
            how.push(`Capped at maximum USD ${r.maxCharge}`);
            amount = (0, exports.num)(r.maxCharge);
        }
        const taxCode = r.taxCode ?? 'VAT18';
        const pct = exports.TAX[taxCode]?.pct ?? 18;
        return {
            key: `${s.unitStayId}-${r.tariffRuleId}-${extra.serviceFrom ?? ''}`, unitStayId: s.unitStayId, unitNo: u.unitNo, unitCategory: u.category,
            consignmentId: s.consignmentId, billToPartyId: bill, chargeCode: r.chargeCode, chargeName: exports.CHARGE_NAMES[r.chargeCode] ?? r.chargeCode,
            description: exports.CHARGE_NAMES[r.chargeCode] ?? r.chargeCode, uom: exports.UOM[r.basis], tariffCode: t.tariffCode, tariffVersion: t.versionNo, ruleId: r.tariffRuleId,
            taxCode, taxPct: pct, kind: 'NORMAL',
            ...extra, how, amount: (0, exports.m2)(amount), taxAmount: (0, exports.m2)((amount * pct) / 100), quantity: String(qty), unitRate: (0, exports.m2)(rate),
        };
    };
    const gateIn = s.gatedInAt ? (0, exports.eatDate)(s.gatedInAt) : null;
    for (const r of t.rules.filter((x) => x.chargeCode !== 'DOC_FEE' && ruleMatches(x, s))) {
        if (r.basis === 'PER_UNIT_DAY' || r.basis === 'PER_TEU_DAY') {
            const c = storageClock(s, r);
            if (!c || c.start > through)
                continue;
            const totalDays = (0, exports.daysBetween)(c.start, through) + 1;
            const teu = r.basis === 'PER_TEU_DAY' ? (lengthOf(u.unitTypeCode) === 40 ? 2 : 1) : 1;
            const clockHow = `Clock starts at ${r.clockStart === 'GATE_IN' ? 'gate-in' : 'vessel discharge'} ${(0, exports.dShort)(c.start)}`;
            const freeHow = `Free days 1–${c.freeEndDayNo}: ${(0, exports.dShort)(c.start)}–${(0, exports.dShort)(c.freeEnd)}` +
                (r.freeExclSundays || r.freeExclHolidays
                    ? ` (${r.freeDays} free days; ${c.extended} Sunday${c.extended === 1 ? '' : 's'}/holiday${c.extended === 1 ? '' : 's'} skipped)`
                    : `; Sundays${c.sundays ? ` (${c.sundays})` : ''} and holidays${c.hols.length ? ` (${c.hols.join(', ')})` : ''} count as free days`);
            if (totalDays <= c.freeEndDayNo) {
                out.push(base(r, { serviceFrom: c.start, serviceTo: through, quantity: '0', unitRate: '0', description: `${exports.CHARGE_NAMES[r.chargeCode]}: within free days`, how: [clockHow, freeHow, `Day ${totalDays} of ${c.freeEndDayNo} free: nothing to pay yet`] }));
                continue;
            }
            for (const sb of r.slabs.filter((x) => (0, exports.num)(x.rate) > 0)) {
                const from = Math.max((0, exports.num)(sb.fromQty), c.freeEndDayNo + 1);
                const to = Math.min(sb.toQty === null || sb.toQty === undefined ? Infinity : (0, exports.num)(sb.toQty), totalDays);
                if (to < from)
                    continue;
                const days = to - from + 1;
                out.push(base(r, {
                    serviceFrom: (0, exports.addDays)(c.start, from - 1), serviceTo: (0, exports.addDays)(c.start, to - 1), quantity: String(days * teu), unitRate: sb.rate,
                    description: `${exports.CHARGE_NAMES[r.chargeCode]}, days ${from}–${to}`,
                    how: [clockHow, freeHow, `Slab days ${sb.fromQty}–${sb.toQty ?? '…'} at USD ${sb.rate}${teu > 1 ? ` × ${teu} TEU` : ''}: ${days} day${days === 1 ? '' : 's'}`],
                }));
            }
        }
        else if (r.basis === 'PER_MOVE') {
            if (!gateIn || gateIn > through)
                continue;
            out.push(base(r, { serviceFrom: gateIn, serviceTo: gateIn, quantity: '1', unitRate: r.flatRate ?? '0', how: [`Lift off at gate-in ${(0, exports.dShort)(gateIn)}; lift on at delivery included`, `${exports.BASIS_LABEL[r.basis]} at USD ${r.flatRate}`] }));
        }
        else if (r.basis === 'PER_KWH') {
            if (!gateIn)
                continue;
            const days = Math.max(1, (0, exports.daysBetween)(gateIn, through) + 1);
            const k = kwhPerDay(s) * days;
            out.push(base(r, { serviceFrom: gateIn, serviceTo: through, quantity: String(k), unitRate: r.flatRate ?? '0', how: [`Plugged in ${(0, exports.dShort)(gateIn)}; meter readings ${days} day${days === 1 ? '' : 's'}, about ${kwhPerDay(s)} kWh a day`, `USD ${r.flatRate} per kWh`] }));
        }
        else if (r.basis === 'PER_UNIT') {
            const exam = r.chargeCode === 'EXAM_HANDLING';
            if (exam && !(s.customsStatus === 'UNDER_EXAM' || (s.customsStatus === 'CLEARED' && (s.unitStayId ?? 0) % 3 === 0)))
                continue;
            if (!gateIn)
                continue;
            out.push(base(r, { serviceFrom: gateIn, serviceTo: gateIn, quantity: '1', unitRate: r.flatRate ?? '0', how: [exam ? 'Unit moved to exam bay for customs examination' : r.chargeCode === 'HAZ_SURCHARGE' ? `IMO class ${s.imoClass} cargo` : 'Vehicle received and parked', `${exports.BASIS_LABEL[r.basis]} at USD ${r.flatRate}`] }));
        }
        else if (r.basis === 'PER_TONNE') {
            if (!gateIn)
                continue;
            out.push(base(r, { serviceFrom: gateIn, serviceTo: gateIn, quantity: String(tonnes(s)), unitRate: r.flatRate ?? '0', how: [`${tonnes(s)} revenue tonnes tallied at CFS receipt`, `USD ${r.flatRate} per tonne`] }));
        }
    }
    return out;
}
/** Rate several stays to a date: adds one documentation fee per consignment. */
function rateStays(stays, through, opts = {}) {
    const lines = stays.flatMap((s) => rateStay(s, through, opts));
    const byCons = new Map();
    for (const s of stays)
        if (s.consignmentId && !byCons.has(s.consignmentId))
            byCons.set(s.consignmentId, s);
    for (const [cid, s] of byCons) {
        const t = tariffFor(s, opts);
        const r = t.rules.find((x) => x.chargeCode === 'DOC_FEE');
        if (!r)
            continue;
        const pct = exports.TAX[r.taxCode ?? 'VAT18'].pct;
        const amt = (0, exports.num)(r.flatRate);
        lines.push({
            key: `doc-${cid}`, consignmentId: cid, billToPartyId: (0, exports.billToOf)(s), chargeCode: 'DOC_FEE', chargeName: exports.CHARGE_NAMES.DOC_FEE,
            description: `Documentation fee, ${(0, core_1.consignment)(cid)?.refNo}`, serviceFrom: through, serviceTo: through, quantity: '1', uom: 'each',
            unitRate: (0, exports.m2)(amt), amount: (0, exports.m2)(amt), taxCode: r.taxCode ?? 'VAT18', taxPct: pct, taxAmount: (0, exports.m2)((amt * pct) / 100), tariffCode: t.tariffCode,
            tariffVersion: t.versionNo, ruleId: r.tariffRuleId, how: ['One documentation fee per consignment per invoice', `USD ${r.flatRate} flat`], kind: 'NORMAL',
        });
    }
    return lines.filter((l) => (0, exports.num)(l.amount) > 0 || l.chargeCode.startsWith('STORAGE'));
}
const sumLines = (ls) => {
    const sub = r2(ls.reduce((a, l) => a + (0, exports.num)(l.amount), 0));
    const tax = r2(ls.reduce((a, l) => a + (0, exports.num)(l.taxAmount), 0));
    return { subtotal: sub, tax, total: r2(sub + tax) };
};
exports.sumLines = sumLines;
/** Release validity a payment through this date gives: end of that day. */
const releaseValidTo = (through) => `${(0, exports.dLong)(through)}, 23:59`;
exports.releaseValidTo = releaseValidTo;
let chargeId = 70000;
const billable = core_1.allStays.filter((s) => s.billingStatus === 'ACCRUING' && s.physicalStatus !== 'EXPECTED' && s.physicalStatus !== 'DEPARTED');
exports.charges = rateStays(billable, exports.TODAY)
    .filter((l) => (0, exports.num)(l.amount) > 0)
    .map((l) => ({ ...l, chargeId: ++chargeId, status: 'OPEN', ratedAt: (0, gen_1.at)((0, gen_1.int)(1, 30)) }));
// two manual charges and one waiver waiting for approval, so the rules show
{
    const hero = core_1.allStays[0];
    exports.charges.push({
        key: 'man-1', chargeId: ++chargeId, status: 'OPEN', ratedAt: (0, gen_1.at)(4), unitStayId: hero.unitStayId, unitNo: hero.cargoUnit.unitNo, unitCategory: 'CONTAINER',
        consignmentId: hero.consignmentId, billToPartyId: (0, exports.billToOf)(hero), chargeCode: 'WEIGHING', chargeName: exports.CHARGE_NAMES.WEIGHING, description: 'Weighbridge ticket WB-DAR1-26-08812 (customer request)',
        serviceFrom: (0, gen_1.day)(-1), serviceTo: (0, gen_1.day)(-1), quantity: '1', uom: 'visit', unitRate: '25.00', amount: '25.00', taxCode: 'VAT18', taxPct: 18, taxAmount: '4.50',
        how: ['Manual charge by Neema Mushi', 'Approved by Grace Mrema · 6 Oct 15:12'], kind: 'MANUAL',
    });
    const big = exports.charges.find((c) => c.chargeCode === 'STORAGE_IMPORT');
    if (big)
        Object.assign(big, { status: 'WAIVER_PENDING', waiverNote: '50% waiver requested by Neema Mushi: customs exam delay' });
}
const openCharges = (siteId) => exports.charges.filter((c) => {
    const s = c.unitStayId ? core_1.allStays.find((x) => x.unitStayId === c.unitStayId) : undefined;
    return s ? s.siteId === siteId : (0, core_1.consignment)(c.consignmentId)?.vesselCallId !== 13 ? siteId === 1 : siteId === 2;
});
exports.openCharges = openCharges;
const SITE_CODE = { 1: 'DAR1', 2: 'DAR2', 3: 'KBH1' };
const PREFIX = { PROFORMA: 'PRO', TAX_INVOICE: 'INV', CREDIT_NOTE: 'CN', DEBIT_NOTE: 'DN' };
function toInvLines(ls, currency, rate) {
    return ls.filter((l) => (0, exports.num)(l.amount) > 0).map((l, i) => {
        const k = currency === 'TZS' ? rate : 1;
        const amount = r2((0, exports.num)(l.amount) * k);
        const tax = r2((amount * l.taxPct) / 100);
        return {
            lineNo: i + 1, chargeCode: l.chargeCode, unitStayId: l.unitStayId ?? undefined, unitNo: l.unitNo ?? undefined, description: l.description,
            serviceFrom: l.serviceFrom ?? undefined, serviceTo: l.serviceTo ?? undefined, quantity: l.quantity, uom: l.uom, unitRate: (0, exports.m2)((0, exports.num)(l.unitRate) * k),
            amount: (0, exports.m2)(amount), taxCode: l.taxCode, taxRatePct: String(l.taxPct), taxAmount: (0, exports.m2)(tax), lineTotal: (0, exports.m2)(amount + tax), how: l.how,
        };
    });
}
/** Synthetic lines for older invoices whose units have left the depot. */
function historicLines(n, through, transit) {
    const out = [];
    for (let i = 0; i < n; i++) {
        const unitNo = (0, gen_1.containerNo)((0, gen_1.pick)(['BMLU', 'IOSU', 'SCLU']));
        const forty = (0, gen_1.rnd)() < 0.6;
        const v = transit ? 'VAT0' : 'VAT18', pct = transit ? 0 : 18;
        const start = (0, exports.addDays)(through, -(0, gen_1.int)(9, 26));
        const add = (code, desc, qty, rate, from, to) => {
            const amt = r2(qty * rate);
            out.push({ key: `${unitNo}-${code}-${from}`, unitNo, unitCategory: 'CONTAINER', billToPartyId: 0, chargeCode: code, chargeName: exports.CHARGE_NAMES[code], description: desc, serviceFrom: from, serviceTo: to, quantity: String(qty), uom: code.startsWith('STORAGE') ? 'day' : 'move', unitRate: (0, exports.m2)(rate), amount: (0, exports.m2)(amt), taxCode: v, taxPct: pct, taxAmount: (0, exports.m2)((amt * pct) / 100), how: [] });
        };
        add('LIFT_ON_OFF', exports.CHARGE_NAMES.LIFT_ON_OFF, 1, forty ? 90 : 60, start, start);
        const days = (0, exports.daysBetween)(start, through) + 1;
        const free = transit ? 14 : 7;
        if (days > free) {
            const s1 = Math.min(days, transit ? 30 : 14);
            if (s1 > free)
                add(transit ? 'STORAGE_TRANSIT' : 'STORAGE_IMPORT', `Storage, days ${free + 1}–${s1}`, s1 - free, transit ? (forty ? 20 : 10) : forty ? 16 : 8, (0, exports.addDays)(start, free), (0, exports.addDays)(start, s1 - 1));
            if (!transit && days > 14)
                add('STORAGE_IMPORT', `Storage, days 15–${days}`, days - 14, forty ? 24 : 12, (0, exports.addDays)(start, 14), through);
        }
    }
    return out;
}
const specs = [
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
const invById = new Map();
exports.invoices = [];
for (const sp of specs) {
    const site = sp.site ?? 1;
    const date = (0, gen_1.day)(sp.date);
    const cur = sp.cur ?? 'USD';
    const rate = (0, exports.fx)(date);
    const rRec = rateOn(date).rate;
    const through = sp.through !== undefined ? (0, gen_1.day)(sp.through) : date;
    const cons = sp.cons ? (0, core_1.consignment)(sp.cons) : undefined;
    let lines = [];
    let reason = sp.reason;
    if (sp.orig) {
        const o = invById.get(sp.orig);
        const part = sp.creditPart ?? 0.2;
        const src = o.lines.filter((l) => l.chargeCode?.startsWith('STORAGE') || l.chargeCode === 'CFS_HANDLING' || l.chargeCode === 'LIFT_ON_OFF').slice(0, 2);
        lines = src.map((l, i) => {
            const amt = r2((0, exports.num)(l.amount) * part * 2);
            const tax = r2((amt * (0, exports.num)(l.taxRatePct)) / 100);
            return { ...l, lineNo: i + 1, description: `${sp.kind === 'CREDIT_NOTE' ? 'Credit' : 'Additional charge'}: ${l.description}`, quantity: '1', unitRate: (0, exports.m2)(amt), amount: (0, exports.m2)(amt), taxAmount: (0, exports.m2)(tax), lineTotal: (0, exports.m2)(amt + tax) };
        });
    }
    else if (sp.units) {
        const stays = core_1.allStays.filter((s) => s.consignmentId === sp.cons && s.physicalStatus !== 'EXPECTED' && s.siteId === site);
        const pickS = (sp.id === 1220 ? [core_1.allStays[0], ...stays.filter((s) => s !== core_1.allStays[0])] : stays).slice(0, sp.units);
        let ls = rateStays(pickS, through);
        if (sp.disb) {
            const amt = 145.0, fee = 15.0;
            ls = ls.concat([
                { key: 'd1', billToPartyId: sp.bill, chargeCode: 'DISB_PORT', chargeName: exports.CHARGE_NAMES.DISB_PORT, description: 'Port charges paid on your behalf, receipt PA-DSM-26-551902', serviceFrom: (0, gen_1.day)(-4), serviceTo: (0, gen_1.day)(-4), quantity: '1', uom: 'each', unitRate: (0, exports.m2)(amt), amount: (0, exports.m2)(amt), taxCode: 'OOS', taxPct: 0, taxAmount: '0.00', how: ['Re-billed at cost; outside VAT scope'] },
                { key: 'd2', billToPartyId: sp.bill, chargeCode: 'DISB_HANDLING_FEE', chargeName: exports.CHARGE_NAMES.DISB_HANDLING_FEE, description: 'Disbursement handling fee', serviceFrom: (0, gen_1.day)(-4), serviceTo: (0, gen_1.day)(-4), quantity: '1', uom: 'each', unitRate: (0, exports.m2)(fee), amount: (0, exports.m2)(fee), taxCode: 'VAT18', taxPct: 18, taxAmount: (0, exports.m2)(fee * 0.18), how: ['Handling fee on disbursement DSB-DAR1-26-0187'] },
            ]);
        }
        lines = toInvLines(ls, cur, rate);
    }
    else {
        lines = toInvLines(historicLines(sp.hist ?? 2, date, cons?.cargoRegimeCode === 'TRANSIT'), cur, rate);
    }
    const sub = r2(lines.reduce((a, l) => a + (0, exports.num)(l.amount), 0));
    const tax = r2(lines.reduce((a, l) => a + (0, exports.num)(l.taxAmount), 0));
    const total = r2(sub + tax);
    const paidAmt = r2(total * (sp.paid ?? 0));
    const credited = 0;
    const posted = sp.status !== 'DRAFT' && sp.kind !== 'PROFORMA';
    const inv = {
        invoiceId: sp.id, invoiceNo: `${PREFIX[sp.kind]}-${SITE_CODE[site]}-26-${String(sp.no).padStart(6, '0')}`, docKind: sp.kind, status: sp.status, siteId: site,
        billToPartyId: sp.bill, consignmentId: sp.cons, consignmentRef: cons?.refNo, currency: cur, baseCurrency: 'TZS',
        exchangeRate: rRec.rate, exchangeRateDate: rRec.rateDate, invoiceDate: date, dueDate: (0, core_1.party)(sp.bill)?.creditStatus === 'CREDIT' && sp.kind !== 'PROFORMA' ? (0, exports.addDays)(date, 30) : date,
        serviceToDate: through, subtotal: (0, exports.m2)(sub), taxTotal: (0, exports.m2)(tax), total: (0, exports.m2)(total), totalBase: (0, exports.m2)(cur === 'TZS' ? total : total * rate),
        amountPaid: (0, exports.m2)(paidAmt), amountCredited: (0, exports.m2)(credited), balance: (0, exports.m2)(sp.kind === 'PROFORMA' && sp.status === 'CONVERTED' ? 0 : total - paidAmt - credited),
        proformaInvoiceId: sp.proforma, originalInvoiceId: sp.orig, reason, postedAt: posted ? (0, gen_1.at)(-sp.date * 24 + 3 - (sp.id % 5) * 0.4) : undefined,
        fiscalReceipt: sp.fiscal ? {
            provider: 'VFD · TRA EFD gateway', status: sp.fiscal, attempts: sp.fiscal === 'FAILED' ? 3 : sp.fiscal === 'PENDING' ? 1 : 1,
            receiptNo: sp.fiscal === 'ISSUED' ? `${exports.COMPANY.vfdSerial}-${String(48800 + (sp.id % 1000)).padStart(6, '0')}` : null,
            verificationCode: sp.fiscal === 'ISSUED' ? `${(sp.id * 7919).toString(16).toUpperCase().slice(0, 4)}${(sp.no * 104729).toString(16).toUpperCase().slice(0, 6)}` : null,
            verificationUrl: sp.fiscal === 'ISSUED' ? 'https://verify.tra.go.tz/…' : null,
            issuedAt: sp.fiscal === 'ISSUED' ? (0, gen_1.at)(-sp.date * 24 + 2.9) : null,
            lastError: sp.fiscal === 'FAILED' ? 'VFD provider did not answer within 30 s (HTTP 504). Will retry automatically every 15 minutes.' : null,
        } : undefined,
        glStatus: sp.gl ?? null, createdBy: sp.by ?? (0, gen_1.pick)(['Neema Mushi', 'Halima Said', 'Joseph Kweka']), lines,
        releaseValidTo: sp.through !== undefined ? through : undefined, zeroRated: cons?.cargoRegimeCode === 'TRANSIT',
    };
    invById.set(sp.id, inv);
    exports.invoices.push(inv);
}
// apply notes to their originals
for (const n of exports.invoices.filter((i) => i.docKind === 'CREDIT_NOTE')) {
    const o = invById.get(n.originalInvoiceId);
    const cr = (0, exports.num)(n.total);
    Object.assign(o, { amountCredited: (0, exports.m2)(cr), balance: (0, exports.m2)((0, exports.num)(o.total) - (0, exports.num)(o.amountPaid) - cr) });
    Object.assign(n, { balance: '0.00' });
}
for (const n of exports.invoices.filter((i) => i.docKind === 'DEBIT_NOTE'))
    Object.assign(n, { balance: n.total });
// a paid proforma waiting to be converted
{
    const p = invById.get(1242);
    Object.assign(p, { amountPaid: p.total, balance: '0.00' });
}
{
    const p = invById.get(1240);
    Object.assign(p, { amountPaid: p.total });
}
{
    const p = invById.get(1243);
    Object.assign(p, { amountPaid: p.total });
}
const invoice = (id) => invById.get(id);
exports.invoice = invoice;
const invoiceByNo = (no) => exports.invoices.find((i) => i.invoiceNo === no);
exports.invoiceByNo = invoiceByNo;
for (const r of exports.rates)
    r.usedBy = exports.invoices.filter((i) => i.exchangeRateDate === r.rateDate && i.status !== 'DRAFT' && i.docKind !== 'PROFORMA').length;
exports.DOC_KIND = { PROFORMA: 'Proforma', TAX_INVOICE: 'Tax invoice', CREDIT_NOTE: 'Credit note', DEBIT_NOTE: 'Debit note' };
exports.channels = [
    { paymentChannelId: 1, companyId: 1, channelCode: 'CASH_USD', channelName: 'Cash USD', method: 'CASH', currency: 'USD', glAccount: '1011 Cash on hand USD', isActive: true },
    { paymentChannelId: 2, companyId: 1, channelCode: 'CASH_TZS', channelName: 'Cash TZS', method: 'CASH', currency: 'TZS', glAccount: '1010 Cash on hand TZS', isActive: true },
    { paymentChannelId: 3, companyId: 1, channelCode: 'CRDB_USD', channelName: 'CRDB transfer (USD)', method: 'BANK_TRANSFER', provider: 'CRDB', currency: 'USD', glAccount: '1020 CRDB USD', referencePattern: 'FT reference', isActive: true },
    { paymentChannelId: 4, companyId: 1, channelCode: 'NMB_TZS', channelName: 'NMB transfer (TZS)', method: 'BANK_TRANSFER', provider: 'NMB', currency: 'TZS', glAccount: '1030 NMB TZS', referencePattern: 'Bank reference', isActive: true },
    { paymentChannelId: 5, companyId: 1, channelCode: 'MPESA', channelName: 'M-Pesa', method: 'MOBILE_MONEY', provider: 'M-Pesa', currency: 'TZS', glAccount: '1041 M-Pesa till', referencePattern: '10 characters, e.g. SJ47KQ2ZP1', isActive: true },
    { paymentChannelId: 6, companyId: 1, channelCode: 'TIGO', channelName: 'Tigo Pesa', method: 'MOBILE_MONEY', provider: 'Tigo Pesa', currency: 'TZS', glAccount: '1042 Tigo Pesa till', referencePattern: 'Transaction ID', isActive: true },
    { paymentChannelId: 7, companyId: 1, channelCode: 'AIRTEL', channelName: 'Airtel Money', method: 'MOBILE_MONEY', provider: 'Airtel Money', currency: 'TZS', glAccount: '1043 Airtel Money till', referencePattern: 'Transaction ID', isActive: true },
    { paymentChannelId: 8, companyId: 1, channelCode: 'CHEQUE', channelName: 'Cheque', method: 'CHEQUE', currency: 'TZS', glAccount: '1025 Cheques in hand', referencePattern: 'Cheque number and bank', isActive: true },
];
const channel = (code) => exports.channels.find((c) => c.channelCode === code);
exports.channel = channel;
let payId = 3100, rctNo = 18840, allocId = 52000;
exports.payments = [];
function mkPayment(o) {
    const date = (0, exports.eatDate)((0, gen_1.at)(o.hoursAgo));
    const rate = (0, exports.fx)(date);
    const allocs = o.alloc.map(([inv, amtPayCcy]) => {
        const invRate = (0, exports.num)(inv.exchangeRate);
        const inInvCcy = inv.currency === o.currency ? amtPayCcy : o.currency === 'TZS' ? amtPayCcy / invRate : amtPayCcy * invRate;
        const fxDiff = inv.currency === 'USD' ? r2(inInvCcy * (rate - invRate)) : 0;
        return { paymentAllocationId: ++allocId, invoiceId: inv.invoiceId, invoiceNo: inv.invoiceNo, amount: (0, exports.m2)(amtPayCcy), amountInvoiceCcy: (0, exports.m2)(inInvCcy), fxDifferenceBase: (0, exports.m2)(fxDiff), allocatedAt: (0, gen_1.at)(o.hoursAgo - 0.02) };
    });
    const allocated = r2(allocs.reduce((a, x) => a + (0, exports.num)(x.amount), 0));
    const p = {
        paymentId: ++payId, receiptNo: `RCT-DAR1-26-${String(++rctNo).padStart(6, '0')}`, partyId: o.partyId, channelCode: o.channelCode, externalRef: o.ref ?? null,
        currency: o.currency, amount: (0, exports.m2)(o.amount), exchangeRate: (0, exports.m2)(rate), amountBase: (0, exports.m2)(o.currency === 'TZS' ? o.amount : o.amount * rate),
        amountAllocated: (0, exports.m2)(allocated), unallocated: (0, exports.m2)(o.amount - allocated), receivedAt: (0, gen_1.at)(o.hoursAgo), valueDate: date,
        status: o.status ?? (allocated >= o.amount - 0.005 ? 'ALLOCATED' : allocated > 0 ? 'PART_ALLOC' : 'RECEIVED'), allocations: allocs,
        cashier: o.cashier ?? exports.ME, siteId: 1, payerName: o.payer,
    };
    exports.payments.push(p);
    return p;
}
// payments behind the paid and part-paid invoices
for (const inv of exports.invoices.filter((i) => i.docKind === 'TAX_INVOICE' && (0, exports.num)(i.amountPaid) > 0 && i.invoiceId !== 1220 && i.invoiceId !== 1242)) {
    const hrs = Math.max(1, -(0, exports.daysBetween)(exports.TODAY, inv.invoiceDate) * 24 - 2) + (inv.invoiceDate === exports.TODAY ? 0 : 0);
    const usd = inv.currency === 'USD';
    const chan = usd ? (0, gen_1.pick)(['CRDB_USD', 'CRDB_USD', 'CASH_USD']) : (0, gen_1.pick)(['NMB_TZS', 'MPESA']);
    mkPayment({ partyId: inv.billToPartyId, channelCode: chan, currency: usd ? 'USD' : 'TZS', amount: (0, exports.num)(inv.amountPaid), hoursAgo: inv.invoiceDate === exports.TODAY ? 2.2 : hrs, ref: chan.startsWith('CASH') ? undefined : chan === 'CRDB_USD' ? `CRDB/FT/26${(0, gen_1.int)(200, 280)}/${(0, gen_1.int)(10000, 99999)}` : `NMB${(0, gen_1.int)(10000000, 99999999)}`, alloc: [[inv, (0, exports.num)(inv.amountPaid)]], cashier: (0, gen_1.pick)(['Mary Temba', 'Joseph Kweka', exports.ME]) });
}
// today at the counter: the hero invoice paid partly by M-Pesa in TZS, an overpayment, and an unallocated transfer
{
    const hero = invById.get(1220);
    const part = (0, exports.num)(hero.amountPaid);
    const r = (0, exports.fx)(exports.TODAY);
    mkPayment({ partyId: 2, channelCode: 'CRDB_USD', currency: 'USD', amount: r2(part - 200), hoursAgo: 26, ref: 'CRDB/FT/26279/44812', alloc: [[hero, r2(part - 200)]], cashier: 'Mary Temba' });
    mkPayment({ partyId: 2, channelCode: 'MPESA', currency: 'TZS', amount: Math.round(200 * r), hoursAgo: 1.4, ref: 'SJ47KQ2ZP1', alloc: [[hero, Math.round(200 * r)]], payer: 'Baraka Mwita (collector)' });
    const pro = invById.get(1242);
    mkPayment({ partyId: 13, channelCode: 'CASH_USD', currency: 'USD', amount: (0, exports.num)(pro.total) + 640, hoursAgo: 3.1, alloc: [[pro, (0, exports.num)(pro.total)]], payer: 'Tanzanite Pharma, A. Msuya' });
    mkPayment({ partyId: 1, channelCode: 'NMB_TZS', currency: 'TZS', amount: 1850000, hoursAgo: 0.8, ref: 'NMB60228814', alloc: [] });
    mkPayment({ partyId: 3, channelCode: 'TIGO', currency: 'TZS', amount: 265000, hoursAgo: 2.6, ref: '8F21KX09TA', alloc: [], payer: 'Bahari Motors, yard clerk' });
    mkPayment({ partyId: 10, channelCode: 'CASH_TZS', currency: 'TZS', amount: 412000, hoursAgo: 0.5, alloc: [], payer: 'Nyota Agro, driver' });
}
const payment = (id) => exports.payments.find((p) => p.paymentId === id);
exports.payment = payment;
const usedRefs = () => exports.payments.filter((p) => p.externalRef).map((p) => ({ ref: p.externalRef, channel: p.channelCode, receiptNo: p.receiptNo, at: p.receivedAt }));
exports.usedRefs = usedRefs;
const normRef = (s) => s.replace(/[\s/\-.]/g, '').toUpperCase();
exports.normRef = normRef;
function findDuplicateRef(channelCode, ref) {
    const n = (0, exports.normRef)(ref);
    if (n.length < 4)
        return undefined;
    return (0, exports.usedRefs)().find((u) => u.channel === channelCode && (0, exports.normRef)(u.ref) === n);
}
const cashIn = (cur, who, since) => exports.payments.filter((p) => p.cashier === who && p.channelCode === `CASH_${cur}` && Date.parse(p.receivedAt) >= Date.parse((0, gen_1.at)(since)));
function mkShift(id, who, cur, openHrs, float, o = {}) {
    const cash = cashIn(cur, who, openHrs).reduce((a, p) => a + (0, exports.num)(p.amount), 0) + (o.extra ?? 0);
    const expected = float + cash;
    const nonCash = exports.payments.filter((p) => p.cashier === who && p.currency === cur && !p.channelCode.startsWith('CASH') && Date.parse(p.receivedAt) >= Date.parse((0, gen_1.at)(openHrs))).reduce((a, p) => a + (0, exports.num)(p.amount), 0);
    return {
        cashierShiftId: id, siteId: 1, cashierSub: who, cashier: who, currency: cur, openedAt: (0, gen_1.at)(openHrs), closedAt: o.closeHrs !== undefined ? (0, gen_1.at)(o.closeHrs) : undefined,
        openingFloat: (0, exports.m2)(float), expectedCash: (0, exports.m2)(expected), countedCash: o.diff !== undefined ? (0, exports.m2)(expected + o.diff) : undefined,
        difference: o.diff !== undefined ? (0, exports.m2)(o.diff) : undefined, status: o.status ?? 'OPEN', receiptsCount: exports.payments.filter((p) => p.cashier === who && p.currency === cur && Date.parse(p.receivedAt) >= Date.parse((0, gen_1.at)(openHrs))).length + (o.extra ? 6 : 0),
        nonCash: (0, exports.m2)(nonCash), note: o.note, approvedBy: o.approvedBy,
    };
}
exports.shifts = [
    mkShift(901, exports.ME, 'USD', 3.5, 200),
    mkShift(902, exports.ME, 'TZS', 3.5, 300000),
    mkShift(895, 'Mary Temba', 'TZS', 27, 300000, { closeHrs: 18, extra: 2_316_000, diff: -4000, status: 'CLOSED', note: 'Short TZS 4,000. Recounted twice; one TZS 5,000 note given as change for TZS 1,000.' }),
    mkShift(896, 'Mary Temba', 'USD', 27, 200, { closeHrs: 18, extra: 1840, diff: 0, status: 'CLOSED', note: 'Balanced.' }),
    mkShift(897, 'Joseph Kweka', 'USD', 26, 200, { closeHrs: 17, extra: 3120, diff: 20, status: 'CLOSED', note: 'Over USD 20; customer left before change was given, name noted.' }),
    mkShift(890, 'Joseph Kweka', 'TZS', 50, 300000, { closeHrs: 41, extra: 1_904_500, diff: 0, status: 'APPROVED', approvedBy: 'Grace Mrema' }),
];
exports.refunds = (() => {
    const over = exports.payments.find((p) => p.partyId === 13 && (0, exports.num)(p.unallocated) > 0);
    const p2 = exports.payments.find((p) => p.partyId === 3 && p.channelCode === 'TIGO');
    const p3 = exports.payments.find((p) => p.partyId === 11);
    const p4 = exports.payments.find((p) => p.partyId === 10 && p.status === 'ALLOCATED') ?? exports.payments[0];
    return [
        { refundId: 61, refundNo: 'RFD-DAR1-26-000071', paymentId: over.paymentId, partyId: 13, currency: 'USD', amount: '640.00', reason: 'Paid proforma PRO-DAR1-26-002060 plus USD 640 for a second container that was not released to them. Customer asks for the balance back to their CRDB account.', status: 'PENDING_L1', requestedBy: 'Neema Mushi', requestedAt: (0, gen_1.at)(2.2), method: 'Bank transfer CRDB', levels: [{ level: 1, who: exports.APPROVERS.l1 }, { level: 2, who: exports.APPROVERS.l2 }] },
        { refundId: 60, refundNo: 'RFD-DAR1-26-000070', paymentId: p3.paymentId, partyId: 11, currency: 'USD', amount: '1180.00', reason: 'Invoice INV-DAR1-26-003295 paid twice: by CRDB transfer and again by the clearing agent.', status: 'PENDING_L2', requestedBy: 'Halima Said', requestedAt: (0, gen_1.at)(22), method: 'Bank transfer CRDB', levels: [{ level: 1, who: exports.APPROVERS.l1, at: (0, gen_1.at)(6), decision: 'APPROVED' }, { level: 2, who: exports.APPROVERS.l2 }] },
        { refundId: 59, refundNo: 'RFD-DAR1-26-000069', paymentId: p2.paymentId, partyId: 3, currency: 'TZS', amount: '265000.00', reason: 'Tigo Pesa payment sent to our till by mistake; Bahari Motors had no invoice open.', status: 'APPROVED', requestedBy: 'Neema Mushi', requestedAt: (0, gen_1.at)(5), method: 'Tigo Pesa reversal', levels: [] },
        { refundId: 58, refundNo: 'RFD-DAR1-26-000068', paymentId: p4.paymentId, partyId: 10, currency: 'USD', amount: '320.00', reason: 'Export cancelled; documentation and lift charges credited on CN-DAR1-26-000209.', status: 'PAID', requestedBy: 'Halima Said', requestedAt: (0, gen_1.at)(120), method: 'Bank transfer CRDB', paidAt: (0, gen_1.at)(70), paidReference: 'CRDB/FT/26276/10988', levels: [] },
        { refundId: 57, refundNo: 'RFD-DAR1-26-000067', paymentId: p4.paymentId, partyId: 1, currency: 'USD', amount: '2400.00', reason: 'Customer asked for advance back; later agreed to keep it on account.', status: 'CANCELLED', requestedBy: 'Joseph Kweka', requestedAt: (0, gen_1.at)(200), method: 'Bank transfer CRDB', levels: [{ level: 1, who: exports.APPROVERS.l1, at: (0, gen_1.at)(190), decision: 'APPROVED' }, { level: 2, who: exports.APPROVERS.l2 }] },
    ];
})();
exports.disbursements = [
    { disbursementId: 187, disbNo: 'DSB-DAR1-26-0187', consignmentId: 101, billToPartyId: 2, payeeName: 'Port authority, Dar es Salaam port', chargeCode: 'DISB_PORT', description: 'Port charges: wharfage and removal to ICD', currency: 'USD', amountPaid: '145.00', paidAt: (0, gen_1.day)(-4), payeeReceiptNo: 'PA-DSM-26-551902', rebillMode: 'COST_PLUS_FEE', handlingFee: '15.00', status: 'INVOICED', invoiceId: 1220, recordedBy: 'Halima Said' },
    { disbursementId: 188, disbNo: 'DSB-DAR1-26-0188', consignmentId: 103, billToPartyId: 2, payeePartyId: 5, payeeName: (0, core_1.partyName)(5), chargeCode: 'DISB_LINE', description: 'Delivery order fee and container deposit handling', currency: 'USD', amountPaid: '380.00', paidAt: (0, gen_1.day)(-3), payeeReceiptNo: 'IOS-DSM-DO-77120', rebillMode: 'COST_PLUS_FEE', handlingFee: '25.00', status: 'RECORDED', recordedBy: 'Halima Said' },
    { disbursementId: 189, disbNo: 'DSB-DAR1-26-0189', consignmentId: 109, billToPartyId: 1, payeeName: 'TRA customs (duty and taxes)', chargeCode: 'DISB_DUTY', description: 'Import duty and VAT on entry TZDL-26-0418877', currency: 'TZS', amountPaid: '18450000.00', paidAt: (0, gen_1.day)(-2), payeeReceiptNo: 'TRA-CN-99128834', rebillMode: 'COST_PLUS_FEE', handlingFee: '150000.00', status: 'RECORDED', recordedBy: 'Joseph Kweka' },
    { disbursementId: 181, disbNo: 'DSB-DAR1-26-0181', consignmentId: 102, billToPartyId: 11, payeePartyId: 4, payeeName: (0, core_1.partyName)(4), chargeCode: 'DISB_LINE', description: 'Line demurrage settled to release the hold', currency: 'USD', amountPaid: '620.00', paidAt: (0, gen_1.day)(-21), payeeReceiptNo: 'BML-DSM-RCT-30017', rebillMode: 'AT_COST', handlingFee: '0.00', status: 'INVOICED', invoiceId: 1207, recordedBy: 'Halima Said' },
    { disbursementId: 176, disbNo: 'DSB-DAR1-26-0176', consignmentId: 104, billToPartyId: 14, payeeName: 'Port authority, Dar es Salaam port', chargeCode: 'DISB_PORT', description: 'Port storage before transfer to ICD', currency: 'USD', amountPaid: '210.00', paidAt: (0, gen_1.day)(-38), payeeReceiptNo: 'PA-DSM-26-540118', rebillMode: 'AT_COST', handlingFee: '0.00', status: 'WRITTEN_OFF', recordedBy: 'Joseph Kweka' },
    { disbursementId: 183, disbNo: 'DSB-DAR1-26-0183', consignmentId: 101, billToPartyId: 2, payeeName: 'Port authority, Dar es Salaam port', chargeCode: 'DISB_PORT', description: 'Port charges: second batch', currency: 'USD', amountPaid: '96.00', paidAt: (0, gen_1.day)(-13), payeeReceiptNo: 'PA-DSM-26-549330', rebillMode: 'COST_PLUS_FEE', handlingFee: '10.00', status: 'INVOICED', invoiceId: 1210, recordedBy: 'Halima Said' },
];
function statement(partyId, from = (0, gen_1.day)(-60), to = exports.TODAY) {
    const usd = (amt, cur, rate) => (cur === 'USD' ? amt : amt / rate);
    const ev = [];
    for (const i of exports.invoices.filter((x) => x.billToPartyId === partyId && x.docKind !== 'PROFORMA' && x.status !== 'DRAFT' && x.status !== 'CANCELLED')) {
        const amt = usd((0, exports.num)(i.total), i.currency, (0, exports.num)(i.exchangeRate));
        const credit = i.docKind === 'CREDIT_NOTE';
        ev.push({ date: i.invoiceDate, docKind: exports.DOC_KIND[i.docKind], docNo: i.invoiceNo, reference: i.consignmentRef, debit: credit ? 0 : amt, credit: credit ? amt : 0, to: `/invoices/${i.invoiceId}`, due: i.dueDate ?? undefined });
    }
    for (const p of exports.payments.filter((x) => x.partyId === partyId && x.status !== 'REVERSED')) {
        ev.push({ date: p.valueDate ?? (0, exports.eatDate)(p.receivedAt), docKind: 'Payment', docNo: p.receiptNo, reference: [(0, exports.channel)(p.channelCode)?.channelName, p.externalRef].filter(Boolean).join(' · '), debit: 0, credit: usd((0, exports.num)(p.amount), p.currency, (0, exports.num)(p.exchangeRate)) });
    }
    for (const r of exports.refunds.filter((x) => x.partyId === partyId && x.status === 'PAID')) {
        ev.push({ date: (0, exports.eatDate)(r.paidAt), docKind: 'Refund', docNo: r.refundNo, reference: r.paidReference ?? undefined, debit: usd((0, exports.num)(r.amount), r.currency, (0, exports.fx)((0, exports.eatDate)(r.paidAt))), credit: 0 });
    }
    ev.sort((a, b) => a.date.localeCompare(b.date) || a.docNo.localeCompare(b.docNo));
    const opening = r2(ev.filter((e) => e.date < from).reduce((a, e) => a + e.debit - e.credit, 0));
    let bal = opening;
    const lines = ev.filter((e) => e.date >= from && e.date <= to).map((e) => { bal = r2(bal + e.debit - e.credit); return { ...e, debit: r2(e.debit), credit: r2(e.credit), balance: bal }; });
    // ageing of open documents by days past due
    const ageing = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0 };
    for (const i of exports.invoices.filter((x) => x.billToPartyId === partyId && (x.docKind === 'TAX_INVOICE' || x.docKind === 'DEBIT_NOTE') && (0, exports.num)(x.balance) > 0 && x.status !== 'DRAFT')) {
        const b = usd((0, exports.num)(i.balance), i.currency, (0, exports.num)(i.exchangeRate));
        const late = (0, exports.daysBetween)(i.dueDate ?? i.invoiceDate, to);
        if (late <= 0)
            ageing.current += b;
        else if (late <= 30)
            ageing.d1_30 += b;
        else if (late <= 60)
            ageing.d31_60 += b;
        else if (late <= 90)
            ageing.d61_90 += b;
        else
            ageing.over90 += b;
    }
    const unallocated = exports.payments.filter((p) => p.partyId === partyId).reduce((a, p) => a + usd((0, exports.num)(p.unallocated), p.currency, (0, exports.num)(p.exchangeRate)), 0);
    const outstanding = r2(Object.values(ageing).reduce((a, b) => a + b, 0));
    return {
        partyId, currency: 'USD', fromDate: from, toDate: to, openingBalance: opening, lines, closingBalance: bal,
        ageing: Object.fromEntries(Object.entries(ageing).map(([k, v]) => [k, r2(v)])), outstanding, unallocated: r2(unallocated),
    };
}
exports.customers = core_1.parties.filter((p) => p.roles.includes('CUSTOMER') || p.roles.includes('SHIPPING_LINE')).filter((p) => exports.invoices.some((i) => i.billToPartyId === p.partyId) || p.roles.includes('CUSTOMER'));
function openBalanceUsd(partyId) { return statement(partyId).outstanding; }
let glId = 88000;
function journalForInvoice(i) {
    const rate = i.currency === 'TZS' ? 1 : (0, exports.num)(i.exchangeRate);
    const credit = i.docKind === 'CREDIT_NOTE';
    const lines = [];
    const byAcc = new Map();
    for (const l of i.lines) {
        const acc = exports.REVENUE_GL[exports.CHARGE_GROUP[l.chargeCode ?? ''] ?? 'OTHER'];
        byAcc.set(acc, (byAcc.get(acc) ?? 0) + Math.round((0, exports.num)(l.amount) * rate));
    }
    const vat = Math.round((0, exports.num)(i.taxTotal) * rate);
    for (const [acc, v] of byAcc)
        lines.push({ account: acc, description: credit ? 'Revenue reversed' : 'Revenue', debit: credit ? v : 0, credit: credit ? 0 : v });
    if (vat)
        lines.push({ account: '2310 VAT output', description: 'VAT 18%', debit: credit ? vat : 0, credit: credit ? 0 : vat });
    const total = [...byAcc.values()].reduce((a, b) => a + b, 0) + vat;
    lines.unshift({ account: '1200 Trade receivables (AR control)', description: `${(0, core_1.partyName)(i.billToPartyId)}`, debit: credit ? 0 : total, credit: credit ? total : 0 });
    return lines;
}
function journalForPayment(p) {
    const base = Math.round((0, exports.num)(p.amountBase));
    const fxd = Math.round(p.allocations.reduce((a, x) => a + (0, exports.num)(x.fxDifferenceBase), 0));
    const lines = [{ account: (0, exports.channel)(p.channelCode)?.glAccount ?? '1010 Cash', description: `${p.receiptNo} ${p.externalRef ?? ''}`.trim(), debit: base, credit: 0 }];
    const unalloc = Math.round((0, exports.num)(p.unallocated) * (p.currency === 'USD' ? (0, exports.num)(p.exchangeRate) : 1));
    const toAr = base - unalloc;
    if (toAr)
        lines.push({ account: '1200 Trade receivables (AR control)', description: (0, core_1.partyName)(p.partyId), debit: 0, credit: toAr - fxd });
    if (fxd > 0)
        lines.push({ account: '7100 Exchange gain', description: 'Rate moved since invoice', debit: 0, credit: fxd });
    if (fxd < 0)
        lines.push({ account: '7110 Exchange loss', description: 'Rate moved since invoice', debit: -fxd, credit: 0 });
    if (unalloc)
        lines.push({ account: '2150 Unallocated receipts', description: 'Kept on account', debit: 0, credit: unalloc });
    return lines;
}
exports.glPostings = [];
for (const i of exports.invoices.filter((x) => x.glStatus)) {
    const jl = journalForInvoice(i);
    const failedReason = i.invoiceId === 1208 ? 'NG Billing refused: account 4120 Reefer income is blocked for posting in NG (code GL-ACC-BLOCKED).' : null;
    exports.glPostings.push({
        glPostingId: ++glId, sourceEntity: 'invoice', sourceId: i.invoiceId, sourceNo: i.invoiceNo, sourceKind: exports.DOC_KIND[i.docKind], destination: 'NG_BILLING',
        postingDate: i.invoiceDate, status: i.glStatus, externalRef: i.glStatus === 'POSTED' ? `NG-JV-26-${String(40100 + (glId % 1000)).padStart(6, '0')}` : null,
        attempts: i.glStatus === 'FAILED' ? 4 : i.glStatus === 'PENDING' ? 0 : 1, lastError: failedReason, postedAt: i.glStatus === 'POSTED' ? i.postedAt : null,
        journalLines: jl, to: `/invoices/${i.invoiceId}`, amountBase: jl.reduce((a, l) => a + l.debit, 0),
    });
}
for (const p of exports.payments) {
    const today = (0, exports.eatDate)(p.receivedAt) === exports.TODAY;
    const jl = journalForPayment(p);
    const fail = p.channelCode === 'TIGO';
    exports.glPostings.push({
        glPostingId: ++glId, sourceEntity: 'payment', sourceId: p.paymentId, sourceNo: p.receiptNo, sourceKind: 'Payment', destination: 'NG_BILLING',
        postingDate: p.valueDate, status: fail ? 'FAILED' : today ? (p.paymentId % 2 ? 'PENDING' : 'POSTED') : 'POSTED',
        externalRef: !fail && !(today && p.paymentId % 2) ? `NG-RV-26-${String(20500 + (glId % 1000)).padStart(6, '0')}` : null,
        attempts: fail ? 2 : 1, lastError: fail ? 'Timed out waiting for NG Billing after 30 s. The journal was not received; safe to retry.' : null,
        postedAt: !fail && !(today && p.paymentId % 2) ? p.receivedAt : null, journalLines: jl, amountBase: jl.reduce((a, l) => a + l.debit, 0),
    });
}
exports.glPostings.sort((a, b) => b.postingDate.localeCompare(a.postingDate) || b.glPostingId - a.glPostingId);
exports.periods = [
    { accountingPeriodId: 26, companyId: 1, periodKey: '2026-10', periodStart: '2026-10-01', periodEnd: '2026-10-31', status: 'OPEN' },
    { accountingPeriodId: 25, companyId: 1, periodKey: '2026-09', periodStart: '2026-09-01', periodEnd: '2026-09-30', status: 'OPEN' },
    { accountingPeriodId: 24, companyId: 1, periodKey: '2026-08', periodStart: '2026-08-01', periodEnd: '2026-08-31', status: 'CLOSED', closedAt: (0, gen_1.at)(24 * 30), closedBy: 'Grace Mrema' },
    { accountingPeriodId: 23, companyId: 1, periodKey: '2026-07', periodStart: '2026-07-01', periodEnd: '2026-07-31', status: 'CLOSED', closedAt: (0, gen_1.at)(24 * 62), closedBy: 'Grace Mrema' },
    { accountingPeriodId: 22, companyId: 1, periodKey: '2026-06', periodStart: '2026-06-01', periodEnd: '2026-06-30', status: 'CLOSED', closedAt: (0, gen_1.at)(24 * 95), closedBy: 'Grace Mrema' },
];
/* ------------------------------------------------------------------ helpers for screens */
const stayById = (id) => core_1.allStays.find((s) => s.unitStayId === id);
exports.stayById = stayById;
const vesselOf = (s) => core_1.vesselCalls.find((v) => v.vesselCallId === (0, core_1.consignment)(s.consignmentId)?.vesselCallId);
exports.vesselOf = vesselOf;
const consignmentsFor = (partyId, siteId) => core_1.consignments.filter((c) => c.billToPartyId === partyId && (siteId === undefined || core_1.allStays.some((s) => s.consignmentId === c.consignmentId && s.siteId === siteId)));
exports.consignmentsFor = consignmentsFor;
/* ------------------------------------------------------------------ search */
(0, search_1.registerSearch)((q) => {
    const n = q.replace(/[\s-]/g, '').toUpperCase();
    if (n.length < 3)
        return null;
    const hits = exports.invoices.filter((i) => i.invoiceNo.replace(/-/g, '').includes(n)).slice(0, 6).map((i) => ({
        id: i.invoiceId, title: i.invoiceNo, status: i.status,
        subtitle: `${exports.DOC_KIND[i.docKind]} · ${(0, core_1.partyName)(i.billToPartyId)} · ${i.currency} ${Number(i.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        link: { entityName: 'invoice', entityId: i.invoiceId }, to: `/invoices/${i.invoiceId}`,
    }));
    return hits.length ? { entity: 'INVOICE', label: 'Invoices', hits } : null;
});
