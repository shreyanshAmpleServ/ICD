/* Core sample data shared by every module: parties, vessels, consignments,
   units and their stays, the yard, equipment. All names are fictional.
   Every record is typed against the API contract, so sample data cannot
   drift from ng_icd_api.yaml. */
import type { S } from '@/api/types';
import { at, containerNo, iso6346, day, int, money, pick, rnd, vin } from './gen';

/* ------------------------------------------------------------------ parties */
type Party = S<'Party'>;
const P = (partyId: number, partyCode: string, partyName: string, roles: Party['roles'], extra: Partial<Party> = {}): Party => ({
  partyId, partyCode, partyName, roles, countryCode: 'TZ', city: 'Dar es Salaam', creditStatus: 'CASH',
  disbursementService: false, source: 'NG', syncStatus: 'SYNCED', ngRefId: `NG-C${1000 + partyId}`, isActive: true,
  defaultCurrency: 'USD', ...extra,
});
export const parties: Party[] = [
  P(1, 'C-MZIZI', 'Mzizi Traders Ltd', ['CUSTOMER', 'IMPORTER', 'CONSIGNEE'], { creditStatus: 'CREDIT', creditLimit: '25000.00', creditCurrency: 'USD', vatNo: '40-012345-A', taxId: '112-233-445', phone: '+255 22 211 0401', email: 'imports@mzizi.example' }),
  P(2, 'C-KILELE', 'Kilele Clearing & Forwarding', ['CLEARING_AGENT', 'CUSTOMER'], { creditStatus: 'CREDIT', creditLimit: '40000.00', creditCurrency: 'USD', disbursementService: true, email: 'ops@kilele.example' }),
  P(3, 'C-BAHARI', 'Bahari Motors Ltd', ['CUSTOMER', 'IMPORTER', 'CONSIGNEE'], { email: 'yard@baharimotors.example' }),
  P(4, 'L-BML', 'Blue Meridian Line', ['SHIPPING_LINE'], { countryCode: 'AE', city: 'Dubai' }),
  P(5, 'L-IOS', 'Indian Ocean Shipping', ['SHIPPING_LINE'], { countryCode: 'KE', city: 'Mombasa' }),
  P(6, 'L-SCL', 'Southern Cross Lines', ['SHIPPING_LINE'], { countryCode: 'ZA', city: 'Durban' }),
  P(7, 'T-UPEPO', 'Upepo Transporters', ['TRANSPORTER']),
  P(8, 'T-SIMBA', 'Simba Haulage Co.', ['TRANSPORTER']),
  P(9, 'C-ZAMLINK', 'Zamlink Distributors (Lusaka)', ['CUSTOMER', 'CONSIGNEE'], { countryCode: 'ZM', city: 'Lusaka' }),
  P(10, 'C-NYOTA', 'Nyota Agro Exports', ['CUSTOMER', 'EXPORTER']),
  P(11, 'C-PWANIHW', 'Pwani Hardware Wholesalers', ['CUSTOMER', 'CONSIGNEE']),
  P(12, 'A-MSAADA', 'Msaada Shipping Agency', ['SHIPPING_AGENT']),
  P(13, 'C-NEWCO', 'Tanzanite Pharma Distributors', ['CUSTOMER', 'CONSIGNEE'], { source: 'LOCAL', syncStatus: 'PROVISIONAL', ngRefId: undefined }),
  P(14, 'C-KAGERA', 'Kagera Builders Supply', ['CUSTOMER', 'CONSIGNEE'], { creditStatus: 'BLOCKED' }),
];
export const party = (id?: number | null) => parties.find((p) => p.partyId === id);
export const partyName = (id?: number | null) => party(id)?.partyName ?? '—';
export const LINE_CODES: Record<number, string> = { 4: 'BML', 5: 'IOS', 6: 'SCL' };

/* ------------------------------------------------------------------ vessels */
export const vessels: S<'Vessel'>[] = [
  { vesselId: 1, vesselName: 'Meridian Star', imoNo: '9701234', flagCountry: 'PA', operatorPartyId: 4, isActive: true },
  { vesselId: 2, vesselName: 'Ocean Kestrel', imoNo: '9655881', flagCountry: 'LR', operatorPartyId: 5, isActive: true },
  { vesselId: 3, vesselName: 'Cape Albatross', imoNo: '9588120', flagCountry: 'MT', operatorPartyId: 6, isActive: true },
  { vesselId: 4, vesselName: 'Hoegh Tanzanite', imoNo: '9690112', flagCountry: 'NO', operatorPartyId: 5, isActive: true },
];
export const vesselCalls: S<'VesselCall'>[] = [
  { vesselCallId: 11, vesselId: 1, vesselName: 'Meridian Star', voyageNo: '241W', portId: 1, shippingLinePartyId: 4, eta: at(240), ata: at(236), dischargeCompletedAt: at(210), status: 'DEPARTED', portCallRef: 'DSM-26-1182' },
  { vesselCallId: 12, vesselId: 2, vesselName: 'Ocean Kestrel', voyageNo: '0926S', portId: 1, shippingLinePartyId: 5, eta: at(140), ata: at(138), dischargeCompletedAt: at(112), status: 'DEPARTED', portCallRef: 'DSM-26-1207' },
  { vesselCallId: 13, vesselId: 4, vesselName: 'Hoegh Tanzanite', voyageNo: '112', portId: 1, shippingLinePartyId: 5, eta: at(70), ata: at(68), dischargeCompletedAt: at(40), status: 'DISCHARGED', portCallRef: 'DSM-26-1219' },
  { vesselCallId: 14, vesselId: 3, vesselName: 'Cape Albatross', voyageNo: '318N', portId: 1, shippingLinePartyId: 6, eta: at(-30), status: 'EXPECTED', portCallRef: 'DSM-26-1231', gateCutoffAt: at(-20), docCutoffAt: at(-26), vgmCutoffAt: at(-22) },
];

/* ------------------------------------------------------------------ consignments */
type Cons = S<'Consignment'>;
const C = (consignmentId: number, refNo: string, o: Partial<Cons>): Cons => ({
  consignmentId, refType: 'BL', refNo, cargoRegimeCode: 'IMPORT_HOME', status: 'OPEN', unitsExpected: 0, unitsReceived: 0, unitsDelivered: 0, ...o,
});
export const consignments: Cons[] = [
  C(101, 'BMLU2409881', { vesselCallId: 11, shippingLinePartyId: 4, consigneePartyId: 1, agentPartyId: 2, billToPartyId: 2, cargoDescription: 'Ceramic floor tiles', declaredPackages: 1680, declaredWeightKg: '118400' }),
  C(102, 'BMLU2409902', { vesselCallId: 11, shippingLinePartyId: 4, consigneePartyId: 11, agentPartyId: 2, billToPartyId: 11, cargoDescription: 'Hand tools and fittings' }),
  C(103, 'IOSL0926S0441', { vesselCallId: 12, shippingLinePartyId: 5, consigneePartyId: 9, agentPartyId: 2, billToPartyId: 2, cargoRegimeCode: 'TRANSIT', destinationCountry: 'ZM', cargoDescription: 'Copper cable drums' }),
  C(104, 'IOSL0926S0457', { vesselCallId: 12, shippingLinePartyId: 5, consigneePartyId: 14, agentPartyId: 2, billToPartyId: 14, cargoDescription: 'Cement additives' }),
  C(105, 'HTZ112-0087', { vesselCallId: 13, shippingLinePartyId: 5, consigneePartyId: 3, agentPartyId: 2, billToPartyId: 3, cargoDescription: 'Used passenger vehicles (Ro-Ro)' }),
  C(106, 'HTZ112-0093', { vesselCallId: 13, shippingLinePartyId: 5, consigneePartyId: 9, agentPartyId: 2, billToPartyId: 2, cargoRegimeCode: 'TRANSIT', destinationCountry: 'ZM', cargoDescription: 'Tractors and trailers (Ro-Ro)' }),
  C(107, 'SCLB318N2210', { refType: 'BOOKING', vesselCallId: 14, shippingLinePartyId: 6, shipperPartyId: 10, billToPartyId: 10, cargoRegimeCode: 'EXPORT', cargoDescription: 'Green coffee beans in jute bags' }),
  C(108, 'BMLU2410017', { vesselCallId: 11, shippingLinePartyId: 4, consigneePartyId: 13, agentPartyId: 2, billToPartyId: 13, cargoDescription: 'Pharmaceutical products (temperature controlled)' }),
  C(109, 'IOSL0926S0470', { vesselCallId: 12, shippingLinePartyId: 5, consigneePartyId: 1, agentPartyId: 2, billToPartyId: 1, cargoDescription: 'Mixed consolidated cargo (LCL)' }),
  C(110, 'ER-BML-2026-0311', { refType: 'EMPTY_RELEASE', shippingLinePartyId: 4, billToPartyId: 4, cargoRegimeCode: 'EMPTY', cargoDescription: 'Empty release to exporter' }),
];
export const consignment = (id?: number | null) => consignments.find((c) => c.consignmentId === id);

/* ------------------------------------------------------------------ yard */
export interface Block { id: number; code: string; rows: number; bays: number; tiers: number; x: number; y: number; w: number; h: number; kind: 'CONTAINER' | 'VEHICLE' | 'REEFER' | 'EMPTY' | 'EXAM'; siteId: number }
export const blocks: Block[] = [
  { id: 201, code: 'A', rows: 5, bays: 10, tiers: 4, x: 40, y: 40, w: 360, h: 150, kind: 'CONTAINER', siteId: 1 },
  { id: 202, code: 'B', rows: 5, bays: 10, tiers: 4, x: 440, y: 40, w: 360, h: 150, kind: 'CONTAINER', siteId: 1 },
  { id: 203, code: 'C', rows: 4, bays: 8, tiers: 5, x: 40, y: 230, w: 300, h: 125, kind: 'EMPTY', siteId: 1 },
  { id: 204, code: 'R', rows: 2, bays: 8, tiers: 2, x: 380, y: 225, w: 300, h: 80, kind: 'REEFER', siteId: 1 },
  { id: 205, code: 'X', rows: 2, bays: 6, tiers: 1, x: 380, y: 316, w: 180, h: 74, kind: 'EXAM', siteId: 1 },
  { id: 206, code: 'V1', rows: 4, bays: 6, tiers: 1, x: 40, y: 40, w: 520, h: 200, kind: 'VEHICLE', siteId: 2 },
  { id: 207, code: 'V2', rows: 3, bays: 5, tiers: 1, x: 600, y: 40, w: 300, h: 150, kind: 'VEHICLE', siteId: 2 },
];

/* ------------------------------------------------------------------ units & stays */
export type Stay = S<'UnitStay'> & { unitSummary: S<'UnitSummary'> };
const FREE_DAYS = 7;
const stays: Stay[] = [];
let stayId = 5000, cuId = 9000;

function mkStay(o: {
  category: 'CONTAINER' | 'VEHICLE' | 'LOT'; unitNo: string; type: string; cons?: Cons; site: number;
  flow: S<'UnitStay'>['flow']; fe: 'F' | 'E'; phys: S<'UnitStay'>['physicalStatus']; customs: S<'UnitStay'>['customsStatus'];
  billing: S<'UnitStay'>['billingStatus']; release: S<'UnitStay'>['releaseStatus']; holds?: number; loc?: string; gatedHrs?: number;
  make?: string; model?: string; year?: number; colour?: string; reefer?: string; imo?: string; un?: string; next?: string; desc?: string;
}): Stay {
  const id = ++stayId;
  const line = o.cons?.shippingLinePartyId ?? pick([4, 5, 6]);
  const vc = vesselCalls.find((v) => v.vesselCallId === o.cons?.vesselCallId);
  const gatedInAt = o.phys === 'EXPECTED' ? undefined : at(o.gatedHrs ?? int(6, 400));
  const storageStartAt = vc?.dischargeCompletedAt ?? gatedInAt;
  const dwell = storageStartAt ? Math.floor((new Date('2026-10-07T07:30:00Z').getTime() - new Date(storageStartAt).getTime()) / 86400000) : 0;
  const freeUntil = storageStartAt ? new Date(new Date(storageStartAt).getTime() + FREE_DAYS * 86400000).toISOString() : undefined;
  const storageDays = Math.max(0, dwell - FREE_DAYS);
  const rate = o.category === 'VEHICLE' ? 10 : o.type.startsWith('4') ? 16 : 8;
  const amount = storageDays * rate + (o.phys !== 'EXPECTED' ? (o.category === 'VEHICLE' ? 45 : 90) : 0);
  const location = o.loc ? { yardLocationId: id * 10, fullCode: o.loc } : undefined;
  const s: Stay = {
    unitStayId: id, siteId: o.site, consignmentId: o.cons?.consignmentId,
    cargoUnit: {
      cargoUnitId: ++cuId, category: o.category, unitNo: o.unitNo, unitTypeCode: o.type, ownerPartyId: line,
      make: o.make, model: o.model, modelYear: o.year, colour: o.colour,
      tareKg: o.category === 'CONTAINER' ? (o.type.startsWith('4') ? 3750 : 2200) : undefined,
      maxGrossKg: o.category === 'CONTAINER' ? (o.type.startsWith('4') ? 32500 : 30480) : undefined,
    },
    cargoRegimeCode: o.cons?.cargoRegimeCode ?? 'IMPORT_HOME', flow: o.flow, fullEmpty: o.fe,
    physicalStatus: o.phys, customsStatus: o.customs, billingStatus: o.billing, releaseStatus: o.release,
    activeHoldCount: o.holds ?? 0, currentLocation: location, linePartyId: line,
    cargoDescription: o.desc ?? o.cons?.cargoDescription, conditionStatus: o.phys === 'EXPECTED' ? 'UNKNOWN' : rnd() < 0.12 ? 'DAMAGED' : 'SOUND',
    sealNo: o.category === 'CONTAINER' && o.fe === 'F' ? `ML-${int(1000000, 9999999)}` : undefined,
    grossWeightKg: o.category === 'CONTAINER' && o.fe === 'F' ? String(int(9000, 27000)) : undefined,
    imoClass: o.imo, unNo: o.un, reeferSetTempC: o.reefer, dischargeAt: vc?.dischargeCompletedAt ?? undefined,
    gatedInAt, storageStartAt, freeUntil, destinationCountry: o.cons?.destinationCountry,
    accruedCharges: { currency: 'USD', amount: money(amount), taxAmount: money(amount * 0.18), total: money(amount * 1.18) },
    nextAction: o.next,
    unitSummary: undefined as never,
  };
  s.unitSummary = {
    unitStayId: id, unitNo: o.unitNo, category: o.category, unitTypeCode: o.type, siteId: o.site, flow: o.flow, fullEmpty: o.fe,
    physicalStatus: o.phys!, customsStatus: o.customs!, billingStatus: o.billing!, releaseStatus: o.release!,
    activeHoldCount: o.holds ?? 0, location: o.loc, consignmentRef: o.cons?.refNo, lineCode: LINE_CODES[line],
    gatedInAt, dwellDays: o.phys === 'EXPECTED' ? undefined : dwell,
  };
  stays.push(s);
  return s;
}

/* Stack units bottom-up so tiers are physically possible. */
const heights = new Map<string, number>();
function slot(code: string): string | undefined {
  const b = blocks.find((x) => x.code === code)!;
  for (let tries = 0; tries < 200; tries++) {
    const r = int(1, b.rows), c = int(1, b.bays);
    const k = `${code}-${String(r).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
    const h = heights.get(k) ?? 0;
    if (h < b.tiers) { heights.set(k, h + 1); return b.tiers > 1 ? `${k}-${h + 1}` : k; }
  }
  return undefined;
}

/* Hero unit used across the demo: an import with a customs exam hold and charges due. */
export const HERO = mkStay({
  category: 'CONTAINER', unitNo: 'BMLU4021175', type: '40HC', cons: consignments[0], site: 1, flow: 'IMPORT', fe: 'F',
  phys: 'IN_YARD', customs: 'UNDER_EXAM', billing: 'ACCRUING', release: 'REQUESTED', holds: 1, loc: (heights.set('A-03-07', 1), 'A-03-07-1'), gatedHrs: 205,
  next: 'Customs exam booked for today 14:00 at bay X-01',
});
// fix the hero number to a valid ISO 6346 check digit
HERO.cargoUnit.unitNo = HERO.unitSummary.unitNo = 'BMLU402117' + iso6346('BMLU402117');

const owners = ['BMLU', 'IOSU', 'SCLU', 'TZNU'];
for (let i = 0; i < 260; i++) {
  const cons = pick(consignments.slice(0, 4).concat(consignments[7], consignments[8]));
  const owner = cons.shippingLinePartyId === 4 ? 'BMLU' : cons.shippingLinePartyId === 5 ? 'IOSU' : pick(owners);
  const r = rnd();
  const phys = r < 0.08 ? 'EXPECTED' : r < 0.85 ? 'IN_YARD' : r < 0.93 ? 'AT_ACTIVITY' : 'DEPARTED';
  const customs = phys === 'EXPECTED' ? 'NOT_LODGED' : pick(['LODGED', 'CLEARED', 'CLEARED', 'UNDER_EXAM', 'NOT_LODGED', 'CLEARED'] as const);
  const billing = phys === 'DEPARTED' ? 'PAID' : pick(['ACCRUING', 'ACCRUING', 'PROFORMA', 'PAID', 'CREDIT'] as const);
  const release = phys === 'DEPARTED' ? 'USED' : customs === 'CLEARED' && (billing === 'PAID' || billing === 'CREDIT') ? pick(['APPROVED', 'REQUESTED', 'NONE'] as const) : 'NONE';
  const reefer = cons.consignmentId === 108;
  mkStay({
    category: 'CONTAINER', unitNo: containerNo(owner), type: reefer ? '40RH' : pick(['20GP', '40GP', '40HC', '20GP', '40HC']), cons, site: 1,
    flow: cons.cargoRegimeCode === 'TRANSIT' ? 'TRANSIT' : 'IMPORT', fe: 'F', phys, customs, billing, release,
    holds: rnd() < 0.12 ? 1 : 0, loc: phys === 'IN_YARD' ? slot(reefer ? 'R' : pick(['A', 'B', 'A', 'B'])) : phys === 'AT_ACTIVITY' ? `X-0${int(1, 6)}` : undefined,
    reefer: reefer ? '4.0' : undefined, imo: rnd() < 0.06 ? '3' : undefined, un: undefined,
  });
}
for (let i = 0; i < 70; i++) {
  mkStay({
    category: 'CONTAINER', unitNo: containerNo(pick(['BMLU', 'IOSU', 'SCLU'])), type: pick(['20GP', '40HC', '40GP']), site: 1, flow: 'EMPTY_RETURN', fe: 'E',
    phys: 'IN_YARD', customs: 'NOT_REQUIRED', billing: pick(['ACCRUING', 'CREDIT']), release: 'NONE', loc: slot('C'),
  });
}
for (let i = 0; i < 6; i++) {
  mkStay({
    category: 'CONTAINER', unitNo: containerNo('SCLU'), type: pick(['20GP', '40HC']), cons: consignments[6], site: 1, flow: 'EXPORT', fe: 'F',
    phys: i < 4 ? 'IN_YARD' : 'EXPECTED', customs: i < 2 ? 'CLEARED' : 'LODGED', billing: 'PROFORMA', release: 'NONE', loc: i < 4 ? slot('B') : undefined,
  });
}
const makes: [string, string, string][] = [['TOYOTA', 'Land Cruiser Prado', 'JTE'], ['TOYOTA', 'Hilux', 'AHT'], ['NISSAN', 'X-Trail', 'JN1'], ['MITSUBISHI', 'Canter', 'JLB'], ['SUBARU', 'Forester', 'JF1'], ['ISUZU', 'D-Max', 'MPA'], ['MASSEY FERGUSON', 'MF 385', 'MF3']];
for (let i = 0; i < 24; i++) {
  const [make, model, wmi] = pick(makes);
  const cons = i < 18 ? consignments[4] : consignments[5];
  const phys = i < 2 ? 'EXPECTED' : i < 21 ? 'IN_YARD' : 'DEPARTED';
  mkStay({
    category: 'VEHICLE', unitNo: vin(wmi), type: model.includes('MF') ? 'TRACTOR' : model === 'Canter' ? 'TRUCK_LIGHT' : 'CAR_SUV', cons, site: 2,
    flow: cons.cargoRegimeCode === 'TRANSIT' ? 'TRANSIT' : 'IMPORT', fe: 'F', phys,
    customs: phys === 'EXPECTED' ? 'NOT_LODGED' : pick(['LODGED', 'CLEARED', 'CLEARED', 'QUERY']), billing: phys === 'DEPARTED' ? 'PAID' : pick(['ACCRUING', 'PAID', 'PROFORMA']),
    release: phys === 'DEPARTED' ? 'USED' : pick(['NONE', 'NONE', 'APPROVED']), holds: rnd() < 0.1 ? 1 : 0,
    loc: phys === 'IN_YARD' ? slot(i < 14 ? 'V1' : 'V2') : undefined,
    make, model, year: int(2016, 2023), colour: pick(['White', 'Silver', 'Black', 'Grey', 'Blue', 'Red']),
  });
}
for (let i = 0; i < 4; i++) {
  mkStay({
    category: 'LOT', unitNo: `LOT-${consignments[8].refNo.slice(-4)}-${i + 1}`, type: 'LOT', cons: consignments[8], site: 1, flow: 'IMPORT', fe: 'F',
    phys: 'IN_YARD', customs: pick(['LODGED', 'CLEARED']), billing: 'ACCRUING', release: 'NONE', loc: `CFS-W1-${String(i + 1).padStart(2, '0')}`,
    desc: pick(['Cartons of kitchenware', 'Pallets of bottled water', 'Bales of second-hand clothing', 'Crates of solar panels']),
  });
}

export const allStays = stays;
export const stay = (id: number) => stays.find((s) => s.unitStayId === id);
export const staysAt = (siteId: number) => stays.filter((s) => s.siteId === siteId);
export const unitsOf = (consignmentId: number) => stays.filter((s) => s.consignmentId === consignmentId);

// derive consignment unit counts from the stays
for (const c of consignments) {
  const u = unitsOf(c.consignmentId!);
  Object.assign(c, {
    unitsExpected: u.length || int(1, 6),
    unitsReceived: u.filter((s) => s.physicalStatus !== 'EXPECTED').length,
    unitsDelivered: u.filter((s) => s.physicalStatus === 'DEPARTED').length,
  });
}

/* ------------------------------------------------------------------ equipment */
export const equipment: S<'Equipment'>[] = [
  { equipmentId: 1, equipmentCode: 'RS-01', equipmentName: 'Reach stacker 1', equipmentType: 'REACH_STACKER', capacityKg: 45000, isActive: true },
  { equipmentId: 2, equipmentCode: 'RS-02', equipmentName: 'Reach stacker 2', equipmentType: 'REACH_STACKER', capacityKg: 45000, isActive: true },
  { equipmentId: 3, equipmentCode: 'EH-01', equipmentName: 'Empty handler', equipmentType: 'EMPTY_HANDLER', capacityKg: 9000, isActive: true },
  { equipmentId: 4, equipmentCode: 'FL-03', equipmentName: 'Forklift 3 t (CFS)', equipmentType: 'FORKLIFT', capacityKg: 3000, isActive: true },
  { equipmentId: 5, equipmentCode: 'TT-01', equipmentName: 'Terminal tractor', equipmentType: 'TERMINAL_TRACTOR', isActive: true },
  { equipmentId: 6, equipmentCode: 'WB-01', equipmentName: 'Weighbridge 80 t', equipmentType: 'WEIGHBRIDGE', capacityKg: 80000, isActive: true },
];

export const day0 = day;
