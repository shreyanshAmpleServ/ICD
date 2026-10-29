import { useMemo, useState } from 'react';
import { Page, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { day } from '@/mock/gen';
import { APPT_TYPES, HOURS, appointments, ruleFor, type Appt } from '@/mock/ops';
import { appointmentsApi } from '../api';
import { AppointmentsHeader } from './AppointmentsHeader';
import { AppointmentsDaySelector } from './AppointmentsDaySelector';
import { DepotClosedPanel } from './DepotClosedPanel';
import { AppointmentsKpiStrip } from './AppointmentsKpiStrip';
import { AppointmentsSlotMatrix } from './AppointmentsSlotMatrix';
import { AppointmentsTable } from './AppointmentsTable';
import { AppointmentsRulesPanel } from './AppointmentsRulesPanel';
import { BookAppointmentDrawer } from './BookAppointmentDrawer';
import { weekday, dayLabel, hh, type SlotSelection, type StatusFilter } from '../types';

export function AppointmentsView() {
  const toast = useToast();
  const { data: dbAppts = [], refetch } = useQ<Appt[]>(['appointments'], async () => {
    try {
      const res = await appointmentsApi.getAppointments();
      return Array.isArray(res) && res.length > 0 ? (res as Appt[]) : appointments;
    } catch {
      return appointments;
    }
  });
  const data: Appt[] = Array.isArray(dbAppts) && dbAppts.length > 0 ? (dbAppts as Appt[]) : appointments;
  const [extra, setExtra] = useState<Appt[]>([]);
  const [changed, setChanged] = useState<Record<number, Appt['status']>>({});
  const [date, setDate] = useState(day(0));
  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [bookOpen, setBookOpen] = useState(false);

  // Combine live data, client-booked items, and status overrides
  const all = useMemo(
    () => [...data, ...extra].map((a) => (changed[a.appointmentId!] ? { ...a, status: changed[a.appointmentId!] } : a)),
    [data, extra, changed]
  );

  const days = Array.from({ length: 8 }, (_, i) => day(i - 1));
  const wd = weekday(date);
  const ofDay = all.filter((a) => a.date === date);
  const live = (a: Appt) => a.status !== 'CANCELLED';

  const booked = (t: string, h: number) =>
    ofDay.filter((a) => a.visitTypeCode === t && a.hour === h && live(a)).length;

  const cap = (t: string, h: number) => {
    const r = ruleFor(wd, t);
    return r && h < Number(r.slotEnd.slice(0, 2)) ? r.capacityTrucks : 0;
  };

  const totalCap = APPT_TYPES.reduce((a, t) => a + HOURS.reduce((b, h) => b + cap(t, h), 0), 0);
  const totalBooked = ofDay.filter(live).length;

  const list = ofDay
    .filter((a) => !slot || (a.visitTypeCode === slot.t && a.hour === slot.h))
    .filter((a) => filter === 'all' || a.status === filter || (filter === 'ARRIVED' && a.status === 'COMPLETED'))
    .sort((a, b) => a.slotStart.localeCompare(b.slotStart) || a.visitTypeCode.localeCompare(b.visitTypeCode));

  const setStatus = async (a: Appt, s: Appt['status'], msg: string) => {
    try {
      if (a.appointmentId && s) {
        await appointmentsApi.updateAppointmentStatus(a.appointmentId, s);
      }
    } catch {}
    setChanged((c) => ({ ...c, [a.appointmentId!]: s }));
    toast(msg);
    refetch();
  };

  return (
    <Page wide>
      {/* 1. Header with title, badge & Book Appointment action */}
      <AppointmentsHeader onBook={() => setBookOpen(true)} />

      <div className="stack-lg">
        {/* 2. 8-Day rolling date selector */}
        <AppointmentsDaySelector
          days={days}
          date={date}
          all={all}
          live={live}
          weekday={weekday}
          dayLabel={dayLabel}
          today={day(0)}
          onSelectDate={(d) => {
            setDate(d);
            setSlot(null);
          }}
        />

        {wd === 0 ? (
          /* Closed state on Sundays */
          <DepotClosedPanel />
        ) : (
          <>
            {/* 3. KPI summary metrics */}
            <AppointmentsKpiStrip
              totalBooked={totalBooked}
              totalCap={totalCap}
              ofDay={ofDay}
              date={date}
              today={day(0)}
            />

            {/* 4. Hourly Slot Heatmap Matrix (06:00 - 22:00) */}
            <AppointmentsSlotMatrix
              date={date}
              dayLabel={dayLabel}
              slot={slot}
              onToggleSlot={(s) => setSlot(s)}
              cap={cap}
              booked={booked}
              hh={hh}
            />

            {/* 5. Bookings Data Table & Slot Rules side-by-side */}
            <div className="grid-main-side ops-gms">
              <style>{'.ops-gms > * { min-width: 0; }'}</style>
              <AppointmentsTable
                list={list}
                filter={filter}
                onFilterChange={setFilter}
                slot={slot}
                hh={hh}
                onCancel={(a) => setStatus(a, 'CANCELLED', `Appointment ${a.appointmentNo} cancelled`)}
                onClearSlot={() => setSlot(null)}
              />
              <AppointmentsRulesPanel />
            </div>
          </>
        )}
      </div>

      {/* 6. Slide-over drawer to book an appointment */}
      <BookAppointmentDrawer
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        date={wd === 0 ? day(1) : date}
        booked={booked}
        cap={cap}
        onBook={async (a) => {
          try {
            await appointmentsApi.createAppointment(a);
          } catch {}
          setExtra((x) => [...x, a]);
          setDate(a.date);
          refetch();
        }}
      />
    </Page>
  );
}

export { AppointmentsView as Appointments };
