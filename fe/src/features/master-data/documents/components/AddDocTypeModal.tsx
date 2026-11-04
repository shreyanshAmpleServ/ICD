import { useState } from 'react';
import { Check, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

interface AddDocTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (doc: any) => void;
}

const APPLIES_TO_OPTIONS: [string, string][] = [
  ['CONSIGNMENT', 'Consignment'],
  ['CUSTOMS', 'Customs'],
  ['INSPECTION', 'Inspection'],
  ['TRUCK_VISIT', 'Truck visit'],
  ['RELEASE_ORDER', 'Release order'],
  ['PAYMENT', 'Payment'],
  ['INVOICE', 'Invoice'],
  ['ANY', 'Any record'],
];

const REQUIRED_TAGS = ['Import', 'Export', 'Transit', 'Gate in', 'Gate out', 'Import pick-up'];

export function AddDocTypeModal({ open, onClose, onSave }: AddDocTypeModalProps) {
  const [docTypeCode, setDocTypeCode] = useState('');
  const [docTypeName, setDocTypeName] = useState('');
  const [appliesTo, setAppliesTo] = useState('CONSIGNMENT');
  const [maxSizeMb, setMaxSizeMb] = useState(20);
  const [allowedExt, setAllowedExt] = useState('pdf,jpg,jpeg,png');
  const [retentionYears, setRetentionYears] = useState(7);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Import']);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    if (!docTypeCode.trim() || !docTypeName.trim()) return;
    onSave({
      docTypeCode: docTypeCode.toUpperCase().trim(),
      docTypeName: docTypeName.trim(),
      appliesTo,
      maxSizeMb: Number(maxSizeMb) || 20,
      allowedExt: allowedExt.trim() || 'pdf,jpg,jpeg,png',
      retentionYears: Number(retentionYears) || 7,
      requiresApproval,
      requiredFor: selectedTags,
      isActive: true,
    });
    setDocTypeCode('');
    setDocTypeName('');
    onClose();
  };

  if (!open) return null;

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Add document type"
      saveLabel="Create document type"
      perm="admin.config.manage"
      reason="Configure required and optional attachments across terminal workflows."
      onSave={handleSave}
    >
      <div className="form-grid">
        <Field label="Document code" required hint="Short code (e.g. SURVEY_REPORT)">
          <Input
            value={docTypeCode}
            onChange={(e) => setDocTypeCode(e.target.value.toUpperCase())}
            placeholder="e.g. SURVEY_REPORT"
            autoFocus
          />
        </Field>
        <Field label="Document name" required hint="Display label for uploads and tabs">
          <Input
            value={docTypeName}
            onChange={(e) => setDocTypeName(e.target.value)}
            placeholder="e.g. Damage Survey Report"
          />
        </Field>
        <Field label="Attached to" hint="What entity this document attaches to">
          <Select
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value)}
            options={APPLIES_TO_OPTIONS}
          />
        </Field>
        <Field label="Max size (MB)">
          <Input
            type="number"
            value={maxSizeMb}
            onChange={(e) => setMaxSizeMb(Number(e.target.value))}
          />
        </Field>
        <Field label="Allowed file types" hint="Comma-separated extensions">
          <Input
            value={allowedExt}
            onChange={(e) => setAllowedExt(e.target.value)}
            placeholder="pdf,jpg,jpeg,png"
          />
        </Field>
        <Field label="Retention (years)" hint="TRA requires 5 years for tax records">
          <Input
            type="number"
            value={retentionYears}
            onChange={(e) => setRetentionYears(Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="Required for flows" hint="Select the operations where this document must be uploaded">
        <div className="row-wrap" style={{ gap: 6, marginTop: 4 }}>
          {REQUIRED_TAGS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`tag ${active ? 'tag-primary' : ''}`}
                style={{
                  cursor: 'pointer',
                  border: active ? '1px solid var(--accent, #0066cc)' : '1px solid var(--line, #ccc)',
                  background: active ? 'var(--accent-subtle, #e6f0ff)' : 'transparent',
                  color: active ? 'var(--accent, #0066cc)' : 'inherit',
                  fontWeight: active ? 600 : 400,
                  padding: '4px 8px',
                  borderRadius: 4,
                }}
                onClick={() => toggleTag(tag)}
              >
                {active ? `✓ ${tag}` : `+ ${tag}`}
              </button>
            );
          })}
        </div>
      </Field>

      <Check
        label="A supervisor approves it before it counts (e.g. a scanned release)"
        checked={requiresApproval}
        onChange={(e) => setRequiresApproval(e.target.checked)}
      />
    </EditDrawer>
  );
}

