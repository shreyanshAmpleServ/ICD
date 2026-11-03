import { useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Select, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { VISIT_TYPES } from '@/features/gate-management/types';
import { APPT_TYPES, HOURS } from '@/mock/ops';
import { appointmentsApi } from '../api';
import type { Appt } from '../types';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const dayLabel = (date: string) =>
  new Date(date + 'T12:00:00+03:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Africa/Dar_es_Salaam',
  });

export function BookAppointmentDrawer({
  open,
  onClose,
  date,
  booked,
  cap,
  onBook,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  booked: (t: string, h: number) => number;
  cap: (t: string, h: number) => number;
  onBook: (a: Appt) => void;
}) {
  const toast = useToast();
  const [t, setT] = useState<string>('IMPORT_PICKUP');
  const [h, setH] = useState(13);
  const [co, setCo] = useState<string>('');
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [ref, setRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: parties = [] } = useQ<any[]>(['parties-appointments'], () => appointmentsApi.getParties());

  useEffect(() => {
    if (parties.length > 0 && !co) {
      const firstId = String(parties[0].partyId || parties[0].party_id || parties[0].id || '1');
      setCo(firstId);
    }
  }, [parties, co]);

  const c = cap(t, h),
    b = booked(t, h);
  const full = c > 0 && b >= c;
  const plateOk = /^T\s?\d{3}\s?[A-Z]{3}$/i.test(plate.trim());
  const refOk = t !== 'IMPORT_PICKUP' || /^RO-/i.test(ref.trim());
  const ok = c > 0 && !full && plateOk && driver.trim().length > 2 && refOk && !isSubmitting;

  const partyOptions: [string, string][] = parties.length > 0
    ? parties.map((p: any) => [
        String(p.partyId || p.party_id || p.id),
        p.partyName || p.party_name || p.name || `Party #${p.partyId || p.party_id}`,
      ])
    : [['1', 'General Transporter']];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Book an appointment · ${dayLabel(date)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CalendarPlus />}
            disabled={!ok}
            onClick={async () => {
              setIsSubmitting(true);
              const start = new Date(`${date}T${hh(h)}:00+03:00`);
              const end = new Date(start.getTime() + 3600_000);
              const apptPayload = {
                siteId: 1,
                visitTypeCode: t,
                slotStart: start.toISOString(),
                slotEnd: end.toISOString(),
                transporterPartyId: Number(co) || undefined,
                partyId: Number(co) || undefined,
                truckPlate: plate.trim().toUpperCase(),
                driverName: driver.trim(),
                refNo: ref.trim().toUpperCase() || undefined,
                bookedVia: 'DESK',
                status: 'BOOKED',
              };

              try {
                const res = await appointmentsApi.createAppointment(apptPayload);
                const bookedItem: Appt = {
                  appointmentId: res.appointmentId || (90000 + (Math.round(start.getTime() / 60000) % 9999)),
                  appointmentNo: res.appointmentNo || `AP-26-${19000 + h * 10}`,
                  visitTypeCode: t,
                  slotStart: start.toISOString(),
                  slotEnd: end.toISOString(),
                  transporterPartyId: Number(co) || 1,
                  partyName: parties.find((p) => String(p.partyId || p.party_id) === String(co))?.partyName,
                  status: 'BOOKED',
                  bookedVia: 'DESK',
                  plateNo: plate.toUpperCase(),
                  driverName: driver,
                  refNo: ref.toUpperCase() || undefined,
                  date,
                  hour: h,
                };
                onBook(bookedItem);
                toast(`Appointment booked for ${plate.toUpperCase()} at ${hh(h)}`);
                onClose();
              } catch (err: any) {
                toast(`Failed to book appointment: ${err?.message || 'Error'}`);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? 'Booking...' : 'Book appointment'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Visit type" required>
            <Select value={t} onChange={(e) => setT(e.target.value)} options={APPT_TYPES.map((x) => [x, VISIT_TYPES[x] || x])} />
          </Field>
          <Field
            label="Slot"
            required
            error={c === 0 ? 'Closed at this hour' : full ? `Full: ${b} of ${c} booked. Pick another hour.` : undefined}
            hint={c ? `${c - b} of ${c} free` : undefined}
          >
            <Select
              value={String(h)}
              onChange={(e) => setH(Number(e.target.value))}
              options={HOURS.map((x) => {
                const cc = cap(t, x),
                  bb = booked(t, x);
                return [String(x), `${hh(x)}–${hh(x + 1)} · ${cc ? (bb >= cc ? 'full' : `${cc - bb} free`) : 'closed'}`];
              })}
            />
          </Field>
        </div>
        <Field label="Transporter" required>
          <Select
            value={co}
            onChange={(e) => setCo(e.target.value)}
            options={partyOptions}
          />
        </Field>
        <div className="form-grid">
          <Field label="Truck plate" required error={plate && !plateOk ? 'Tanzanian plate like T 412 DKL' : undefined}>
            <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="T 412 DKL" />
          </Field>
          <Field label="Driver" required>
            <Input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="Full name" />
          </Field>
        </div>
        <Field
          label={
            t === 'IMPORT_PICKUP'
              ? 'Release order'
              : t === 'EXPORT_DROP'
              ? 'Booking number'
              : 'Empty release / return ref.'
          }
          required={t === 'IMPORT_PICKUP'}
          error={ref && !refOk ? 'Import pick-ups need a release order number (RO-…)' : undefined}
        >
          <Input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder={t === 'IMPORT_PICKUP' ? 'RO-DAR1-26-01942' : 'Optional'}
          />
        </Field>
        {t === 'IMPORT_PICKUP' && (
          <Banner tone="wait">
            The release is checked again when the truck reaches the inner gate out. Booking a slot does not release the
            unit.
          </Banner>
        )}
        <p className="xs faint">
          The driver gets an SMS with the slot and a QR. Arriving more than the grace period late counts as a no show.
        </p>
      </div>
    </Drawer>
  );
}
