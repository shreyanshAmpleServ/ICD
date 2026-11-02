import { useState } from 'react';
import { Check, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

export interface EquipmentItem {
  equipmentId?: number;
  siteId?: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  capacityKg?: number;
  status?: string;
  isActive?: boolean;
}

interface EquipmentDrawerProps {
  open: boolean;
  onClose: () => void;
  equipment: EquipmentItem;
  onSave: (eq: EquipmentItem) => void;
  isNew?: boolean;
}

const EQ_TYPES: [string, string][] = [
  ['REACH_STACKER', 'Reach stacker'],
  ['FORKLIFT', 'Forklift'],
  ['EMPTY_HANDLER', 'Empty handler'],
  ['TERMINAL_TRACTOR', 'Terminal tractor'],
  ['WEIGHBRIDGE', 'Weighbridge'],
];

export function EquipmentDrawer({ open, onClose, equipment, onSave, isNew }: EquipmentDrawerProps) {
  const [e, setE] = useState<EquipmentItem>(equipment);
  const set = (partial: Partial<EquipmentItem>) => setE((prev) => ({ ...prev, ...partial }));

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Add yard equipment' : `Edit ${equipment.equipmentName}`}
      saveLabel={isNew ? 'Add equipment' : 'Save changes'}
      perm="masters.local.edit"
      disabled={!e.equipmentCode.trim() || !e.equipmentName.trim()}
      onSave={() => onSave(e)}
    >
      <div className="form-grid">
        <Field label="Equipment code" required hint="e.g. RS-03">
          <Input
            value={e.equipmentCode}
            disabled={!isNew}
            onChange={(ev) => set({ equipmentCode: ev.target.value.toUpperCase() })}
            placeholder="e.g. RS-03"
          />
        </Field>
        <Field label="Equipment name" required>
          <Input
            value={e.equipmentName}
            onChange={(ev) => set({ equipmentName: ev.target.value })}
            placeholder="e.g. Reach stacker 3"
          />
        </Field>
        <Field label="Equipment type">
          <Select
            value={e.equipmentType}
            onChange={(ev) => set({ equipmentType: ev.target.value })}
            options={EQ_TYPES}
          />
        </Field>
        <Field label="Rated capacity (kg)" hint="Maximum safe working load in kg">
          <Input
            type="number"
            value={e.capacityKg ?? 45000}
            onChange={(ev) => set({ capacityKg: Number(ev.target.value) })}
          />
        </Field>
      </div>
      <Field label="Status">
        <Check
          label="Equipment is active and available"
          checked={e.isActive ?? true}
          onChange={(ev) => set({ isActive: ev.target.checked })}
        />
      </Field>
    </EditDrawer>
  );
}
