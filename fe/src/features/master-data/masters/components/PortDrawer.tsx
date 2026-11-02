import { useState } from 'react';
import { Check, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

export interface PortItem {
  portId?: number;
  unlocode?: string | null;
  portCode?: string;
  portName: string;
  countryCode: string;
  portKind: string;
  isActive?: boolean;
}

interface PortDrawerProps {
  open: boolean;
  onClose: () => void;
  port: PortItem;
  onSave: (p: PortItem) => void;
  isNew?: boolean;
}

export function PortDrawer({ open, onClose, port, onSave, isNew }: PortDrawerProps) {
  const [p, setP] = useState<PortItem>(port);
  const set = (partial: Partial<PortItem>) => setP((prev) => ({ ...prev, ...partial }));

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Add port / border' : `Edit ${port.portName}`}
      saveLabel={isNew ? 'Add port' : 'Save changes'}
      perm="masters.local.edit"
      disabled={!p.portName.trim()}
      onSave={() => onSave(p)}
    >
      <div className="form-grid">
        <Field label="Port / border name" required>
          <Input value={p.portName} onChange={(e) => set({ portName: e.target.value })} placeholder="e.g. Dar es Salaam" />
        </Field>
        <Field label="UN/LOCODE" hint="5-character location code (e.g. TZDAR)">
          <Input
            value={p.unlocode ?? ''}
            onChange={(e) => set({ unlocode: e.target.value.toUpperCase() })}
            placeholder="e.g. TZDAR"
          />
        </Field>
        <Field label="Kind">
          <Select
            value={p.portKind}
            onChange={(e) => set({ portKind: e.target.value })}
            options={[
              ['SEAPORT', 'Seaport'],
              ['BORDER', 'Border post'],
              ['ICD', 'Inland container depot (ICD)'],
            ]}
          />
        </Field>
        <Field label="Country code" hint="2-letter ISO code">
          <Input
            value={p.countryCode}
            onChange={(e) => set({ countryCode: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="TZ"
          />
        </Field>
      </div>
      <Field label="Status">
        <Check
          label="Port is active"
          checked={p.isActive ?? true}
          onChange={(e) => set({ isActive: e.target.checked })}
        />
      </Field>
    </EditDrawer>
  );
}

