import { useMemo, useState } from 'react';
import { Banner, Check, Field, Input, Panel } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import { locationTags, type YardNode } from '@/mock/admin';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

interface GenerateDrawerProps {
  open: boolean;
  onClose: () => void;
  parent: YardNode;
  onCreate: (rows: number, bays: number, tiers: number, a20: boolean, a40: boolean, a45: boolean, w: number, tags: string[]) => void;
}

export function GenerateDrawer({ open, onClose, parent, onCreate }: GenerateDrawerProps) {
  const aisle = parent.kind === 'AISLE';
  const [prefix, setPrefix] = useState(aisle ? `${parent.fullCode}-R` : parent.locationCode);
  const [rowFrom, setRowFrom] = useState((parent.rows ?? 0) + 1);
  const [rowTo, setRowTo] = useState((parent.rows ?? 0) + (parent.rows ? 2 : 4));
  const [bayFrom, setBayFrom] = useState(1);
  const [bayTo, setBayTo] = useState(Math.max(parent.bays ?? 0, aisle ? 6 : 8));
  const existing = parent.rows ?? 0;
  const [tiers, setTiers] = useState(parent.maxTier ?? (aisle ? 4 : 2));
  const [a20, setA20] = useState(parent.allows20 ?? true);
  const [a40, setA40] = useState(parent.allows40 ?? true);
  const [a45, setA45] = useState(parent.allows45 ?? false);
  const [w, setW] = useState(parent.maxWeightKg ?? 32500);
  const [tags, setTags] = useState<string[]>(parent.tags ?? []);
  const rows = Math.max(0, rowTo - rowFrom + 1), bays = Math.max(0, bayTo - bayFrom + 1);
  const count = rows * bays * tiers;
  const overlap = existing > 0 && rowFrom <= existing;
  const bad = rows === 0 || bays === 0 || tiers < 1 || tiers > 8 || count > 5000;
  const code = (r: number, b: number, t: number) => aisle ? `${prefix}${r}-${pad(b)}-${t}` : `${prefix}-${pad(r)}-${pad(b)}-${t}`;
  const samples = useMemo(() => {
    const s: string[] = [];
    for (let r = rowFrom; r <= rowTo && s.length < 6; r++)
      for (let b = bayFrom; b <= bayTo && s.length < 6; b++)
        for (let t = 1; t <= tiers && s.length < 6; t++)
          s.push(code(r, b, t));
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, rowFrom, rowTo, bayFrom, bayTo, tiers]);
  const last = rows && bays ? code(rowTo, bayTo, tiers) : '';
  const num = (v: string) => Math.max(0, Math.min(99, Number(v) || 0));

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      wide
      title={`Generate rows and bays in ${parent.locationCode}`}
      saveLabel={`Create ${count.toLocaleString()} slots`}
      perm="admin.yard.design"
      disabled={bad || overlap}
      onSave={() => onCreate(rowTo, bayTo, tiers, a20, a40, a45, w, tags)}
    >
      <div className="form-grid">
        <Field label="Code prefix" hint="Block code; rows and bays are added after it">
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
        </Field>
        <Field label={aisle ? 'Racks from' : 'Rows from'}>
          <Input type="number" min={1} value={rowFrom} onChange={(e) => setRowFrom(num(e.target.value))} />
        </Field>
        <Field label={aisle ? 'Racks to' : 'Rows to'}>
          <Input type="number" min={1} value={rowTo} onChange={(e) => setRowTo(num(e.target.value))} />
        </Field>
        <Field label={aisle ? 'Bins from' : 'Bays from'}>
          <Input type="number" min={1} value={bayFrom} onChange={(e) => setBayFrom(num(e.target.value))} />
        </Field>
        <Field label={aisle ? 'Bins to' : 'Bays to'}>
          <Input type="number" min={1} value={bayTo} onChange={(e) => setBayTo(num(e.target.value))} />
        </Field>
        <Field label={aisle ? 'Levels per bin' : 'Tiers (stack height)'} error={tiers > 8 ? 'At most 8' : undefined}>
          <Input type="number" min={1} max={8} value={tiers} onChange={(e) => setTiers(num(e.target.value))} />
        </Field>
        <Field label="Max weight per slot (kg)">
          <Input type="number" value={w} onChange={(e) => setW(Number(e.target.value))} />
        </Field>
      </div>
      {!aisle && (
        <Field label="Container sizes allowed">
          <div className="row-wrap" style={{ gap: 16 }}>
            <Check label="20 ft" checked={a20} onChange={(e) => setA20(e.target.checked)} />
            <Check label="40 ft" checked={a40} onChange={(e) => setA40(e.target.checked)} />
            <Check label="45 ft" checked={a45} onChange={(e) => setA45(e.target.checked)} />
          </div>
        </Field>
      )}
      <Field label="Tags for the new slots" hint="Allocation only suggests tagged slots for matching units (reefers to reefer plugs, DG to the hazardous area)">
        <div className="row-wrap" style={{ gap: 12 }}>
          {['REEFER', 'HAZARDOUS', 'EXAM', 'IMPORT', 'EXPORT', 'EMPTY', 'TRANSIT', 'DAMAGED', 'QUARANTINE'].map((t) => (
            <Check key={t} label={locationTags.find((x) => x.tagCode === t)?.tagName ?? t} checked={tags.includes(t)} onChange={(e) => setTags(e.target.checked ? [...tags, t] : tags.filter((x) => x !== t))} />
          ))}
        </div>
      </Field>

      <Panel title="Dry run" sub="Nothing is created until you confirm">
        <div className="stack">
          {overlap ? (
            <Banner tone="stop" title={`Rows ${pad(rowFrom)}–${pad(Math.min(rowTo, existing))} already exist`}>
              Start from row {pad(existing + 1)} to extend the block, or remove the existing rows first.
            </Banner>
          ) : count > 5000 ? (
            <Banner tone="stop" title="Too many in one go">
              Generate at most 5,000 slots per run.
            </Banner>
          ) : (
            <Banner tone="go" title={`${count.toLocaleString()} slots in ${rows} ${aisle ? 'racks' : 'rows'} × ${bays} ${aisle ? 'bins' : 'bays'} × ${tiers} ${aisle ? 'levels' : 'tiers'}`}>
              {rows * bays} ground positions{!aisle && ` · ${(rows * bays * tiers * (a40 ? 2 : 1)).toLocaleString()} TEU at full stack`}.
            </Banner>
          )}
          <div>
            <div className="xs faint" style={{ marginBottom: 4 }}>Sample codes</div>
            <div className="row-wrap">
              {samples.map((s) => <span key={s} className="adm-code-box">{s}</span>)}
              {last && <><span className="faint">…</span><span className="adm-code-box">{last}</span></>}
            </div>
          </div>
          {rows > 0 && bays > 0 && rows * bays <= 400 && (
            <div>
              <div className="xs faint" style={{ marginBottom: 4 }}>Preview (ground positions; existing rows grey, new rows yellow)</div>
              <div className="adm-grid" style={{ gridTemplateColumns: `repeat(${bayTo}, minmax(10px, 1fr))`, maxWidth: 480 }}>
                {Array.from({ length: rowTo }, (_, r) => Array.from({ length: bayTo }, (_, b) => {
                  const isNew = r + 1 >= rowFrom && b + 1 >= bayFrom;
                  const old = r + 1 <= existing && b + 1 <= (parent.bays ?? 0);
                  return <span key={`${r}-${b}`} className={isNew && !old ? 'new' : undefined} style={{ height: 12, background: old ? 'var(--steel)' : undefined }} />;
                }))}
              </div>
            </div>
          )}
        </div>
      </Panel>
    </EditDrawer>
  );
}
