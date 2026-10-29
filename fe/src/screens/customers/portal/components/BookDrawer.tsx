import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Segmented, Select, fmtD, fmtT, useToast } from '@/ds/components';
import type { Stay } from '@/mock/core';
import { day } from '@/mock/gen';
import { slotsFor, type Appt } from '@/mock/insight';

export function BookDrawer({
  open,
  unit,
  units,
  onClose,
  onBooked,
}: {
  open: boolean;
  unit?: Stay;
  units: Stay[];
  onClose: () => void;
  onBooked: (a: Appt) => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState(day(1));
  const [slot, setSlot] = useState<string | null>(null);
  const [pick, setPick] = useState<string>('');
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  if (!open) return null;
  const chosen = pick || (unit ? String(unit.unitStayId) : units[0] ? String(units[0].unitStayId) : '');
  const slots = slotsFor(date);
  const s = slots.find((x) => x.slotStart === slot);
  const ok = !!s && !!chosen && plate.trim().length >= 6 && driver.trim().length > 2;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Book a truck"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CalendarClock />}
            disabled={!ok}
            perm="appointment.book"
            onClick={() => {
              const u = units.find((x) => String(x.unitStayId) === chosen);
              const a: Appt = {
                appointmentId: 4200 + plate.length,
                appointmentNo: `APT-26-0${4130 + plate.length}`,
                visitTypeCode: u?.cargoUnit.category === 'VEHICLE' ? 'VEHICLE_DELIVERY' : 'IMPORT_PICKUP',
                slotStart: s!.slotStart,
                slotEnd: s!.slotEnd,
                transporterPartyId: 7,
                status: 'BOOKED',
                bookedVia: 'PORTAL',
                plate: plate.toUpperCase(),
                driver,
                unitNos: u ? [u.cargoUnit.unitNo] : [],
              };
              toast(`Truck booked for ${fmtD(s!.slotStart)} ${fmtT(s!.slotStart)}`);
              onBooked(a);
            }}
          >
            Book truck
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        {units.length === 0 ? (
          <Banner tone="wait" title="Nothing is ready to collect yet">
            You can book once a unit shows “Ready to collect”.
          </Banner>
        ) : (
          <Field label="Unit to collect" required>
            <Select
              value={chosen}
              onChange={(e) => setPick(e.target.value)}
              options={units.map((u) => [String(u.unitStayId), `${u.cargoUnit.unitNo} · ${u.unitSummary.consignmentRef}`])}
            />
          </Field>
        )}
        <Field label="Day">
          <Segmented
            label="Day"
            value={date}
            onChange={(d) => {
              setDate(d);
              setSlot(null);
            }}
            options={[1, 2, 3].map((n) => ({ id: day(n), label: fmtD(day(n)).slice(0, 6) }))}
          />
        </Field>
        <Field label="Time slot" hint="Full slots cannot be booked. Lunch hour has fewer places.">
          <div className="slots">
            {slots.map((x) => (
              <button
                key={x.slotStart}
                type="button"
                className="slot"
                aria-pressed={slot === x.slotStart}
                disabled={x.available === 0}
                onClick={() => setSlot(x.slotStart)}
              >
                <div className="strong">{fmtT(x.slotStart)}</div>
                <div className="xs muted">{x.available === 0 ? 'Full' : `${x.available} of ${x.capacity} free`}</div>
              </button>
            ))}
          </div>
        </Field>
        <div className="form-grid">
          <Field label="Truck plate" required>
            <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="T 123 ABC" />
          </Field>
          <Field label="Driver name" required hint="Must match the driving licence at the gate">
            <Input value={driver} onChange={(e) => setDriver(e.target.value)} />
          </Field>
        </div>
      </div>
    </Drawer>
  );
}
