import { Kpi, Meter } from '@/ds/components';
import type { Appt } from '@/mock/ops';

interface AppointmentsKpiStripProps {
  totalBooked: number;
  totalCap: number;
  ofDay: Appt[];
  date: string;
  today: string;
}

export function AppointmentsKpiStrip({
  totalBooked,
  totalCap,
  ofDay,
  date,
  today,
}: AppointmentsKpiStripProps) {
  const arrivedCount = ofDay.filter((a) => a.status === 'ARRIVED' || a.status === 'COMPLETED').length;
  const noShowsCount = ofDay.filter((a) => a.status === 'MISSED').length;
  const cancelledCount = ofDay.filter((a) => a.status === 'CANCELLED').length;
  const portalPct = Math.round(
    (ofDay.filter((a) => a.bookedVia === 'PORTAL').length / Math.max(1, ofDay.length)) * 100
  );

  return (
    <div className="kpi-strip">
      <Kpi label="Booked" value={totalBooked} unit={`of ${totalCap}`}>
        <Meter pct={(totalBooked / Math.max(1, totalCap)) * 100} label="Capacity used" />
      </Kpi>
      <Kpi label="Arrived" value={arrivedCount} />
      <Kpi
        label="No shows"
        value={noShowsCount}
        delta={date <= today ? 'Slot passed + grace' : 'None yet'}
      />
      <Kpi label="Cancelled" value={cancelledCount} />
      <Kpi label="Booked via portal" value={`${portalPct}`} unit="%" />
    </div>
  );
}
