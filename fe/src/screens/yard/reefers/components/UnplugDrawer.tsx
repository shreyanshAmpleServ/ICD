import { useState } from 'react';
import { Unplug } from 'lucide-react';
import { Banner, Button, DL, Field, Input, Select } from '@/ds/components';
import type { Reefer } from '@/mock/ops';
import { hoursSince } from './ReeferDetailPanel';

export interface UnplugDrawerProps {
  r: Reefer;
  onDone: (kwh: string) => void;
}

export function UnplugDrawer({ r, onDone }: UnplugDrawerProps) {
  const [why, setWhy] = useState('Leaving on a truck');
  const [meter, setMeter] = useState('');
  const start = Number(r.meterStartKwh ?? 0);
  const m = Number(meter);
  const err = meter && m < start ? `Must be at least the start reading ${start}` : undefined;

  return (
    <div className="stack">
      <DL
        items={[
          ['Plug', r.plugNo],
          ['Plugged in', `${hoursSince(r.pluggedAt)} h`],
          ['Meter at start', r.meterStartKwh ?? '—'],
        ]}
      />
      <Field label="Why" required>
        <Select
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          options={['Leaving on a truck', 'Going to the exam bay', 'Moving to another plug', 'Technician repair']}
        />
      </Field>
      <Field label="Meter now (kWh)" required error={err}>
        <Input
          xl
          value={meter}
          inputMode="decimal"
          onChange={(e) => setMeter(e.target.value)}
          placeholder={String(start + Math.round(Number(r.kwhUsed ?? 0)))}
        />
      </Field>
      {why !== 'Leaving on a truck' && (
        <Banner tone="wait">
          The unit is off power from now. Plug it in again within 2 hours or the cargo may warm up.
        </Banner>
      )}
      <Button
        size="xl"
        variant="primary"
        icon={<Unplug />}
        perm="reefer.manage"
        disabled={!meter || !!err}
        onClick={() => onDone((m - start).toFixed(1))}
      >
        Unplug now
      </Button>
    </div>
  );
}
