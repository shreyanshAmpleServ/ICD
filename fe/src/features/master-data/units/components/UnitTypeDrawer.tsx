import { Check, Field, Input } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { unitTypes as seedTypes } from '@/mock/admin';

type UT = (typeof seedTypes)[number];

interface UnitTypeDrawerProps {
  edit: UT | null;
  onClose: () => void;
  onSave: () => void;
  setEdit: React.Dispatch<React.SetStateAction<UT | null>>;
}

export function UnitTypeDrawer({ edit, onClose, onSave, setEdit }: UnitTypeDrawerProps) {
  if (!edit) return null;

  return (
    <EditDrawer
      open={!!edit}
      onClose={onClose}
      title={`${edit.typeCode} · ${edit.typeName}`}
      saveLabel="Save unit type"
      perm="admin.config.manage"
      onSave={onSave}
    >
      <Field label="Name">
        <Input value={edit.typeName} onChange={(e) => setEdit({ ...edit, typeName: e.target.value })} />
      </Field>
      {edit.category === 'CONTAINER' && (
        <Field label="Default tare (kg)" hint="Used when the manifest has no tare">
          <Input type="number" value={edit.defaultTareKg ?? ''} onChange={(e) => setEdit({ ...edit, defaultTareKg: Number(e.target.value) })} />
        </Field>
      )}
      <Check
        label="Active: can be used on manifests and at the gate"
        checked={!!edit.isActive}
        onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
      />
      <p className="xs faint">The ISO code, size and TEU come from the seed and cannot be changed; add a new type instead.</p>
    </EditDrawer>
  );
}
