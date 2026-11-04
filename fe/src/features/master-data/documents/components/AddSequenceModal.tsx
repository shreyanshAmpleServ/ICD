import { useState } from 'react';
import { Field, Input, Select } from '@/ds/components';
import { SITES } from '@/app/session';
import { renderPattern } from '@/mock/admin';
import { EditDrawer, useDynamicSites } from '../../shared/AdminKit';

interface AddSequenceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (seq: any) => void;
}

const DOCUMENT_KINDS: [string, string][] = [
  ['INVOICE', 'Invoice'],
  ['CREDIT_NOTE', 'Credit note'],
  ['RECEIPT', 'Receipt'],
  ['RELEASE_ORDER', 'Release order'],
  ['GATE_PASS', 'Gate pass'],
  ['EIR', 'Equipment interchange receipt (EIR)'],
  ['TRUCK_VISIT', 'Truck visit'],
  ['EXCEPTION', 'Exception case'],
  ['APPROVAL', 'Approval request'],
  ['CUSTOM', 'Custom document sequence'],
];

const RESET_OPTIONS: [string, string][] = [
  ['YEARLY', 'Every 1 January (Yearly)'],
  ['MONTHLY', 'Every month (Monthly)'],
  ['NEVER', 'Never (Sequential continuous)'],
];

export function AddSequenceModal({ open, onClose, onSave }: AddSequenceModalProps) {
  const { options: siteOptions } = useDynamicSites();
  const [documentKind, setDocumentKind] = useState('INVOICE');
  const [siteId, setSiteId] = useState<string>('');
  const [prefix, setPrefix] = useState('INV');
  const [pattern, setPattern] = useState('{PREFIX}-{SITE}-{YY}-{######}');
  const [nextValue, setNextValue] = useState(1);
  const [resetPolicy, setResetPolicy] = useState('YEARLY');

  const siteChoices: [string, string][] = [
    ['', 'All sites'],
    ...(siteOptions.length > 0 ? siteOptions : SITES.map((s) => [String(s.siteId), s.siteCode] as [string, string])),
  ];

  const siteCode = siteId ? (siteChoices.find(([val]) => val === siteId)?.[1] || 'DAR1') : undefined;
  const sample = renderPattern(pattern, prefix, siteCode, nextValue);

  const handleKindChange = (kind: string) => {
    setDocumentKind(kind);
    const p = kind === 'INVOICE' ? 'INV' : kind === 'CREDIT_NOTE' ? 'CN' : kind === 'RECEIPT' ? 'RCT' : kind === 'RELEASE_ORDER' ? 'RO' : kind === 'GATE_PASS' ? 'GP' : kind === 'EIR' ? 'EIR' : 'DOC';
    setPrefix(p);
  };

  const handleSave = () => {
    onSave({
      documentKind,
      siteId: siteId ? Number(siteId) : null,
      siteCode: siteCode || 'All sites',
      prefix: prefix.toUpperCase().trim(),
      pattern: pattern.trim(),
      nextValue: Number(nextValue) || 1,
      resetPolicy,
      currentPeriod: '2026',
      sample,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add number sequence"
      saveLabel="Create sequence"
      perm="admin.config.manage"
      reason="Configure running numbering formats for official operational and tax documents."
      onSave={handleSave}
    >
      <div className="form-grid">
        <Field label="Document kind" hint="Entity type generating this sequence">
          <Select
            value={documentKind}
            onChange={(e) => handleKindChange(e.target.value)}
            options={DOCUMENT_KINDS}
          />
        </Field>
        <Field label="Site" hint="Limit to a specific terminal or apply company-wide">
          <Select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            options={siteChoices}
          />
        </Field>
        <Field label="Prefix" hint="Short code leading the number">
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            placeholder="e.g. INV"
          />
        </Field>
        <Field label="Pattern" hint="e.g. {PREFIX}-{SITE}-{YY}-{######}">
          <Input
            className="adm-code"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
        </Field>
        <Field label="Next running number">
          <Input
            type="number"
            value={nextValue}
            onChange={(e) => setNextValue(Number(e.target.value))}
          />
        </Field>
        <Field label="Restarts / Reset cycle">
          <Select
            value={resetPolicy}
            onChange={(e) => setResetPolicy(e.target.value)}
            options={RESET_OPTIONS}
          />
        </Field>
      </div>
      <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--panel, #f8f9fa)', borderRadius: 6 }}>
        <span className="small muted">Live preview sample: </span>
        <strong className="adm-cond" style={{ fontSize: '1.05rem', color: 'var(--text)' }}>{sample}</strong>
      </div>
      <p className="xs faint" style={{ marginTop: 8 }}>
        Pattern placeholders: {'{PREFIX}'}, {'{SITE}'}, {'{YYYY}'}, {'{YY}'}, {'{MM}'}, and {'{######}'}.
      </p>
    </EditDrawer>
  );
}
