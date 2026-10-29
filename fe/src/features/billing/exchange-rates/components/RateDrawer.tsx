import { useState } from 'react';
import { Banner, Button, Drawer, Field, Input, Segmented } from '@/ds/components';
import { TODAY, addDays, dShort, rateOn, type Rate } from '@/mock/money';

export interface RateDrawerProps {
  entry: Rate | 'new' | null;
  onClose: () => void;
  all: Rate[];
  onSave: (r: Rate, isNew: boolean) => void;
}

export function RateDrawer({ entry, onClose, all, onSave }: RateDrawerProps) {
  const editing = entry && entry !== 'new' ? entry : null;
  return (
    <Drawer
      open={!!entry}
      onClose={onClose}
      title={editing ? `Correct rate for ${dShort(editing.rateDate)}` : 'Enter exchange rate'}
    >
      {entry && (
        <RateForm
          key={editing?.exchangeRateId ?? 'new'}
          editing={editing}
          all={all}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Drawer>
  );
}

function RateForm({
  editing,
  all,
  onClose,
  onSave,
}: {
  editing: Rate | null;
  all: Rate[];
  onClose: () => void;
  onSave: (r: Rate, isNew: boolean) => void;
}) {
  const [kind, setKind] = useState<'DAILY' | 'MONTHLY'>(editing?.rateKind ?? 'DAILY');
  const [date, setDate] = useState(
    editing?.rateDate ?? (all.some((r) => r.rateDate === TODAY && r.rateKind === 'DAILY') ? addDays(TODAY, 1) : TODAY)
  );
  const [rate, setRate] = useState(editing?.rate ?? '');
  const [src, setSrc] = useState(editing?.sourceNote ?? 'BoT mean rate 09:00');
  const d = kind === 'MONTHLY' ? date.slice(0, 8) + '01' : date;
  const clash = !editing && all.find((r) => r.rateDate === d && r.rateKind === kind);
  const prev = rateOn(addDays(d, -1)).rate;
  const jump = Number(rate) && Math.abs(Number(rate) / Number(prev.rate) - 1) > 0.02;

  return (
    <div className="stack">
      <Field label="Kind">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { id: 'DAILY', label: 'Daily' },
            { id: 'MONTHLY', label: 'Monthly' },
          ]}
        />
      </Field>
      <Field
        label={kind === 'MONTHLY' ? 'Month' : 'Date'}
        required
        error={clash ? `A ${kind.toLowerCase()} rate for ${dShort(d)} already exists. Correct it instead.` : undefined}
      >
        <Input
          type={kind === 'MONTHLY' ? 'month' : 'date'}
          value={kind === 'MONTHLY' ? date.slice(0, 7) : date}
          disabled={!!editing}
          onChange={(e) => setDate(kind === 'MONTHLY' ? e.target.value + '-01' : e.target.value)}
        />
      </Field>
      <Field
        label="TZS per 1 USD"
        required
        hint={`Previous rate ${prev.rate} (${dShort(prev.rateDate)})`}
      >
        <Input
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="2,670.00"
        />
      </Field>
      {jump ? (
        <Banner tone="wait" title="More than 2% from the previous rate">
          Check the figure before saving. A wrong rate flows into every document posted with it.
        </Banner>
      ) : null}
      <Field label="Source">
        <Input value={src} onChange={(e) => setSrc(e.target.value)} />
      </Field>
      <p className="xs muted">Once a document is posted with this rate it is locked.</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          perm="finance.exchange_rate.edit"
          disabled={!Number(rate) || !!clash}
          onClick={() => {
            onSave(
              {
                ...(editing ?? {
                  exchangeRateId: 999,
                  companyId: 1,
                  fromCurrency: 'USD',
                  toCurrency: 'TZS',
                  usedBy: 0,
                  enteredBy: 'Neema Mushi',
                }),
                rateDate: d,
                rateKind: kind,
                rate: Number(rate).toFixed(2),
                sourceNote: src,
                enteredAt: '2026-10-07T07:30:00Z',
              },
              !editing
            );
            onClose();
          }}
        >
          {editing ? 'Save correction' : 'Save rate'}
        </Button>
      </div>
    </div>
  );
}
