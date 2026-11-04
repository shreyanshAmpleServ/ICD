import { useState } from 'react';
import { Banner, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

interface AddChannelModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (channel: any) => void;
}

const METHODS: [string, string][] = [
  ['BANK_TRANSFER', 'Bank transfer (EFT / TISS / Swift)'],
  ['MOBILE_MONEY', 'Mobile money till (M-Pesa / Tigo / Airtel)'],
  ['CASH', 'Physical cash desk'],
  ['CARD', 'POS card terminal (Visa / Mastercard)'],
  ['CHEQUE', 'Bankers cheque'],
];

const CURRENCIES: [string, string][] = [
  ['USD', 'USD - US Dollar'],
  ['TZS', 'TZS - Tanzanian Shilling'],
  ['KES', 'KES - Kenyan Shilling'],
  ['UGX', 'UGX - Ugandan Shilling'],
];

export function AddChannelModal({ open, onClose, onSave }: AddChannelModalProps) {
  const [channelCode, setChannelCode] = useState('');
  const [channelName, setChannelName] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [provider, setProvider] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [glAccount, setGlAccount] = useState('1020-03');
  const [referencePattern, setReferencePattern] = useState('^[A-Z0-9]{10,16}$');
  const [example, setExample] = useState('FT26280ZK4Q1');
  const [refHint, setRefHint] = useState('Bank transaction reference, 10–16 alphanumeric characters.');

  const handleMethodChange = (m: string) => {
    setMethod(m);
    if (m === 'CASH') {
      setReferencePattern('');
      setExample('—');
      setRefHint('No reference; the receipt number is the reference.');
      setGlAccount(currency === 'USD' ? '1010-01' : '1010-02');
    } else if (m === 'MOBILE_MONEY') {
      setReferencePattern('^[A-Z0-9]{10}$');
      setExample('8JK2QW71PZ');
      setRefHint('Transaction ID from customer SMS, 10 characters.');
      setGlAccount('1030-01');
    } else {
      setReferencePattern('^[A-Z0-9]{10,16}$');
      setExample('FT26280ZK4Q1');
      setRefHint('Bank reference from the statement, 10–16 alphanumeric characters.');
      setGlAccount('1020-03');
    }
  };

  const handleSave = () => {
    if (!channelCode.trim() || !channelName.trim()) return;
    onSave({
      channelCode: channelCode.toUpperCase().trim(),
      channelName: channelName.trim(),
      method,
      provider: provider.trim() || null,
      currency,
      glAccount: glAccount.trim() || '1020-00',
      referencePattern: referencePattern.trim() || null,
      example: example.trim() || '—',
      refHint: refHint.trim() || 'Payment reference',
      isActive: true,
      companyId: 1,
    });
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add payment channel"
      saveLabel="Create payment channel"
      perm="finance.period.close"
      disabled={!channelCode.trim() || !channelName.trim()}
      onSave={handleSave}
    >
      <Banner tone="info" title="Cashier & Receipting Integration">
        Each channel defines an authorized receipt destination with strict duplicate-prevention rules and automatic GL ledger posting.
      </Banner>

      <div className="form-grid" style={{ marginTop: '1rem' }}>
        <Field label="Channel code" required hint="e.g. STANBIC_TZS, MPESA">
          <Input
            value={channelCode}
            onChange={(e) => setChannelCode(e.target.value)}
            placeholder="e.g. STANBIC_TZS"
            className="adm-code"
          />
        </Field>
        <Field label="Currency" required>
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={CURRENCIES}
          />
        </Field>
      </div>

      <Field label="Channel name" required hint="Display name shown to cashier">
        <Input
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          placeholder="e.g. Stanbic Bank TZS collection account"
        />
      </Field>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <Field label="Payment method" required>
          <Select
            value={method}
            onChange={(e) => handleMethodChange(e.target.value)}
            options={METHODS}
          />
        </Field>
        <Field label="Provider / Financial institution">
          <Input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. Stanbic Bank, Vodacom"
          />
        </Field>
      </div>

      <Field label="General ledger account" required hint="Debit account for funds received">
        <Input
          value={glAccount}
          onChange={(e) => setGlAccount(e.target.value)}
          placeholder="e.g. 1020-03"
          className="adm-code"
        />
      </Field>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <Field label="Reference regex rule" hint="Pattern to validate cashier entry (empty for cash)">
          <Input
            value={referencePattern}
            onChange={(e) => setReferencePattern(e.target.value)}
            placeholder="e.g. ^[A-Z0-9]{10,16}$"
            className="adm-code"
          />
        </Field>
        <Field label="Example reference" hint="Placeholder hint in cashier UI">
          <Input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="e.g. FT26280ZK4Q1"
            className="adm-cond"
          />
        </Field>
      </div>

      <Field label="Cashier hint" hint="Guidance message shown on cashier receipt screen">
        <Input
          value={refHint}
          onChange={(e) => setRefHint(e.target.value)}
          placeholder="e.g. Bank reference from statement"
        />
      </Field>
    </EditDrawer>
  );
}
