import { useState, useEffect } from 'react';
import { Banner, Field, Input } from '@/ds/components';
import { EditDrawer, label } from '../../shared/AdminKit';

interface TaxCodeDrawerProps {
  taxCode: any | null;
  onClose: () => void;
  onSave: (updated: any) => void;
}

export function TaxCodeDrawer({ taxCode, onClose, onSave }: TaxCodeDrawerProps) {
  const [taxName, setTaxName] = useState('');
  const [ratePct, setRatePct] = useState('');
  const [outputGlAccount, setOutputGlAccount] = useState('');
  const [fiscalTaxClass, setFiscalTaxClass] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (taxCode) {
      setTaxName(taxCode.taxName || '');
      setRatePct(String(taxCode.ratePct ?? '18.000'));
      setOutputGlAccount(taxCode.outputGlAccount || '');
      setFiscalTaxClass(taxCode.fiscalTaxClass || '');
      setIsActive(taxCode.isActive !== undefined ? Boolean(taxCode.isActive) : true);
    }
  }, [taxCode]);

  if (!taxCode) return null;

  const handleSave = () => {
    onSave({
      ...taxCode,
      taxName: taxName.trim(),
      ratePct,
      outputGlAccount: outputGlAccount.trim() || null,
      fiscalTaxClass: fiscalTaxClass.trim() || null,
      isActive,
    });
  };

  return (
    <EditDrawer
      open={!!taxCode}
      onClose={onClose}
      title={`Tax code: ${taxCode.taxCode}`}
      saveLabel="Save tax code"
      perm="admin.config.manage"
      disabled={!taxName.trim()}
      onSave={handleSave}
    >
      <Banner tone="info" title="Tax Authority Mapping">
        Treatment: <strong>{label(taxCode.taxTreatment || 'STANDARD')}</strong> · Country: <strong>{taxCode.countryCode || 'TZ'}</strong>
      </Banner>

      <div className="form-grid" style={{ marginTop: '1rem' }}>
        <Field label="Tax code">
          <Input value={taxCode.taxCode} readOnly className="adm-code" />
        </Field>
        <Field label="Rate (%)" required>
          <Input
            type="number"
            step="0.001"
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Name on invoice" required>
        <Input
          value={taxName}
          onChange={(e) => setTaxName(e.target.value)}
        />
      </Field>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <Field label="Output GL account" hint="VAT liability account">
          <Input
            value={outputGlAccount}
            onChange={(e) => setOutputGlAccount(e.target.value)}
            placeholder="2310-00"
            className="adm-code"
          />
        </Field>
        <Field label="VFD / EFD tax class">
          <Input
            value={fiscalTaxClass}
            onChange={(e) => setFiscalTaxClass(e.target.value)}
            placeholder="A"
          />
        </Field>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label className="row" style={{ gap: '0.5rem', cursor: 'pointer', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span style={{ fontWeight: 500 }}>Active for invoice calculations</span>
        </label>
      </div>
    </EditDrawer>
  );
}
