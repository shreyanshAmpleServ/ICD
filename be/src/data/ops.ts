/* Operations sample data: truck visit detail, appointments, move orders,
   inspections, weighbridge, vehicle keys, CFS jobs, reefers and M&R repairs.
   Everything links to the units in core.ts and the visits in gate.ts. */
import type { S } from '../types';
import type { Tone } from '../types';
import { HERO, LINE_CODES, allStays, blocks, partyName, stay, type Stay } from './core';
import { visits } from './gate';
import { at, day, int, money, pick, rnd } from './gen';

const inYard = allStays.filter((s) => s.physicalStatus === 'IN_YARD' && s.cargoUnit.category === 'CONTAINER');
const pad = (n: number) => String(n).padStart(2, '0');

/* ================================================================== gate: visit detail */
export type SealStatus = NonNullable<S<'VisitUnit'>['sealStatus']>;
export interface VisitEvent { at: string; title: string; detail?: string; by?: string; tone?: Tone }
export interface VisitExtra {
  trailerPlate?: string; licenceNo: string; appointmentNo?: string; approvalNo?: string; exceptionNo?: string;
  seals: Record<number, { expected?: string; found?: string; status?: SealStatus }>;
  events: VisitEvent[];
}

function sealsFor(v: (typeof visits)[number]): VisitExtra['seals'] {
  const out: VisitExtra['seals'] = {};
  for (const u of v.units ?? []) {
    const veh = u.unitNo?.length === 17;
    if (veh) { out[u.unitStayId] = { status: 'NOT_SEALED' }; continue; }
    if (u.status === 'DONE' || (u.status === 'IN_PROGRESS' && u.direction === 'DROP')) out[u.unitStayId] = { expected: u.sealExpected, found: u.sealExpected, status: 'MATCH' };
    else out[u.unitStayId] = { expected: u.sealExpected };
  }
  return out;
}

export const visitExtras: Record<number, VisitExtra> = {};
for (const v of visits) {
  const evs: VisitEvent[] = [];
  if (v.expectedFrom) evs.push({ at: at(20), title: 'Visit announced', detail: `Expected ${new Date(v.expectedFrom).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' })}`, by: 'Portal · ' + v.transporter });
  if (v.arrivedAt) evs.push({ at: v.arrivedAt, title: `Plate read ${v.plateNo} at outer gate`, detail: 'Camera ANPR, 96% confidence', by: 'Lane In 2 · camera' });
  for (const c of v.checkpoints ?? []) {
    evs.push({
      at: c.occurredAt, by: c.by, tone: c.result === 'FAILED' ? 'stop' : 'go',
      title: `${c.checkpointCode.replace('_', ' ').toLowerCase().replace(/^\w/, (x) => x.toUpperCase())}: ${c.result === 'FAILED' ? 'failed' : 'passed'}`,
      detail: [c.failureReason, c.isOffline ? 'Recorded offline on the tablet, synced later' : null].filter(Boolean).join(' · ') || undefined,
    });
  }
  for (const u of v.units ?? []) if (u.status === 'DONE') evs.push({ at: v.checkedOutAt ?? at(0.2), title: `${u.direction === 'PICK' ? 'Picked up' : 'Dropped off'} ${u.unitNo}`, detail: `EIR ${u.eirNo} signed on screen`, by: 'Gate · Rose A.', tone: 'go' });
  if (v.gatePassNo) evs.push({ at: v.checkedOutAt ?? at(0.1), title: `Gate pass ${v.gatePassNo} printed`, by: 'Gate · Rose A.' });
  if (v.exitedAt) evs.push({ at: v.exitedAt, title: 'Left the depot', by: 'Gate · Hamisi J.' });
  visitExtras[v.truckVisitId!] = {
    licenceNo: `40${int(10000000, 99999999)}`, trailerPlate: v.conveyance === 'TRUCK' ? `T ${int(100, 999)} ${pick(['DKA', 'DLM', 'DGT'])}` : undefined,
    appointmentNo: v.visitTypeCode === 'IMPORT_PICKUP' || v.visitTypeCode === 'EXPORT_DROP' ? `AP-26-${int(10000, 19999)}` : undefined,
    seals: sealsFor(v), events: evs,
  };
}
{
  // T 902 DMB: seal mismatch at the inner gate, override requested
  const x = visitExtras[4410];
  const uid = visits.find((v) => v.truckVisitId === 4410)!.units![0].unitStayId;
  x.seals[uid] = { expected: 'ML-7781203', found: 'ML-7781208', status: 'MISMATCH' };
  x.approvalNo = 'APR-26-00414'; x.exceptionNo = 'EX-26-00881';
  x.events.push(
    { at: at(0.4), title: 'Unit held at inner gate', detail: 'Seal on the door does not match the transfer manifest', by: 'Gate · Hamisi J.', tone: 'stop' },
    { at: at(0.38), title: 'Exception EX-26-00881 opened', detail: 'Seal mismatch at gate-in · assigned to operations manager', by: 'System', tone: 'wait' },
    { at: at(0.3), title: 'Override requested: APR-26-00414', detail: 'Seal number on paper EIR mistyped; photo shows seal ML-7781203 intact', by: 'Gate · Hamisi J.', tone: 'wait' },
  );
  // T 505 DJN: release order expired before the truck reached the inner gate out
  const r = visitExtras[4402];
  r.exceptionNo = 'EX-26-00879';
  r.events.push(
    { at: at(3.0), title: 'Gate-out check failed', detail: 'Release order RO-DAR1-26-01918 expired at 07:30. Agent must extend it.', by: 'Release engine', tone: 'stop' },
    { at: at(2.95), title: 'Truck turned back, unit pick-up cancelled', detail: 'Driver told to return after Kilele C&F renews the release', by: 'Gate · Rose A.', tone: 'stop' },
    { at: at(2.9), title: 'Exception EX-26-00879 opened for customer service', by: 'System', tone: 'wait' },
  );
}
for (const x of Object.values(visitExtras)) x.events.sort((a, b) => b.at.localeCompare(a.at));

/* ================================================================== appointments (M5) */
export const APPT_TYPES = ['IMPORT_PICKUP', 'EXPORT_DROP', 'EMPTY_RETURN', 'EMPTY_PICKUP'] as const;
export const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const capFor: Record<string, number> = { IMPORT_PICKUP: 6, EXPORT_DROP: 4, EMPTY_RETURN: 4, EMPTY_PICKUP: 3 };

export const slotRules: S<'AppointmentSlotRule'>[] = [];
let ruleId = 600;
for (let wd = 1; wd <= 6; wd++) {
  for (const t of APPT_TYPES) {
    const sat = wd === 6;
    slotRules.push({
      appointmentSlotRuleId: ++ruleId, visitTypeCode: t, weekday: wd,
      slotStart: '07:00', slotEnd: sat ? '12:00' : t === 'EMPTY_RETURN' ? '16:00' : '17:00',
      capacityTrucks: sat ? Math.max(2, capFor[t] - 2) : capFor[t], lateGraceMin: t === 'IMPORT_PICKUP' ? 30 : 45, isActive: true,
    });
  }
}
export const ruleFor = (weekday: number, t: string) => slotRules.find((r) => r.weekday === weekday && r.visitTypeCode === t);

export type Appt = S<'Appointment'> & { plateNo: string; driverName: string; refNo?: string; date: string; hour: number };
const DRIVERS = ['Juma Selemani', 'Athumani Said', 'Godfrey Mollel', 'Ramadhani Issa', 'Emmanuel Mushi', 'Salim Hamad', 'Zuberi Kitwana', 'Joseph Mbwambo', 'Omari Shabani', 'Victor Lema', 'Hamza Mfinanga', 'Daudi Swai'];
const PLATE_SUFFIX = ['DKA', 'DLM', 'DGT', 'DMB', 'DPE', 'DQA', 'DRC', 'DHN', 'DJK'];
export const appointments: Appt[] = [];
let apptId = 3300;
for (let d = -1; d <= 6; d++) {
  const date = day(d);
  const wd = new Date(date + 'T12:00:00+03:00').getUTCDay();
  if (wd === 0) continue;
  for (const h of HOURS) {
    for (const t of APPT_TYPES) {
      const rule = ruleFor(wd, t);
      if (!rule) continue;
      const endH = Number(rule.slotEnd.slice(0, 2));
      if (h >= endH) continue;
      // busier mornings, emptier days further out
      const load = (h < 11 ? 0.85 : 0.6) * (d <= 1 ? 1 : d <= 3 ? 0.7 : 0.4);
      const n = Math.min(rule.capacityTrucks, Math.round(rule.capacityTrucks * load * (0.55 + rnd() * 0.6)));
      for (let i = 0; i < n; i++) {
        const start = new Date(`${date}T${pad(h)}:00:00+03:00`);
        const past = start.getTime() + 3600_000 < new Date('2026-10-07T10:30:00+03:00').getTime();
        const r = rnd();
        const status: Appt['status'] = r < 0.06 ? 'CANCELLED' : past ? (r < 0.16 ? 'MISSED' : d < 0 || h < 9 ? 'COMPLETED' : 'ARRIVED') : 'BOOKED';
        appointments.push({
          appointmentId: ++apptId, appointmentNo: `AP-26-${10000 + apptId}`, visitTypeCode: t,
          slotStart: start.toISOString(), slotEnd: new Date(start.getTime() + 3600_000).toISOString(),
          transporterPartyId: pick([7, 8, 7, 8, 11, 2]), status, bookedVia: pick(['PORTAL', 'PORTAL', 'DESK', 'API'] as const),
          plateNo: `T ${int(100, 999)} ${pick(PLATE_SUFFIX)}`, driverName: pick(DRIVERS),
          refNo: t === 'IMPORT_PICKUP' ? `RO-DAR1-26-0${int(1800, 1990)}` : t === 'EXPORT_DROP' ? 'SCLB318N2210' : t === 'EMPTY_RETURN' ? `ER-${pick(['BML', 'IOS', 'SCL'])}-${int(1000, 9999)}` : 'ER-BML-2026-0311',
          date, hour: h,
        });
      }
    }
  }
}
// tie today's bookings to the real visits on the gate queue
{
  const today = day(0);
  const tie = (plate: string, driver: string, h: number, t: string, status: Appt['status'], tvId: number, transporter: number, ref?: string) => {
    const a = appointments.find((x) => x.date === today && x.hour === h && x.visitTypeCode === t && x.status !== 'CANCELLED');
    if (a) Object.assign(a, { plateNo: plate, driverName: driver, status, truckVisitId: tvId, transporterPartyId: transporter, refNo: ref ?? a.refNo });
  };
  tie('T 412 DKL', 'Baraka Mwita', 10, 'IMPORT_PICKUP', 'ARRIVED', 4411, 7, 'RO-DAR1-26-01942');
  tie('T 118 DPE', 'Said Omari', 9, 'IMPORT_PICKUP', 'ARRIVED', 4412, 8);
  tie('T 655 DQA', 'Hassan Ali', 11, 'EXPORT_DROP', 'BOOKED', 4415, 7);
  tie('T 771 DGH', 'John Massawe', 9, 'EMPTY_RETURN', 'ARRIVED', 4413, 7);
}

/* ================================================================== yard: move orders */
export type Move = S<'MoveOrder'> & {
  siteId: number; category: string; unitType: string; lineCode?: string; fromCode: string; toCode?: string; toLabel?: string;
  plateNo?: string; operatorName?: string; startedAt?: string; note?: string; doneAt?: string;
};
export const OPERATORS: Record<string, string> = { 'ibrahim.n': 'Ibrahim N.', 'kassim.m': 'Kassim M.', 'shabani.r': 'Shabani R.', 'neema.k': 'Neema K.' };
export const MOVE_KIND: Record<string, string> = {
  PLACE: 'Place', RELOCATE: 'Relocate', RESHUFFLE: 'Reshuffle', TO_ACTIVITY: 'To activity', FROM_ACTIVITY: 'Back from activity', PICK_FOR_VISIT: 'Pick for truck',
};

/** Stack height per ground slot, from where units are now. */
const heightAt = new Map<string, number>();
for (const s of allStays) {
  const c = s.currentLocation?.fullCode;
  if (!c || s.physicalStatus !== 'IN_YARD') continue;
  const g = c.split('-').slice(0, 3).join('-');
  heightAt.set(g, Math.max(heightAt.get(g) ?? 0, Number(c.split('-')[3] ?? 1)));
}
export const BLOCKED_SLOTS: Record<string, string> = { 'B-05-10': 'Drainage repair until 10 Oct', 'A-01-01': 'Next to the fuel bay, kept clear', 'C-04-08': 'Damaged ground plate' };
export type SlotState = { state: 'FREE' | 'FULL' | 'BLOCKED' | 'INVALID'; tier?: number; note: string };
export function checkSlot(code: string): SlotState {
  const m = code.trim().toUpperCase().match(/^([A-Z]\d?)-(\d{2})-(\d{2})$/);
  if (!m) return { state: 'INVALID', note: 'Type a ground slot like A-03-07' };
  const b = blocks.find((x) => x.code === m[1]);
  if (!b || Number(m[2]) < 1 || Number(m[2]) > b.rows || Number(m[3]) < 1 || Number(m[3]) > b.bays) return { state: 'INVALID', note: 'No such slot in this yard' };
  const g = `${m[1]}-${m[2]}-${m[3]}`;
  if (BLOCKED_SLOTS[g]) return { state: 'BLOCKED', note: `Blocked: ${BLOCKED_SLOTS[g]}` };
  const h = heightAt.get(g) ?? 0;
  if (h >= b.tiers) return { state: 'FULL', note: `Stack is full (${h} of ${b.tiers} high)` };
  return { state: 'FREE', tier: h + 1, note: h ? `Goes on tier ${h + 1} of ${b.tiers}` : 'Empty ground slot' };
}
function freeSlots(blockCode: string, skip: number, n = 3): string[] {
  const b = blocks.find((x) => x.code === blockCode)!;
  const out: string[] = [];
  for (let r = 1; r <= b.rows && out.length < n + skip; r++) {
    for (let c = 1; c <= b.bays && out.length < n + skip; c++) {
      const g = `${b.code}-${pad(r)}-${pad(c)}`;
      if (!BLOCKED_SLOTS[g] && (heightAt.get(g) ?? 0) < b.tiers) out.push(g);
    }
  }
  return out.slice(skip, skip + n);
}
const REASONS: Record<string, string[][]> = {
  IMPORT: [['Same line, same BL', 'No reshuffle to deliver', 'Release requested: near gate'], ['Same line', 'One unit on top, not urgent'], ['Free ground slot', 'Further from the gate']],
  EMPTY: [['Same line, same size', 'Empty stack for this line'], ['Same line', 'Mixed sizes in row'], ['Overflow row', 'Different line next door']],
  REEFER: [['Reefer plug free', 'Same consignment next to it'], ['Reefer plug free'], ['Plug free on tier 2', 'Needs ladder for readings']],
  VEHICLE: [['Same BL, same make', 'Near the wash bay'], ['Same BL'], ['Free bay, far end']],
  EXAM: [['Exam bay booked for 14:00', 'Customs officer assigned'], ['Exam bay free'], ['Exam bay free, no shade']],
};
export function candidatesFor(m: Move): S<'SlotCandidate'>[] {
  const s = stay(m.unitStayId);
  const kind = m.moveKind === 'TO_ACTIVITY' ? 'EXAM' : m.category === 'VEHICLE' ? 'VEHICLE' : s?.reeferSetTempC ? 'REEFER' : s?.fullEmpty === 'E' ? 'EMPTY' : 'IMPORT';
  const block = kind === 'EXAM' ? 'X' : kind === 'VEHICLE' ? 'V2' : kind === 'REEFER' ? 'R' : kind === 'EMPTY' ? 'C' : (m.moveOrderId! % 2 ? 'A' : 'B');
  const skip = m.moveOrderId! % 4;
  const own = freeSlots(block, skip);
  const fallback = own.length < 3 ? freeSlots(kind === 'REEFER' ? 'B' : 'A', skip * 2, 3 - own.length) : [];
  const base = 92 - (m.moveOrderId! % 5);
  return [...own, ...fallback].map((fullCode, i) => ({
    rank: i + 1, yardLocationId: 70000 + i + m.moveOrderId!, fullCode, score: String(base - i * 9 - (i ? ((m.moveOrderId! + i) % 4) + 1 : 0) - (i >= own.length ? 25 : 0)),
    reasons: i >= own.length && kind === 'REEFER' ? ['Reefer block full', 'Portable genset G-2 in reach', 'Plug at R when one frees'] : REASONS[kind][i] ?? ['Free ground slot'],
  }));
}

const st = (i: number) => inYard[i];
const mv = (id: number, s: Stay, o: Partial<Move> & Pick<Move, 'moveKind' | 'status'>): Move => ({
  moveOrderId: id, unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, siteId: s.siteId!, category: s.cargoUnit.category,
  unitType: s.cargoUnit.unitTypeCode, lineCode: s.unitSummary.lineCode ?? undefined, fromCode: s.currentLocation?.fullCode ?? 'Gate',
  fromLocation: s.currentLocation, priority: 3, requestedAt: at(((id * 7) % 6 + 1) / 4), suggestionLogId: 50000 + id, ...o,
});
const v4416 = visits.find((v) => v.truckVisitId === 4416)!;
const reefersOff = allStays.filter((s) => s.reeferSetTempC && s.physicalStatus === 'IN_YARD' && !s.currentLocation);
const empties = allStays.filter((s) => s.flow === 'EMPTY_RETURN' && s.currentLocation);
const vehiclesIn = allStays.filter((s) => s.cargoUnit.category === 'VEHICLE' && s.physicalStatus === 'IN_YARD');

export const moveOrders: Move[] = [
  mv(9101, stay(5005)!, { moveKind: 'PICK_FOR_VISIT', status: 'IN_PROGRESS', priority: 1, truckVisitId: 4412, plateNo: 'T 118 DPE', toLabel: 'Truck T 118 DPE · inner gate out', assignedEquipmentId: 1, assignedOperatorSub: 'ibrahim.n', requestedAt: at(1.15), startedAt: at(0.15), note: 'Driver waiting 72 min. One unit on top must be moved first.' }),
  mv(9102, stay(5043)!, { moveKind: 'PLACE', status: 'OPEN', priority: 2, truckVisitId: 4413, plateNo: 'T 771 DGH', fromCode: 'Truck T 771 DGH', fromLocation: undefined, requestedAt: at(0.65) }),
  mv(9103, HERO, { moveKind: 'TO_ACTIVITY', status: 'ASSIGNED', priority: 2, toCode: 'X-01', toLabel: 'Exam bay X-01 · customs exam 14:00', assignedEquipmentId: 2, assignedOperatorSub: 'kassim.m', requestedAt: at(2.5), note: 'Must be at X-01 by 13:45. Customs officer: Rehema K.' }),
  ...reefersOff.slice(0, 3).map((s, i) => mv(9104 + i, s, { moveKind: 'PLACE', status: i === 0 ? 'ASSIGNED' : 'OPEN', priority: 2, fromCode: `Reefer park P-0${i + 1} (off power)`, fromLocation: undefined, assignedEquipmentId: i === 0 ? 1 : undefined, assignedOperatorSub: i === 0 ? 'ibrahim.n' : undefined, requestedAt: at(3 + i * 0.3), note: 'Reefer off power. Plug in as soon as it is placed.' })),
  mv(9107, st(14), { moveKind: 'RESHUFFLE', status: 'OPEN', priority: 3, toLabel: 'Any slot in block A', requestedAt: at(0.9), note: 'Sits on top of a unit released for collection tomorrow.' }),
  mv(9108, st(40), { moveKind: 'RELOCATE', status: 'OPEN', priority: 4, requestedAt: at(4.2), note: 'Housekeeping: bring BML units of the same BL together.' }),
  mv(9109, empties[3], { moveKind: 'RELOCATE', status: 'ASSIGNED', priority: 4, assignedEquipmentId: 3, assignedOperatorSub: 'shabani.r', requestedAt: at(2) }),
  mv(9110, empties[7], { moveKind: 'RELOCATE', status: 'OPEN', priority: 5, requestedAt: at(5.5), note: 'Move to the repair area after the estimate is approved.' }),
  mv(9111, st(25), { moveKind: 'FROM_ACTIVITY', status: 'DONE', priority: 3, fromCode: 'X-03', toCode: st(25).currentLocation?.fullCode, assignedEquipmentId: 2, assignedOperatorSub: 'kassim.m', requestedAt: at(3), startedAt: at(2.6), completedAt: at(2.4), suggestionRank: 1 }),
  mv(9112, st(5), { moveKind: 'PICK_FOR_VISIT', status: 'DONE', priority: 1, truckVisitId: 4414, plateNo: 'T 230 DLX', toLabel: 'Truck T 230 DLX', assignedEquipmentId: 1, assignedOperatorSub: 'ibrahim.n', requestedAt: at(1.8), startedAt: at(1.5), completedAt: at(1.3) }),
  mv(9113, st(18), { moveKind: 'PLACE', status: 'DONE', priority: 2, fromCode: 'Truck T 337 DKA', toCode: st(18).currentLocation?.fullCode, assignedEquipmentId: 1, assignedOperatorSub: 'ibrahim.n', requestedAt: at(4), startedAt: at(3.8), completedAt: at(3.7), suggestionRank: 2, overrideReason: 'Rank 1 slot had a forklift parked in front' }),
  mv(9114, empties[12], { moveKind: 'PLACE', status: 'DONE', priority: 3, fromCode: 'Truck T 880 DFF', toCode: empties[12].currentLocation?.fullCode, assignedEquipmentId: 3, assignedOperatorSub: 'shabani.r', requestedAt: at(5), startedAt: at(4.7), completedAt: at(4.6), suggestionRank: 1 }),
  // vehicle yard (DAR2)
  ...(v4416.units ?? []).map((u, i) => mv(9120 + i, stay(u.unitStayId)!, { moveKind: 'PICK_FOR_VISIT', status: i === 0 ? 'DONE' : i === 1 ? 'IN_PROGRESS' : 'OPEN', priority: 1, truckVisitId: 4416, plateNo: 'T 340 DRC', toLabel: 'Car carrier T 340 DRC · loading ramp', fromCode: stay(u.unitStayId)?.currentLocation?.fullCode ?? 'V2 overflow', assignedEquipmentId: i < 2 ? undefined : undefined, assignedOperatorSub: i < 2 ? 'neema.k' : undefined, requestedAt: at(0.8), startedAt: i < 2 ? at(0.5 - i * 0.2) : undefined, completedAt: i === 0 ? at(0.35) : undefined, note: 'Self-driven. Take the key from the cabinet first.' })),
  mv(9124, vehiclesIn[6], { moveKind: 'RELOCATE', status: 'OPEN', priority: 4, requestedAt: at(3), note: 'Move to wash bay before pre-delivery inspection.' }),
];
// fill suggested target for each order that needs a slot
for (const m of moveOrders) if (!m.toCode && !m.toLabel) m.toCode = candidatesFor(m)[0]?.fullCode;
export const equipmentForMoves = ['RS-01', 'RS-02', 'EH-01', 'TT-01'];

/* ================================================================== inspections */
export const damageCodes: S<'DamageCode'>[] = [
  { damageCode: 'DT', damageName: 'Dent', appliesTo: 'ANY' },
  { damageCode: 'HO', damageName: 'Hole', appliesTo: 'CONTAINER' },
  { damageCode: 'BR', damageName: 'Broken', appliesTo: 'ANY' },
  { damageCode: 'CU', damageName: 'Cut or tear', appliesTo: 'ANY' },
  { damageCode: 'BT', damageName: 'Bent', appliesTo: 'CONTAINER' },
  { damageCode: 'CR', damageName: 'Corroded', appliesTo: 'CONTAINER' },
  { damageCode: 'MS', damageName: 'Missing', appliesTo: 'ANY' },
  { damageCode: 'LO', damageName: 'Loose', appliesTo: 'ANY' },
  { damageCode: 'SC', damageName: 'Scratch', appliesTo: 'VEHICLE' },
  { damageCode: 'CK', damageName: 'Cracked glass', appliesTo: 'VEHICLE' },
  { damageCode: 'PT', damageName: 'Paint damage', appliesTo: 'VEHICLE' },
  { damageCode: 'DY', damageName: 'Dirty or contaminated', appliesTo: 'CONTAINER' },
];
export const damageName = (c: string) => damageCodes.find((d) => d.damageCode === c)?.damageName ?? c;

const item = (id: number, itemCode: string, itemName: string, area: S<'InspectionItem'>['area']): S<'InspectionItem'> => ({
  inspectionItemId: id, itemCode, itemName, area, inputType: 'OK_DAMAGE', isMandatory: true, sortOrder: id,
});
export const checklists: Record<'CONTAINER' | 'VEHICLE', S<'InspectionItem'>[]> = {
  CONTAINER: [
    item(1, 'DOORS', 'Doors open, close and lock', 'DOORS'), item(2, 'GASKET', 'Door gaskets', 'DOORS'), item(3, 'SEAL', 'Seal intact', 'SEAL'),
    item(4, 'WALLS', 'Side walls', 'WALLS'), item(5, 'FRONT', 'Front wall', 'WALLS'), item(6, 'ROOF', 'Roof', 'ROOF'),
    item(7, 'FLOOR', 'Floor and cross members', 'FLOOR'), item(8, 'CORNERS', 'Corner posts and castings', 'CORNERS'),
    item(9, 'INSIDE', 'Inside clean, dry, no smell', 'INTERIOR'), item(10, 'PLACARDS', 'Placards and labels', 'OTHER'),
  ],
  VEHICLE: [
    item(21, 'BODY', 'Body panels', 'EXTERIOR'), item(22, 'GLASS', 'Glass and mirrors', 'EXTERIOR'), item(23, 'LIGHTS', 'Lights and indicators', 'EXTERIOR'),
    item(24, 'TYRES', 'Tyres and spare wheel', 'UNDERCARRIAGE'), item(25, 'SEATS', 'Seats and trim', 'INTERIOR'), item(26, 'DASH', 'Dashboard and radio', 'CABIN'),
    item(27, 'TOOLS', 'Jack, tools, triangle', 'ACCESSORIES'), item(28, 'ENGINE', 'Engine bay, no leaks', 'ENGINE'), item(29, 'DOCS', 'Documents in the car', 'DOCUMENTS'),
  ],
};

export type Finding = S<'InspectionFinding'>;
export type Insp = S<'Inspection'> & {
  siteId: number; unitNo: string; category: 'CONTAINER' | 'VEHICLE'; unitType: string; inspector: string; plateNo?: string;
  approvalNeeded?: boolean; approvedBy?: string; signatureMode?: 'SCREEN' | 'PAPER'; signedBy?: string;
};
let findingId = 40000;
const fd = (area: Finding['area'], zone: string, code: string, severity: Finding['severity'], sizeCm?: string, description?: string, isPreexisting = false): Finding => ({
  inspectionFindingId: ++findingId, area, locationDetail: zone, damageCode: code, severity, sizeCm, description, needsRepair: severity !== 'MINOR', isPreexisting, photoDocumentIds: [findingId * 10, findingId * 10 + 1],
});
const okAll = (cat: 'CONTAINER' | 'VEHICLE', bad: number[] = [], na: number[] = []): S<'InspectionResult'>[] =>
  checklists[cat].map((i) => ({ inspectionItemId: i.inspectionItemId, isOk: na.includes(i.inspectionItemId) ? null : !bad.includes(i.inspectionItemId), resultValue: na.includes(i.inspectionItemId) ? 'NA' : bad.includes(i.inspectionItemId) ? 'DAMAGED' : 'OK' }));

const ins = (id: number, s: Stay, o: Partial<Insp> & Pick<Insp, 'inspectionKind' | 'status'>): Insp => ({
  inspectionId: id, unitStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, siteId: s.siteId!, category: s.cargoUnit.category === 'VEHICLE' ? 'VEHICLE' : 'CONTAINER',
  unitType: s.cargoUnit.unitTypeCode, templateCode: s.cargoUnit.category === 'VEHICLE' ? 'VEH-STD-v3' : 'CTR-STD-v4', startedAt: at(1), inspector: 'Juma M.',
  results: [], findings: [], photoCount: 0, ...o,
});
const veh = vehiclesIn;
const u4410 = stay(5027)!;
export const inspections: Insp[] = [
  ins(1201, allStays[8], {
    inspectionKind: 'GATE_IN', status: 'COMPLETED', overallCondition: 'MAJOR_DAMAGE', startedAt: at(26.4), completedAt: at(26), approvalNeeded: true, photoCount: 9,
    eirNo: `EIR-DAR1-26-${allStays[8].unitStayId}`, signatureMode: 'SCREEN', signedBy: 'Driver Musa Rajabu', results: okAll('CONTAINER', [4, 7]),
    findings: [fd('WALLS', 'Left side', 'HO', 'MAJOR', '18 × 6', 'Puncture through the side panel near bay 3, light visible from inside'), fd('WALLS', 'Left side', 'DT', 'MINOR', '30 × 20', 'Dent above the hole'), fd('FLOOR', 'Floor', 'BR', 'MAJOR', '40 × 15', 'Plywood board split at the door end')],
    remarks: 'Line surveyor to attend. Unit kept on hold until the damage is approved.',
  }),
  ins(1202, u4410, { inspectionKind: 'GATE_IN', status: 'IN_PROGRESS', truckVisitId: 4410, plateNo: 'T 902 DMB', startedAt: at(0.35), inspector: 'Hamisi J.', results: okAll('CONTAINER').slice(0, 2), photoCount: 3, remarks: 'Seal ML-7781208 found, ML-7781203 expected. Photos of seal taken.' }),
  ins(1203, HERO, { inspectionKind: 'EXAM', status: 'PENDING', startedAt: at(-3.5), inspector: 'Juma M.', remarks: 'Joint exam with customs at X-01, 14:00. Record condition before and after.' }),
  ins(1204, HERO, { inspectionKind: 'GATE_IN', status: 'COMPLETED', overallCondition: 'SOUND', startedAt: at(204.8), completedAt: at(204.6), photoCount: 6, eirNo: `EIR-DAR1-26-${HERO.unitStayId}`, signatureMode: 'SCREEN', signedBy: 'Driver Abdallah K.', results: okAll('CONTAINER', [], [10]) }),
  ins(1205, stay(5008)!, { inspectionKind: 'GATE_OUT', status: 'COMPLETED', overallCondition: 'SOUND', truckVisitId: 4414, plateNo: 'T 230 DLX', startedAt: at(0.3), completedAt: at(0.15), photoCount: 5, inspector: 'Rose A.', signatureMode: 'SCREEN', signedBy: 'Driver Elia Mrema', results: okAll('CONTAINER', [], [10]) }),
  ins(1206, empties[3], { inspectionKind: 'PERIODIC', status: 'COMPLETED', overallCondition: 'MINOR_DAMAGE', startedAt: at(28), completedAt: at(27.7), photoCount: 4, results: okAll('CONTAINER', [5], [3, 10]), findings: [fd('WALLS', 'Front end', 'DT', 'MINOR', '25 × 25', 'Small dent, no puncture', true)] }),
  ins(1207, empties[7], { inspectionKind: 'PERIODIC', status: 'REINSPECT', overallCondition: 'MAJOR_DAMAGE', startedAt: at(50), completedAt: at(49.6), photoCount: 7, results: okAll('CONTAINER', [6, 8], [3, 10]), findings: [fd('ROOF', 'Roof', 'HO', 'MAJOR', '10 × 10', 'Rust hole over door header'), fd('CORNERS', 'Rear frame', 'BT', 'MAJOR', '', 'Rear right corner post bent')], remarks: 'Line asked for a second look after repair estimate EST-26-0412.' }),
  ins(1208, empties[12], { inspectionKind: 'GATE_IN', status: 'COMPLETED', overallCondition: 'SOUND', truckVisitId: 4398, plateNo: 'T 880 DFF', startedAt: at(4.9), completedAt: at(4.75), photoCount: 5, inspector: 'Rose A.', signatureMode: 'PAPER', results: okAll('CONTAINER', [], [3]) }),
  ins(1209, stay(5043)!, { inspectionKind: 'GATE_IN', status: 'PENDING', truckVisitId: 4413, plateNo: 'T 771 DGH', startedAt: at(0.6), inspector: '—' }),
  // vehicle yard (DAR2)
  ins(1210, veh[2], {
    inspectionKind: 'GATE_IN', status: 'COMPLETED', overallCondition: 'MINOR_DAMAGE', startedAt: at(30), completedAt: at(29.7), photoCount: 12, inspector: 'Neema K.',
    odometerKm: 84213, fuelLevel: '1/4', batteryOk: true, personalEffects: 'Child seat in the back, umbrella in the boot', signatureMode: 'SCREEN', signedBy: 'Driver Abdul Kombo',
    results: okAll('VEHICLE', [21]), findings: [fd('EXTERIOR', 'Left side', 'SC', 'MINOR', '40', 'Scratch along rear left door', true), fd('EXTERIOR', 'Front bumper', 'DT', 'MINOR', '8 × 5', 'Small dent under number plate', true)],
  }),
  ins(1211, veh[5], { inspectionKind: 'GATE_IN', status: 'IN_PROGRESS', startedAt: at(0.4), inspector: 'Neema K.', odometerKm: 112540, fuelLevel: 'E', results: okAll('VEHICLE').slice(0, 4), photoCount: 6, findings: [fd('EXTERIOR', 'Windscreen', 'CK', 'MAJOR', '25', 'Crack from lower left corner')] }),
  ins(1212, stay(v4416.units![1].unitStayId)!, { inspectionKind: 'GATE_OUT', status: 'PENDING', truckVisitId: 4416, plateNo: 'T 340 DRC', startedAt: at(0.2), inspector: '—' }),
];
for (const i of inspections) if (i.category === 'VEHICLE' && i.status === 'PENDING') Object.assign(i, { results: [] });

/* ================================================================== weighbridge */
export const TOLERANCE_PCT = 5;
export type Ticket = S<'Weighing'> & { plateNo: string; unitNo?: string; operator: string; status: 'OK' | 'OVERRIDE_PENDING' | 'OVERRIDDEN' | 'NO_DECLARED'; approvalNo?: string };
const tk = (id: number, o: Omit<Ticket, 'weighingId' | 'ticketNo' | 'netKg' | 'variancePct' | 'withinTolerance' | 'status'> & { status?: Ticket['status'] }): Ticket => {
  const net = o.grossKg && o.tareKg ? Number(o.grossKg) - Number(o.tareKg) : undefined;
  const compare = o.weighKind === 'VGM' ? Number(o.grossKg) - Number(o.tareKg ?? 0) + Number(o.containerTareKg ?? 0) : net;
  const variance = compare !== undefined && o.declaredKg ? ((compare - Number(o.declaredKg)) / Number(o.declaredKg)) * 100 : undefined;
  const within = variance === undefined ? undefined : Math.abs(variance) <= TOLERANCE_PCT;
  return {
    weighingId: id, ticketNo: `WT-DAR1-26-${id}`, netKg: net !== undefined ? String(net) : undefined,
    variancePct: variance !== undefined ? variance.toFixed(1) : undefined, withinTolerance: within,
    status: o.status ?? (variance === undefined ? 'NO_DECLARED' : within ? 'OK' : 'OVERRIDE_PENDING'), ...o,
  };
};
export const tickets: Ticket[] = [
  tk(5531, { weighKind: 'IN', truckVisitId: 4413, plateNo: 'T 771 DGH', unitNo: stay(5043)!.cargoUnit.unitNo, grossKg: '19840', tareKg: '15600', weighedAt: at(0.75), source: 'DEVICE', deviceRef: 'WB-01', operator: 'Ally S.' }),
  tk(5530, { weighKind: 'OUT', truckVisitId: 4412, plateNo: 'T 118 DPE', unitNo: stay(5005)!.cargoUnit.unitNo, grossKg: '31260', tareKg: '15800', declaredKg: '14200', weighedAt: at(0.5), source: 'DEVICE', deviceRef: 'WB-01', operator: 'Ally S.', status: 'OVERRIDE_PENDING', approvalNo: 'APR-26-00416' }),
  tk(5529, { weighKind: 'OUT', truckVisitId: 4414, plateNo: 'T 230 DLX', unitNo: stay(5008)!.cargoUnit.unitNo, grossKg: '36420', tareKg: '15900', declaredKg: '20100', weighedAt: at(0.2), source: 'DEVICE', deviceRef: 'WB-01', operator: 'Ally S.' }),
  tk(5528, { weighKind: 'IN', truckVisitId: 4410, plateNo: 'T 902 DMB', unitNo: u4410.cargoUnit.unitNo, grossKg: '38150', tareKg: '15400', declaredKg: '22400', weighedAt: at(0.5), source: 'DEVICE', deviceRef: 'WB-01', operator: 'Ally S.' }),
  tk(5527, { weighKind: 'VGM', unitStayId: inYard.find((s) => s.consignmentId === 107)?.unitStayId, plateNo: 'T 655 DQA', unitNo: inYard.find((s) => s.consignmentId === 107)?.cargoUnit.unitNo, grossKg: '41720', tareKg: '15500', containerTareKg: '3750', declaredKg: '29400', weighedAt: at(6), source: 'DEVICE', deviceRef: 'WB-01', operator: 'Ally S.' }),
  tk(5526, { weighKind: 'IN', truckVisitId: 4398, plateNo: 'T 880 DFF', unitNo: empties[12].cargoUnit.unitNo, grossKg: '18100', tareKg: '15300', weighedAt: at(4.9), source: 'MANUAL', operator: 'Ally S.' }),
  tk(5520, { weighKind: 'OUT', truckVisitId: 4390, plateNo: 'T 214 DHN', unitNo: inYard[44].cargoUnit.unitNo, grossKg: '33980', tareKg: '15700', declaredKg: '17000', weighedAt: at(22), source: 'DEVICE', deviceRef: 'WB-01', operator: 'Ally S.', status: 'OVERRIDDEN', approvalNo: 'APR-26-00405' }),
  tk(5510, { weighKind: 'VGM', plateNo: 'T 505 DJN', unitNo: inYard[48].cargoUnit.unitNo, grossKg: '42900', tareKg: '15600', containerTareKg: '3750', declaredKg: '28000', weighedAt: at(30), source: 'DEVICE', deviceRef: 'WB-01', operator: 'Ally S.', status: 'OVERRIDDEN', approvalNo: 'APR-26-00390' }),
];
export const WB_LIVE_KG = 32480;

/* ================================================================== vehicle keys (ICDV) */
export type Key = S<'KeyCustody'> & { hook?: number; vin: string; make: string; model: string; colour?: string; unitLocation?: string; movements: S<'KeyMovement'>[] };
let kmId = 88000;
const km = (action: S<'KeyMovement'>['action'], hrs: number, by: string, o: Partial<S<'KeyMovement'>> = {}): S<'KeyMovement'> => ({ keyMovementId: ++kmId, action, occurredAt: at(hrs), by, ...o });
const vehicleStays = allStays.filter((s) => s.cargoUnit.category === 'VEHICLE' && s.physicalStatus !== 'EXPECTED');
export const KEY_HOOKS = 32;
export const keys: Key[] = vehicleStays.map((s, i) => {
  const gated = s.gatedInAt ? (Date.parse('2026-10-07T07:30:00Z') - Date.parse(s.gatedInAt)) / 3600_000 : 100;
  const hook = i + 1;
  const base: S<'KeyMovement'>[] = [
    km('RECEIVE', gated, 'Gate · Rose A.', { toHolderName: 'Gate officer', reason: `From driver at gate-in, ${s.cargoUnit.make === 'MASSEY FERGUSON' ? '1 key' : '2 keys and remote'}` }),
    km('STORE', gated - 0.4, 'Yard · Neema K.', { toLocationId: 3000 + hook, reason: `Hook ${hook}` }),
  ];
  let status: Key['status'] = 'IN_CABINET'; let holder: string | undefined;
  if (s.physicalStatus === 'DEPARTED') {
    status = 'HANDED_OVER'; holder = 'Abdul Kombo (car carrier T 340 DRC)';
    base.push(km('ISSUE', gated - 30, 'Yard · Neema K.', { toHolderName: 'Shabani R. (yard driver)', reason: 'Drive to loading ramp' }), km('HAND_OVER', gated - 30.5, 'Gate · Hamisi J.', { toHolderName: holder, reason: 'Delivered with the vehicle, EIR signed' }));
  } else if (v4416.units!.some((u) => u.unitStayId === s.unitStayId)) {
    status = 'ISSUED'; holder = 'Neema K. (yard driver)';
    base.push(km('ISSUE', 0.6, 'Yard · Neema K.', { toHolderName: holder, reason: 'Pick for car carrier T 340 DRC' }));
  } else if (i === 9) {
    status = 'ISSUED'; holder = 'Juma M. (inspection)';
    base.push(km('ISSUE', 1.2, 'Yard · Neema K.', { toHolderName: holder, reason: 'Engine check for line survey' }));
  } else if (i === 14) {
    status = 'LOST'; holder = undefined;
    base.push(km('ISSUE', 26, 'Yard · Neema K.', { toHolderName: 'Shabani R. (yard driver)', reason: 'Relocate to V2' }), km('LOST', 20, 'Yard · Neema K.', { reason: 'Not returned after the move. Searched V2 and the driver room. Owner informed.' }));
  } else if (i % 5 === 2) {
    base.push(km('ISSUE', 40 - i, 'Yard · Neema K.', { toHolderName: 'Shabani R. (yard driver)', reason: 'Move to wash bay' }), km('RETURN', 39.5 - i, 'Yard · Neema K.', { toLocationId: 3000 + hook, reason: `Back on hook ${hook}` }));
  }
  return {
    keyCustodyId: 6100 + i, unitStayId: s.unitStayId!, keyTagNo: `KT-${String(2400 + i)}`, keyCount: s.cargoUnit.make === 'MASSEY FERGUSON' ? 1 : 2,
    hasRemote: s.cargoUnit.make !== 'MASSEY FERGUSON' && s.cargoUnit.make !== 'MITSUBISHI', status, holderName: holder,
    location: status === 'IN_CABINET' ? { yardLocationId: 3000 + hook, fullCode: `KC1-H${pad(hook)}` } : undefined,
    hook: status === 'HANDED_OVER' ? undefined : hook, vin: s.cargoUnit.unitNo, make: s.cargoUnit.make ?? '', model: s.cargoUnit.model ?? '', colour: s.cargoUnit.colour ?? undefined,
    unitLocation: s.currentLocation?.fullCode, movements: base.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  };
});

/* ================================================================== CFS (M5) */
export const contractors: S<'LabourContractor'>[] = [
  { labourContractorId: 41, contractorName: 'Umoja Labour Group', rateBasis: 'PER_PACKAGE', rate: '0.35', currency: 'USD', isActive: true },
  { labourContractorId: 42, contractorName: 'Bandari Casuals Cooperative', rateBasis: 'PER_TONNE', rate: '2.80', currency: 'USD', isActive: true },
  { labourContractorId: 43, contractorName: 'Mwenge Handling Crew', rateBasis: 'PER_JOB', rate: '120.00', currency: 'USD', isActive: true },
];
export type Job = S<'HandlingJob'> & { containerNo: string; containerType: string; consignmentRef: string; customer: string; lines: S<'HandlingJobLine'>[] };
const lots = allStays.filter((s) => s.cargoUnit.category === 'LOT');
const lcl = allStays.filter((s) => s.consignmentId === 109 && s.cargoUnit.category === 'CONTAINER' && s.physicalStatus === 'IN_YARD');
const exp = allStays.filter((s) => s.consignmentId === 107 && s.physicalStatus === 'IN_YARD');
let jlId = 77000;
const jl = (lineNo: number, marks: string, description: string, packageType: string, declared: number, counted: number, o: Partial<S<'HandlingJobLine'>> = {}): S<'HandlingJobLine'> => ({
  handlingJobLineId: ++jlId, lineNo, marksNumbers: marks, description, packageType, packagesDeclared: declared, packagesCounted: counted,
  shortQty: Math.max(0, declared - counted), excessQty: Math.max(0, counted - declared), damagedQty: 0, ...o,
});
const job = (id: number, c: Stay | undefined, o: Partial<Job> & Pick<Job, 'jobKind' | 'status' | 'lines'>): Job => ({
  handlingJobId: id, jobNo: `CFS-DAR1-26-${id}`, containerStayId: c?.unitStayId ?? 0, containerNo: c?.cargoUnit.unitNo ?? '—', containerType: c?.cargoUnit.unitTypeCode ?? '—',
  consignmentId: c?.consignmentId, consignmentRef: c?.unitSummary.consignmentRef ?? '—', customer: partyName(c?.consignmentId === 107 ? 10 : 1),
  workLocationId: 801, supervisorSub: 'Halima S.', ...o,
});
export const jobs: Job[] = [
  job(2201, lcl[0], {
    jobKind: 'DESTUFF', status: 'COMPLETED', plannedAt: at(6), startedAt: at(5.5), completedAt: at(3.2), labourContractorId: 41, labourCount: 8, equipmentId: 4,
    sealRemoved: lcl[0]?.sealNo, customsOfficerName: 'Rehema K. (TRA)', remarks: 'Four cartons short on line 2. Two pallets of water wrapped but crushed.',
    lines: [
      jl(1, 'MZ/SOL/1-60', 'Crates of solar panels', 'CRATE', 60, 60, { lotStayId: lots[0]?.unitStayId, lotUnitNo: lots[0]?.cargoUnit.unitNo, weightKg: '3120' }),
      jl(2, 'MZ/KIT/1-240', 'Cartons of kitchenware', 'CARTON', 240, 236, { lotStayId: lots[1]?.unitStayId, lotUnitNo: lots[1]?.cargoUnit.unitNo, weightKg: '2860' }),
      jl(3, 'AQUA/DSM/1-20', 'Pallets of bottled water', 'PALLET', 20, 20, { lotStayId: lots[2]?.unitStayId, lotUnitNo: lots[2]?.cargoUnit.unitNo, weightKg: '18200', damagedQty: 2, damageNote: 'Shrink wrap torn, 30 bottles crushed' }),
      jl(4, 'NO MARKS', 'Spare parts (unmanifested)', 'CARTON', 0, 3, { weightKg: '45' }),
    ],
  }),
  job(2202, lcl[1], {
    jobKind: 'DESTUFF', status: 'IN_PROGRESS', plannedAt: at(1.5), startedAt: at(1), labourContractorId: 42, labourCount: 6, equipmentId: 4, sealRemoved: lcl[1]?.sealNo, customsOfficerName: 'Rehema K. (TRA)',
    lines: [
      jl(1, 'MZ/SOL/61-120', 'Crates of solar panels', 'CRATE', 60, 41, { lotStayId: lots[3]?.unitStayId, lotUnitNo: lots[3]?.cargoUnit.unitNo }),
      jl(2, 'PW/HW/1-90', 'Cartons of hand tools', 'CARTON', 90, 0),
    ],
  }),
  job(2203, exp[0], {
    jobKind: 'STUFF', status: 'PLANNED', plannedAt: at(-3), labourContractorId: 43, labourCount: 10, equipmentId: 4, remarks: 'Stuff 320 bags of green coffee for Cape Albatross 318N. VGM after stuffing.',
    lines: [jl(1, 'NYOTA/AA/1-320', 'Green coffee beans, 60 kg jute bags', 'BAG', 320, 0, { weightKg: '19200' })],
  }),
  job(2204, exp[1], {
    jobKind: 'STUFF', status: 'APPROVED', plannedAt: at(28), startedAt: at(27), completedAt: at(24.5), labourContractorId: 43, labourCount: 10, equipmentId: 4, sealApplied: 'SCL-0448712',
    lines: [jl(1, 'NYOTA/AB/1-320', 'Green coffee beans, 60 kg jute bags', 'BAG', 320, 320, { weightKg: '19200' })],
  }),
  job(2205, lcl[2], {
    jobKind: 'DESTUFF', status: 'PLANNED', plannedAt: at(-20), labourContractorId: 41, labourCount: 8,
    lines: [jl(1, 'MZ/MIX/1-150', 'Mixed cartons', 'CARTON', 150, 0)],
  }),
];
export type Lot = S<'LotBalance'> & { description: string; consignmentRef: string; location?: string; deliveries: { at: string; qty: number; ref: string; plateNo: string }[] };
export const lotBalances: Lot[] = lots.map((s, i) => {
  const received = [60, 236, 20, 41][i] ?? 50;
  const deliveries = i === 0 ? [{ at: at(2), qty: 24, ref: 'RO-DAR1-26-01960', plateNo: 'T 448 DKA' }, { at: at(0.7), qty: 12, ref: 'RO-DAR1-26-01960', plateNo: 'T 448 DKA' }]
    : i === 2 ? [{ at: at(1.5), qty: 20, ref: 'RO-DAR1-26-01957', plateNo: 'T 301 DLM' }] : [];
  const delivered = deliveries.reduce((a, d) => a + d.qty, 0);
  const pkgWt = [52, 12, 910, 52][i] ?? 20;
  return {
    lotStayId: s.unitStayId!, unitNo: s.cargoUnit.unitNo, uom: ['CRATE', 'CARTON', 'PALLET', 'CRATE'][i] ?? 'PKG', packageType: ['Crate', 'Carton', 'Pallet', 'Crate'][i],
    qtyReceived: String(received), qtyDelivered: String(delivered), qtyBalance: String(received - delivered),
    weightReceivedKg: String(received * pkgWt), weightDeliveredKg: String(delivered * pkgWt),
    description: ['Crates of solar panels', 'Cartons of kitchenware', 'Pallets of bottled water', 'Crates of solar panels'][i] ?? s.cargoDescription ?? '', consignmentRef: s.unitSummary.consignmentRef ?? '—',
    location: s.currentLocation?.fullCode, deliveries,
  };
});

/* ================================================================== reefers (M5) */
export type Reefer = S<'ReeferSession'> & { unitNo: string; plugNo?: string; unitType: string; cargo: string; readings: S<'ReeferReading'>[]; alarm?: 'HIGH_TEMP' | 'POWER_OFF' | 'NO_READING' };
const reeferStays = allStays.filter((s) => s.reeferSetTempC && s.physicalStatus === 'IN_YARD');
let rrId = 120000;
export const reefers: Reefer[] = reeferStays.map((s, i) => {
  const plugged = !!s.currentLocation;
  const hrs = plugged ? 20 + ((i * 37) % 160) : 0;
  const set = Number(s.reeferSetTempC);
  const alarmHigh = i === 3, alarmPower = i === 11, stale = i === 19;
  const readings: S<'ReeferReading'>[] = [];
  if (plugged) {
    const n = 13;
    for (let k = n - 1; k >= 0; k--) {
      if (stale && k < 4) continue;
      let t = set + (Math.sin((i + k) * 1.3) * 0.5) + (rnd() - 0.5) * 0.3;
      if (alarmHigh && k < 4) t = set + (4 - k) * 1.6 + 0.4;
      if (alarmPower && k < 2) t = set + (2 - k) * 0.9;
      const temp = Math.round(t * 10) / 10;
      readings.push({
        reeferReadingId: ++rrId, readAt: at(k * 2 + 0.25), supplyTempC: String(temp), returnTempC: String(Math.round((temp + 1.1) * 10) / 10), setTempC: String(set),
        powerOn: !(alarmPower && k < 2), alarmCode: alarmHigh && k < 3 ? 'AL-HIGH' : alarmPower && k < 2 ? 'AL-POWER' : undefined,
        source: k % 3 === 0 ? 'MANUAL' : 'IOT', isOutOfRange: Math.abs(temp - set) > 2,
      });
    }
  }
  const p = s.currentLocation?.fullCode.split('-');
  return {
    reeferSessionId: 9300 + i, unitStayId: s.unitStayId!, plugLocationId: 4000 + i, setTempC: s.reeferSetTempC!, pluggedAt: at(hrs),
    meterStartKwh: plugged ? String(10400 + i * 211) : undefined, kwhUsed: plugged ? (hrs * (2.6 + (i % 4) * 0.2)).toFixed(1) : undefined,
    unitNo: s.cargoUnit.unitNo, plugNo: p ? `R${Number(p[1])}-${p[2]}${p[3] === '2' ? 'U' : 'L'}` : undefined, unitType: s.cargoUnit.unitTypeCode, cargo: s.cargoDescription ?? '',
    readings, alarm: alarmHigh ? 'HIGH_TEMP' : alarmPower ? 'POWER_OFF' : stale ? 'NO_READING' : undefined,
  };
});
export const REEFER_BAND = 2; // ± °C around the set point before an alarm

/* ================================================================== repairs, empty depot (M5) */
export const repairCodes: S<'RepairCode'>[] = [
  { repairCode: 'STR-DT', repairName: 'Straighten dent', defaultLabourHours: '1.5', isActive: true },
  { repairCode: 'PAT-WLD', repairName: 'Patch weld, steel insert', defaultLabourHours: '2.5', isActive: true },
  { repairCode: 'FLR-PLY', repairName: 'Replace floor plywood (per board)', defaultLabourHours: '3.0', isActive: true },
  { repairCode: 'DR-GSK', repairName: 'Replace door gasket', defaultLabourHours: '1.0', isActive: true },
  { repairCode: 'LB-STR', repairName: 'Straighten locking bar', defaultLabourHours: '0.8', isActive: true },
  { repairCode: 'CR-WLD', repairName: 'Corner post weld and straighten', defaultLabourHours: '4.0', isActive: true },
  { repairCode: 'RF-PAT', repairName: 'Roof patch', defaultLabourHours: '2.0', isActive: true },
  { repairCode: 'CLN-WSH', repairName: 'Sweep and wash inside', defaultLabourHours: '0.5', isActive: true },
  { repairCode: 'PNT-TCH', repairName: 'Paint touch-up', defaultLabourHours: '0.5', isActive: true },
  { repairCode: 'LBL-REM', repairName: 'Remove old labels and placards', defaultLabourHours: '0.3', isActive: true },
];
export const repairName = (c: string) => repairCodes.find((r) => r.repairCode === c)?.repairName ?? c;
export const LABOUR_RATE = 18; // USD per hour, agreed with the lines
export type Estimate = S<'RepairEstimate'> & { unitNo: string; unitType: string; lineCode: string; location?: string; lines: S<'RepairEstimateLine'>[] };
const LINE_TEMPLATES: [string, string, number, number, S<'RepairEstimateLine'>['responsibility']][][] = [
  [['PAT-WLD', 'Left side, panel 3', 1, 85, 'USER'], ['STR-DT', 'Left side, panel 3', 1, 0, 'USER'], ['FLR-PLY', 'Floor, door end', 2, 140, 'OWNER'], ['CLN-WSH', 'Inside', 1, 6, 'DEPOT']],
  [['DR-GSK', 'Right door', 1, 64, 'OWNER'], ['LB-STR', 'Left door, bar 2', 1, 0, 'USER']],
  [['RF-PAT', 'Roof over door header', 1, 70, 'OWNER'], ['CR-WLD', 'Rear right corner post', 1, 120, 'USER'], ['PNT-TCH', 'Roof', 1, 15, 'OWNER']],
  [['CLN-WSH', 'Inside', 1, 6, 'USER'], ['LBL-REM', 'Both sides', 4, 0, 'USER']],
  [['STR-DT', 'Front end', 1, 0, 'OWNER'], ['PNT-TCH', 'Front end', 1, 12, 'OWNER']],
];
const ESTIMATE_STATES: S<'RepairEstimate'>['status'][] = ['DRAFT', 'SENT', 'SENT', 'APPROVED', 'PARTIAL', 'COMPLETED', 'DRAFT', 'REJECTED', 'APPROVED', 'SENT'];
let relId = 99000;
export const estimates: Estimate[] = ESTIMATE_STATES.map((status, i) => {
  const s = i === 2 ? empties[7] : empties[(3 + i * 5) % empties.length];
  const tmpl = LINE_TEMPLATES[[4, 1, 2, 0, 3][i % 5]];
  const lines: S<'RepairEstimateLine'>[] = tmpl.map(([code, loc, qty, mat, resp], k) => {
    const hrs = Number(repairCodes.find((r) => r.repairCode === code)!.defaultLabourHours) * qty;
    const lineStatus: S<'RepairEstimateLine'>['lineStatus'] = status === 'APPROVED' ? 'APPROVED' : status === 'COMPLETED' ? 'DONE' : status === 'REJECTED' ? 'REJECTED' : status === 'PARTIAL' ? (k === 0 ? 'REJECTED' : 'APPROVED') : 'PROPOSED';
    return { repairEstimateLineId: ++relId, lineNo: k + 1, repairCode: code, locationDetail: loc, quantity: String(qty), labourHours: hrs.toFixed(1), labourCost: money(hrs * LABOUR_RATE), materialCost: money(mat), responsibility: resp, lineStatus };
  });
  const tl = lines.reduce((a, l) => a + Number(l.labourCost), 0), tm = lines.reduce((a, l) => a + Number(l.materialCost), 0);
  const line = s.linePartyId ?? 4;
  return {
    repairEstimateId: 410 + i, estimateNo: `EST-26-0${410 + i}`, unitStayId: s.unitStayId!, inspectionId: i === 0 ? 1206 : i === 2 ? 1207 : undefined,
    approverPartyId: line, currency: 'USD', labourRate: String(LABOUR_RATE), totalLabour: money(tl), totalMaterial: money(tm), totalAmount: money(tl + tm), status,
    sentAt: status !== 'DRAFT' ? at(30 + i * 7) : undefined, approverRef: ['APPROVED', 'PARTIAL', 'COMPLETED', 'REJECTED'].includes(status!) ? `${LINE_CODES[line]}-MNR-${int(2000, 9999)}` : undefined,
    decidedAt: ['APPROVED', 'PARTIAL', 'COMPLETED', 'REJECTED'].includes(status!) ? at(20 + i * 3) : undefined, completedAt: status === 'COMPLETED' ? at(5) : undefined,
    createdAt: at(40 + i * 8), unitNo: s.cargoUnit.unitNo, unitType: s.cargoUnit.unitTypeCode, lineCode: LINE_CODES[line] ?? '—', location: s.currentLocation?.fullCode, lines,
  };
});
