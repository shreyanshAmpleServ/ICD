import { useState } from 'react';
import { Field, Input } from '@/ds/components';
import { holidays as seedHol } from '@/mock/admin';
import { EditDrawer } from '../../shared/AdminKit';

type Hol = (typeof seedHol)[number];

export function HolDrawer({
  onClose,
  onSave,
  taken,
}: {
  onClose: () => void;
  onSave: (h: Hol) => void;
  taken: string[];
}) {
  const [d, setD] = useState('2026-12-31');
  const [n, setN] = useState('');
  const dup = taken.includes(d);

  return (
    <EditDrawer
      open
      onClose={onClose}
      title="Add holiday"
      saveLabel="Add holiday"
      perm="admin.config.manage"
      disabled={!n || dup}
      onSave={() => onSave({ calendarHolidayId: 100 + taken.length, holidayDate: d, holidayName: n })}
    >
      <Field label="Date" error={dup ? 'There is already a holiday on this date' : undefined}>
        <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
      </Field>
      <Field label="Name">
        <Input value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. Special public holiday (gazette notice)" />
      </Field>
      <p className="small muted">Storage already charged for that day is not recalculated; unbilled storage picks it up.</p>
    </EditDrawer>
  );
}
