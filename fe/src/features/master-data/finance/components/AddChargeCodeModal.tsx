import { useState } from 'react';
import { Banner, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

interface AddChargeCodeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (charge: any) => void;
  taxCodes?: any[];
}

const CHARGE_GROUPS: [string, string][] = [
  ['STORAGE', 'Storage'],
  ['HANDLING', 'Handling'],
  ['VEHICLE', 'Vehicle'],
  ['GATE', 'Gate'],
  ['WEIGHING', 'Weighing & VGM'],
  ['INSPECTION', 'Inspection'],
  ['EXAMINATION', 'Examination & Scanning'],
  ['REEFER', 'Reefer electricity & monitoring'],
  ['DOCUMENTATION', 'Documentation'],
  ['SPECIAL', 'Special services (Stuffing/Washing/Repair)'],
  ['DISBURSEMENT', 'Disbursements (Port / Terminal clearing)'],
  ['OTHER', 'Other'],
];

const DEFAULT_REV_ACCOUNTS: Record<string, string> = {
  STORAGE: '4100-99',
  HANDLING: '4200-99',
  VEHICLE: '4250-99',
  GATE: '4300-99',
  WEIGHING: '4310-99',
  INSPECTION: '4400-99',
  EXAMINATION: '4410-99',
  REEFER: '4500-99',
  DOCUMENTATION: '4600-99',
  SPECIAL: '4700-99',
  DISBURSEMENT: '1290-00',
  OTHER: '4900-99',
};

export function AddChargeCodeModal({ open, onClose, onSave, taxCodes = [] }: AddChargeCodeModalProps) {
  const [chargeCode, setChargeCode] = useState('');
  const [chargeName, setChargeName] = useState('');
  const [chargeGroup, setChargeGroup] = useState('STORAGE');
  const [defaultTaxCode, setDefaultTaxCode] = useState('TZ_VAT_STD');
  const [isDisbursement, setIsDisbursement] = useState(false);
  const [printOrder, setPrintOrder] = useState('80');
  const [revenueGlAccount, setRevenueGlAccount] = useState('4100-99');

  const handleGroupChange = (grp: string) => {
    setChargeGroup(grp);
    if (grp === 'DISBURSEMENT') {
      setIsDisbursement(true);
      setDefaultTaxCode('TZ_NO_VAT');
      setRevenueGlAccount('');
    } else {
      if (isDisbursement) setIsDisbursement(false);
      setRevenueGlAccount(DEFAULT_REV_ACCOUNTS[grp] || '4900-99');
    }
  };

  const handleDisbursementToggle = (checked: boolean) => {
    setIsDisbursement(checked);
    if (checked) {
      setChargeGroup('DISBURSEMENT');
      setDefaultTaxCode('TZ_NO_VAT');
      setRevenueGlAccount('');
    } else {
      setRevenueGlAccount('4900-99');
      setDefaultTaxCode('TZ_VAT_STD');
    }
  };

  const handleSave = () => {
    if (!chargeCode.trim() || !chargeName.trim()) return;
    onSave({
      chargeCode: chargeCode.toUpperCase().trim(),
      chargeName: chargeName.trim(),
      chargeGroup,
      defaultTaxCode,
      isDisbursement,
      printOrder: parseInt(printOrder, 10) || 80,
      revenueGlAccount: isDisbursement ? null : (revenueGlAccount.trim() || null),
      isActive: true,
    });
  };

  const taxOptions: [string, string][] = taxCodes.map((t) => [
    t.taxCode,
    `${t.taxName || t.taxCode} (${Number(t.ratePct ?? 18)}%)`,
  ]);

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add charge code"
      saveLabel="Create charge code"
      perm="admin.config.manage"
      disabled={!chargeCode.trim() || !chargeName.trim()}
      onSave={handleSave}
    >
      <Banner tone="info" title="Tariff & Invoice Catalog">
        Charge codes define billable line items appearing on customer invoices and credit notes. Rates and billing rules are set in Tariffs.
      </Banner>

      <div className="form-grid" style={{ marginTop: '1rem' }}>
        <Field label="Charge code" required hint="Unique alphanumeric key, e.g. WHARFAGE_REEFER">
          <Input
            value={chargeCode}
            onChange={(e) => setChargeCode(e.target.value)}
            placeholder="e.g. WHARFAGE_REEFER"
            className="adm-code"
          />
        </Field>
        <Field label="Print order" hint="Sort order on invoice (lower prints first)">
          <Input
            type="number"
            value={printOrder}
            onChange={(e) => setPrintOrder(e.target.value)}
            placeholder="80"
          />
        </Field>
      </div>

      <Field label="Name on invoice" required hint="Customer-facing description">
        <Input
          value={chargeName}
          onChange={(e) => setChargeName(e.target.value)}
          placeholder="e.g. Special wharfage fee"
        />
      </Field>

      <div className="form-grid" style={{ marginTop: '0.75rem' }}>
        <Field label="Charge group" required>
          <Select
            value={chargeGroup}
            onChange={(e) => handleGroupChange(e.target.value)}
            options={CHARGE_GROUPS}
          />
        </Field>
        <Field label="Default tax code" required>
          <Select
            value={defaultTaxCode}
            onChange={(e) => setDefaultTaxCode(e.target.value)}
            options={taxOptions.length > 0 ? taxOptions : [['TZ_VAT_STD', 'VAT standard rate (18%)'], ['TZ_VAT_ZERO', 'VAT zero-rated (0%)'], ['TZ_NO_VAT', 'Outside VAT scope (0%)']]}
          />
        </Field>
      </div>

      <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
        <label className="row" style={{ gap: '0.5rem', cursor: 'pointer', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={isDisbursement}
            onChange={(e) => handleDisbursementToggle(e.target.checked)}
          />
          <span style={{ fontWeight: 500 }}>Is disbursement / pass-through charge</span>
        </label>
        <span className="xs faint" style={{ display: 'block', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
          Pass-through port and customs charges debited to customer receivables without sales revenue recognition.
        </span>
      </div>

      {!isDisbursement && (
        <Field label="Revenue GL account" hint="Credit account in General Ledger, e.g. 4100-99">
          <Input
            value={revenueGlAccount}
            onChange={(e) => setRevenueGlAccount(e.target.value)}
            placeholder="e.g. 4100-99"
            className="adm-code"
          />
        </Field>
      )}
    </EditDrawer>
  );
}
