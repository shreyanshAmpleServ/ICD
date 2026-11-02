import { useState } from 'react';
import { Check, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import { parties } from '@/mock/core';

export interface VesselItem {
  vesselId?: number;
  vesselName: string;
  imoNo?: string;
  lloydsImo?: string;
  callSign?: string;
  flagCountry?: string;
  countryCode?: string;
  operatorPartyId?: number | null;
  operatorName?: string;
  isActive?: boolean;
}

interface VesselDrawerProps {
  open: boolean;
  onClose: () => void;
  vessel: VesselItem;
  onSave: (v: VesselItem) => void;
  isNew?: boolean;
}

export function VesselDrawer({ open, onClose, vessel, onSave, isNew }: VesselDrawerProps) {
  const [v, setV] = useState<VesselItem>(vessel);
  const set = (partial: Partial<VesselItem>) => setV((prev) => ({ ...prev, ...partial }));

  const operators: [string, string][] = parties
    .filter((p) => (p.roles as any[]).some((r) => r === 'SHIPPING_LINE' || r === 'LINE' || r === 'CUSTOMER'))
    .map((p) => [String(p.partyId), p.partyName] as [string, string]);

  const operatorOpts: [string, string][] = operators.length > 0 ? operators : [
    ['1', 'A.P. Moller - Maersk'],
    ['2', 'Mediterranean Shipping Company'],
    ['3', 'CMA CGM Group'],
    ['4', 'Said Salim Bakhresa & Co Ltd'],
    ['5', 'Mohammed Enterprises Tanzania Limited'],
  ];

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Add vessel' : `Edit ${vessel.vesselName}`}
      saveLabel={isNew ? 'Add vessel' : 'Save changes'}
      perm="masters.local.edit"
      disabled={!v.vesselName.trim() || !(v.imoNo || v.lloydsImo)}
      onSave={() => onSave(v)}
    >
      <div className="form-grid">
        <Field label="Vessel name" required>
          <Input
            value={v.vesselName}
            onChange={(e) => set({ vesselName: e.target.value })}
            placeholder="e.g. Meridian Star"
          />
        </Field>
        <Field label="IMO number" required hint="7-digit IMO ship identifier">
          <Input
            value={v.imoNo || v.lloydsImo || ''}
            onChange={(e) => set({ imoNo: e.target.value.trim(), lloydsImo: e.target.value.trim() })}
            placeholder="e.g. 9701234"
          />
        </Field>
        <Field label="Call sign">
          <Input
            value={v.callSign ?? ''}
            onChange={(e) => set({ callSign: e.target.value.toUpperCase() })}
            placeholder="e.g. 3FMS7"
          />
        </Field>
        <Field label="Flag country code" hint="2-letter ISO country code">
          <Input
            value={v.flagCountry || v.countryCode || 'PA'}
            onChange={(e) => set({ flagCountry: e.target.value.toUpperCase().slice(0, 2), countryCode: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="PA"
          />
        </Field>
        <Field label="Operator / shipping line">
          <Select
            value={String(v.operatorPartyId ?? 1)}
            onChange={(e) => set({ operatorPartyId: Number(e.target.value) })}
            options={operatorOpts}
          />
        </Field>
      </div>
      <Field label="Status">
        <Check
          label="Vessel is active"
          checked={v.isActive ?? true}
          onChange={(e) => set({ isActive: e.target.checked })}
        />
      </Field>
    </EditDrawer>
  );
}
