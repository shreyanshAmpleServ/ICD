import { useState } from 'react';
import { Check, Field, Input, Select } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import { locationTags, type YardNode } from '@/mock/admin';

interface AddBlockDrawerProps {
  open: boolean;
  onClose: () => void;
  area: YardNode;
  onAdd: (data: {
    code: string;
    name: string;
    tag: string;
    rows: number;
    bays: number;
    tiers: number;
    allows20: boolean;
    allows40: boolean;
    allows45: boolean;
    maxWeightKg: number;
  }) => void;
}

export function AddBlockDrawer({ open, onClose, area, onAdd }: AddBlockDrawerProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [tag, setTag] = useState('IMPORT');
  const [rows, setRows] = useState(6);
  const [bays, setBays] = useState(12);
  const [tiers, setTiers] = useState(4);
  const [allows20, setAllows20] = useState(true);
  const [allows40, setAllows40] = useState(true);
  const [allows45, setAllows45] = useState(false);
  const [maxWeightKg, setMaxWeightKg] = useState(32500);

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const isValid = cleanCode.length > 0 && rows > 0 && bays > 0 && tiers > 0;

  const handleSave = () => {
    if (!isValid) return;
    const finalName = name.trim() || `Block ${cleanCode} · ${locationTags.find((t) => t.tagCode === tag)?.tagName || 'General'}`;
    onAdd({
      code: cleanCode,
      name: finalName,
      tag,
      rows: Number(rows),
      bays: Number(bays),
      tiers: Number(tiers),
      allows20,
      allows40,
      allows45,
      maxWeightKg: Number(maxWeightKg) || 32500,
    });
    setCode('');
    setName('');
    onClose();
  };

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      wide
      title={`Add new block in ${area.name || area.locationCode}`}
      saveLabel="Create block and slots"
      perm="admin.yard.design"
      disabled={!isValid}
      onSave={handleSave}
    >
      <div className="form-grid">
        <Field label="Block code" required hint="Short code, e.g. E, F, G, HAZ, EXAM">
          <Input
            value={code}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setCode(val);
              if (!name) setName(`Block ${val}`);
            }}
            placeholder="e.g. E"
          />
        </Field>

        <Field label="Block name" required hint="Descriptive label">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Block E · Export staging"
          />
        </Field>

        <Field label="Primary purpose / tag">
          <Select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            options={locationTags.map((t) => [t.tagCode, t.tagName])}
          />
        </Field>

        <Field label="Rows" required>
          <Input type="number" min={1} max={30} value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value) || 1))} />
        </Field>

        <Field label="Bays" required>
          <Input type="number" min={1} max={50} value={bays} onChange={(e) => setBays(Math.max(1, Number(e.target.value) || 1))} />
        </Field>

        <Field label="Tiers (Stack height)" required>
          <Input type="number" min={1} max={8} value={tiers} onChange={(e) => setTiers(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
        </Field>

        <Field label="Max weight per slot (kg)">
          <Input type="number" value={maxWeightKg} onChange={(e) => setMaxWeightKg(Number(e.target.value) || 32500)} />
        </Field>
      </div>

      <Field label="Allowed container sizes">
        <div className="row-wrap" style={{ gap: 16, marginTop: 4 }}>
          <Check label="20 ft" checked={allows20} onChange={(e) => setAllows20(e.target.checked)} />
          <Check label="40 ft" checked={allows40} onChange={(e) => setAllows40(e.target.checked)} />
          <Check label="45 ft" checked={allows45} onChange={(e) => setAllows45(e.target.checked)} />
        </div>
      </Field>

      <div className="panel" style={{ padding: 12, marginTop: 12, background: 'var(--concrete)' }}>
        <div className="small strong">Block Summary</div>
        <div className="small muted" style={{ marginTop: 4 }}>
          This will register <strong>Block {cleanCode || '—'}</strong> under {area.locationCode} and generate {rows * bays} ground slots ({rows * bays * tiers} total slot positions across {tiers} tiers).
        </div>
      </div>
    </EditDrawer>
  );
}

