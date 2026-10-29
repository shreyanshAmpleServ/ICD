import { useState } from 'react';
import { PlugZap } from 'lucide-react';
import { Banner, Button, Field, Input, Select } from '@/ds/components';
import type { Reefer } from '@/mock/ops';

export const GENSET_PLUGS = ['G2-01', 'G2-02', 'G2-03', 'G2-04'];

export interface PlugInDrawerProps {
  r: Reefer;
  used: Set<string | undefined>;
  onDone: (plug: string, temp: string) => void;
}

export function PlugInDrawer({ r, used, onDone }: PlugInDrawerProps) {
  const free = GENSET_PLUGS.filter((p) => !used.has(p));
  const [plug, setPlug] = useState(free[0] ?? '');
  const [temp, setTemp] = useState(r.setTempC);
  const [checked, setChecked] = useState(false);

  return (
    <div className="stack">
      {free.length === 0 ? (
        <Banner tone="stop">No plug free. Unplug a departing unit first.</Banner>
      ) : (
        <>
          <Banner tone="wait">
            Block R is full. Free plugs are on portable genset G2 next to block B. Check its fuel at each round.
          </Banner>
          <Field label="Plug" required>
            <Select value={plug} onChange={(e) => setPlug(e.target.value)} options={free} />
          </Field>
          <Field label="Set point (°C)" hint="From the booking. Change only if the line tells you in writing." required>
            <Input xl value={temp} onChange={(e) => setTemp(e.target.value)} />
          </Field>
          <Field label="Before you plug in">
            <button
              type="button"
              className="btn btn-xl"
              aria-pressed={checked}
              onClick={() => setChecked(!checked)}
              style={{ justifyContent: 'flex-start', borderColor: checked ? 'var(--go)' : undefined }}
            >
              {checked ? '✓ ' : ''}Cable and socket checked, unit display on
            </button>
          </Field>
          <Button
            size="xl"
            variant="primary"
            icon={<PlugZap />}
            perm="reefer.manage"
            disabled={!checked || !plug}
            onClick={() => onDone(plug, temp)}
          >
            Plug in at {plug}
          </Button>
        </>
      )}
    </div>
  );
}
