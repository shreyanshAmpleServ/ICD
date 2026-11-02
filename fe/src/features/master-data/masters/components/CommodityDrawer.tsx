import { useState } from 'react';
import { Check, Field, Input } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';

export interface CommodityItem {
  commodityId?: number;
  commodityCode: string;
  commodityName: string;
  hsCode?: string;
  isHazardous?: boolean;
  isActive?: boolean;
}

interface CommodityDrawerProps {
  open: boolean;
  onClose: () => void;
  commodity: CommodityItem;
  onSave: (c: CommodityItem) => void;
  isNew?: boolean;
}

export function CommodityDrawer({ open, onClose, commodity, onSave, isNew }: CommodityDrawerProps) {
  const [c, setC] = useState<CommodityItem>(commodity);
  const set = (partial: Partial<CommodityItem>) => setC((prev) => ({ ...prev, ...partial }));

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title={isNew ? 'Add commodity' : `Edit ${commodity.commodityName}`}
      saveLabel={isNew ? 'Add commodity' : 'Save changes'}
      perm="masters.local.edit"
      disabled={!c.commodityCode.trim() || !c.commodityName.trim()}
      onSave={() => onSave(c)}
    >
      <div className="form-grid">
        <Field label="Commodity code" required hint="Short uppercase code, e.g. TILES">
          <Input
            value={c.commodityCode}
            disabled={!isNew}
            onChange={(e) => set({ commodityCode: e.target.value.toUpperCase() })}
            placeholder="e.g. TILES"
          />
        </Field>
        <Field label="Commodity name" required>
          <Input
            value={c.commodityName}
            onChange={(e) => set({ commodityName: e.target.value })}
            placeholder="e.g. Ceramic tiles"
          />
        </Field>
        <Field label="HS heading / code" hint="Harmonized System 4 to 6 digit code">
          <Input
            value={c.hsCode ?? ''}
            onChange={(e) => set({ hsCode: e.target.value })}
            placeholder="e.g. 6907"
          />
        </Field>
      </div>
      <Field label="Classification">
        <Check
          label="Hazardous / Dangerous Goods (DG)"
          checked={Boolean(c.isHazardous)}
          onChange={(e) => set({ isHazardous: e.target.checked })}
        />
      </Field>
      <Field label="Status">
        <Check
          label="Commodity is active"
          checked={c.isActive ?? true}
          onChange={(e) => set({ isActive: e.target.checked })}
        />
      </Field>
    </EditDrawer>
  );
}

