import { useState } from 'react';
import { Field, Select, Segmented } from '@/ds/components';
import { ROLES } from '@/app/roles';
import { FIELD_CATALOGUE, type FieldRule } from '@/mock/admin';
import { EditDrawer, useDynamicRoles } from '../../shared/AdminKit';

type Access = 'HIDDEN' | 'READONLY' | 'MANDATORY';

export function RuleDrawer({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (r: FieldRule) => void;
}) {
  const { options: roleOptions } = useDynamicRoles();
  const [role, setRole] = useState('GATE_OFFICER');
  const [field, setField] = useState(`${FIELD_CATALOGUE[0].entity}.${FIELD_CATALOGUE[0].field}`);
  const [acc, setAcc] = useState<Access>('HIDDEN');
  const [entity, fname] = field.split('.');

  return (
    <EditDrawer
      open
      onClose={onClose}
      title="Add field rule"
      saveLabel="Add field rule"
      perm="admin.config.manage"
      onSave={() =>
        onSave({
          fieldRuleId: 900,
          roleCode: role,
          entityName: entity,
          fieldName: fname,
          accessLevel: acc === 'MANDATORY' ? 'READONLY' : acc,
          mandatory: acc === 'MANDATORY',
          uiOnly: acc === 'MANDATORY',
        })
      }
    >
      <Field label="Role">
        <Select value={role} onChange={(e) => setRole(e.target.value)} options={roleOptions.length > 0 ? roleOptions : ROLES.map((r) => [r.code, r.name])} />
      </Field>
      <Field label="Field">
        <Select
          value={field}
          onChange={(e) => setField(e.target.value)}
          options={FIELD_CATALOGUE.map((f) => [`${f.entity}.${f.field}`, `${f.label} · ${f.screen}`])}
        />
      </Field>
      <Field label="Rule">
        <Segmented
          value={acc}
          onChange={setAcc}
          options={[
            { id: 'HIDDEN', label: 'Hidden' },
            { id: 'READONLY', label: 'Read-only' },
            { id: 'MANDATORY', label: 'Mandatory' },
          ]}
        />
      </Field>
      {acc === 'HIDDEN' && (
        <p className="small muted">
          The API leaves the field out of every response for this role, including exports and Aiva answers.
        </p>
      )}
    </EditDrawer>
  );
}
