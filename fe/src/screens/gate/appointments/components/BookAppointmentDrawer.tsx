import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Select, useToast } from '@/ds/components';
import { partyName } from '@/mock/core';
import { VISIT_TYPES } from '@/screens/gate/types';
import { APPT_TYPES, HOURS, type Appt } from '@/mock/ops';

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
  const [co, setCo] = useState('7');
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [ref, setRef] = useState('');
  const c = cap(t, h),
    b = booked(t, h);
  const full = c > 0 && b >= c;
  const plateOk = /^T\s?\d{3}\s?[A-Z]{3}$/.test(plate.trim().toUpperCase());
  const refOk = t !== 'IMPORT_PICKUP' || /^RO-/.test(ref.trim().toUpperCase());
  const ok = c > 0 && !full && plateOk && driver.trim().length > 2 && refOk;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Book an appointment · ${dayLabel(date)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CalendarPlus />}
            disabled={!ok}
            onClick={() => {
              const start = new Date(`${date}T${hh(h)}:00+03:00`);
              onBook({
                appointmentId: 90000 + (Math.round(start.getTime() / 60000) % 9999),
                appointmentNo: `AP-26-${19000 + h * 10}`,
                visitTypeCode: t,
                slotStart: start.toISOString(),
                slotEnd: new Date(start.getTime() + 3600_000).toISOString(),
                transporterPartyId: Number(co),
                status: 'BOOKED',
                bookedVia: 'DESK',
                plateNo: plate.toUpperCase(),
                driverName: driver,
                refNo: ref.toUpperCase() || undefined,
                date,
                hour: h,
              });
              toast(`Appointment booked for ${plate.toUpperCase()} at ${hh(h)}`);
              onClose();
            }}
          >
            Book appointment
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Visit type" required>
            <Select value={t} onChange={(e) => setT(e.target.value)} options={APPT_TYPES.map((x) => [x, VISIT_TYPES[x]])} />
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
            options={[
              ['7', partyName(7)],
              ['8', partyName(8)],
              ['11', partyName(11)],
              ['2', partyName(2)],
            ]}
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
