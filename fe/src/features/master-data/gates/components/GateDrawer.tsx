import { useState, useEffect } from 'react';
import { Check, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { Gate } from '@/mock/admin';

interface GateDrawerProps {
  gate: Partial<Gate> | null;
  isNew?: boolean;
  onClose: () => void;
  onSave: (gate: Gate) => void;
}

const KIND_OPTIONS: [string, string][] = [
  ['OUTER', 'Outer gate'],
  ['INNER', 'Inner gate'],
  ['WEIGHBRIDGE', 'Weighbridge'],
  ['OTHER', 'Other'],
];

export function GateDrawer({ gate, isNew, onClose, onSave }: GateDrawerProps) {
  const [form, setForm] = useState<Partial<Gate>>({
    gateCode: '',
    gateName: '',
    gateKind: 'OUTER',
    isActive: true,
  });

  useEffect(() => {
    if (gate) {
      setForm({
        ...gate,
        gateKind: gate.gateKind || 'OUTER',
        isActive: gate.isActive ?? true,
      });
    }
  }, [gate]);

  if (!gate) return null;

  const title = isNew ? 'Add gate' : `Edit gate ${form.gateCode || ''}`;
  const saveLabel = isNew ? 'Add gate' : 'Save changes';
  const disabled = !form.gateCode?.trim() || !form.gateName?.trim();

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={title}
      saveLabel={saveLabel}
      perm="admin.gate.configure"
      disabled={disabled}
      onSave={() => onSave(form as Gate)}
    >
      <Field label="Gate code" required hint="e.g. OG1, IG1, WB1">
        <Input
          value={form.gateCode || ''}
          placeholder="e.g. OG2"
          onChange={(e) => setForm({ ...form, gateCode: e.target.value.toUpperCase() })}
        />
      </Field>

      <Field label="Gate name" required hint="Display name for drivers and operators">
        <Input
          value={form.gateName || ''}
          placeholder="e.g. North Gate (Outer)"
          onChange={(e) => setForm({ ...form, gateName: e.target.value })}
        />
      </Field>

      <Field label="Gate kind" required>
        <Select
          value={form.gateKind || 'OUTER'}
          onChange={(e) => setForm({ ...form, gateKind: e.target.value as any })}
          options={KIND_OPTIONS}
        />
      </Field>

      <Check
        label="Gate is operational and active"
        checked={!!form.isActive}
        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
      />
    </EditDrawer>
  );
}

