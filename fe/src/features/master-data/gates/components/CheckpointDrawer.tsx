import { Banner, Check, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { Gate } from '@/mock/admin';

interface CheckpointDrawerProps {
  cpEdit: any | null;
  siteGates: Gate[];
  onClose: () => void;
  onSave: (cp: any) => void;
  setCpEdit: React.Dispatch<React.SetStateAction<any | null>>;
}

const KIND_OPTIONS: [string, string][] = [
  ['OUTER_IN', 'Outer gate in'],
  ['INNER_IN', 'Inner gate in'],
  ['WEIGH_IN', 'Weigh in'],
  ['INNER_OUT', 'Inner gate out'],
  ['WEIGH_OUT', 'Weigh out'],
  ['OUTER_OUT', 'Outer gate out'],
  ['OTHER', 'Other (Inspection / Customs / CFS)'],
];

export function CheckpointDrawer({ cpEdit, siteGates, onClose, onSave, setCpEdit }: CheckpointDrawerProps) {
  if (!cpEdit) return null;

  const isNew = !!cpEdit.isNew;
  const title = isNew ? 'Add checkpoint' : `Edit checkpoint ${cpEdit.checkpointCode}`;
  const saveLabel = isNew ? 'Add checkpoint' : 'Save checkpoint';
  const disabled = !cpEdit.checkpointCode?.trim() || !cpEdit.checkpointName?.trim();

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={title}
      saveLabel={saveLabel}
      perm="admin.gate.configure"
      disabled={disabled}
      onSave={() => onSave(cpEdit)}
    >
      <Field label="Checkpoint code" required hint="e.g. OUTER_IN, WEIGH_IN, CP_CUSTOMS">
        <Input
          value={cpEdit.checkpointCode || ''}
          placeholder="e.g. CP_CUSTOMS"
          disabled={!isNew}
          onChange={(e) => setCpEdit({ ...cpEdit, checkpointCode: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
        />
      </Field>

      <Field label="Checkpoint name" required hint="Display name on checkpoint tablet">
        <Input
          value={cpEdit.checkpointName || ''}
          placeholder="e.g. Customs physical exam bay"
          onChange={(e) => setCpEdit({ ...cpEdit, checkpointName: e.target.value })}
        />
      </Field>

      <Field label="Checkpoint kind" required>
        <Select
          value={cpEdit.checkpointKind || 'OUTER_IN'}
          onChange={(e) => setCpEdit({ ...cpEdit, checkpointKind: e.target.value })}
          options={KIND_OPTIONS}
        />
      </Field>

      <Field label="At gate" hint="Physical gate where this checkpoint check happens">
        <Select
          value={String(cpEdit.gateId ?? '')}
          onChange={(e) => setCpEdit({ ...cpEdit, gateId: e.target.value ? Number(e.target.value) : null })}
          options={[['', 'No specific gate (Facility-wide)'], ...siteGates.map((g) => [String(g.gateId), `${g.gateCode} · ${g.gateName}`] as [string, string])]}
        />
      </Field>

      <Check
        label="Active"
        checked={cpEdit.isActive ?? true}
        onChange={(e) => setCpEdit({ ...cpEdit, isActive: e.target.checked })}
      />

      {!cpEdit.isActive && (
        <Banner tone="wait">Visit types that use this checkpoint skip it while it is inactive.</Banner>
      )}
    </EditDrawer>
  );
}
