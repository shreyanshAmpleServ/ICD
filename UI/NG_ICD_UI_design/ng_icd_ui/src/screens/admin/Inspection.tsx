import { useState } from 'react';
import { ArrowDown, ArrowUp, Camera, Car, Container, Plus, Trash2 } from 'lucide-react';
import {
  Banner, Button, Chips, DataTable, Field, Input, Panel, Pill, Select, Tabs, useToast, Check,
} from '@/ds/components';
import { SRC, damageCodes, inspectionTemplates as seedTpl } from '@/mock/admin';
import { SaveBar, ListPanel, SetupPage, Split, useEditable } from './AdminKit';

/* Inspection checklists: /inspection-templates (versioned), /damage-codes.
   Saving a change creates a new version; inspections already done keep
   the version they were recorded with. */
type Tab = 'templates' | 'damage';
type Tpl = (typeof seedTpl)[number];
type Item = Tpl['items'][number];
const INPUT: Record<string, string> = { OK_DAMAGE: 'OK / damage', YES_NO: 'Yes / no', NUMBER: 'Number', TEXT: 'Text', CHOICE: 'Choice' };
const AREAS = ['EXTERIOR', 'INTERIOR', 'ROOF', 'FLOOR', 'DOORS', 'WALLS', 'CORNERS', 'UNDERCARRIAGE', 'ENGINE', 'CABIN', 'ACCESSORIES', 'DOCUMENTS', 'SEAL', 'OTHER'] as const;

export function Inspection() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('templates');
  const [tpls, setTpls] = useEditable<Tpl>('inspTpl', seedTpl);
  const [sel, setSel] = useState(3);
  const [dcat, setDcat] = useState<'ALL' | 'CONTAINER' | 'VEHICLE'>('ALL');
  const tpl = tpls.find((t) => t.inspectionTemplateId === sel) ?? tpls[0];

  return (
    <SetupPage title="Inspection checklists" ms="M1" sub="What the inspector checks at gate-in and gate-out, in order, and the damage codes they pick from"
      sources={[SRC.inspection, SRC.damage]}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'templates', label: 'Checklists', count: tpls.length }, { id: 'damage', label: 'Damage codes', count: damageCodes.length }]} />
      {tab === 'templates' && tpl && (
        <Split narrow list={
          <ListPanel title="Checklists" selected={tpl.inspectionTemplateId} onSelect={(id) => setSel(Number(id))}
            actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Checklist added')}>Add</Button>}
            items={tpls.map((t) => ({ id: t.inspectionTemplateId, lead: t.category === 'VEHICLE' ? <Car size={18} /> : <Container size={18} />, title: t.templateName, sub: `Version ${t.versionNo} · ${t.items.length} items` }))} />
        }>
          <Editor key={tpl.inspectionTemplateId + '-' + tpl.versionNo} tpl={tpl} onSave={(t) => { setTpls((all) => all.map((x) => (x.inspectionTemplateId === t.inspectionTemplateId ? t : x))); toast(`Version ${t.versionNo} saved`); }} />
        </Split>
      )}
      {tab === 'damage' && (
        <Panel flush title="Damage codes" sub="Picked per finding; M&R estimates and claims group by them"
          actions={<Button size="sm" icon={<Plus />} perm="admin.config.manage" onClick={() => toast('Damage code added')}>Add damage code</Button>}>
          <div className="toolbar"><Chips value={dcat} onChange={setDcat} options={[{ id: 'ALL', label: 'All' }, { id: 'CONTAINER', label: 'Containers' }, { id: 'VEHICLE', label: 'Vehicles' }]} /></div>
          <DataTable rows={damageCodes.filter((d) => dcat === 'ALL' || d.appliesTo === dcat || d.appliesTo === 'ANY')} rowKey={(d) => d.damageCode} cols={[
            { key: 'c', header: 'Code', render: (d) => <span className="adm-cond strong">{d.damageCode}</span> },
            { key: 'n', header: 'Name', render: (d) => d.damageName },
            { key: 'a', header: 'Applies to', render: (d) => d.appliesTo === 'ANY' ? <span className="muted small">Containers and vehicles</span> : <Pill tone="info">{d.appliesTo === 'VEHICLE' ? 'Vehicles' : 'Containers'}</Pill> },
          ]} />
        </Panel>
      )}
    </SetupPage>
  );
}

function Editor({ tpl, onSave }: { tpl: Tpl; onSave: (t: Tpl) => void }) {
  const [t, setT] = useState(tpl);
  const [newName, setNewName] = useState('');
  const dirty = JSON.stringify(t) !== JSON.stringify(tpl);
  const items = [...t.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const setItems = (xs: Item[]) => setT({ ...t, items: xs.map((x, i) => ({ ...x, sortOrder: (i + 1) * 10 })) });
  const move = (i: number, d: -1 | 1) => { const s = [...items]; [s[i], s[i + d]] = [s[i + d], s[i]]; setItems(s); };
  const upd = (i: number, p: Partial<Item>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <>
      <Panel title={t.templateName} sub={<span><span className="adm-code">{t.templateCode}</span> · {t.category.toLowerCase()} · {t.inspectionKind.replace('_', '-').toLowerCase()} · version {t.versionNo}</span>}>
        <div className="row-wrap" style={{ gap: 24 }}>
          <Field label="Minimum photos" hint="The inspector cannot finish with fewer"><span className="row"><Camera size={16} /><Input type="number" min={0} max={20} value={t.minPhotos} onChange={(e) => setT({ ...t, minPhotos: Number(e.target.value) })} style={{ width: 90 }} /></span></Field>
          {t.fixedFields && (
            <div className="field"><label>Also recorded on every {t.category.toLowerCase()} inspection</label>
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
              <span style={{ flex: '1 1 200px', minWidth: 0 }}><strong className="small">{it.itemName}</strong><div className="xs faint">{it.itemCode} · {it.area.toLowerCase()}</div></span>
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
          <Button size="sm" icon={<Plus />} disabled={newName.trim().length < 3} onClick={() => {
            setItems([...items, { inspectionItemId: 900 + items.length, itemCode: newName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 20), itemName: newName, area: AREAS[0], inputType: 'YES_NO', isMandatory: false, sortOrder: 0 }]);
            setNewName('');
          }}>Add item</Button>
        </div>
      </Panel>
      {dirty && <Banner tone="info" title={`Saving creates version ${tpl.versionNo + 1}`}>Inspections already recorded keep version {tpl.versionNo}. Tablets pick up the new version at their next sync.</Banner>}
      <SaveBar>
        <Button variant="ghost" disabled={!dirty} onClick={() => setT(tpl)}>Undo changes</Button>
        <Button variant="primary" perm="admin.config.manage" disabled={!dirty || items.length === 0} onClick={() => onSave({ ...t, items, versionNo: tpl.versionNo + 1 })}>Save as version {tpl.versionNo + 1}</Button>
      </SaveBar>
    </>
  );
}
