import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Settings2, X } from 'lucide-react';
import {
  Banner, Button, Chips, DataTable, Drawer, Empty, Field, Input, Kpi, Meter, Page, PageHeader, Panel, Pill, Select, cx, fmtT, useToast,
} from '@/ds/components';
import type { Tone } from '@/ds/status';
import { useQ, delay } from '@/api/query';
import { partyName } from '@/mock/core';
import { VISIT_TYPES } from '@/mock/gate';
import { day } from '@/mock/gen';
import { APPT_TYPES, HOURS, appointments, ruleFor, slotRules, type Appt } from '@/mock/ops';

/* Appointments (M5): GET /appointments/availability?date= for the grid and
   GET /appointments for the bookings. Capacity comes from the slot rules per
   weekday and visit type; a full slot refuses new bookings. */
const STATUS: Record<string, [string, Tone]> = {
  BOOKED: ['Booked', 'info'], ARRIVED: ['Arrived', 'go'], COMPLETED: ['Completed', 'idle'], MISSED: ['No show', 'stop'], CANCELLED: ['Cancelled', 'idle'],
};
const weekday = (date: string) => new Date(date + 'T12:00:00+03:00').getUTCDay();
const dayLabel = (date: string) => new Date(date + 'T12:00:00+03:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Africa/Dar_es_Salaam' });
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
type StatusFilter = 'all' | 'BOOKED' | 'ARRIVED' | 'MISSED' | 'CANCELLED';

export function Appointments() {
  const toast = useToast();
  const { data = [] } = useQ(['appointments'], () => delay(appointments));
  const [extra, setExtra] = useState<Appt[]>([]);
  const [changed, setChanged] = useState<Record<number, Appt['status']>>({});
  const [date, setDate] = useState(day(0));
  const [slot, setSlot] = useState<{ t: string; h: number } | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [bookOpen, setBookOpen] = useState(false);

  const all = useMemo(() => [...data, ...extra].map((a) => (changed[a.appointmentId!] ? { ...a, status: changed[a.appointmentId!] } : a)), [data, extra, changed]);
  const days = Array.from({ length: 8 }, (_, i) => day(i - 1));
  const wd = weekday(date);
  const ofDay = all.filter((a) => a.date === date);
  const live = (a: Appt) => a.status !== 'CANCELLED';
  const booked = (t: string, h: number) => ofDay.filter((a) => a.visitTypeCode === t && a.hour === h && live(a)).length;
  const cap = (t: string, h: number) => { const r = ruleFor(wd, t); return r && h < Number(r.slotEnd.slice(0, 2)) ? r.capacityTrucks : 0; };
  const totalCap = APPT_TYPES.reduce((a, t) => a + HOURS.reduce((b, h) => b + cap(t, h), 0), 0);
  const totalBooked = ofDay.filter(live).length;

  const list = ofDay
    .filter((a) => !slot || (a.visitTypeCode === slot.t && a.hour === slot.h))
    .filter((a) => filter === 'all' || a.status === filter || (filter === 'ARRIVED' && a.status === 'COMPLETED'))
    .sort((a, b) => a.slotStart.localeCompare(b.slotStart) || a.visitTypeCode.localeCompare(b.visitTypeCode));

  const setStatus = (a: Appt, s: Appt['status'], msg: string) => { setChanged((c) => ({ ...c, [a.appointmentId!]: s })); toast(msg); };

  return (
    <Page wide>
      <PageHeader title="Appointments" ms="M5" sub="Truck booking slots per hour and visit type. Agents book through the portal; the desk books for walk-in calls."
        actions={<Button variant="primary" icon={<CalendarPlus />} perm="appointment.book" onClick={() => setBookOpen(true)}>Book appointment</Button>} />

      <div className="stack-lg">
        <div className="chipset" role="group" aria-label="Day">
          {days.map((d) => {
            const closed = weekday(d) === 0;
            const n = all.filter((a) => a.date === d && live(a)).length;
            return (
              <button key={d} className="chip" aria-pressed={d === date} onClick={() => { setDate(d); setSlot(null); }} style={{ height: 40, borderRadius: 8 }}>
                {d === day(0) ? 'Today' : dayLabel(d)}<span className="count">{closed ? 'closed' : n}</span>
              </button>
            );
          })}
        </div>

        {wd === 0 ? (
          <Panel><Empty title="The depot is closed on Sundays">No slots are open. Pick another day, or change the slot rules if Sunday work is agreed.</Empty></Panel>
        ) : (
          <>
            <div className="kpi-strip">
              <Kpi label="Booked" value={totalBooked} unit={`of ${totalCap}`}><Meter pct={(totalBooked / Math.max(1, totalCap)) * 100} label="Capacity used" /></Kpi>
              <Kpi label="Arrived" value={ofDay.filter((a) => a.status === 'ARRIVED' || a.status === 'COMPLETED').length} />
              <Kpi label="No shows" value={ofDay.filter((a) => a.status === 'MISSED').length} delta={date <= day(0) ? 'Slot passed + grace' : 'None yet'} />
              <Kpi label="Cancelled" value={ofDay.filter((a) => a.status === 'CANCELLED').length} />
              <Kpi label="Booked via portal" value={`${Math.round((ofDay.filter((a) => a.bookedVia === 'PORTAL').length / Math.max(1, ofDay.length)) * 100)}`} unit="%" />
            </div>

            <Panel title={`Slots on ${dayLabel(date)}`} sub="Booked / capacity per hour. Select a slot to see its bookings." flush
              actions={slot && <Button size="sm" variant="ghost" icon={<X />} onClick={() => setSlot(null)}>Show all slots</Button>}>
              <div className="table-wrap">
                <table className="dt" style={{ minWidth: 860 }}>
                  <thead><tr><th style={{ width: 150 }}>Visit type</th>{HOURS.map((h) => <th key={h} style={{ textAlign: 'center' }}>{hh(h)}</th>)}</tr></thead>
                  <tbody>
                    {APPT_TYPES.map((t) => (
                      <tr key={t}>
                        <td className="strong small">{VISIT_TYPES[t]}</td>
                        {HOURS.map((h) => {
                          const c = cap(t, h); const b = booked(t, h);
                          const sel = slot?.t === t && slot.h === h;
                          if (!c) return <td key={h} className="xs faint" style={{ textAlign: 'center' }}>closed</td>;
                          return (
                            <td key={h} style={{ padding: 4 }}>
                              <button onClick={() => setSlot(sel ? null : { t, h })} aria-pressed={sel} aria-label={`${VISIT_TYPES[t]} ${hh(h)}: ${b} of ${c} booked`}
                                className={cx('btn', 'btn-sm')} style={{ width: '100%', flexDirection: 'column', alignItems: 'stretch', gap: 4, height: 'auto', padding: '6px 8px', borderColor: sel ? 'var(--ink)' : undefined, borderWidth: sel ? 2 : 1 }}>
                                <span className="small" style={{ fontVariantNumeric: 'tabular-nums', color: b >= c ? 'var(--stop)' : undefined }}>{b}/{c}{b >= c && <span className="xs"> full</span>}</span>
                                <Meter pct={(b / c) * 100} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid-main-side ops-gms">
          <style>{'.ops-gms > * { min-width: 0; }'}</style>
              <Panel flush title={slot ? `Bookings · ${VISIT_TYPES[slot.t]} ${hh(slot.h)}` : 'Bookings'} sub={`${list.length} shown`}
                actions={<Chips<StatusFilter> value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'BOOKED', label: 'Booked' }, { id: 'ARRIVED', label: 'Arrived' }, { id: 'MISSED', label: 'No show' }, { id: 'CANCELLED', label: 'Cancelled' }]} />}>
                <DataTable rows={list} rowKey={(a) => a.appointmentId!} dense
                  empty={<Empty title="No bookings match">Clear the slot or status filter, or book a truck into a free slot.</Empty>}
                  cols={[
                    { key: 'time', header: 'Slot', render: (a) => <span className="strong">{fmtT(a.slotStart)}</span> },
                    { key: 'plate', header: 'Truck', render: (a) => <><span className="unitno unitno-sm">{a.plateNo}</span><div className="xs faint">{a.driverName}</div></> },
                    { key: 'co', header: 'Company', render: (a) => <span className="small">{partyName(a.transporterPartyId)}</span> },
                    { key: 'type', header: 'Visit type', render: (a) => <span className="small">{VISIT_TYPES[a.visitTypeCode]}</span> },
                    { key: 'ref', header: 'Reference', render: (a) => <span className="small nowrap">{a.refNo}<div className="xs faint">{a.appointmentNo} · {a.bookedVia?.toLowerCase()}</div></span> },
                    { key: 'st', header: 'Status', render: (a) => <Pill tone={STATUS[a.status!][1]}>{STATUS[a.status!][0]}</Pill> },
                    { key: 'act', header: '', render: (a) => a.truckVisitId ? <Link className="small" to={`/gate/visits/${a.truckVisitId}`}>Open visit</Link>
                      : a.status === 'BOOKED' ? <Button size="sm" variant="ghost" perm="appointment.book" onClick={() => setStatus(a, 'CANCELLED', `Appointment ${a.appointmentNo} cancelled`)}>Cancel</Button> : null },
                  ]} />
              </Panel>
              <Panel title="Slot rules" sub="Trucks per hour, by visit type" actions={<Button size="sm" icon={<Settings2 />} perm="appointment.manage">Edit rules</Button>}>
                <div className="stack">
                  <table className="dt" style={{ fontSize: 13 }}>
                    <thead><tr><th>Visit type</th><th>Mon–Fri</th><th>Sat</th></tr></thead>
                    <tbody>
                      {APPT_TYPES.map((t) => {
                        const wk = slotRules.find((r) => r.weekday === 1 && r.visitTypeCode === t)!;
                        const sat = slotRules.find((r) => r.weekday === 6 && r.visitTypeCode === t)!;
                        return (
                          <tr key={t}>
                            <td className="small">{VISIT_TYPES[t]}<div className="xs faint">Late grace {wk.lateGraceMin} min</div></td>
                            <td className="small">{wk.capacityTrucks}/h<div className="xs faint">{wk.slotStart}–{wk.slotEnd}</div></td>
                            <td className="small">{sat.capacityTrucks}/h<div className="xs faint">{sat.slotStart}–{sat.slotEnd}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <ul className="list-plain small muted stack" style={{ gap: 6 }}>
                    <li>Sunday and public holidays: closed.</li>
                    <li>A truck more than the grace late is a no show; the slot goes back to the pool.</li>
                    <li>Import pick-ups need an approved release order to book.</li>
                  </ul>
                </div>
              </Panel>
            </div>
          </>
        )}
      </div>

      <BookAppointment open={bookOpen} onClose={() => setBookOpen(false)} date={wd === 0 ? day(1) : date} booked={booked} cap={cap}
        onBook={(a) => { setExtra((x) => [...x, a]); setDate(a.date); }} />
    </Page>
  );
}

function BookAppointment({ open, onClose, date, booked, cap, onBook }: {
  open: boolean; onClose: () => void; date: string; booked: (t: string, h: number) => number; cap: (t: string, h: number) => number; onBook: (a: Appt) => void;
}) {
  const toast = useToast();
  const [t, setT] = useState<string>('IMPORT_PICKUP');
  const [h, setH] = useState(13);
  const [co, setCo] = useState('7');
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [ref, setRef] = useState('');
  const c = cap(t, h), b = booked(t, h);
  const full = c > 0 && b >= c;
  const plateOk = /^T\s?\d{3}\s?[A-Z]{3}$/.test(plate.trim().toUpperCase());
  const refOk = t !== 'IMPORT_PICKUP' || /^RO-/.test(ref.trim().toUpperCase());
  const ok = c > 0 && !full && plateOk && driver.trim().length > 2 && refOk;
  return (
    <Drawer open={open} onClose={onClose} title={`Book an appointment · ${dayLabel(date)}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={<CalendarPlus />} disabled={!ok} onClick={() => {
          const start = new Date(`${date}T${hh(h)}:00+03:00`);
          onBook({ appointmentId: 90000 + Math.round(start.getTime() / 60000) % 9999, appointmentNo: `AP-26-${19000 + h * 10}`, visitTypeCode: t, slotStart: start.toISOString(), slotEnd: new Date(start.getTime() + 3600_000).toISOString(), transporterPartyId: Number(co), status: 'BOOKED', bookedVia: 'DESK', plateNo: plate.toUpperCase(), driverName: driver, refNo: ref.toUpperCase() || undefined, date, hour: h });
          toast(`Appointment booked for ${plate.toUpperCase()} at ${hh(h)}`); onClose();
        }}>Book appointment</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Visit type" required><Select value={t} onChange={(e) => setT(e.target.value)} options={APPT_TYPES.map((x) => [x, VISIT_TYPES[x]])} /></Field>
          <Field label="Slot" required error={c === 0 ? 'Closed at this hour' : full ? `Full: ${b} of ${c} booked. Pick another hour.` : undefined} hint={c ? `${c - b} of ${c} free` : undefined}>
            <Select value={String(h)} onChange={(e) => setH(Number(e.target.value))} options={HOURS.map((x) => {
              const cc = cap(t, x), bb = booked(t, x);
              return [String(x), `${hh(x)}–${hh(x + 1)} · ${cc ? (bb >= cc ? 'full' : `${cc - bb} free`) : 'closed'}`];
            })} />
          </Field>
        </div>
        <Field label="Transporter" required><Select value={co} onChange={(e) => setCo(e.target.value)} options={[['7', partyName(7)], ['8', partyName(8)], ['11', partyName(11)], ['2', partyName(2)]]} /></Field>
        <div className="form-grid">
          <Field label="Truck plate" required error={plate && !plateOk ? 'Tanzanian plate like T 412 DKL' : undefined}><Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="T 412 DKL" /></Field>
          <Field label="Driver" required><Input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="Full name" /></Field>
        </div>
        <Field label={t === 'IMPORT_PICKUP' ? 'Release order' : t === 'EXPORT_DROP' ? 'Booking number' : 'Empty release / return ref.'} required={t === 'IMPORT_PICKUP'}
          error={ref && !refOk ? 'Import pick-ups need a release order number (RO-…)' : undefined}>
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t === 'IMPORT_PICKUP' ? 'RO-DAR1-26-01942' : 'Optional'} />
        </Field>
        {t === 'IMPORT_PICKUP' && <Banner tone="wait">The release is checked again when the truck reaches the inner gate out. Booking a slot does not release the unit.</Banner>}
        <p className="xs faint">The driver gets an SMS with the slot and a QR. Arriving more than the grace period late counts as a no show.</p>
      </div>
    </Drawer>
  );
}
