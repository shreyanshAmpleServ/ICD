import { useMemo, useState } from 'react';
import { Page, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { APPT_TYPES, HOURS } from '@/mock/ops';
import { appointmentsApi } from './api';
import { AppointmentsHeader } from './components/AppointmentsHeader';
import { AppointmentsDaySelector } from './components/AppointmentsDaySelector';
import { DepotClosedPanel } from './components/DepotClosedPanel';
import { AppointmentsKpiStrip } from './components/AppointmentsKpiStrip';
import { AppointmentsSlotMatrix } from './components/AppointmentsSlotMatrix';
import { AppointmentsTable } from './components/AppointmentsTable';
import { AppointmentsRulesPanel } from './components/AppointmentsRulesPanel';
import { BookAppointmentDrawer } from './components/BookAppointmentDrawer';
import { weekday, dayLabel, hh, type SlotSelection, type StatusFilter, type Appt } from './types';

export { appointmentsApi } from './api';
export * from './types';

export function AppointmentsView() {
  const toast = useToast();
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { data: dbAppts = [], isLoading: apptsLoading, refetch } = useQ<Appt[]>(['appointments'], async () => {
    try {
      const res = await appointmentsApi.getAppointments();
      return Array.isArray(res) ? (res as Appt[]) : [];
    } catch {
      return [];
    }
  });

  const { data: slotRules = [] } = useQ<any[]>(['appointment-slot-rules'], async () => {
    try {
      const res = await appointmentsApi.getSlotRules();
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  });

  const data: Appt[] = Array.isArray(dbAppts) ? (dbAppts as Appt[]) : [];
  const [extra, setExtra] = useState<Appt[]>([]);
  const [changed, setChanged] = useState<Record<number, Appt['status']>>({});
  const [date, setDate] = useState(todayStr);
  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [bookOpen, setBookOpen] = useState(false);

  // Combine live data, client-booked items, and status overrides
  const all = useMemo(
    () => [...data, ...extra].map((a) => (changed[a.appointmentId!] ? { ...a, status: changed[a.appointmentId!] } : a)),
    [data, extra, changed]
  );

  const days = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(base.getTime() + (i - 1) * 86400000);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const wd = weekday(date);
  const ofDay = all.filter((a) => a.date === date);
  const live = (a: Appt) => a.status !== 'CANCELLED';

  const booked = (t: string, h: number) =>
    ofDay.filter((a) => a.visitTypeCode === t && a.hour === h && live(a)).length;

  const cap = (t: string, h: number) => {
    if (wd === 0) return 0; // Depot closed on Sundays
    const rule =
      slotRules.find((r) => r.weekday === wd && r.visitTypeCode === t) ||
      slotRules.find((r) => r.visitTypeCode === t && r.weekday === 1);
    if (!rule) {
      return h >= 6 && h < 22 ? 6 : 0;
    }
    const startH = parseInt(String(rule.slotStart).slice(0, 2), 10) || 6;
    const endH = parseInt(String(rule.slotEnd).slice(0, 2), 10) || 22;
    return h >= startH && h < endH ? Number(rule.capacityTrucks) : 0;
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
    } catch { }
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
          today={todayStr}
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
              today={todayStr}
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
                loading={apptsLoading}
                list={list}
                filter={filter}
                onFilterChange={setFilter}
                slot={slot}
                hh={hh}
                onCancel={(a) => setStatus(a, 'CANCELLED', `Appointment ${a.appointmentNo} cancelled`)}
                onClearSlot={() => setSlot(null)}
              />
              <AppointmentsRulesPanel rules={slotRules} />
            </div>
          </>
        )}
      </div>

      {/* 6. Slide-over drawer to book an appointment */}
      <BookAppointmentDrawer
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        date={wd === 0 ? days[2] || todayStr : date}
        booked={booked}
        cap={cap}
        onBook={(a) => {
          setExtra((x) => [...x, a]);
          setDate(a.date);
          refetch();
        }}
      />
    </Page>
  );
}

export { AppointmentsView as Appointments };
export default AppointmentsView;
