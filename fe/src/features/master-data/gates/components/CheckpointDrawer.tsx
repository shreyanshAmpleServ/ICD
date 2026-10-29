import { Banner, Check, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { checkpoints as seedCps, Gate } from '@/mock/admin';

type CP = (typeof seedCps)[number];

interface CheckpointDrawerProps {
  cpEdit: CP | null;
  siteGates: Gate[];
  onClose: () => void;
  onSave: (cp: CP) => void;
  setCpEdit: React.Dispatch<React.SetStateAction<CP | null>>;
}

export function CheckpointDrawer({ cpEdit, siteGates, onClose, onSave, setCpEdit }: CheckpointDrawerProps) {
  if (!cpEdit) return null;

  return (
    <EditDrawer
      open
      onClose={onClose}
      title={`Checkpoint ${cpEdit.checkpointCode}`}
      saveLabel="Save checkpoint"
      perm="admin.gate.configure"
      onSave={() => onSave(cpEdit)}
    >
      <Field label="Name">
        <Input value={cpEdit.checkpointName} onChange={(e) => setCpEdit({ ...cpEdit, checkpointName: e.target.value })} />
      </Field>
      <Field label="At gate">
        <Select
          value={String(cpEdit.gateId ?? '')}
          onChange={(e) => setCpEdit({ ...cpEdit, gateId: Number(e.target.value) })}
          options={siteGates.map((g) => [String(g.gateId), g.gateName])}
        />
      </Field>
      <Check label="Active" checked={cpEdit.isActive} onChange={(e) => setCpEdit({ ...cpEdit, isActive: e.target.checked })} />
      {!cpEdit.isActive && (
        <Banner tone="wait">Visit types that use this checkpoint skip it while it is inactive.</Banner>
      )}
    </EditDrawer>
  );
}
