import { useState, useEffect } from 'react';
import { Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { paymentChannels as seedChannels } from '@/mock/admin';

type Channel = (typeof seedChannels)[number];

interface ChannelDrawerProps {
  ch: Channel | null;
  onClose: () => void;
  onSave?: (updated: Channel) => void;
}

export function ChannelDrawer({ ch, onClose, onSave }: ChannelDrawerProps) {
  const [channelName, setChannelName] = useState('');
  const [provider, setProvider] = useState('');
  const [glAccount, setGlAccount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [referencePattern, setReferencePattern] = useState('');
  const [ref, setRef] = useState('');

  useEffect(() => {
    if (ch) {
      setChannelName(ch.channelName || '');
      setProvider(ch.provider ?? '');
      setGlAccount(ch.glAccount ?? '');
      setCurrency(ch.currency || 'USD');
      setReferencePattern(ch.referencePattern ?? '');
      setRef(ch.example === '—' ? '' : ch.example);
    }
  }, [ch]);

  if (!ch) return null;

  const ok = !referencePattern || new RegExp(referencePattern).test(ref.trim().toUpperCase());

  const handleSave = () => {
    if (!onSave) return;
    onSave({
      ...ch,
      channelName: channelName.trim() || ch.channelName,
      provider: provider.trim() || null,
      glAccount: glAccount.trim() || ch.glAccount,
      currency,
      referencePattern: referencePattern.trim() || null,
    });
  };

  return (
    <EditDrawer
      open={!!ch}
      onClose={onClose}
      title={channelName || ch.channelName}
      saveLabel="Save channel"
      perm="finance.period.close"
      onSave={handleSave}
    >
      <div className="form-grid">
        <Field label="Channel name" required>
          <Input value={channelName} onChange={(e) => setChannelName(e.target.value)} />
        </Field>
        <Field label="Provider">
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. CRDB Bank" />
        </Field>
        <Field label="GL account" required>
          <Input value={glAccount} onChange={(e) => setGlAccount(e.target.value)} className="adm-code" />
        </Field>
        <Field label="Currency" required>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)} options={['USD', 'TZS', 'KES', 'UGX']} />
        </Field>
      </div>
      <Field label="Reference regex rule" hint={ch.refHint || 'Regex to validate cashier reference'}>
        <Input
          value={referencePattern}
          onChange={(e) => setReferencePattern(e.target.value)}
          className="adm-code"
          placeholder="e.g. ^[A-Z0-9]{10,16}$"
        />
      </Field>
      <Field
        label="Test a reference"
        error={ref && !ok ? 'The cashier would be asked to correct this format' : undefined}
        hint={ref && ok ? 'Reference matches rule' : undefined}
      >
        <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={ch.example || 'Type reference to test'} />
      </Field>
    </EditDrawer>
  );
}
