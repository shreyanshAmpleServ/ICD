import { useState } from 'react';
import { ArrowDown, ArrowUp, Camera, Plus, Trash2 } from 'lucide-react';
import { Banner, Button, Check, Field, Input, Panel, Select } from '@/ds/components';
import { SaveBar } from '../../shared/AdminKit';
import type { inspectionTemplates as seedTpl } from '@/mock/admin';

type Tpl = (typeof seedTpl)[number];
type Item = Tpl['items'][number];
const INPUT: Record<string, string> = { OK_DAMAGE: 'OK / damage', YES_NO: 'Yes / no', NUMBER: 'Number', TEXT: 'Text', CHOICE: 'Choice' };
const AREAS = ['EXTERIOR', 'INTERIOR', 'ROOF', 'FLOOR', 'DOORS', 'WALLS', 'CORNERS', 'UNDERCARRIAGE', 'ENGINE', 'CABIN', 'ACCESSORIES', 'DOCUMENTS', 'SEAL', 'OTHER'] as const;

interface ChecklistEditorProps {
  tpl: Tpl;
  onSave: (t: Tpl) => void;
}

export function ChecklistEditor({ tpl, onSave }: ChecklistEditorProps) {
  const [t, setT] = useState(tpl);
  const [newName, setNewName] = useState('');
  const dirty = JSON.stringify(t) !== JSON.stringify(tpl);
  const items = [...t.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const setItems = (xs: Item[]) => setT({ ...t, items: xs.map((x, i) => ({ ...x, sortOrder: (i + 1) * 10 })) });
  const move = (i: number, d: -1 | 1) => {
    const s = [...items];
    [s[i], s[i + d]] = [s[i + d], s[i]];
    setItems(s);
  };
  const upd = (i: number, p: Partial<Item>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <>
      <Panel
        title={t.templateName}
        sub={<span><span className="adm-code">{t.templateCode}</span> · {t.category.toLowerCase()} · {t.inspectionKind.replace('_', '-').toLowerCase()} · version {t.versionNo}</span>}
      >
        <div className="row-wrap" style={{ gap: 24 }}>
          <Field label="Minimum photos" hint="The inspector cannot finish with fewer">
            <span className="row">
              <Camera size={16} />
              <Input type="number" min={0} max={20} value={t.minPhotos} onChange={(e) => setT({ ...t, minPhotos: Number(e.target.value) })} style={{ width: 90 }} />
            </span>
          </Field>
          {t.fixedFields && (
            <div className="field">
              <label>Also recorded on every {t.category.toLowerCase()} inspection</label>
              <div className="row-wrap">{t.fixedFields.map((f) => <span key={f} className="tag">{f}</span>)}</div>
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Checklist items" sub="In the order the inspector walks round the unit">
        <ol className="adm-order">
          {items.map((it, i) => (
            <li key={it.itemCode} style={{ flexWrap: 'wrap' }}>
              <span className="n">{i + 1}</span>
              <span style={{ flex: '1 1 200px', minWidth: 0 }}>
                <strong className="small">{it.itemName}</strong>
                <div className="xs faint">{it.itemCode} · {it.area.toLowerCase()}</div>
              </span>
              <Select aria-label={`Answer type for ${it.itemName}`} value={it.inputType} onChange={(e) => upd(i, { inputType: e.target.value as Item['inputType'] })} options={Object.entries(INPUT)} style={{ width: 130 }} />
              <Check label="Required" checked={it.isMandatory} onChange={(e) => upd(i, { isMandatory: e.target.checked })} />
              <Button size="sm" variant="ghost" icon={<ArrowUp />} aria-label={`Move ${it.itemName} up`} disabled={i === 0} onClick={() => move(i, -1)} />
              <Button size="sm" variant="ghost" icon={<ArrowDown />} aria-label={`Move ${it.itemName} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)} />
              <Button size="sm" variant="ghost" icon={<Trash2 />} aria-label={`Remove ${it.itemName}`} onClick={() => setItems(items.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ol>
        <div className="row-wrap" style={{ marginTop: 12 }}>
          <Input aria-label="New item" placeholder="New item, e.g. Fire extinguisher present" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ maxWidth: 320 }} />
          <Button
            size="sm"
            icon={<Plus />}
            disabled={newName.trim().length < 3}
            onClick={() => {
              setItems([...items, { inspectionItemId: 900 + items.length, itemCode: newName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 20), itemName: newName, area: AREAS[0], inputType: 'YES_NO', isMandatory: false, sortOrder: 0 }]);
              setNewName('');
            }}
          >
            Add item
          </Button>
        </div>
      </Panel>
      {dirty && (
        <Banner tone="info" title={`Saving creates version ${tpl.versionNo + 1}`}>
          Inspections already recorded keep version {tpl.versionNo}. Tablets pick up the new version at their next sync.
        </Banner>
      )}
      <SaveBar>
        <Button variant="ghost" disabled={!dirty} onClick={() => setT(tpl)}>Undo changes</Button>
        <Button variant="primary" perm="admin.config.manage" disabled={!dirty || items.length === 0} onClick={() => onSave({ ...t, items, versionNo: tpl.versionNo + 1 })}>
          Save as version {tpl.versionNo + 1}
        </Button>
      </SaveBar>
    </>
  );
}
