/* Setup (admin) sample data. Configuration values are copied from the
   database seed files (ng_icd_tenant_M0…M5_seed.sql) so the screens show
   what a new tenant actually starts with. Customer data the seed leaves
   to the admin (company, sites, yard, users, GL accounts, payment
   channels) is fictional. No rnd(): the shared seed in gen.ts is left
   untouched so other modules' sample data does not shift. */
import type { S } from '@/api/types';
import { equipment as coreEquipment, parties, vessels as coreVessels } from './core';
import { at, day } from './gen';
import { registerSearch } from './search';

/** Where a block of configuration comes from in the database. */
export interface Source { table: string; seed?: string }
export const SRC = {
  company: { table: 'm_company' }, site: { table: 'm_site, m_site_facility' }, pack: { table: 'm_country_pack', seed: 'M0 + M5 seed' },
  yard: { table: 'm_yard_location' }, tags: { table: 'm_location_tag', seed: 'M0 seed' },
  gates: { table: 'm_gate, m_gate_lane, m_checkpoint' }, visitTypes: { table: 'm_visit_type_checkpoint' },
  unitTypes: { table: 'm_unit_type', seed: 'M0 seed' }, identity: { table: 'm_identity_rule', seed: 'M0 seed' },
  regimes: { table: 'm_cargo_regime, m_regime_customs_ref', seed: 'M0 + M2 seed' },
  perms: { table: 'm_permission, m_role_permission', seed: 'M0 + M5 seed' },
  holds: { table: 'm_hold_type', seed: 'M2 seed' }, release: { table: 'm_release_condition, m_release_rule', seed: 'M2 seed' },
  approvals: { table: 'm_approval_policy', seed: 'M2 + M5 seed' }, exceptions: { table: 'm_exception_type', seed: 'M2 seed' },
  inspection: { table: 'm_inspection_template, m_inspection_item', seed: 'M1 seed' }, damage: { table: 'm_damage_code', seed: 'M1 seed' },
  tax: { table: 'm_tax_code', seed: 'M3 + M5 seed' }, charges: { table: 'm_charge_code', seed: 'M3 seed' },
  notify: { table: 'm_notification_template', seed: 'M4 seed' }, rules: { table: 'm_notification_rule', seed: 'M4 seed' },
  docTypes: { table: 'm_document_type', seed: 'M0 seed' }, fieldRules: { table: 'm_field_rule', seed: 'M0 seed' },
  sync: { table: 'sync_state', seed: 'M0 seed' },
} satisfies Record<string, Source>;

/* ------------------------------------------------------------------ company, packs, sites */
export const company: S<'Company'> = {
  companyId: 1, companyCode: 'MLM', legalName: 'Mlimani Inland Depots Limited', tradingName: 'Mlimani ICD',
  countryCode: 'TZ', countryPackCode: 'TZ', baseCurrency: 'USD', taxId: '128-445-907', vatNo: '40-031122-K',
  addressLine1: 'Plot 112, Nelson Mandela Road', addressLine2: 'Tabata', city: 'Dar es Salaam',
  phone: '+255 22 286 4400', email: 'ops@mlimani-icd.example', isActive: true,
};

export interface CountryPack { packCode: string; packName: string; countryCode: string; version: string; isActive: boolean; verify?: boolean; contents: string }
export const countryPacks: CountryPack[] = [
  { packCode: 'TZ', packName: 'Tanzania', countryCode: 'TZ', version: '2026.1', isActive: true, contents: '6 regimes, 8 customs reference types, 6 authority holds, VAT 18%' },
  { packCode: 'KE', packName: 'Kenya (starter)', countryCode: 'KE', version: '2026.0', isActive: false, verify: true, contents: '6 customs reference types, VAT 16% (seeded, unconfirmed)' },
  { packCode: 'UG', packName: 'Uganda (starter)', countryCode: 'UG', version: '2026.0', isActive: false, verify: true, contents: '6 customs reference types, VAT 18% (seeded, unconfirmed)' },
];

export type Site = S<'Site'> & { calendarCode: string; gates: number; slots: number };
export const sites: Site[] = [
  { siteId: 1, siteCode: 'DAR1', siteName: 'Dar es Salaam main yard', companyId: 1, countryCode: 'TZ', timeZone: 'Africa/Dar_es_Salaam', calendarId: 1, calendarCode: 'TZ_PUBLIC', addressLine1: 'Plot 112, Nelson Mandela Road', city: 'Dar es Salaam', latitude: '-6.832100', longitude: '39.231700', customsStationCode: 'DLICD1', regulatorLicenceNo: 'TASAC/ICD/0231', offlineGateLimitMin: 60, signatureMode: 'EITHER', facilities: ['ICD', 'CFS', 'EMPTY_DEPOT'], isActive: true, gates: 3, slots: 660 },
  { siteId: 2, siteCode: 'DAR2', siteName: 'Dar es Salaam vehicle yard', companyId: 1, countryCode: 'TZ', timeZone: 'Africa/Dar_es_Salaam', calendarId: 1, calendarCode: 'TZ_PUBLIC', addressLine1: 'Kurasini, Mivinjeni Street', city: 'Dar es Salaam', latitude: '-6.858400', longitude: '39.276900', customsStationCode: 'DLICD4', regulatorLicenceNo: 'TASAC/ICD/0247', offlineGateLimitMin: 30, signatureMode: 'SCREEN', facilities: ['ICDV'], isActive: true, gates: 1, slots: 39 },
  { siteId: 3, siteCode: 'KBH1', siteName: 'Kibaha warehouse', companyId: 1, countryCode: 'TZ', timeZone: 'Africa/Dar_es_Salaam', calendarId: 1, calendarCode: 'TZ_PUBLIC', addressLine1: 'Morogoro Road, Mlandizi junction', city: 'Kibaha', customsStationCode: null, regulatorLicenceNo: null, offlineGateLimitMin: 60, signatureMode: 'PAPER', facilities: ['WAREHOUSE', 'CFS'], isActive: true, gates: 1, slots: 96 },
];
export const FACILITY_NAME: Record<string, string> = {
  ICD: 'Inland container depot', ICDV: 'Vehicle depot', CFS: 'Container freight station', EMPTY_DEPOT: 'Empty depot', WAREHOUSE: 'Warehouse',
};

/* ------------------------------------------------------------------ calendars */
export const calendars: S<'Calendar'>[] = [{ calendarId: 1, calendarCode: 'TZ_PUBLIC', calendarName: 'Tanzania public holidays', countryCode: 'TZ' }];
/** 2026 dates. Islamic holidays follow the moon and are confirmed by government notice close to the date. */
export const holidays: (S<'Holiday'> & { moves?: boolean })[] = [
  { calendarHolidayId: 1, holidayDate: '2026-01-01', holidayName: "New Year's Day" },
  { calendarHolidayId: 2, holidayDate: '2026-01-12', holidayName: 'Zanzibar Revolution Day' },
  { calendarHolidayId: 3, holidayDate: '2026-03-20', holidayName: 'Eid al-Fitr', moves: true },
  { calendarHolidayId: 4, holidayDate: '2026-04-03', holidayName: 'Good Friday' },
  { calendarHolidayId: 5, holidayDate: '2026-04-06', holidayName: 'Easter Monday' },
  { calendarHolidayId: 6, holidayDate: '2026-04-07', holidayName: 'Karume Day' },
  { calendarHolidayId: 7, holidayDate: '2026-04-26', holidayName: 'Union Day' },
  { calendarHolidayId: 8, holidayDate: '2026-05-01', holidayName: "Workers' Day" },
  { calendarHolidayId: 9, holidayDate: '2026-05-27', holidayName: 'Eid al-Adha', moves: true },
  { calendarHolidayId: 10, holidayDate: '2026-07-07', holidayName: 'Saba Saba (Industry Day)' },
  { calendarHolidayId: 11, holidayDate: '2026-08-08', holidayName: 'Nane Nane (Farmers Day)' },
  { calendarHolidayId: 12, holidayDate: '2026-08-26', holidayName: 'Maulid (Prophet\'s Birthday)', moves: true },
  { calendarHolidayId: 13, holidayDate: '2026-10-14', holidayName: 'Mwalimu Nyerere Day' },
  { calendarHolidayId: 14, holidayDate: '2026-12-09', holidayName: 'Independence Day' },
  { calendarHolidayId: 15, holidayDate: '2026-12-25', holidayName: 'Christmas Day' },
  { calendarHolidayId: 16, holidayDate: '2026-12-26', holidayName: 'Boxing Day' },
];

/* ------------------------------------------------------------------ yard tree */
export type YardNode = S<'YardLocation'> & { name: string; siteId: number; rows?: number; bays?: number; draft?: boolean };
export const locationTags: S<'LocationTag'>[] = [
  ['IMPORT', 'Import'], ['EXPORT', 'Export'], ['EMPTY', 'Empty'], ['TRANSIT', 'Transit'], ['REEFER', 'Reefer (powered)'],
  ['HAZARDOUS', 'Hazardous'], ['HOLD', 'Hold area'], ['QUARANTINE', 'Quarantine'], ['EXAM', 'Examination area'],
  ['OVERFLOW', 'Overflow'], ['DAMAGED', 'Damaged units'], ['WASH', 'Washing bay'], ['REPAIR', 'Repair area'],
  ['VEHICLE', 'Vehicle parking'], ['KEYS', 'Key cabinet'],
].map(([tagCode, tagName], i) => ({ locationTagId: i + 1, tagCode, tagName }));

let yid = 1000;
const node = (siteId: number, parentId: number | null, levelNo: number, kind: YardNode['kind'], code: string, fullCode: string, name: string, extra: Partial<YardNode> = {}): YardNode => ({
  yardLocationId: ++yid, siteId, parentId, levelNo, kind, locationCode: code, fullCode, name, isSlot: false, allows20: true, allows40: true, allows45: false,
  sortOrder: yid, isBlocked: false, tags: [], isActive: true, ...extra,
});
const blk = (siteId: number, parent: YardNode, code: string, name: string, rows: number, bays: number, tiers: number, tags: string[], map: S<'MapRect'>, extra: Partial<YardNode> = {}) =>
  node(siteId, parent.yardLocationId!, 2, 'BLOCK', code, code, name, { rows, bays, maxTier: tiers, tags, map, childCount: rows, maxWeightKg: 32500, ...extra });

const dar1 = node(1, null, 1, 'AREA', 'MAIN', 'MAIN', 'Main container yard', { childCount: 6 });
const dar2 = node(2, null, 1, 'AREA', 'VEH', 'VEH', 'Vehicle parking', { childCount: 2, allows20: false, allows40: false });
const dar2k = node(2, null, 1, 'KEY_CABINET', 'KC1', 'KC1', 'Key cabinet 1 (gatehouse)', { childCount: 120, allows20: false, allows40: false, tags: ['KEYS'] });
const kbh = node(3, null, 1, 'AREA', 'WH1', 'WH1', 'Warehouse 1 (bonded)', { childCount: 4, allows20: false, allows40: false });
export const yardNodes: YardNode[] = [
  dar1,
  blk(1, dar1, 'A', 'Block A · import full', 5, 10, 4, ['IMPORT'], { x: '40', y: '40', w: '360', h: '150' }),
  blk(1, dar1, 'B', 'Block B · import and transit', 5, 10, 4, ['IMPORT', 'TRANSIT'], { x: '440', y: '40', w: '360', h: '150' }),
  blk(1, dar1, 'C', 'Block C · empties', 4, 8, 5, ['EMPTY'], { x: '40', y: '230', w: '300', h: '125' }, { maxWeightKg: 6000 }),
  blk(1, dar1, 'R', 'Block R · reefer stack', 2, 8, 2, ['REEFER'], { x: '380', y: '225', w: '300', h: '80' }, { reeferPlugNo: 'R-01…R-32' }),
  blk(1, dar1, 'X', 'Block X · customs exam bays', 2, 6, 1, ['EXAM'], { x: '380', y: '318', w: '180', h: '50' }),
  blk(1, dar1, 'D', 'Block D · dangerous goods pad', 0, 0, 2, ['HAZARDOUS'], { x: '720', y: '230', w: '180', h: '125' }, { draft: true, childCount: 0, isActive: false }),
  dar2,
  blk(2, dar2, 'V1', 'Zone V1 · cars and SUVs', 4, 6, 1, ['VEHICLE'], { x: '40', y: '40', w: '520', h: '200' }, { kind: 'BLOCK', allows20: false, allows40: false, baySize: 'SUV' }),
  blk(2, dar2, 'V2', 'Zone V2 · trucks and machinery', 3, 5, 1, ['VEHICLE'], { x: '600', y: '40', w: '300', h: '150' }, { allows20: false, allows40: false, baySize: 'TRUCK' }),
  dar2k,
  kbh,
  ...[1, 2, 3, 4].map((a) => node(3, kbh.yardLocationId!, 2, 'AISLE', `A${a}`, `WH1-A${a}`, `Aisle ${a}`, { rows: 4, bays: 6, maxTier: 4, childCount: 4, allows20: false, allows40: false, maxWeightKg: 1500, tags: a === 4 ? ['QUARANTINE'] : [] })),
];
/** Ground slots that are blocked, by block-row-bay. */
export const blockedSlots: Record<string, string> = {
  'A-03-07': 'Drainage repair, contractor on site until 15 Oct',
  'B-01-01': 'Light mast foundation; never stack here',
  'C-04-08': 'Too close to the fence for the empty handler',
};

/* ------------------------------------------------------------------ gates */
export type Gate = S<'Gate'> & { siteId: number };
export const gates: Gate[] = [
  { gateId: 1, siteId: 1, gateCode: 'OG1', gateName: 'Main gate (outer)', gateKind: 'OUTER', isActive: true, lanes: [
    { gateLaneId: 11, laneCode: 'In 1', direction: 'IN', isActive: true }, { gateLaneId: 12, laneCode: 'In 2', direction: 'IN', isActive: true },
    { gateLaneId: 13, laneCode: 'Out 1', direction: 'OUT', isActive: true }, { gateLaneId: 14, laneCode: 'Out 2', direction: 'OUT', isActive: false }] },
  { gateId: 2, siteId: 1, gateCode: 'IG1', gateName: 'Inner gate (yard)', gateKind: 'INNER', isActive: true, lanes: [
    { gateLaneId: 21, laneCode: 'Inner A', direction: 'BOTH', isActive: true }] },
  { gateId: 3, siteId: 1, gateCode: 'WB1', gateName: 'Weighbridge', gateKind: 'WEIGHBRIDGE', isActive: true, lanes: [
    { gateLaneId: 31, laneCode: 'Scale 1', direction: 'BOTH', isActive: true }] },
  { gateId: 4, siteId: 2, gateCode: 'VG1', gateName: 'Vehicle yard gate', gateKind: 'OUTER', isActive: true, lanes: [
    { gateLaneId: 41, laneCode: 'In', direction: 'IN', isActive: true }, { gateLaneId: 42, laneCode: 'Out', direction: 'OUT', isActive: true }] },
  { gateId: 5, siteId: 3, gateCode: 'KG1', gateName: 'Warehouse gate', gateKind: 'OUTER', isActive: true, lanes: [
    { gateLaneId: 51, laneCode: 'Lane 1', direction: 'BOTH', isActive: true }] },
];
export const checkpoints: S<'Checkpoint'>[] = [
  { checkpointId: 1, checkpointCode: 'OUTER_IN', checkpointName: 'Outer gate in', checkpointKind: 'OUTER_IN', gateId: 1, isActive: true },
  { checkpointId: 2, checkpointCode: 'INNER_IN', checkpointName: 'Inner gate in', checkpointKind: 'INNER_IN', gateId: 2, isActive: true },
  { checkpointId: 3, checkpointCode: 'WEIGH_IN', checkpointName: 'Weigh in', checkpointKind: 'WEIGH_IN', gateId: 3, isActive: true },
  { checkpointId: 4, checkpointCode: 'INNER_OUT', checkpointName: 'Inner gate out', checkpointKind: 'INNER_OUT', gateId: 2, isActive: true },
  { checkpointId: 5, checkpointCode: 'WEIGH_OUT', checkpointName: 'Weigh out', checkpointKind: 'WEIGH_OUT', gateId: 3, isActive: true },
  { checkpointId: 6, checkpointCode: 'OUTER_OUT', checkpointName: 'Outer gate out', checkpointKind: 'OUTER_OUT', gateId: 1, isActive: true },
];
const vtc = (...codes: string[]): S<'VisitTypeCheckpoint'>[] => codes.map((c, i) => ({ seqNo: i + 1, checkpointCode: c.replace('?', ''), isMandatory: !c.endsWith('?') }));
export const visitTypes: S<'VisitType'>[] = [
  { visitTypeId: 1, visitTypeCode: 'TRANSFER_IN', visitTypeName: 'Transfer from port', requiresNomination: true, requiresAppointment: false, isActive: true, checkpoints: vtc('OUTER_IN', 'WEIGH_IN?', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT') },
  { visitTypeId: 2, visitTypeCode: 'IMPORT_PICKUP', visitTypeName: 'Import pick-up', requiresNomination: true, requiresAppointment: true, isActive: true, checkpoints: vtc('OUTER_IN', 'INNER_IN', 'INNER_OUT', 'WEIGH_OUT?', 'OUTER_OUT') },
  { visitTypeId: 3, visitTypeCode: 'EXPORT_DROP', visitTypeName: 'Export drop-off', requiresNomination: true, requiresAppointment: true, isActive: true, checkpoints: vtc('OUTER_IN', 'WEIGH_IN', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT') },
  { visitTypeId: 4, visitTypeCode: 'EMPTY_RETURN', visitTypeName: 'Empty return', requiresNomination: false, requiresAppointment: false, isActive: true, checkpoints: vtc('OUTER_IN', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT') },
  { visitTypeId: 5, visitTypeCode: 'EMPTY_PICKUP', visitTypeName: 'Empty pick-up', requiresNomination: true, requiresAppointment: false, isActive: true, checkpoints: vtc('OUTER_IN', 'INNER_IN', 'INNER_OUT', 'OUTER_OUT') },
  { visitTypeId: 6, visitTypeCode: 'VEHICLE_DELIVERY', visitTypeName: 'Vehicle delivery', requiresNomination: true, requiresAppointment: false, isActive: true, checkpoints: vtc('OUTER_IN', 'INNER_OUT', 'OUTER_OUT') },
  { visitTypeId: 7, visitTypeCode: 'VEHICLE_RECEIPT', visitTypeName: 'Vehicle receipt (self-driven)', requiresNomination: true, requiresAppointment: false, isActive: true, checkpoints: vtc('OUTER_IN', 'INNER_IN') },
];

/* ------------------------------------------------------------------ unit types, identity, regimes */
const ALIAS: Record<string, string> = { '22G1': '20GP', '22R1': '20RF', '22U1': '20OT', '22P1': '20FR', '22T1': '20TK', '42G1': '40GP', '45G1': '40HC', '45R1': '40RH', '42U1': '40OT', '42P1': '40FR', L5G1: '45HC' };
type UT = S<'UnitType'> & { alias?: string };
const ct = (id: number, typeCode: string, typeName: string, lengthFt: number, heightCode: 'STD' | 'HC', teu: string, tare: number, f: Partial<UT> = {}): UT => ({
  unitTypeId: id, category: 'CONTAINER', typeCode, typeName, lengthFt, heightCode, teu, defaultTareKg: tare, isReefer: false, isTank: false, isOpenTop: false, isFlatRack: false,
  identityRules: ['ISO6346'], isActive: true, alias: ALIAS[typeCode], ...f,
});
const vt = (id: number, typeCode: string, typeName: string, vehicleClass: UT['vehicleClass'], bay: UT['baySizeRequired']): UT => ({
  unitTypeId: id, category: 'VEHICLE', typeCode, typeName, vehicleClass, baySizeRequired: bay, identityRules: ['VIN17', 'JP_FRAME'], isActive: true,
});
const lt = (id: number, typeCode: string, typeName: string): UT => ({ unitTypeId: id, category: 'LOT', typeCode, typeName, identityRules: ['FREE_TEXT'], isActive: true });
export const unitTypes: UT[] = [
  ct(1, '22G1', "20' general purpose", 20, 'STD', '1.0', 2200), ct(2, '22R1', "20' reefer", 20, 'STD', '1.0', 3000, { isReefer: true }),
  ct(3, '22U1', "20' open top", 20, 'STD', '1.0', 2300, { isOpenTop: true }), ct(4, '22P1', "20' flat rack", 20, 'STD', '1.0', 2700, { isFlatRack: true }),
  ct(5, '22T1', "20' tank", 20, 'STD', '1.0', 3700, { isTank: true }), ct(6, '42G1', "40' general purpose", 40, 'STD', '2.0', 3750),
  ct(7, '45G1', "40' high cube", 40, 'HC', '2.0', 3900), ct(8, '45R1', "40' high cube reefer", 40, 'HC', '2.0', 4600, { isReefer: true }),
  ct(9, '42U1', "40' open top", 40, 'STD', '2.0', 3800, { isOpenTop: true }), ct(10, '42P1', "40' flat rack", 40, 'STD', '2.0', 5000, { isFlatRack: true }),
  ct(11, 'L5G1', "45' high cube", 45, 'HC', '2.25', 4800),
  vt(12, 'CAR', 'Passenger car', 'CAR', 'CAR'), vt(13, 'SUV', 'SUV / 4x4', 'SUV', 'SUV'), vt(14, 'VAN', 'Van / minibus', 'VAN', 'SUV'),
  vt(15, 'PICKUP', 'Pick-up', 'PICKUP', 'SUV'), vt(16, 'TRUCK', 'Truck / lorry', 'TRUCK', 'TRUCK'), vt(17, 'BUS', 'Bus / coach', 'BUS', 'BUS'),
  vt(18, 'MOTORCYCLE', 'Motorcycle', 'MOTORCYCLE', 'CAR'), vt(19, 'MACHINERY', 'Machinery / equipment', 'MACHINERY', 'TRUCK'),
  lt(20, 'PKG', 'Package'), lt(21, 'PALLET', 'Pallet'), lt(22, 'BAG', 'Bag'), lt(23, 'CRATE', 'Crate / case'),
];
export const identityRules: (S<'IdentityRule'> & { description: string; example: string })[] = [
  { ruleCode: 'ISO6346', ruleName: 'Container number (ISO 6346)', regexPattern: '^[A-Z]{3}[UJZ][0-9]{7}$', checkDigitAlgo: 'ISO6346', description: 'Owner code + category + 6 digits + check digit; check digit validated.', example: 'CSQU 305438 3' },
  { ruleCode: 'VIN17', ruleName: 'Vehicle identification number', regexPattern: '^[A-HJ-NPR-Z0-9]{17}$', checkDigitAlgo: 'NONE', description: '17 characters, no I, O or Q. Check digit not enforced: only North American VINs use it.', example: 'JTMHV05J604123456' },
  { ruleCode: 'JP_FRAME', ruleName: 'Japanese chassis / frame number', regexPattern: '^[A-Z0-9]{2,8}-[0-9]{4,8}$', checkDigitAlgo: 'NONE', description: 'Model code, dash, serial, e.g. NZE141-1234567. Common on used imports from Japan.', example: 'NZE141-1234567' },
  { ruleCode: 'FREE_TEXT', ruleName: 'Free reference (lots, packages)', regexPattern: '^.{1,40}$', checkDigitAlgo: 'NONE', description: 'Any reference up to 40 characters.', example: 'LOT-0441/12' },
];
export interface PlateFormat { code: string; country: string; pattern: string; example: string; note: string }
export const plateFormats: PlateFormat[] = [
  { code: 'TZ', country: 'Tanzania', pattern: '^T ?[0-9]{3} ?[A-Z]{3}$', example: 'T 412 DKL', note: 'Stored without spaces (T412DKL); shown with spaces.' },
  { code: 'TZ_TRAILER', country: 'Tanzania trailer', pattern: '^T ?[0-9]{3} ?[A-Z]{3}$', example: 'T 118 DPE', note: 'Trailers carry their own plate; record both on the visit.' },
  { code: 'ZM', country: 'Zambia', pattern: '^[A-Z]{3} ?[0-9]{4}$', example: 'BAK 4471', note: 'Transit trucks to Lusaka and the Copperbelt.' },
  { code: 'KE', country: 'Kenya', pattern: '^K[A-Z]{2} ?[0-9]{3}[A-Z]$', example: 'KDA 233M', note: 'Starter pattern. Verify before use.' },
];
export const cargoRegimes: (S<'CargoRegime'> & { refs: string[] })[] = [
  { cargoRegimeId: 1, regimeCode: 'LOCAL', regimeName: 'Local import', requiresCustoms: true, refs: ['TANSAD', 'CUSTOMS_RELEASE'] },
  { cargoRegimeId: 2, regimeCode: 'TRANSIT', regimeName: 'Transit', requiresCustoms: true, refs: ['TRANSIT_DECL', 'TRANSIT_BOND', 'CUSTOMS_RELEASE'] },
  { cargoRegimeId: 3, regimeCode: 'EMPTY', regimeName: 'Empty', requiresCustoms: false, refs: [] },
  { cargoRegimeId: 4, regimeCode: 'BONDED', regimeName: 'Bonded', requiresCustoms: true, refs: ['TANSAD', 'CUSTOMS_RELEASE'] },
  { cargoRegimeId: 5, regimeCode: 'EXPORT', regimeName: 'Export', requiresCustoms: true, refs: ['EXPORT_DECL', 'EXPORT_RELEASE'] },
  { cargoRegimeId: 6, regimeCode: 'TRANSHIP', regimeName: 'Transhipment', requiresCustoms: true, refs: ['TRANSIT_DECL', 'CUSTOMS_RELEASE'] },
];
export const CUSTOMS_REF_NAME: Record<string, string> = {
  TANSAD: 'Customs declaration (TANSAD)', TRANSIT_DECL: 'Transit declaration', TRANSIT_BOND: 'Transit bond', EXAM_NOTICE: 'Examination / scan notice',
  CUSTOMS: 'Customs query', CUSTOMS_RELEASE: 'Customs release', EXPORT_DECL: 'Export declaration', EXPORT_RELEASE: 'Export release',
};

/* ------------------------------------------------------------------ masters */
type Truck = S<'Truck'> & { localNote?: string; gateBlocked?: boolean };
const tr = (truckId: number, plateNo: string, transporterPartyId: number, makeModel: string, axleCount: number, tareKg: number, f: Partial<Truck> = {}): Truck => ({
  truckId, plateNo: plateNo.replace(/\s/g, ''), plateDisplay: plateNo, vehicleKind: 'TRUCK', transporterPartyId, countryCode: 'TZ', makeModel, axleCount, tareKg,
  source: 'NG', syncStatus: 'SYNCED', ngRefId: `NG-T${5000 + truckId}`, isActive: true, ...f,
});
export const trucks: Truck[] = [
  tr(1, 'T 412 DKL', 7, 'Scania R460', 3, 9200, { localNote: 'Regular on Lusaka transit runs' }),
  tr(2, 'T 902 DMB', 8, 'Howo A7', 3, 9800),
  tr(3, 'T 118 DPE', 8, 'Mercedes Actros 3340', 3, 9400),
  tr(4, 'T 771 DGH', 7, 'Volvo FH 440', 3, 9100),
  tr(5, 'T 340 DRC', 8, 'MAN TGS car carrier', 3, 14500, { vehicleKind: 'CAR_CARRIER' }),
  tr(6, 'T 655 DQA', 7, 'Faw J6P', 3, 8800),
  tr(7, 'BAK 4471', 9, 'Scania G410', 3, 9300, { countryCode: 'ZM', ngRefId: 'NG-T5107' }),
  tr(8, 'T 505 DJN', 11, 'Isuzu FVZ', 2, 7200, { gateBlocked: true, localNote: 'Turned back 07 Oct; release expired' }),
  tr(9, 'T 233 DSW', 7, 'Howo trailer', 0, 6100, { vehicleKind: 'TRAILER' }),
  tr(10, 'T 880 DFF', 7, 'Volvo FMX', 3, 9600, { source: 'LOCAL', syncStatus: 'PROVISIONAL', ngRefId: undefined, localNote: 'Created at gate while NG was unreachable' }),
];
type Driver = S<'Driver'> & { localNote?: string };
const dr = (driverId: number, driverName: string, licenceNo: string, licenceExpiry: string, transporterPartyId: number, f: Partial<Driver> = {}): Driver => ({
  driverId, driverName, licenceNo, licenceClass: 'E', licenceExpiry, licenceCountry: 'TZ', phone: `+255 7${String(54 + driverId).padStart(2, '0')} ${300 + driverId * 7} ${100 + driverId * 11}`,
  transporterPartyId, source: 'NG', syncStatus: 'SYNCED', ngRefId: `NG-D${7000 + driverId}`, licenceValid: Date.parse(licenceExpiry) > Date.parse(day(0)), isActive: true, ...f,
});
export const drivers: Driver[] = [
  dr(1, 'Baraka Mwita', '4003218876', day(410), 7),
  dr(2, 'Musa Rajabu', '4001877120', day(19), 8),
  dr(3, 'Said Omari', '4002233019', day(260), 8),
  dr(4, 'John Massawe', '4000981443', day(-6), 7, { localNote: 'Told at gate 05 Oct to renew' }),
  dr(5, 'Abdul Kombo', '4004410255', day(95), 8),
  dr(6, 'Hassan Ali', '4003390712', day(27), 7),
  dr(7, 'Elia Mrema', '4002876604', day(530), 8),
  dr(8, 'Chanda Mwape', 'ZM-1188420', day(140), 9, { licenceCountry: 'ZM' }),
  dr(9, 'Peter Lyimo', '4001120987', day(3), 11),
  dr(10, 'Yusuf Bakari', '4005512330', day(300), 7, { source: 'LOCAL', syncStatus: 'PROVISIONAL', ngRefId: undefined }),
];
export const vessels: S<'Vessel'>[] = coreVessels.map((v, i) => ({ ...v, callSign: ['3FMS7', 'A8KE2', '9HAL9', 'LAHT5'][i] }));
export const ports: S<'Port'>[] = [
  { portId: 1, unlocode: 'TZDAR', portName: 'Dar es Salaam', countryCode: 'TZ', portKind: 'SEAPORT', isActive: true },
  { portId: 2, unlocode: 'TZTGT', portName: 'Tanga', countryCode: 'TZ', portKind: 'SEAPORT', isActive: true },
  { portId: 3, unlocode: 'KEMBA', portName: 'Mombasa', countryCode: 'KE', portKind: 'SEAPORT', isActive: true },
  { portId: 4, unlocode: null, portName: 'Tunduma border post', countryCode: 'TZ', portKind: 'BORDER', isActive: true },
  { portId: 5, unlocode: null, portName: 'Rusumo border post', countryCode: 'TZ', portKind: 'BORDER', isActive: true },
  { portId: 6, unlocode: null, portName: 'Lusaka dry port', countryCode: 'ZM', portKind: 'ICD', isActive: true },
  { portId: 7, unlocode: null, portName: 'Kwala dry port', countryCode: 'TZ', portKind: 'ICD', isActive: false },
];
export const commodities: S<'Commodity'>[] = [
  { commodityId: 1, commodityCode: 'TILES', commodityName: 'Ceramic tiles', hsCode: '6907', isHazardous: false, isActive: true },
  { commodityId: 2, commodityCode: 'COFFEE', commodityName: 'Green coffee', hsCode: '0901', isHazardous: false, isActive: true },
  { commodityId: 3, commodityCode: 'CU_CABLE', commodityName: 'Copper cable', hsCode: '7413', isHazardous: false, isActive: true },
  { commodityId: 4, commodityCode: 'PHARMA', commodityName: 'Medicaments', hsCode: '3004', isHazardous: false, isActive: true },
  { commodityId: 5, commodityCode: 'CARS', commodityName: 'Passenger vehicles', hsCode: '8703', isHazardous: false, isActive: true },
  { commodityId: 6, commodityCode: 'CEMENT', commodityName: 'Cement and additives', hsCode: '2523', isHazardous: false, isActive: true },
  { commodityId: 7, commodityCode: 'PAINT', commodityName: 'Paints and solvents', hsCode: '3208', isHazardous: true, isActive: true },
  { commodityId: 8, commodityCode: 'TRACTORS', commodityName: 'Tractors', hsCode: '8701', isHazardous: false, isActive: true },
];
export const equipment: S<'Equipment'>[] = coreEquipment;

/* ------------------------------------------------------------------ permissions, users */
export interface Perm { code: string; module: string; description: string; isApproval: boolean; supportsLimit: boolean; ms: string }
const p = (code: string, module: string, description: string, isApproval = false, supportsLimit = false, ms = 'M0'): Perm => ({ code, module, description, isApproval, supportsLimit, ms });
export const permissions: Perm[] = [
  p('admin.site.manage', 'admin', 'Create and edit sites and facilities'), p('admin.yard.design', 'admin', 'Design yard layout and slots'),
  p('admin.gate.configure', 'admin', 'Configure gates, lanes, checkpoints, visit types'), p('admin.users.manage', 'admin', 'Create users and grant roles'),
  p('admin.roles.manage', 'admin', 'Edit roles and permissions'), p('admin.config.manage', 'admin', 'Numbering, calendars, document types, tags'),
  p('admin.device.manage', 'admin', 'Register and revoke devices'), p('admin.audit.view', 'admin', 'View audit trail'),
  p('device.configure', 'admin', 'Configure device integrations', false, false, 'M5'), p('integration.monitor', 'admin', 'View and retry integration messages', false, false, 'M5'),
  p('masters.view', 'masters', 'View parties, trucks, drivers'), p('masters.local.edit', 'masters', 'Edit local or provisional masters'),
  p('manifest.import', 'planning', 'Import manifests and pre-advice'), p('consignment.edit', 'planning', 'Create and edit consignments'),
  p('consignment.view', 'planning', 'View consignments and units'),
  p('gate.visit.checkin', 'gate', 'Check trucks in at checkpoints'), p('gate.visit.checkout', 'gate', 'Check trucks out at checkpoints'),
  p('gate.checkout.override', 'gate', 'Override a failed gate-out check', true), p('gate.pass.print', 'gate', 'Print or reprint gate pass and EIR'),
  p('appointment.manage', 'gate', 'Manage appointment slots and bookings', false, false, 'M5'),
  p('inspection.perform', 'inspection', 'Record inspections, damage and EIR'), p('inspection.damage.approve', 'inspection', 'Approve damage cases and claims', true),
  p('yard.map.view', 'yard', 'View yard map and unit locations'), p('yard.allocate', 'yard', 'Allocate slots and create move orders'),
  p('yard.move.execute', 'yard', 'Confirm moves'), p('yard.move.override', 'yard', 'Place a unit outside allowed rules', true),
  p('yard.key.custody', 'yard', 'Issue and receive vehicle keys'), p('reefer.manage', 'yard', 'Plug in/out reefers and record readings', false, false, 'M5'),
  p('dg.manage', 'yard', 'Record dangerous goods details', false, false, 'M5'),
  p('weighbridge.ticket', 'weigh', 'Record weighbridge tickets'), p('weighbridge.override', 'weigh', 'Accept a weight outside tolerance', true),
  p('customs.ref.edit', 'customs', 'Record customs references and status'), p('customs.hold.place', 'customs', 'Place holds'),
  p('customs.hold.lift', 'customs', 'Lift holds', true), p('customs.exam.record', 'customs', 'Record examinations and results'),
  p('release.issue', 'release', 'Issue release orders'), p('release.exception.approve', 'release', 'Approve release with a failed condition', true),
  p('billing.rates.view', 'billing', 'View tariffs and rates'), p('billing.invoice.view', 'billing', 'View invoices and charges'),
  p('billing.invoice.create', 'billing', 'Create proformas and invoices'), p('billing.invoice.post', 'billing', 'Post invoices (final number, fiscal receipt)'),
  p('billing.creditnote', 'billing', 'Credit notes', true, true), p('billing.waiver', 'billing', 'Waive or discount charges', true, true),
  p('billing.freeday.extend', 'billing', 'Extend free days', true), p('billing.tariff.change', 'billing', 'Change tariffs (maker-checker)', true),
  p('payment.record', 'payment', 'Record payments and receipts'), p('payment.cashup.approve', 'payment', 'Approve cash-up differences', true, true),
  p('payment.refund', 'payment', 'Refunds', true, true),
  p('finance.period.close', 'finance', 'Close and reopen periods'), p('finance.exchange_rate.edit', 'finance', 'Maintain exchange rates'),
  p('finance.disbursement.record', 'finance', 'Record disbursements paid on behalf'),
  p('exception.view', 'exception', 'View exception cases'), p('exception.manage', 'exception', 'Assign, resolve and close exception cases'),
  p('security.incident.manage', 'security', 'Security incidents and evidence'),
  p('dashboard.control_tower', 'insight', 'Control tower'), p('dashboard.executive', 'insight', 'Executive dashboard'),
  p('reports.operational', 'insight', 'Operational reports'), p('reports.financial', 'insight', 'Financial reports'), p('aiva.use', 'aiva', 'Ask Aiva'),
  p('cfs.job.manage', 'cfs', 'Plan and record stuffing / de-stuffing jobs and tally', false, false, 'M5'),
  p('cfs.job.approve', 'cfs', 'Approve completed CFS jobs (shortages, excess, damage)', true, false, 'M5'),
  p('repair.estimate', 'mnr', 'Create and send repair estimates', false, false, 'M5'),
  p('appointment.book', 'portal', 'Book truck appointments', false, false, 'M5'), p('portal.request.submit', 'portal', 'Submit service requests and documents', false, false, 'M5'),
  p('portal.request.handle', 'portal', 'Handle customer service requests', false, false, 'M5'), p('portal.invite', 'portal', 'Invite customer and agent users', false, false, 'M5'),
];
export const MODULE_NAME: Record<string, string> = {
  admin: 'Setup', masters: 'Masters', planning: 'Planning', gate: 'Gate', inspection: 'Inspection', yard: 'Yard', weigh: 'Weighbridge',
  customs: 'Customs', release: 'Release', billing: 'Billing', payment: 'Payments', finance: 'Finance', exception: 'Exceptions',
  security: 'Security', insight: 'Dashboards & reports', aiva: 'Aiva', cfs: 'CFS', mnr: 'Repairs (M&R)', portal: 'Portal',
};
/** Roles seeded inactive: switched on per depot. */
export const INACTIVE_ROLES = ['CUSTOMS_OFFICER', 'AGENT_PORTAL', 'CUSTOMER_PORTAL'];
/** Approval limits (m_role_permission.limit_amount, USD). Blank means no upper limit. */
export const roleLimits: Record<string, Record<string, number>> = {
  FINANCE_MANAGER: { 'billing.creditnote': 10000, 'billing.waiver': 5000, 'payment.refund': 3000, 'payment.cashup.approve': 250 },
  OPS_MANAGER: { 'billing.waiver': 500, 'billing.creditnote': 500 },
  BILLING_OFFICER: { 'billing.waiver': 100 },
  DOC_CLEARANCE: { 'billing.waiver': 100 },
};

export type User = S<'User'> & { title: string; siteCodes: string[] };
const g = (roleCode: string, siteId: number | null, validFrom = day(-200), validTo?: string): S<'RoleGrant'> => ({ roleCode, siteId, validFrom, validTo, grantedBy: 'Ashok K. (admin)' });
const usr = (userId: number, userName: string, title: string, email: string, lastLogin: number | null, roleGrants: S<'RoleGrant'>[], f: Partial<User> = {}): User => ({
  userId, userSub: `ng|${8100 + userId}`, userName, title, email, phone: null, preferredLanguage: 'en', isNgUser: true, mfaRequired: false,
  lastLoginAt: lastLogin === null ? undefined : at(lastLogin), isActive: true, roleGrants,
  siteCodes: [...new Set(roleGrants.map((r) => (r.siteId ? sites.find((s) => s.siteId === r.siteId)!.siteCode : 'All sites')))], ...f,
});
export const users: User[] = [
  usr(1, 'Ashok Kumar', 'ICD administrator', 'ashok.k@mlimani-icd.example', 0.2, [g('ICD_ADMIN', null)], { mfaRequired: true }),
  usr(2, 'Hamisi Juma', 'Gate officer', 'hamisi.j@mlimani-icd.example', 0.5, [g('GATE_OFFICER', 1)], { preferredLanguage: 'sw' }),
  usr(3, 'Rose Akyoo', 'Gate officer', 'rose.a@mlimani-icd.example', 1.1, [g('GATE_OFFICER', 1), g('GATE_OFFICER', 2)], { preferredLanguage: 'sw' }),
  usr(4, 'Ibrahim Nassoro', 'Yard planner', 'ibrahim.n@mlimani-icd.example', 2, [g('YARD_OFFICER', 1)]),
  usr(5, 'Juma Mfinanga', 'Inspection officer', 'juma.m@mlimani-icd.example', 3, [g('INSPECTION_OFFICER', 1), g('INSPECTION_OFFICER', 2)], { preferredLanguage: 'sw' }),
  usr(6, 'Rehema Kweka', 'Documentation & clearance', 'rehema.k@mlimani-icd.example', 0.8, [g('DOC_CLEARANCE', null)], { mfaRequired: true }),
  usr(7, 'Amina Salum', 'Billing officer', 'amina.s@mlimani-icd.example', 4, [g('BILLING_OFFICER', null)], { mfaRequired: true }),
  usr(8, 'Mary Temba', 'Cashier', 'mary.t@mlimani-icd.example', 5, [g('CASHIER', 1)], { mfaRequired: true }),
  usr(9, 'Joseph Nyerere', 'Finance manager', 'joseph.n@mlimani-icd.example', 20, [g('FINANCE_MANAGER', null)], { mfaRequired: true }),
  usr(10, 'Daniel Kimaro', 'Depot supervisor', 'daniel.k@mlimani-icd.example', 1.5, [g('OPS_MANAGER', null)], { mfaRequired: true }),
  usr(11, 'Grace Pallangyo', 'Customer service', 'grace.p@mlimani-icd.example', 6, [g('CUSTOMER_SERVICE', null)]),
  usr(12, 'Ally Shabani', 'Weighbridge officer', 'ally.s@mlimani-icd.example', 30, [g('WEIGHBRIDGE_OFFICER', 1)]),
  usr(13, 'Neema Mushi', 'Relief gate officer', 'neema.m@mlimani-icd.example', 72, [g('GATE_OFFICER', 2, day(-10), day(20))], { isNgUser: false }),
  usr(14, 'Tumaini Lema', 'Former cashier', 'tumaini.l@mlimani-icd.example', 900, [g('CASHIER', 1, day(-400), day(-40))], { isActive: false }),
];
export const delegations: (S<'Delegation'> & { fromName: string; toName: string })[] = [
  { approvalDelegationId: 1, fromUserId: 9, toUserId: 10, fromName: 'Joseph Nyerere', toName: 'Daniel Kimaro', permissionCode: 'billing.creditnote', siteId: null, validFrom: at(48), validTo: at(-120), reason: 'Annual leave 5–12 Oct' },
  { approvalDelegationId: 2, fromUserId: 10, toUserId: 6, fromName: 'Daniel Kimaro', toName: 'Rehema Kweka', permissionCode: 'customs.hold.lift', siteId: 2, validFrom: at(-24), validTo: at(-72), reason: 'Covering vehicle yard on Thursday' },
  { approvalDelegationId: 3, fromUserId: 9, toUserId: 7, fromName: 'Joseph Nyerere', toName: 'Amina Salum', permissionCode: 'payment.refund', siteId: null, validFrom: at(400), validTo: at(300), reason: 'Month-end cover (ended)' },
];

/* ------------------------------------------------------------------ holds, release, approvals, exceptions (M2 seed) */
const ht = (holdCode: string, holdName: string, authority: string, b: string, lift: string, moveToTagCode?: string, pack = true): S<'HoldType'> & { packTz: boolean } => ({
  holdCode, holdName, authority, blocksGateOut: b[0] === '1', blocksRelease: b[1] === '1', blocksMove: b[2] === '1', blocksStuffing: b[3] === '1',
  liftNeedsApproval: lift[0] === '1', liftNeedsEvidence: lift[1] === '1', moveToTagCode, packTz: pack,
});
export const holdTypesSeed = [
  ht('CUSTOMS', 'Customs hold', 'CUSTOMS', '1101', '01'), ht('SCAN', 'Scan / examination hold', 'CUSTOMS', '1101', '01', 'EXAM'),
  ht('REVENUE', 'Revenue hold', 'CUSTOMS', '1100', '01'), ht('PORT', 'Port authority hold', 'PORT', '1100', '01'),
  ht('REGULATOR', 'Regulator hold', 'REGULATOR', '1100', '01'), ht('COURT', 'Court order', 'COURT', '1111', '01', 'HOLD'),
  ht('LINE', 'Shipping line hold', 'LINE', '1100', '01', undefined, false), ht('ICD_COMMERCIAL', 'Depot commercial hold', 'ICD', '1100', '10', undefined, false),
  ht('DAMAGE', 'Damage assessment hold', 'ICD', '1001', '10', 'DAMAGED', false), ht('SECURITY', 'Security hold', 'SECURITY', '1111', '10', 'HOLD', false),
];
export const releaseConditions: S<'ReleaseCondition'>[] = [
  { conditionCode: 'IDENTITY', conditionName: 'Identity and seal', evalOrder: 1, description: 'Unit number (and VIN/chassis) matches the release; seal matches the last recorded seal.' },
  { conditionCode: 'RELEASE_VALID', conditionName: 'Release valid', evalOrder: 2, description: 'An approved or partly used release covers the unit and the current time is within its validity.' },
  { conditionCode: 'NO_HOLD', conditionName: 'No blocking hold', evalOrder: 3, description: 'No active hold that blocks gate-out or release.' },
  { conditionCode: 'CUSTOMS', conditionName: 'Customs cleared', evalOrder: 4, description: 'Customs track is cleared and every reference the regime requires is recorded.' },
  { conditionCode: 'COMMERCIAL', conditionName: 'Paid or on credit', evalOrder: 5, description: "Charges are paid through the exit date, or the bill-to party's approved credit covers them." },
  { conditionCode: 'COLLECTOR', conditionName: 'Authorised collector', evalOrder: 6, description: 'Truck, driver or collecting person matches what the release authorises.' },
  { conditionCode: 'KEYS', conditionName: 'Keys handed over', evalOrder: 7, description: 'Vehicles only: key custody shows handed over to the collector.' },
  { conditionCode: 'PHYSICAL', conditionName: 'Loaded and within weight', evalOrder: 8, description: 'Unit is loaded on this visit; exit weight within tolerance where the site weighs on exit.' },
];
/** Same logic as the M2 seed INSERT … SELECT. */
export const releaseRules: S<'ReleaseRule'>[] = cargoRegimes.flatMap((r) => releaseConditions
  .filter((c) => !(r.regimeCode === 'EMPTY' && c.conditionCode === 'CUSTOMS'))
  .map((c, i) => ({
    releaseRuleId: r.cargoRegimeId! * 10 + i, regimeCode: r.regimeCode, unitCategory: c.conditionCode === 'KEYS' ? 'VEHICLE' as const : null,
    conditionCode: c.conditionCode, atApproval: !['IDENTITY', 'RELEASE_VALID', 'COLLECTOR', 'KEYS', 'PHYSICAL'].includes(c.conditionCode),
    atGateOut: true, canOverride: ['COMMERCIAL', 'COLLECTOR', 'PHYSICAL'].includes(c.conditionCode), isActive: true,
  })));
const approvalPerms = permissions.filter((x) => x.isApproval);
export const approvalPolicies: S<'ApprovalPolicy'>[] = [
  ...approvalPerms.map((x, i) => ({ approvalPolicyId: i + 1, permissionCode: x.code, siteId: null, amountFrom: '0', amountCurrency: null, levelsRequired: 1, expiresAfterHours: 72, isActive: true })),
  { approvalPolicyId: 101, permissionCode: 'billing.waiver', siteId: null, amountFrom: '1000', amountCurrency: 'USD', levelsRequired: 2, expiresAfterHours: 72, isActive: true },
  { approvalPolicyId: 102, permissionCode: 'billing.creditnote', siteId: null, amountFrom: '1000', amountCurrency: 'USD', levelsRequired: 2, expiresAfterHours: 72, isActive: true },
  { approvalPolicyId: 103, permissionCode: 'payment.refund', siteId: null, amountFrom: '500', amountCurrency: 'USD', levelsRequired: 2, expiresAfterHours: 72, isActive: true },
];
const et = (exceptionCode: string, exceptionName: string, severity: S<'ExceptionType'>['severity'], defaultRoleCode: string, escalationRoleCode: string, slaMinutes: number, placesHoldTypeCode: string | null, supervisorClose: boolean): S<'ExceptionType'> => ({
  exceptionCode, exceptionName, severity, defaultRoleCode, escalationRoleCode, slaMinutes, placesHoldTypeCode, supervisorClose, isActive: true,
});
export const exceptionTypes: S<'ExceptionType'>[] = [
  et('SEAL_MISMATCH', 'Seal mismatch', 'CRITICAL', 'OPS_MANAGER', 'MANAGEMENT', 60, 'SECURITY', true),
  et('UNAUTHORIZED_MOVE', 'Unauthorised movement', 'CRITICAL', 'SECURITY_OFFICER', 'OPS_MANAGER', 30, 'SECURITY', true),
  et('KEY_MISSING', 'Vehicle key missing', 'CRITICAL', 'YARD_OFFICER', 'OPS_MANAGER', 60, 'SECURITY', true),
  et('GATE_OUT_BLOCKED', 'Truck blocked at gate-out', 'HIGH', 'OPS_MANAGER', 'MANAGEMENT', 30, null, false),
  et('WEIGHT_VARIANCE', 'Weight outside tolerance', 'HIGH', 'OPS_MANAGER', 'MANAGEMENT', 120, null, false),
  et('MAJOR_DAMAGE', 'Major damage found', 'HIGH', 'INSPECTION_OFFICER', 'OPS_MANAGER', 240, 'DAMAGE', false),
  et('OFFLINE_MISMATCH', 'Offline gate entry failed re-check', 'HIGH', 'OPS_MANAGER', 'MANAGEMENT', 60, null, true),
  et('UNIT_NOT_LOCATED', 'Unit not at recorded location', 'HIGH', 'YARD_OFFICER', 'OPS_MANAGER', 120, null, false),
  et('DISCHARGE_DATE_MISSING', 'Discharge date missing', 'HIGH', 'DOC_CLEARANCE', 'OPS_MANAGER', 240, null, false),
  et('POSTING_FAILED', 'Posting to NG Billing / ERP failed', 'HIGH', 'BILLING_OFFICER', 'FINANCE_MANAGER', 240, null, false),
  et('RELEASE_EXPIRED_AT_GATE', 'Release expired at gate', 'MEDIUM', 'DOC_CLEARANCE', 'OPS_MANAGER', 60, null, false),
  et('UNPAID_AT_EXIT', 'Unpaid charges at exit', 'MEDIUM', 'BILLING_OFFICER', 'FINANCE_MANAGER', 60, null, false),
  et('WRONG_LOCATION', 'Unit placed outside allowed zone', 'MEDIUM', 'YARD_OFFICER', 'OPS_MANAGER', 120, null, false),
  et('MISSING_DOCUMENT', 'Required document missing', 'MEDIUM', 'DOC_CLEARANCE', 'OPS_MANAGER', 1440, null, false),
  et('MANIFEST_MISMATCH', 'Unit not on manifest / not arrived', 'MEDIUM', 'DOC_CLEARANCE', 'OPS_MANAGER', 1440, null, false),
  et('OVERSTAY', 'Overstay / unclaimed limit reached', 'MEDIUM', 'DOC_CLEARANCE', 'OPS_MANAGER', 4320, null, false),
  et('LONG_DWELL', 'Long dwell', 'LOW', 'CUSTOMER_SERVICE', 'OPS_MANAGER', 4320, null, false),
  et('PROVISIONAL_MASTER', 'Provisional party, truck or driver', 'LOW', 'DOC_CLEARANCE', 'OPS_MANAGER', 2880, null, false),
];

/* ------------------------------------------------------------------ inspection (M1 seed) */
let iid = 0;
const it = (itemCode: string, itemName: string, area: S<'InspectionItem'>['area'], inputType: S<'InspectionItem'>['inputType'], m: 0 | 1, sortOrder: number): S<'InspectionItem'> => ({
  inspectionItemId: ++iid, itemCode, itemName, area, inputType, isMandatory: m === 1, sortOrder,
});
export const inspectionTemplates: (S<'InspectionTemplate'> & { fixedFields?: string[] })[] = [
  { inspectionTemplateId: 1, templateCode: 'CONT_GATE_IN', templateName: 'Container gate-in survey', category: 'CONTAINER', inspectionKind: 'GATE_IN', versionNo: 1, minPhotos: 4, items: [
    it('DOORS', 'Doors, hinges and locking bars', 'DOORS', 'OK_DAMAGE', 1, 10), it('WALL_LEFT', 'Left side wall', 'WALLS', 'OK_DAMAGE', 1, 20),
    it('WALL_RIGHT', 'Right side wall', 'WALLS', 'OK_DAMAGE', 1, 30), it('FRONT', 'Front wall', 'WALLS', 'OK_DAMAGE', 1, 40),
    it('ROOF', 'Roof', 'ROOF', 'OK_DAMAGE', 1, 50), it('CORNERS', 'Corner posts and castings', 'CORNERS', 'OK_DAMAGE', 1, 60),
    it('UNDER', 'Cross members / understructure', 'UNDERCARRIAGE', 'OK_DAMAGE', 0, 70), it('FLOOR', 'Floor (empty units)', 'FLOOR', 'OK_DAMAGE', 0, 80),
    it('INTERIOR', 'Interior clean and dry (empty units)', 'INTERIOR', 'YES_NO', 0, 90), it('SEAL', 'Seal present and intact', 'SEAL', 'YES_NO', 1, 100),
    it('PLACARDS', 'Hazard placards correct', 'OTHER', 'YES_NO', 0, 110)] },
  { inspectionTemplateId: 2, templateCode: 'CONT_GATE_OUT', templateName: 'Container gate-out check', category: 'CONTAINER', inspectionKind: 'GATE_OUT', versionNo: 1, minPhotos: 2, items: [
    it('DOORS', 'Doors and locking bars', 'DOORS', 'OK_DAMAGE', 1, 10), it('SIDES', 'Side walls', 'WALLS', 'OK_DAMAGE', 1, 20),
    it('ROOF', 'Roof', 'ROOF', 'OK_DAMAGE', 0, 30), it('SEAL', 'Seal matches release', 'SEAL', 'YES_NO', 1, 40)] },
  { inspectionTemplateId: 3, templateCode: 'VEH_GATE_IN', templateName: 'Vehicle gate-in inspection', category: 'VEHICLE', inspectionKind: 'GATE_IN', versionNo: 2, minPhotos: 6,
    fixedFields: ['Odometer (km)', 'Fuel level (E, 1/4, 1/2, 3/4, F)', 'Battery OK', 'Personal effects found'], items: [
    it('FRONT', 'Front and bumper', 'EXTERIOR', 'OK_DAMAGE', 1, 10), it('REAR', 'Rear and bumper', 'EXTERIOR', 'OK_DAMAGE', 1, 20),
    it('LEFT', 'Left side', 'EXTERIOR', 'OK_DAMAGE', 1, 30), it('RIGHT', 'Right side', 'EXTERIOR', 'OK_DAMAGE', 1, 40),
    it('ROOF', 'Roof', 'ROOF', 'OK_DAMAGE', 1, 50), it('GLASS', 'Windscreen, windows, mirrors', 'EXTERIOR', 'OK_DAMAGE', 1, 60),
    it('LIGHTS', 'Lights', 'EXTERIOR', 'OK_DAMAGE', 1, 70), it('TYRES', 'Tyres and wheels', 'EXTERIOR', 'OK_DAMAGE', 1, 80),
    it('SPARE', 'Spare wheel present', 'ACCESSORIES', 'YES_NO', 1, 90), it('INTERIOR', 'Seats and interior', 'CABIN', 'OK_DAMAGE', 1, 100),
    it('WARNINGS', 'Dashboard warning lights on', 'CABIN', 'YES_NO', 0, 110), it('STARTS', 'Engine starts and runs', 'ENGINE', 'YES_NO', 1, 120),
    it('TOOLS', 'Jack and tools present', 'ACCESSORIES', 'YES_NO', 0, 130), it('RADIO', 'Radio / screen present', 'ACCESSORIES', 'YES_NO', 0, 140),
    it('MATS', 'Floor mats present', 'ACCESSORIES', 'YES_NO', 0, 150), it('DOCS', 'Documents found in vehicle', 'DOCUMENTS', 'YES_NO', 0, 160)] },
  { inspectionTemplateId: 4, templateCode: 'VEH_GATE_OUT', templateName: 'Vehicle gate-out check', category: 'VEHICLE', inspectionKind: 'GATE_OUT', versionNo: 1, minPhotos: 4,
    fixedFields: ['Odometer (km)', 'Fuel level'], items: [
    it('EXTERIOR', 'Exterior unchanged since gate-in', 'EXTERIOR', 'OK_DAMAGE', 1, 10), it('INTERIOR', 'Interior unchanged since gate-in', 'CABIN', 'OK_DAMAGE', 1, 20),
    it('ACCESSORIES', 'Accessories as recorded at gate-in', 'ACCESSORIES', 'YES_NO', 1, 30), it('KEYS', 'Keys handed to collector', 'ACCESSORIES', 'YES_NO', 1, 40)] },
];
export const damageCodes: S<'DamageCode'>[] = ([
  ['DENT', 'Dent', 'ANY'], ['HOLE', 'Hole', 'ANY'], ['CUT', 'Cut / tear', 'ANY'], ['BENT', 'Bent', 'ANY'], ['BROKEN', 'Broken', 'ANY'],
  ['CRACK', 'Crack', 'ANY'], ['RUST', 'Rust / corrosion', 'ANY'], ['MISSING', 'Missing part', 'ANY'], ['PATCH', 'Improper repair', 'ANY'],
  ['WET', 'Wet / stained', 'ANY'], ['DIRTY', 'Dirty / contaminated', 'CONTAINER'], ['ODOUR', 'Odour', 'CONTAINER'], ['LABEL', 'Old labels or placards', 'CONTAINER'],
  ['SCRATCH', 'Scratch', 'VEHICLE'], ['PAINT', 'Paint damage', 'VEHICLE'], ['GLASS', 'Cracked or broken glass', 'VEHICLE'], ['TYRE', 'Tyre damage / flat', 'VEHICLE'],
  ['LEAK', 'Fluid leak', 'VEHICLE'],
] as const).map(([damageCode, damageName, appliesTo]) => ({ damageCode, damageName, appliesTo }));

/* ------------------------------------------------------------------ finance (M3) */
export const periods: S<'AccountingPeriod'>[] = Array.from({ length: 10 }, (_, i) => {
  const m = i + 1;
  const last = new Date(Date.UTC(2026, m, 0)).getUTCDate();
  const key = `2026-${String(m).padStart(2, '0')}`;
  const closed = m <= 8;
  return { accountingPeriodId: m, companyId: 1, periodKey: key, periodStart: `${key}-01`, periodEnd: `${key}-${last}`, status: (closed ? 'CLOSED' : 'OPEN') as 'CLOSED' | 'OPEN', closedAt: closed ? new Date(Date.UTC(2026, m, 6, 14)).toISOString() : undefined, closedBy: closed ? 'Joseph Nyerere' : undefined };
}).reverse();
export const glSettings: S<'GlSetting'>[] = [
  { settingKey: 'AR_CONTROL', glAccount: '1200-00', description: 'Trade receivables control' },
  { settingKey: 'UNALLOCATED_RECEIPTS', glAccount: '2150-00', description: 'Receipts not yet matched to invoices' },
  { settingKey: 'DISBURSEMENT_CLEARING', glAccount: '1290-00', description: 'Port and terminal charges paid on behalf' },
  { settingKey: 'FX_GAIN', glAccount: '7810-00', description: 'Realised exchange gain' },
  { settingKey: 'FX_LOSS', glAccount: '7820-00', description: 'Realised exchange loss' },
  { settingKey: 'ROUNDING', glAccount: '7890-00', description: 'TZS rounding on USD invoices' },
  { settingKey: 'CASH_OVER_SHORT', glAccount: '7850-00', description: 'Cash-up differences' },
  { settingKey: 'REFUNDS_PAYABLE', glAccount: '2160-00', description: 'Approved refunds not yet paid' },
];
export const taxCodes: (S<'TaxCode'> & { verify?: string })[] = [
  { taxCodeId: 1, taxCode: 'TZ_VAT_STD', taxName: 'VAT standard rate', countryCode: 'TZ', ratePct: '18.000', taxTreatment: 'STANDARD', fiscalTaxClass: null, outputGlAccount: '2310-00', effectiveFrom: '2015-07-01', isActive: true, verify: 'Confirm the rate and the VFD tax class code.' },
  { taxCodeId: 2, taxCode: 'TZ_VAT_ZERO', taxName: 'VAT zero-rated', countryCode: 'TZ', ratePct: '0.000', taxTreatment: 'ZERO_RATED', fiscalTaxClass: null, outputGlAccount: '2310-00', effectiveFrom: '2015-07-01', isActive: true, verify: 'Confirm which services to transit cargo are zero-rated.' },
  { taxCodeId: 3, taxCode: 'TZ_VAT_EXEMPT', taxName: 'VAT exempt', countryCode: 'TZ', ratePct: '0.000', taxTreatment: 'EXEMPT', fiscalTaxClass: null, outputGlAccount: null, effectiveFrom: '2015-07-01', isActive: true },
  { taxCodeId: 4, taxCode: 'TZ_NO_VAT', taxName: 'Outside VAT scope (pass-through)', countryCode: 'TZ', ratePct: '0.000', taxTreatment: 'OUT_OF_SCOPE', fiscalTaxClass: null, outputGlAccount: null, effectiveFrom: '2015-07-01', isActive: true, verify: 'Confirm disbursements re-billed at cost are outside scope.' },
  { taxCodeId: 5, taxCode: 'KE_VAT_STD', taxName: 'Kenya VAT standard rate', countryCode: 'KE', ratePct: '16.000', taxTreatment: 'STANDARD', effectiveFrom: '2020-01-01', isActive: false, verify: 'Starter pack: confirm locally.' },
  { taxCodeId: 6, taxCode: 'KE_NO_VAT', taxName: 'Kenya outside VAT scope', countryCode: 'KE', ratePct: '0.000', taxTreatment: 'OUT_OF_SCOPE', effectiveFrom: '2020-01-01', isActive: false, verify: 'Starter pack: confirm locally.' },
  { taxCodeId: 7, taxCode: 'UG_VAT_STD', taxName: 'Uganda VAT standard rate', countryCode: 'UG', ratePct: '18.000', taxTreatment: 'STANDARD', effectiveFrom: '2020-01-01', isActive: false, verify: 'Starter pack: confirm locally.' },
  { taxCodeId: 8, taxCode: 'UG_NO_VAT', taxName: 'Uganda outside VAT scope', countryCode: 'UG', ratePct: '0.000', taxTreatment: 'OUT_OF_SCOPE', effectiveFrom: '2020-01-01', isActive: false, verify: 'Starter pack: confirm locally.' },
];
const REV: Record<string, string> = { STORAGE: '4100', HANDLING: '4200', VEHICLE: '4250', GATE: '4300', WEIGHING: '4310', INSPECTION: '4400', EXAMINATION: '4410', REEFER: '4500', DOCUMENTATION: '4600', SPECIAL: '4700', DISBURSEMENT: '1290', OTHER: '4900' };
const cc = (chargeCode: string, chargeName: string, chargeGroup: S<'ChargeCode'>['chargeGroup'], tax: string, disb: 0 | 1, printOrder: number, mapped = true): S<'ChargeCode'> => ({
  chargeCodeId: printOrder, chargeCode, chargeName, chargeGroup, defaultTaxCode: tax, isDisbursement: disb === 1, printOrder, isActive: true,
  revenueGlAccount: mapped ? `${REV[chargeGroup]}-${String(printOrder).padStart(2, '0')}` : null,
});
export const chargeCodes: S<'ChargeCode'>[] = [
  cc('STORAGE_IMPORT', 'Storage - import', 'STORAGE', 'TZ_VAT_STD', 0, 10), cc('STORAGE_TRANSIT', 'Storage - transit', 'STORAGE', 'TZ_VAT_STD', 0, 11),
  cc('STORAGE_EXPORT', 'Storage - export', 'STORAGE', 'TZ_VAT_STD', 0, 12), cc('STORAGE_EMPTY', 'Storage - empty', 'STORAGE', 'TZ_VAT_STD', 0, 13),
  cc('STORAGE_VEHICLE', 'Storage - vehicle', 'STORAGE', 'TZ_VAT_STD', 0, 14), cc('LIFT_OFF', 'Lift-off (truck to ground)', 'HANDLING', 'TZ_VAT_STD', 0, 20),
  cc('LIFT_ON', 'Lift-on (ground to truck)', 'HANDLING', 'TZ_VAT_STD', 0, 21), cc('SHIFTING', 'Shifting at customer request', 'HANDLING', 'TZ_VAT_STD', 0, 22),
  cc('VEHICLE_HANDLING', 'Vehicle handling', 'VEHICLE', 'TZ_VAT_STD', 0, 23), cc('KEY_HANDLING', 'Key handling and custody', 'VEHICLE', 'TZ_VAT_STD', 0, 24),
  cc('GATE_FEE', 'Gate fee', 'GATE', 'TZ_VAT_STD', 0, 30), cc('WEIGHING', 'Weighbridge', 'WEIGHING', 'TZ_VAT_STD', 0, 31),
  cc('VGM_CERT', 'VGM certificate', 'WEIGHING', 'TZ_VAT_STD', 0, 32), cc('INSPECTION_EIR', 'Inspection and EIR', 'INSPECTION', 'TZ_VAT_STD', 0, 40),
  cc('EXAM_POSITIONING', 'Positioning for customs examination', 'EXAMINATION', 'TZ_VAT_STD', 0, 41), cc('SCAN_POSITIONING', 'Positioning for scanning', 'EXAMINATION', 'TZ_VAT_STD', 0, 42),
  cc('REEFER_POWER', 'Reefer electricity', 'REEFER', 'TZ_VAT_STD', 0, 50), cc('REEFER_MONITOR', 'Reefer monitoring', 'REEFER', 'TZ_VAT_STD', 0, 51),
  cc('DOCUMENTATION', 'Documentation fee', 'DOCUMENTATION', 'TZ_VAT_STD', 0, 60), cc('REVALIDATION', 'Release revalidation fee', 'DOCUMENTATION', 'TZ_VAT_STD', 0, 61),
  cc('STUFFING', 'Stuffing', 'SPECIAL', 'TZ_VAT_STD', 0, 70), cc('DESTUFFING', 'De-stuffing', 'SPECIAL', 'TZ_VAT_STD', 0, 71),
  cc('WASHING', 'Container washing', 'SPECIAL', 'TZ_VAT_STD', 0, 72, false), cc('REPAIR', 'Repair', 'SPECIAL', 'TZ_VAT_STD', 0, 73, false),
  cc('DISB_PORT', 'Port charges paid on your behalf', 'DISBURSEMENT', 'TZ_NO_VAT', 1, 90), cc('DISB_TERMINAL', 'Terminal charges paid on your behalf', 'DISBURSEMENT', 'TZ_NO_VAT', 1, 91),
  cc('DISB_OTHER', 'Other charges paid on your behalf', 'DISBURSEMENT', 'TZ_NO_VAT', 1, 92), cc('DISB_HANDLING_FEE', 'Handling fee on disbursements', 'OTHER', 'TZ_VAT_STD', 0, 93),
];
export const paymentChannels: (S<'PaymentChannel'> & { example: string; refHint: string })[] = [
  { paymentChannelId: 1, companyId: 1, channelCode: 'CASH_USD', channelName: 'Cash (USD)', method: 'CASH', provider: null, currency: 'USD', glAccount: '1010-01', referencePattern: null, isActive: true, example: '—', refHint: 'No reference; the receipt number is the reference.' },
  { paymentChannelId: 2, companyId: 1, channelCode: 'CASH_TZS', channelName: 'Cash (TZS)', method: 'CASH', provider: null, currency: 'TZS', glAccount: '1010-02', referencePattern: null, isActive: true, example: '—', refHint: 'No reference; the receipt number is the reference.' },
  { paymentChannelId: 3, companyId: 1, channelCode: 'CRDB_USD', channelName: 'CRDB Bank USD account', method: 'BANK_TRANSFER', provider: 'CRDB Bank', currency: 'USD', glAccount: '1020-01', referencePattern: '^[A-Z0-9]{10,16}$', isActive: true, example: 'FT26280ZK4Q1', refHint: 'Bank transaction reference from the statement, 10–16 letters or digits.' },
  { paymentChannelId: 4, companyId: 1, channelCode: 'CRDB_TZS', channelName: 'CRDB Bank TZS account', method: 'BANK_TRANSFER', provider: 'CRDB Bank', currency: 'TZS', glAccount: '1020-02', referencePattern: '^[A-Z0-9]{10,16}$', isActive: true, example: 'FT26280RM7T2', refHint: 'Bank transaction reference, 10–16 letters or digits.' },
  { paymentChannelId: 5, companyId: 1, channelCode: 'NMB_TZS', channelName: 'NMB Bank TZS account', method: 'BANK_TRANSFER', provider: 'NMB Bank', currency: 'TZS', glAccount: '1021-02', referencePattern: '^[0-9]{12}$', isActive: true, example: '262801004417', refHint: '12-digit NMB reference.' },
  { paymentChannelId: 6, companyId: 1, channelCode: 'MPESA', channelName: 'M-Pesa (Vodacom) till', method: 'MOBILE_MONEY', provider: 'Vodacom M-Pesa', currency: 'TZS', glAccount: '1030-01', referencePattern: '^[A-Z0-9]{10}$', isActive: true, example: '8JK2QW71PZ', refHint: 'Transaction ID from the customer SMS, 10 characters.' },
  { paymentChannelId: 7, companyId: 1, channelCode: 'TIGOPESA', channelName: 'Tigo Pesa (Mixx by Yas) till', method: 'MOBILE_MONEY', provider: 'Tigo Pesa', currency: 'TZS', glAccount: '1030-02', referencePattern: '^[A-Z]{2}[0-9]{6}\\.[0-9]{4}\\.[A-Z0-9]{6}$', isActive: true, example: 'MP261007.1042.A12345', refHint: 'Full transaction ID including the dots.' },
  { paymentChannelId: 8, companyId: 1, channelCode: 'AIRTEL', channelName: 'Airtel Money till', method: 'MOBILE_MONEY', provider: 'Airtel Money', currency: 'TZS', glAccount: '1030-03', referencePattern: '^[A-Z0-9.]{8,20}$', isActive: true, example: 'PP261007.1215.L44821', refHint: 'Transaction ID from the SMS, 8–20 characters.' },
];

/* ------------------------------------------------------------------ notifications & print (M4) */
type NT = S<'NotificationTemplate'> & { draft?: boolean };
let ntid = 0;
const nt = (templateCode: string, eventType: NT['eventType'], channel: NT['channel'], languageCode: NT['languageCode'], subject: string | null, body: string, draft?: boolean): NT => ({
  notificationTemplateId: ++ntid, templateCode, eventType, channel, languageCode, subject, body, isActive: !draft, draft,
});
export const notificationTemplates: NT[] = [
  nt('UNIT_ARRIVED', 'UnitGatedIn', 'SMS', 'en', null, '{{unit_no}} arrived at {{site_name}} on {{gated_in_local}}. Ref {{ref_no}}.'),
  nt('UNIT_ARRIVED', 'UnitGatedIn', 'EMAIL', 'en', '{{unit_no}} has arrived at {{site_name}}', '{{unit_no}} ({{unit_type}}) for {{ref_type}} {{ref_no}} arrived at {{site_name}} on {{gated_in_local}}. Storage counts from {{storage_start_local}}; free time ends {{free_until_local}}.'),
  nt('CUSTOMS_CLEARED', 'CustomsStatusChanged', 'SMS', 'en', null, '{{unit_no}} is cleared by customs. You can request delivery.'),
  nt('HOLD_PLACED', 'HoldPlaced', 'SMS', 'en', null, '{{unit_no}} is on {{hold_name}} since {{placed_local}}. Contact {{site_name}} for details.'),
  nt('HOLD_PLACED', 'HoldPlaced', 'EMAIL', 'en', '{{unit_no}} placed on {{hold_name}}', '{{unit_no}} for {{ref_no}} was placed on {{hold_name}} at {{placed_local}}. Reason: {{reason}}. The unit cannot leave until the hold is lifted.'),
  nt('FREE_TIME_ENDING', 'FreeTimeExpiring', 'SMS', 'en', null, 'Free time for {{unit_no}} ends {{free_until_local}}. Storage from then: {{currency}} {{daily_rate}}/day.'),
  nt('RELEASE_APPROVED', 'ReleaseApproved', 'SMS', 'en', null, 'Release {{release_no}} approved for {{unit_count}} unit(s), valid to {{valid_to_local}}. Show this QR at the gate: {{qr_link}}'),
  nt('RELEASE_APPROVED', 'ReleaseApproved', 'EMAIL', 'en', 'Release {{release_no}} approved', 'Release {{release_no}} for {{ref_no}} is approved for {{unit_count}} unit(s) and is valid until {{valid_to_local}}. After that date storage will be re-charged before the units can leave. Gate pass QR: {{qr_link}}'),
  nt('RELEASE_EXPIRED', 'ReleaseExpired', 'SMS', 'en', null, 'Release {{release_no}} expired on {{valid_to_local}}. {{units_remaining}} unit(s) still in the depot. Pay the extra storage to revalidate.'),
  nt('INVOICE_POSTED', 'InvoicePosted', 'EMAIL', 'en', 'Invoice {{invoice_no}} from {{company_name}}', 'Invoice {{invoice_no}} for {{ref_no}}: {{currency}} {{total}} due {{due_date_local}}. The PDF is attached.'),
  nt('PAYMENT_RECEIVED', 'PaymentReceived', 'SMS', 'en', null, 'Payment {{currency}} {{amount}} received, receipt {{receipt_no}}. Thank you.'),
  nt('UNIT_DEPARTED', 'UnitGatedOut', 'SMS', 'en', null, '{{unit_no}} left {{site_name}} at {{departed_local}} on truck {{truck_plate}}.'),
  nt('GATE_BLOCKED', 'GateOutBlocked', 'IN_APP', 'en', 'Truck {{truck_plate}} blocked at gate', '{{unit_no}} failed {{condition_name}}: {{detail}}'),
  nt('EXCEPTION_OPENED', 'ExceptionOpened', 'IN_APP', 'en', '{{severity}}: {{title}}', 'Case {{case_no}} assigned to {{role_name}}. Due {{due_local}}.'),
  nt('EXCEPTION_ESCALATED', 'ExceptionEscalated', 'IN_APP', 'en', 'Escalated: {{title}}', 'Case {{case_no}} passed its SLA ({{due_local}}) and is escalated to you.'),
  nt('EXCEPTION_ESCALATED', 'ExceptionEscalated', 'EMAIL', 'en', 'Escalated: {{title}}', 'Case {{case_no}} at {{site_name}} passed its SLA ({{due_local}}) and is escalated to you. Open it in NG ICD to act.'),
  // Swahili drafts: not in the seed. Written as placeholders for a native speaker to rewrite.
  nt('UNIT_ARRIVED', 'UnitGatedIn', 'SMS', 'sw', null, '{{unit_no}} imefika {{site_name}} tarehe {{gated_in_local}}. Kumbukumbu {{ref_no}}.', true),
  nt('RELEASE_APPROVED', 'ReleaseApproved', 'SMS', 'sw', null, 'Ruhusa {{release_no}} imeidhinishwa kwa kontena {{unit_count}}, hadi {{valid_to_local}}. Onyesha QR hii getini: {{qr_link}}', true),
  nt('FREE_TIME_ENDING', 'FreeTimeExpiring', 'SMS', 'sw', null, 'Muda wa bure wa {{unit_no}} unaisha {{free_until_local}}. Baada ya hapo: {{currency}} {{daily_rate}} kwa siku.', true),
];
/** Sample values for the live preview. */
export const SAMPLE_VALUES: Record<string, string> = {
  unit_no: 'MSKU 402117 8', site_name: 'Dar es Salaam main yard', gated_in_local: '05 Oct 2026 14:20', ref_no: 'BMLU2409881', ref_type: 'BL',
  unit_type: '45G1', storage_start_local: '02 Oct 2026', free_until_local: '09 Oct 2026', hold_name: 'Customs hold', placed_local: '06 Oct 2026 09:10',
  reason: 'Physical examination ordered', currency: 'USD', daily_rate: '16.00', release_no: 'RO-DAR1-26-01942', unit_count: '3',
  valid_to_local: '09 Oct 2026 18:00', qr_link: 'ngicd.example/q/7KX2', units_remaining: '2', invoice_no: 'INV-DAR1-26-003310',
  company_name: 'Mlimani ICD', total: '1,288.40', due_date_local: '21 Oct 2026', amount: '620.00', receipt_no: 'RCT-DAR1-26-004471',
  departed_local: '07 Oct 2026 10:05', truck_plate: 'T 412 DKL', condition_name: 'Release valid', detail: 'Release expired at 07:30',
  severity: 'High', title: 'Seal mismatch at gate-in', case_no: 'EX-26-00881', role_name: 'Operations manager', due_local: '07 Oct 11:30',
};
export const notificationRules: S<'NotificationRule'>[] = ([
  ['UnitGatedIn', 'UNIT_ARRIVED', 'AGENT', null, 'SMS'], ['UnitGatedIn', 'UNIT_ARRIVED', 'CONSIGNEE', null, 'EMAIL'],
  ['CustomsStatusChanged', 'CUSTOMS_CLEARED', 'AGENT', null, 'SMS'], ['HoldPlaced', 'HOLD_PLACED', 'AGENT', null, 'SMS'],
  ['HoldPlaced', 'HOLD_PLACED', 'CONSIGNEE', null, 'EMAIL'], ['FreeTimeExpiring', 'FREE_TIME_ENDING', 'AGENT', null, 'SMS'],
  ['ReleaseApproved', 'RELEASE_APPROVED', 'AGENT', null, 'SMS'], ['ReleaseApproved', 'RELEASE_APPROVED', 'TRANSPORTER', null, 'SMS'],
  ['ReleaseApproved', 'RELEASE_APPROVED', 'AGENT', null, 'EMAIL'], ['ReleaseExpired', 'RELEASE_EXPIRED', 'AGENT', null, 'SMS'],
  ['InvoicePosted', 'INVOICE_POSTED', 'BILL_TO', null, 'EMAIL'], ['PaymentReceived', 'PAYMENT_RECEIVED', 'BILL_TO', null, 'SMS'],
  ['UnitGatedOut', 'UNIT_DEPARTED', 'AGENT', null, 'SMS'], ['GateOutBlocked', 'GATE_BLOCKED', 'ROLE', 'OPS_MANAGER', 'IN_APP'],
  ['ExceptionOpened', 'EXCEPTION_OPENED', 'ASSIGNEE', null, 'IN_APP'], ['ExceptionEscalated', 'EXCEPTION_ESCALATED', 'ASSIGNEE', null, 'IN_APP'],
  ['ExceptionEscalated', 'EXCEPTION_ESCALATED', 'ASSIGNEE', null, 'EMAIL'],
] as const).map(([eventType, templateCode, recipientKind, roleCode, channel], i) => ({
  notificationRuleId: i + 1, eventType, templateCode, recipientKind, roleCode, channel, isActive: true,
  onlyIf: templateCode === 'CUSTOMS_CLEARED' ? { to_status: 'CLEARED' } : null,
}));
export const printTemplates: (S<'PrintTemplate'> & { paperNote?: string })[] = [
  { printTemplateId: 1, docKind: 'GATE_PASS', templateName: 'Gate pass (card)', languageCode: 'en', versionNo: 3, templateHtml: '<gate-pass/>', paperSize: 'A5', paperNote: 'A6 card, 2 up on A5', defaultCopies: 1, reprintWatermark: 'REPRINT', status: 'ACTIVE' },
  { printTemplateId: 2, docKind: 'EIR', templateName: 'Equipment interchange receipt', languageCode: 'en', versionNo: 2, templateHtml: '<eir/>', paperSize: 'A4', defaultCopies: 2, reprintWatermark: 'COPY', status: 'ACTIVE' },
  { printTemplateId: 3, docKind: 'TAX_INVOICE', templateName: 'Tax invoice with VFD block', languageCode: 'en', versionNo: 4, templateHtml: '<invoice/>', paperSize: 'A4', defaultCopies: 1, reprintWatermark: 'COPY', status: 'ACTIVE' },
  { printTemplateId: 4, docKind: 'RECEIPT', templateName: 'Cashier receipt (80 mm)', languageCode: 'en', versionNo: 2, templateHtml: '<receipt/>', paperSize: 'THERMAL80', defaultCopies: 1, reprintWatermark: 'COPY', status: 'ACTIVE' },
  { printTemplateId: 5, docKind: 'RELEASE_ORDER', templateName: 'Release order with QR', languageCode: 'en', versionNo: 1, templateHtml: '<ro/>', paperSize: 'A4', defaultCopies: 1, reprintWatermark: 'REPRINT', status: 'ACTIVE' },
  { printTemplateId: 6, docKind: 'GATE_PASS', templateName: 'Gate pass (card) · Swahili', languageCode: 'sw', versionNo: 1, templateHtml: '<gate-pass/>', paperSize: 'A5', paperNote: 'A6 card, 2 up on A5', defaultCopies: 1, reprintWatermark: 'NAKALA', status: 'DRAFT' },
];

/* ------------------------------------------------------------------ numbering & documents */
export const numberSequences: (S<'NumberSequence'> & { siteCode?: string; sample: string })[] = [
  { numberSequenceId: 1, companyId: 1, siteId: 1, siteCode: 'DAR1', documentKind: 'INVOICE', prefix: 'INV', pattern: '{PREFIX}-{SITE}-{YY}-{######}', nextValue: 3319, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 2, companyId: 1, siteId: 2, siteCode: 'DAR2', documentKind: 'INVOICE', prefix: 'INV', pattern: '{PREFIX}-{SITE}-{YY}-{######}', nextValue: 884, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 3, companyId: 1, siteId: null, documentKind: 'CREDIT_NOTE', prefix: 'CN', pattern: '{PREFIX}-{YY}-{#####}', nextValue: 142, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 4, companyId: 1, siteId: 1, siteCode: 'DAR1', documentKind: 'RECEIPT', prefix: 'RCT', pattern: '{PREFIX}-{SITE}-{YY}-{######}', nextValue: 4472, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 5, companyId: 1, siteId: 1, siteCode: 'DAR1', documentKind: 'RELEASE_ORDER', prefix: 'RO', pattern: '{PREFIX}-{SITE}-{YY}-{#####}', nextValue: 1952, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 6, companyId: 1, siteId: null, documentKind: 'GATE_PASS', prefix: 'GP', pattern: '{PREFIX}-{YY}-{#####}', nextValue: 8812, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 7, companyId: 1, siteId: 1, siteCode: 'DAR1', documentKind: 'EIR', prefix: 'EIR', pattern: '{PREFIX}-{SITE}-{YY}-{#####}', nextValue: 6120, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 8, companyId: 1, siteId: null, documentKind: 'TRUCK_VISIT', prefix: 'TV', pattern: '{PREFIX}-{YY}-{#####}', nextValue: 4417, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 9, companyId: 1, siteId: null, documentKind: 'EXCEPTION', prefix: 'EX', pattern: '{PREFIX}-{YY}-{#####}', nextValue: 882, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 10, companyId: 1, siteId: null, documentKind: 'APPROVAL', prefix: 'APR', pattern: '{PREFIX}-{YY}-{#####}', nextValue: 415, resetPolicy: 'YEARLY', currentPeriod: '2026', sample: '' },
  { numberSequenceId: 11, companyId: 1, siteId: 1, siteCode: 'DAR1', documentKind: 'WEIGHT_TICKET', prefix: 'WT', pattern: '{PREFIX}-{SITE}-{YYYY}{MM}-{####}', nextValue: 214, resetPolicy: 'MONTHLY', currentPeriod: '2026-10', sample: '' },
  { numberSequenceId: 12, companyId: 1, siteId: null, documentKind: 'CASHIER_SHIFT', prefix: 'SH', pattern: '{PREFIX}{######}', nextValue: 2210, resetPolicy: 'NEVER', sample: '' },
];
/** Render a number pattern for a value. */
export function renderPattern(pattern: string, prefix: string, site: string | undefined, value: number, when = new Date('2026-10-07')) {
  return pattern
    .replace('{PREFIX}', prefix).replace('{SITE}', site ?? 'ALL')
    .replace('{YYYY}', String(when.getUTCFullYear())).replace('{YY}', String(when.getUTCFullYear()).slice(2))
    .replace('{MM}', String(when.getUTCMonth() + 1).padStart(2, '0'))
    .replace(/\{(#+)\}/, (_, h: string) => String(value).padStart(h.length, '0'))
    .replace(/\{SEQ:(\d)\}/, (_, n: string) => String(value).padStart(Number(n), '0'));
}
for (const s of numberSequences) s.sample = renderPattern(s.pattern, s.prefix, s.siteCode, s.nextValue ?? 1);

export type DocType = S<'DocumentType'> & { requiredFor: string[] };
const REQ: Record<string, string[]> = {
  BL: ['Import'], DO: ['Import pick-up'], TANSAD: ['Import', 'Export'], CUSTOMS_RELEASE: ['Import', 'Transit', 'Export'], TRANSIT_DOC: ['Transit'],
  EIR: ['Gate-in', 'Gate-out'], INSPECTION_PHOTO: ['Gate-in'], GATE_PASS: ['Gate-out'], LINE_DROPOFF_AUTH: ['Empty return'], LINE_RELEASE: ['Empty pick-up'],
  AUTH_LETTER: ['Release (third-party collector)'], COLLECTOR_ID: ['Release'], DAMAGE_REPORT: ['Major damage'], DISBURSEMENT_RCPT: ['Disbursement'],
};
export const documentTypes: DocType[] = ([
  ['BL', 'Bill of lading', 'CONSIGNMENT', 7], ['DO', 'Delivery order', 'CONSIGNMENT', 7], ['TANSAD', 'Customs declaration (TANSAD)', 'CUSTOMS', 7],
  ['CUSTOMS_RELEASE', 'Customs release evidence', 'CUSTOMS', 7], ['TRANSIT_DOC', 'Transit declaration / bond', 'CUSTOMS', 7],
  ['EIR', 'Equipment interchange receipt', 'INSPECTION', 7], ['INSPECTION_PHOTO', 'Inspection photo', 'INSPECTION', 7], ['DAMAGE_REPORT', 'Damage report', 'INSPECTION', 7],
  ['GATE_PASS', 'Gate pass', 'TRUCK_VISIT', 7], ['PAPER_SIGNED_COPY', 'Signed and stamped paper copy', 'ANY', 7], ['WEIGHT_TICKET', 'Weighbridge ticket', 'TRUCK_VISIT', 7],
  ['LINE_DROPOFF_AUTH', 'Shipping line drop-off authorization', 'CONSIGNMENT', 7], ['LINE_RELEASE', 'Shipping line empty release order', 'CONSIGNMENT', 7],
  ['AUTH_LETTER', 'Authorization letter (collector)', 'RELEASE_ORDER', 7], ['COLLECTOR_ID', 'Collector identification', 'RELEASE_ORDER', 2],
  ['DRIVER_ID', 'Driver licence copy', 'TRUCK_VISIT', 2], ['INVOICE_PDF', 'Invoice', 'INVOICE', 10], ['RECEIPT_PDF', 'Receipt', 'PAYMENT', 10],
  ['PAYMENT_PROOF', 'Proof of payment', 'PAYMENT', 10], ['DISBURSEMENT_RCPT', 'Port / terminal receipt (disbursement)', 'CONSIGNMENT', 10], ['OTHER', 'Other', 'ANY', 7],
] as const).map(([docTypeCode, docTypeName, appliesTo, retentionYears], i) => ({
  documentTypeId: i + 1, docTypeCode, docTypeName, appliesTo, retentionYears, requiresApproval: false,
  maxSizeMb: docTypeCode === 'INSPECTION_PHOTO' ? 8 : docTypeCode.endsWith('_PDF') ? 5 : 15, allowedExt: docTypeCode === 'INSPECTION_PHOTO' ? 'jpg, png, heic' : 'pdf, jpg, png',
  isActive: true, requiredFor: REQ[docTypeCode] ?? [],
}));

/* ------------------------------------------------------------------ devices & integrations */
export type Device = S<'Device'> & { queue: number; appVersion: string; assignedTo: string };
export const devices: Device[] = [
  { deviceId: 1, siteId: 1, deviceCode: 'TAB-DAR1-01', deviceName: 'Gate tablet, In 1', deviceKind: 'TABLET', registeredAt: at(2400), registeredBy: 'Ashok K.', lastSeenAt: at(0.02), queue: 0, appVersion: '1.4.2', assignedTo: 'Outer gate In 1' },
  { deviceId: 2, siteId: 1, deviceCode: 'TAB-DAR1-02', deviceName: 'Gate tablet, In 2', deviceKind: 'TABLET', registeredAt: at(2400), registeredBy: 'Ashok K.', lastSeenAt: at(0.05), queue: 0, appVersion: '1.4.2', assignedTo: 'Outer gate In 2' },
  { deviceId: 3, siteId: 1, deviceCode: 'TAB-DAR1-03', deviceName: 'Gate tablet, Out 1', deviceKind: 'TABLET', registeredAt: at(2300), registeredBy: 'Ashok K.', lastSeenAt: at(0.9), queue: 7, appVersion: '1.4.1', assignedTo: 'Outer gate Out 1' },
  { deviceId: 4, siteId: 1, deviceCode: 'HH-DAR1-01', deviceName: 'Yard handheld 1', deviceKind: 'PHONE', registeredAt: at(1900), registeredBy: 'Ashok K.', lastSeenAt: at(0.1), queue: 0, appVersion: '1.4.2', assignedTo: 'RS-01 driver' },
  { deviceId: 5, siteId: 1, deviceCode: 'HH-DAR1-02', deviceName: 'Yard handheld 2', deviceKind: 'PHONE', registeredAt: at(1900), registeredBy: 'Ashok K.', lastSeenAt: at(26), queue: 3, appVersion: '1.3.9', assignedTo: 'RS-02 driver' },
  { deviceId: 6, siteId: 1, deviceCode: 'HH-DAR1-03', deviceName: 'Inspection handheld', deviceKind: 'PHONE', registeredAt: at(800), registeredBy: 'Ashok K.', lastSeenAt: at(0.3), queue: 0, appVersion: '1.4.2', assignedTo: 'Inspection team' },
  { deviceId: 7, siteId: 1, deviceCode: 'GA-DAR1-01', deviceName: 'Gate agent PC (main gate)', deviceKind: 'GATE_PC', registeredAt: at(2500), registeredBy: 'Ashok K.', lastSeenAt: at(0.01), queue: 0, appVersion: 'agent 0.9.4', assignedTo: 'Gatehouse rack' },
  { deviceId: 8, siteId: 2, deviceCode: 'TAB-DAR2-01', deviceName: 'Vehicle gate tablet', deviceKind: 'TABLET', registeredAt: at(1500), registeredBy: 'Ashok K.', lastSeenAt: at(0.2), queue: 0, appVersion: '1.4.2', assignedTo: 'Vehicle yard gate' },
  { deviceId: 9, siteId: 2, deviceCode: 'KIOSK-DAR2-01', deviceName: 'Driver self-service kiosk', deviceKind: 'KIOSK', registeredAt: at(300), registeredBy: 'Ashok K.', lastSeenAt: at(3), queue: 0, appVersion: '1.4.0', assignedTo: 'Waiting area' },
  { deviceId: 10, siteId: 1, deviceCode: 'TAB-DAR1-04', deviceName: 'Spare gate tablet (lost)', deviceKind: 'TABLET', registeredAt: at(2200), registeredBy: 'Ashok K.', lastSeenAt: at(410), revokedAt: at(400), revokedReason: 'Reported lost on 20 Sep; police report RB/1882/26', queue: 0, appVersion: '1.3.6', assignedTo: '—' },
];
export type Integration = S<'DeviceIntegration'> & { lane: string; health: 'OK' | 'WARN' | 'DOWN'; lastRead: string; readsToday: number; matchPct: number };
export const integrations: Integration[] = [
  { deviceIntegrationId: 1, integrationKind: 'ANPR', gateLaneId: 11, lane: 'Main gate · In 1', vendor: 'Hikvision', model: 'iDS-TCM403', gateAgentDeviceId: 7, laneMode: 'ASSISTED', isActive: true, health: 'OK', lastRead: at(0.03), readsToday: 142, matchPct: 94 },
  { deviceIntegrationId: 2, integrationKind: 'CONTAINER_OCR', gateLaneId: 11, lane: 'Main gate · In 1', vendor: 'Camco', model: 'GOS-4', gateAgentDeviceId: 7, laneMode: 'ASSISTED', isActive: true, health: 'OK', lastRead: at(0.04), readsToday: 118, matchPct: 89 },
  { deviceIntegrationId: 3, integrationKind: 'ANPR', gateLaneId: 12, lane: 'Main gate · In 2', vendor: 'Hikvision', model: 'iDS-TCM403', gateAgentDeviceId: 7, laneMode: 'MANUAL', isActive: true, health: 'WARN', lastRead: at(1.2), readsToday: 31, matchPct: 61 },
  { deviceIntegrationId: 4, integrationKind: 'WEIGHBRIDGE', gateLaneId: 31, lane: 'Weighbridge · Scale 1', vendor: 'Avery Weigh-Tronix', model: 'ZM405', gateAgentDeviceId: 7, laneMode: 'AUTOMATIC', isActive: true, health: 'OK', lastRead: at(0.2), readsToday: 58, matchPct: 100 },
  { deviceIntegrationId: 5, integrationKind: 'BARRIER', gateLaneId: 13, lane: 'Main gate · Out 1', vendor: 'FAAC', model: '620 SR', gateAgentDeviceId: 7, laneMode: 'ASSISTED', isActive: true, health: 'OK', lastRead: at(0.1), readsToday: 96, matchPct: 100 },
  { deviceIntegrationId: 6, integrationKind: 'RFID', gateLaneId: 13, lane: 'Main gate · Out 1', vendor: 'Impinj', model: 'R700', gateAgentDeviceId: 7, laneMode: 'MANUAL', isActive: false, health: 'DOWN', lastRead: at(160), readsToday: 0, matchPct: 0 },
  { deviceIntegrationId: 7, integrationKind: 'REEFER_IOT', gateLaneId: null, lane: 'Block R · plugs R-01…R-32', vendor: 'Emerson', model: 'ProAct', laneMode: 'AUTOMATIC', isActive: true, health: 'OK', lastRead: at(0.08), readsToday: 2304, matchPct: 100 },
];

/* ------------------------------------------------------------------ NG sync, outbox, EDI */
export const syncStates: (S<'SyncStatus'> & { total: number; provisional: number })[] = [
  { entityName: 'party', lastUpdatedate: at(0.4), lastRunAt: at(0.25), lastStatus: 'OK', rowsLastRun: 3, total: 412, provisional: 1 },
  { entityName: 'truck', lastUpdatedate: at(0.6), lastRunAt: at(0.25), lastStatus: 'PARTIAL', lastError: '1 row skipped: plate T880DFF exists locally as provisional; match it by hand.', rowsLastRun: 11, total: 1288, provisional: 1 },
  { entityName: 'driver', lastUpdatedate: at(0.6), lastRunAt: at(0.25), lastStatus: 'OK', rowsLastRun: 7, total: 1530, provisional: 1 },
  { entityName: 'vessel', lastUpdatedate: at(30), lastRunAt: at(6.1), lastStatus: 'FAILED', lastError: 'NG master API returned 503 Service Unavailable at 04:25. Next try in 15 min.', rowsLastRun: 0, total: 96, provisional: 0 },
];
export interface Outbox { id: number; eventType: string; aggregate: string; destination: 'NG_EVENTS' | 'NG_BILLING' | 'NOTIFY' | 'ERP'; status: 'PENDING' | 'SENT' | 'FAILED' | 'DEAD'; attempts: number; occurredAt: string; lastError?: string; responseRef?: string }
export const outbox: Outbox[] = [
  { id: 88412, eventType: 'UnitGatedIn', aggregate: 'unit_stay 5031', destination: 'NG_EVENTS', status: 'SENT', attempts: 1, occurredAt: at(0.1), responseRef: 'evt-7f2a' },
  { id: 88411, eventType: 'InvoicePosted', aggregate: 'invoice 3318', destination: 'NG_BILLING', status: 'FAILED', attempts: 4, occurredAt: at(6), lastError: 'NG Billing rejected: customer C-KAGERA is blocked for credit.' },
  { id: 88410, eventType: 'HoldPlaced', aggregate: 'hold 703', destination: 'NOTIFY', status: 'SENT', attempts: 1, occurredAt: at(0.4) },
  { id: 88409, eventType: 'ReleaseApproved', aggregate: 'release_order 801', destination: 'NG_EVENTS', status: 'PENDING', attempts: 0, occurredAt: at(0.05) },
  { id: 88408, eventType: 'PaymentReceived', aggregate: 'payment 9921', destination: 'ERP', status: 'PENDING', attempts: 2, occurredAt: at(1.3), lastError: 'ERP timeout after 30 s; retrying.' },
  { id: 88407, eventType: 'UnitGatedOut', aggregate: 'unit_stay 4980', destination: 'NG_EVENTS', status: 'SENT', attempts: 1, occurredAt: at(2) },
  { id: 88406, eventType: 'CreditNoteIssued', aggregate: 'credit_note 141', destination: 'NG_BILLING', status: 'SENT', attempts: 2, occurredAt: at(8), responseRef: 'NGB-CN-26-0141' },
  { id: 88401, eventType: 'InvoicePosted', aggregate: 'invoice 3301', destination: 'ERP', status: 'DEAD', attempts: 10, occurredAt: at(52), lastError: 'Account 4700-73 not found in ERP chart of accounts.' },
];
export const integrationMessages: S<'IntegrationMessage'>[] = [
  { integrationMessageId: 5501, partnerSystem: 'SHIPPING_LINE', partnerPartyId: 4, direction: 'OUT', messageType: 'GATE_IN_REPORT', format: 'EDIFACT', correlationRef: 'CODECO 26100701', status: 'SENT', attempts: 1, createdAt: at(0.5) },
  { integrationMessageId: 5500, partnerSystem: 'SHIPPING_LINE', partnerPartyId: 5, direction: 'IN', messageType: 'BOOKING', format: 'EDIFACT', correlationRef: 'COPARN 77120', status: 'PROCESSED', attempts: 1, processedAt: at(2), createdAt: at(2.1) },
  { integrationMessageId: 5499, partnerSystem: 'SHIPPING_LINE', partnerPartyId: 4, direction: 'OUT', messageType: 'ESTIMATE', format: 'EDIFACT', correlationRef: 'WESTIM 0412', status: 'FAILED', attempts: 3, lastError: 'Line SFTP refused login (password expired).', createdAt: at(5) },
  { integrationMessageId: 5498, partnerSystem: 'BANK', direction: 'IN', messageType: 'STATEMENT', format: 'CSV', correlationRef: 'CRDB-USD-20261006', status: 'PROCESSED', attempts: 1, processedAt: at(9), createdAt: at(9.1) },
  { integrationMessageId: 5497, partnerSystem: 'MOBILE_MONEY', direction: 'IN', messageType: 'PAYMENT_NOTICE', format: 'JSON', correlationRef: '8JK2QW71PZ', status: 'REJECTED', attempts: 1, lastError: 'Duplicate: same transaction ID already received.', createdAt: at(11) },
  { integrationMessageId: 5496, partnerSystem: 'SHIPPING_LINE', partnerPartyId: 6, direction: 'OUT', messageType: 'GATE_OUT_REPORT', format: 'EDIFACT', correlationRef: 'CODECO 26100611', status: 'SENT', attempts: 1, createdAt: at(20) },
];

/* ------------------------------------------------------------------ prediction models (M6) */
export type Model = S<'ModelVersion'> & { from: string; to: string; summary: string };
export const models: Model[] = [
  { mlModelVersionId: 1, modelCode: 'YARD_ALLOC', versionLabel: 'v3', trainedAt: at(240), from: '2025-10-01', to: '2026-09-20', isActive: true, metrics: { top3Acceptance: 0.81, rehandlesPerMove: 0.34, holdout: 4120 }, summary: '81% of moves went to one of the top 3 slots it offered' },
  { mlModelVersionId: 2, modelCode: 'YARD_ALLOC', versionLabel: 'v4-rc', trainedAt: at(30), from: '2025-11-01', to: '2026-10-05', isActive: false, metrics: { top3Acceptance: 0.86, rehandlesPerMove: 0.29, holdout: 4388 }, summary: '86% top-3 acceptance on hold-out; fewer rehandles' },
  { mlModelVersionId: 3, modelCode: 'DWELL', versionLabel: 'v2', trainedAt: at(600), from: '2025-04-01', to: '2026-08-31', isActive: true, metrics: { maeDays: 2.4, p90Coverage: 0.88, holdout: 9210 }, summary: 'Exit date off by 2.4 days on average' },
  { mlModelVersionId: 4, modelCode: 'DWELL', versionLabel: 'v1', trainedAt: at(3000), from: '2025-01-01', to: '2026-03-31', isActive: false, metrics: { maeDays: 3.9, p90Coverage: 0.81, holdout: 5200 }, summary: 'Exit date off by 3.9 days on average' },
  { mlModelVersionId: 5, modelCode: 'OCCUPANCY', versionLabel: 'v1', trainedAt: at(200), from: '2025-06-01', to: '2026-09-25', isActive: true, metrics: { mapePct: 6.8, horizonDays: 14, holdout: 120 }, summary: 'Occupancy forecast within 6.8% over 14 days' },
];

/* ------------------------------------------------------------------ field rules */
export const FIELD_CATALOGUE: { entity: string; field: string; label: string; screen: string }[] = [
  { entity: 'invoice_line', field: 'unit_rate', label: 'Unit rate', screen: 'Invoices, unit charges' },
  { entity: 'invoice_line', field: 'discount_pct', label: 'Discount %', screen: 'Invoices' },
  { entity: 'party', field: 'credit_limit', label: 'Credit limit', screen: 'Customers & parties' },
  { entity: 'truck_visit', field: 'seal_no', label: 'Seal number', screen: 'Gate lane' },
  { entity: 'inspection', field: 'odometer_km', label: 'Odometer', screen: 'Vehicle inspection' },
  { entity: 'release_order', field: 'collector_id_no', label: 'Collector ID number', screen: 'Release orders' },
  { entity: 'unit_stay', field: 'gross_weight_kg', label: 'Gross weight', screen: 'Unit card' },
];
export type FieldRule = S<'FieldRule'> & { mandatory?: boolean; uiOnly?: boolean };
let frid = 0;
export const fieldRules: FieldRule[] = [
  ...['GATE_OFFICER', 'YARD_OFFICER', 'EQUIPMENT_OPERATOR', 'INSPECTION_OFFICER', 'WEIGHBRIDGE_OFFICER'].map((roleCode) => ({ fieldRuleId: ++frid, roleCode, entityName: 'invoice_line', fieldName: 'unit_rate', accessLevel: 'HIDDEN' as const })),
  { fieldRuleId: ++frid, roleCode: 'CUSTOMER_SERVICE', entityName: 'party', fieldName: 'credit_limit', accessLevel: 'READONLY' },
  { fieldRuleId: ++frid, roleCode: 'BILLING_OFFICER', entityName: 'invoice_line', fieldName: 'discount_pct', accessLevel: 'READONLY' },
  { fieldRuleId: ++frid, roleCode: 'GATE_OFFICER', entityName: 'truck_visit', fieldName: 'seal_no', accessLevel: 'READONLY', mandatory: true, uiOnly: true },
  { fieldRuleId: ++frid, roleCode: 'INSPECTION_OFFICER', entityName: 'inspection', fieldName: 'odometer_km', accessLevel: 'READONLY', mandatory: true, uiOnly: true },
  { fieldRuleId: ++frid, roleCode: 'GATE_OFFICER', entityName: 'release_order', fieldName: 'collector_id_no', accessLevel: 'HIDDEN' },
];

/* ------------------------------------------------------------------ search */
registerSearch((q) => {
  const n = q.replace(/\s/g, '').toUpperCase();
  const hits = [
    ...trucks.filter((t) => t.plateNo.includes(n)).map((t) => ({ id: t.truckId!, title: t.plateDisplay ?? t.plateNo, subtitle: `Truck · ${parties.find((x) => x.partyId === t.transporterPartyId)?.partyName ?? ''}`, link: { entityName: 'truck', entityId: t.truckId! }, to: '/admin/masters' })),
    ...drivers.filter((d) => d.driverName.toUpperCase().replace(/\s/g, '').includes(n) || d.licenceNo.includes(n)).map((d) => ({ id: d.driverId!, title: d.driverName, subtitle: `Driver · licence ${d.licenceNo}`, link: { entityName: 'driver', entityId: d.driverId! }, to: '/admin/masters' })),
    ...users.filter((u) => u.userName.toUpperCase().replace(/\s/g, '').includes(n)).map((u) => ({ id: u.userId!, title: u.userName, subtitle: `User · ${u.title}`, link: { entityName: 'app_user', entityId: u.userId! }, to: '/admin/users' })),
  ].slice(0, 6);
  return hits.length ? { entity: 'TRUCK' as const, label: 'Setup: trucks, drivers, users', hits } : null;
});
