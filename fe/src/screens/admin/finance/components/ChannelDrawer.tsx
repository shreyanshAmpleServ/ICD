import { useState } from 'react';
import { Field, Input, Select, useToast } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { paymentChannels as seedChannels } from '@/mock/admin';

type Channel = (typeof seedChannels)[number];

interface ChannelDrawerProps {
  ch: Channel | null;
  onClose: () => void;
}

export function ChannelDrawer({ ch, onClose }: ChannelDrawerProps) {
  const toast = useToast();
  if (!ch) return null;
  const [ref, setRef] = useState(ch.example === '—' ? '' : ch.example);
  const ok = !ch.referencePattern || new RegExp(ch.referencePattern).test(ref.trim().toUpperCase());

  return (
    <EditDrawer open onClose={onClose} title={ch.channelName} saveLabel="Save channel" perm="finance.period.close" onSave={() => toast('Channel saved')}>
      <div className="form-grid">
        <Field label="Name"><Input defaultValue={ch.channelName} /></Field>
        <Field label="Provider"><Input defaultValue={ch.provider ?? ''} /></Field>
        <Field label="Account"><Input defaultValue={ch.glAccount ?? ''} /></Field>
        <Field label="Currency"><Select defaultValue={ch.currency} options={['USD', 'TZS']} /></Field>
      </div>
      <Field label="Reference rule" hint={ch.refHint}>
        <Input defaultValue={ch.referencePattern ?? ''} className="adm-code" />
      </Field>
      <Field label="Test a reference" error={ref && !ok ? 'The cashier would be asked to correct this' : undefined} hint={ref && ok ? 'Accepted' : undefined}>
        <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={ch.example} />
      </Field>
    </EditDrawer>
  );
}
