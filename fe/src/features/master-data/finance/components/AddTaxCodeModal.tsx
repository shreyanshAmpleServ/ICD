import { useState } from 'react';
import { Banner, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

interface AddTaxCodeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tax: any) => void;
}

const TAX_TREATMENTS: [string, string][] = [
  ['STANDARD', 'Standard rated'],
  ['ZERO_RATED', 'Zero-rated (0%)'],
  ['EXEMPT', 'Exempt (no credit)'],
  ['OUT_OF_SCOPE', 'Outside VAT scope (Pass-through)'],
];

const COUNTRIES: [string, string][] = [
  ['TZ', 'Tanzania (TZ)'],
  ['KE', 'Kenya (KE)'],
  ['UG', 'Uganda (UG)'],
  ['RW', 'Rwanda (RW)'],
  ['BI', 'Burundi (BI)'],
  ['CD', 'DR Congo (CD)'],
  ['ZM', 'Zambia (ZM)'],
  ['MW', 'Malawi (MW)'],
];

export function AddTaxCodeModal({ open, onClose, onSave }: AddTaxCodeModalProps) {
  const [taxCode, setTaxCode] = useState('');
  const [taxName, setTaxName] = useState('');
  const [countryCode, setCountryCode] = useState('TZ');
  const [ratePct, setRatePct] = useState('18.000');
  const [taxTreatment, setTaxTreatment] = useState('STANDARD');
  const [fiscalTaxClass, setFiscalTaxClass] = useState('');
  const [outputGlAccount, setOutputGlAccount] = useState('2310-00');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);

  const handleTreatmentChange = (t: string) => {
    setTaxTreatment(t);
    if (t === 'STANDARD') {
      setRatePct('18.000');
      setOutputGlAccount('2310-00');
    } else {
      setRatePct('0.000');
      if (t === 'EXEMPT' || t === 'OUT_OF_SCOPE') {
        setOutputGlAccount('');
      } else {
        setOutputGlAccount('2310-00');
      }
    }
  };

  const handleSave = () => {
    if (!taxCode.trim() || !taxName.trim()) return;
    onSave({
      taxCode: taxCode.toUpperCase().trim(),
      taxName: taxName.trim(),
      countryCode,
      ratePct,
      taxTreatment,
      fiscalTaxClass: fiscalTaxClass.trim() || null,
      outputGlAccount: outputGlAccount.trim() || null,
      effectiveFrom,
      isActive,
    });
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add tax code"
      saveLabel="Create tax code"
      perm="admin.config.manage"
      disabled={!taxCode.trim() || !taxName.trim()}
      onSave={handleSave}
    >
      <Banner tone="info" title="Tax Authority & VFD Configuration">
        Tax codes dictate VAT output calculation and electronic fiscal device (VFD/EFD) tax classification on issued invoices.
      </Banner>

      <div className="form-grid" style={{ marginTop: '1rem' }}>
        <Field label="Tax code" required hint="e.g. TZ_VAT_STD, TZ_WHT_6">
          <Input
            value={taxCode}
            onChange={(e) => setTaxCode(e.target.value)}
            placeholder="e.g. TZ_VAT_RED"
            className="adm-code"
          />
        </Field>
        <Field label="Country" required>
          <Select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            options={COUNTRIES}
          />
        </Field>
      </div>

      <Field label="Tax name" required hint="Display name on invoices">
        <Input
          value={taxName}
          onChange={(e) => setTaxName(e.target.value)}
          placeholder="e.g. VAT standard rate"
        />
      </Field>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <Field label="Tax treatment" required>
          <Select
            value={taxTreatment}
            onChange={(e) => handleTreatmentChange(e.target.value)}
            options={TAX_TREATMENTS}
          />
        </Field>
        <Field label="Rate (%)" required>
          <Input
            type="number"
            step="0.001"
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
            placeholder="18.000"
          />
        </Field>
      </div>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <Field label="Output GL account" hint="VAT liability account (e.g. 2310-00)">
          <Input
            value={outputGlAccount}
            onChange={(e) => setOutputGlAccount(e.target.value)}
            placeholder="2310-00"
            className="adm-code"
          />
        </Field>
        <Field label="VFD / EFD tax class" hint="Single letter tax group (e.g. A, B)">
          <Input
            value={fiscalTaxClass}
            onChange={(e) => setFiscalTaxClass(e.target.value)}
            placeholder="A"
          />
        </Field>
      </div>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <Field label="Effective from" required>
          <Input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.75rem' }}>
          <label className="row" style={{ gap: '0.5rem', cursor: 'pointer', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span style={{ fontWeight: 500 }}>Active for new transactions</span>
          </label>
        </div>
      </div>
    </EditDrawer>
  );
}
