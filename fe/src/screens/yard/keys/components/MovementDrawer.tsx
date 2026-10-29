import { useState } from 'react';
import { CheckCircle2, FileSignature } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Segmented, Select, Textarea, UnitNo } from '@/ds/components';
import type { Key } from '@/mock/ops';
import type { Flow } from './KeyDetailDrawer';

export const HOLDERS = [
  'Shabani R. (yard driver)',
  'Neema K. (yard driver)',
  'Juma M. (inspection)',
  'Rehema K. (customs, TRA)',
  'Workshop: Bahari Motors technician',
];

export interface MovementDrawerProps {
  k: Key;
  flow: Flow;
  onClose: () => void;
  onDone: (holder: string, reason: string) => void;
}

export function MovementDrawer({ k, flow, onClose, onDone }: MovementDrawerProps) {
  const [holder, setHolder] = useState(HOLDERS[0]);
  const [reason, setReason] = useState('');
  const [rings, setRings] = useState<'ALL' | 'PART'>('ALL');
  const [signed, setSigned] = useState(false);
  const needReason = flow !== 'RETURN';
  const ok =
    signed &&
    (!needReason || reason.trim().length >= 3) &&
    (flow !== 'RETURN' || rings === 'ALL' || reason.trim().length >= 3);
  const title = {
    ISSUE: `Issue ${k.keyTagNo}`,
    RETURN: `Return ${k.keyTagNo} to hook ${k.hook}`,
    LOST: `Report ${k.keyTagNo} lost`,
    FOUND: `Record ${k.keyTagNo} found`,
  }[flow];
  const verb = {
    ISSUE: 'Issue key',
    RETURN: 'Return key',
    LOST: 'Report lost',
    FOUND: 'Put back on hook',
  }[flow];

  return (
    <Drawer
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="xl"
            variant={flow === 'LOST' ? 'danger' : 'primary'}
            perm="yard.key.custody"
            disabled={!ok}
            onClick={() => onDone(holder, reason)}
          >
            {verb}
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="row-wrap">
          <UnitNo no={k.vin} category="VEHICLE" />
          <span className="small muted">
            {k.make} {k.model} · {k.keyCount} key{k.keyCount === 1 ? '' : 's'}
            {k.hasRemote ? ' + remote' : ''}
          </span>
        </div>
        {flow === 'ISSUE' && (
          <>
            <Field label="Who takes it?" required>
              <Select value={holder} onChange={(e) => setHolder(e.target.value)} options={HOLDERS} />
            </Field>
            <Field label="What for?" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Move to wash bay"
              />
            </Field>
          </>
        )}
        {flow === 'RETURN' && (
          <>
            <p className="small">
              From <strong>{k.holderName}</strong>.
            </p>
            <Field label="Everything on the ring?">
              <div>
                <Segmented
                  xl
                  value={rings}
                  onChange={setRings}
                  options={[
                    { id: 'ALL', label: `All ${k.keyCount}${k.hasRemote ? ' + remote' : ''}` },
                    { id: 'PART', label: 'Something missing' },
                  ]}
                />
              </div>
            </Field>
            <Field label={rings === 'PART' ? 'What is missing?' : 'Note'} required={rings === 'PART'}>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </>
        )}
        {flow === 'LOST' && (
          <>
            <Banner tone="stop">
              The vehicle cannot be handed over with this key. The holder ({k.holderName}) and the yard supervisor are
              notified.
            </Banner>
            <Field label="What happened?" required>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Where it was last seen, who searched"
              />
            </Field>
          </>
        )}
        {flow === 'FOUND' && (
          <Field label="Where was it found?" required>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. In the ignition of the vehicle at V2-02-03"
            />
          </Field>
        )}
        <Field label={flow === 'ISSUE' ? `${holder.split(' (')[0]} signs` : 'Holder signs'} required>
          <button
            type="button"
            className="sig"
            onClick={() => setSigned(true)}
            style={{
              width: '100%',
              cursor: 'pointer',
              color: signed ? 'var(--go)' : undefined,
              borderColor: signed ? 'var(--go)' : undefined,
            }}
          >
            {signed ? (
              <>
                <CheckCircle2 size={18} />
                &nbsp;Signed
              </>
            ) : (
              <>
                <FileSignature size={18} />
                &nbsp;Sign here
              </>
            )}
          </button>
        </Field>
      </div>
    </Drawer>
  );
}
