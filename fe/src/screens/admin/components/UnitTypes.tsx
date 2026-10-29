import { useState } from 'react';
import { CheckCircle2, OctagonX } from 'lucide-react';
import {
  Chips, DataTable, Field, Input, Panel, Pill, Segmented, Tabs, UnitNo, useToast, Check,
} from '@/ds/components';
import { iso6346 } from '@/mock/gen';
import { CUSTOMS_REF_NAME, SRC, cargoRegimes as seedRegimes, identityRules as seedRules, plateFormats, unitTypes as seedTypes } from '@/mock/admin';
import { AuditNote, EditDrawer, SetupPage, VerifyPill, YesNo, useEditable } from './AdminKit';
import { useQ, delay } from '@/api/query';
import { adminApi } from '../api';

/* Unit types and identity checks: /unit-types, /identity-rules,
   POST /identity/check. The test box runs the same rules the gate and the
   manifest import use, so an admin can show a gate officer why a number
   was refused. */
type Tab = 'types' | 'rules' | 'regimes';
type Cat = 'CONTAINER' | 'VEHICLE' | 'LOT';
type UT = (typeof seedTypes)[number];

export function UnitTypes() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('types');
  const [cat, setCat] = useState<Cat>('CONTAINER');
  const [types, setTypes] = useEditable<UT>('unitTypes', seedTypes);
  const { data: identityRulesData } = useQ<any>(['admin', 'identityRules'], () => delay(seedRules));
  const { data: cargoRegimesData } = useQ<any>(['admin', 'cargoRegimes'], () => delay(seedRegimes));
  const identityRules = (Array.isArray(identityRulesData) && identityRulesData.length > 0) ? identityRulesData : seedRules;
  const cargoRegimes = (Array.isArray(cargoRegimesData) && cargoRegimesData.length > 0) ? cargoRegimesData : seedRegimes;
  const [edit, setEdit] = useState<UT | null>(null);

  return (
    <SetupPage title="Unit types & checks" ms="M0" sub="What can sit in the yard, how its number is checked, and the cargo regimes"
      sources={[SRC.unitTypes, SRC.identity, SRC.regimes]}>
      <NumberTester />

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'types', label: 'Unit types', count: types.length }, { id: 'rules', label: 'Identity rules', count: identityRules.length + plateFormats.length },
        { id: 'regimes', label: 'Cargo regimes', count: cargoRegimes.length },
      ]} />

      {tab === 'types' && (
        <Panel flush>
          <div className="toolbar">
            <Chips<Cat> value={cat} onChange={setCat} options={(['CONTAINER', 'VEHICLE', 'LOT'] as Cat[]).map((c) => ({ id: c, label: { CONTAINER: 'Containers', VEHICLE: 'Vehicles', LOT: 'Cargo lots' }[c], count: types.filter((t) => t.category === c).length }))} />
          </div>
          <DataTable rows={types.filter((t) => t.category === cat)} rowKey={(t) => t.typeCode} onRow={setEdit} cols={cat === 'CONTAINER' ? [
            { key: 'c', header: 'ISO code', render: (t) => <span className="adm-cond strong">{t.typeCode}</span> },
            { key: 'a', header: 'Also called', render: (t) => <span className="small muted">{t.alias}</span> },
            { key: 'n', header: 'Name', render: (t) => t.typeName },
            { key: 'l', header: 'Length', num: true, render: (t) => `${t.lengthFt} ft` },
            { key: 'h', header: 'Height', render: (t) => t.heightCode === 'HC' ? 'High cube' : 'Standard' },
            { key: 'teu', header: 'TEU', num: true, render: (t) => t.teu },
            { key: 'f', header: 'Kind', render: (t) => <span className="row-wrap">{t.isReefer && <Pill tone="info">Reefer</Pill>}{t.isTank && <Pill tone="info">Tank</Pill>}{t.isOpenTop && <Pill tone="info">Open top</Pill>}{t.isFlatRack && <Pill tone="info">Flat rack</Pill>}</span> },
            { key: 't', header: 'Default tare', num: true, render: (t) => `${t.defaultTareKg?.toLocaleString()} kg` },
            { key: 'act', header: 'Active', render: (t) => <YesNo v={t.isActive} /> },
          ] : [
            { key: 'c', header: 'Code', render: (t) => <span className="adm-cond strong">{t.typeCode}</span> },
            { key: 'n', header: 'Name', render: (t) => t.typeName },
            ...(cat === 'VEHICLE' ? [{ key: 'b', header: 'Needs bay size', render: (t: UT) => t.baySizeRequired?.toLowerCase() }] : []),
            { key: 'r', header: 'Identity rules (in order)', render: (t) => <span className="row-wrap">{(t.identityRules ?? []).map((r) => <span key={r} className="tag">{r}</span>)}</span> },
            { key: 'act', header: 'Active', render: (t) => <YesNo v={t.isActive} /> },
          ]} />
        </Panel>
      )}

      {tab === 'rules' && (
        <>
          <Panel flush title="Unit number rules" sub="A unit type can accept several rules; they are tried in order">
            <DataTable rows={identityRules} rowKey={(r) => r.ruleCode} cols={[
              { key: 'c', header: 'Rule', render: (r) => <><strong>{r.ruleName}</strong><div className="xs faint">{r.ruleCode}</div></> },
              { key: 'p', header: 'Pattern', render: (r) => <span className="adm-code-box">{r.regexPattern}</span> },
              { key: 'd', header: 'Check digit', render: (r) => r.checkDigitAlgo === 'NONE' ? <span className="faint">None</span> : <Pill tone="info">{r.checkDigitAlgo}</Pill> },
              { key: 'x', header: 'Example', render: (r) => <span className="adm-cond">{r.example}</span> },
              { key: 'n', header: 'Notes', render: (r) => <span className="small muted">{r.description}</span> },
            ]} />
          </Panel>
          <Panel flush title="Truck plate formats" sub="Plates are stored without spaces and shown with them">
            <DataTable rows={plateFormats} rowKey={(r) => r.code} cols={[
              { key: 'c', header: 'Country', render: (r) => <strong>{r.country}</strong> },
              { key: 'p', header: 'Pattern', render: (r) => <span className="adm-code-box">{r.pattern}</span> },
              { key: 'x', header: 'Example', render: (r) => <span className="unitno unitno-sm">{r.example}</span> },
              { key: 'n', header: 'Notes', render: (r) => <span className="row-wrap small muted">{r.note}{r.code === 'KE' && <VerifyPill>Verify</VerifyPill>}</span> },
            ]} />
          </Panel>
        </>
      )}

      {tab === 'regimes' && (
        <Panel flush title="Cargo regimes (Tanzania pack)" sub="Which customs references must be recorded before a unit under each regime can be released">
          <DataTable rows={cargoRegimes} rowKey={(r) => r.regimeCode} cols={[
            { key: 'c', header: 'Regime', render: (r) => <><strong>{r.regimeName}</strong><div className="xs faint">{r.regimeCode}</div></> },
            { key: 'cu', header: 'Needs customs', render: (r) => <YesNo v={r.requiresCustoms} /> },
            { key: 'r', header: 'References required for release', render: (r) => r.refs.length ? <span className="row-wrap">{r.refs.map((x: any) => <span key={x} className="tag">{CUSTOMS_REF_NAME[x]}</span>)}</span> : <span className="faint">None</span> },
          ]} />
        </Panel>
      )}
      <AuditNote />

      {edit && (
        <EditDrawer open onClose={() => setEdit(null)} title={`${edit.typeCode} · ${edit.typeName}`} saveLabel="Save unit type" perm="admin.config.manage"
          onSave={() => {
            adminApi.updateUnitType(edit.typeCode, edit).catch(() => {});
            setTypes((all) => all.map((t) => (t.typeCode === edit.typeCode ? edit : t)));
            toast('Unit type saved');
          }}>
          <Field label="Name"><Input value={edit.typeName} onChange={(e) => setEdit({ ...edit, typeName: e.target.value })} /></Field>
          {edit.category === 'CONTAINER' && <Field label="Default tare (kg)" hint="Used when the manifest has no tare"><Input type="number" value={edit.defaultTareKg ?? ''} onChange={(e) => setEdit({ ...edit, defaultTareKg: Number(e.target.value) })} /></Field>}
          <Check label="Active: can be used on manifests and at the gate" checked={!!edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
          <p className="xs faint">The ISO code, size and TEU come from the seed and cannot be changed; add a new type instead.</p>
        </EditDrawer>
      )}
    </SetupPage>
  );
}

/* ------------------------------------------------------------------ test a number */
type Mode = 'CONTAINER' | 'VEHICLE' | 'PLATE';
interface Result { ok: boolean; title: string; detail: string; normalized?: string }

export function checkContainer(raw: string): Result {
  const n = raw.replace(/[\s-]/g, '').toUpperCase();
  if (!n) return { ok: false, title: '', detail: '' };
  if (n.length !== 11) return { ok: false, title: `${n.length} characters, needs 11`, detail: '4 letters (owner code ending in U, J or Z) then 7 digits.', normalized: n };
  if (!/^[A-Z]{3}[UJZ]/.test(n)) return { ok: false, title: 'Owner code is wrong', detail: `"${n.slice(0, 4)}" must be three letters followed by U (freight), J (detachable equipment) or Z (trailer).`, normalized: n };
  if (!/^[A-Z]{4}\d{7}$/.test(n)) return { ok: false, title: 'Serial must be digits', detail: `"${n.slice(4)}" must be 7 digits.`, normalized: n };
  const cd = iso6346(n.slice(0, 10));
  if (cd !== n[10]) return { ok: false, title: `Check digit should be ${cd}, not ${n[10]}`, detail: 'Usually one digit was misread. Compare with the number painted on the door.', normalized: n };
  return { ok: true, title: 'Valid container number', detail: `Check digit ${cd} matches (ISO 6346).`, normalized: n };
}
export function checkVin(raw: string): Result {
  const n = raw.replace(/\s/g, '').toUpperCase();
  if (!n) return { ok: false, title: '', detail: '' };
  if (/^[A-Z0-9]{2,8}-[0-9]{4,8}$/.test(n)) return { ok: true, title: 'Valid Japanese frame number', detail: 'Accepted by rule JP_FRAME (model code, dash, serial).', normalized: n };
  const bad = [...new Set(n.split('').filter((c) => !/[A-HJ-NPR-Z0-9]/.test(c)))];
  if (bad.length) return { ok: false, title: `Not allowed: ${bad.join(', ')}`, detail: bad.some((c) => 'IOQ'.includes(c)) ? 'VINs never use I, O or Q: they are read as 1 and 0. Check the plate on the dashboard.' : 'Only letters and digits.', normalized: n };
  if (n.length !== 17) return { ok: false, title: `${n.length} characters, needs 17`, detail: n.length < 17 ? 'Missing characters. If it has a dash it may be a Japanese frame number.' : 'Too many characters.', normalized: n };
  return { ok: true, title: 'Valid VIN', detail: `World manufacturer code ${n.slice(0, 3)}; serial ${n.slice(9)}. Check digit not enforced (only North American VINs use it).`, normalized: n };
}
function checkPlate(raw: string): Result {
  const n = raw.toUpperCase().trim();
  if (!n) return { ok: false, title: '', detail: '' };
  const hit = plateFormats.find((f) => new RegExp(f.pattern).test(n));
  return hit ? { ok: true, title: `Valid ${hit.country} plate`, detail: `Stored as ${n.replace(/\s/g, '')}.`, normalized: n } : { ok: false, title: 'No plate format matches', detail: 'Check the country, or record it as a foreign plate with a supervisor.', normalized: n };
}

function NumberTester() {
  const [mode, setMode] = useState<Mode>('CONTAINER');
  const [v, setV] = useState('MSKU 402117 8');
  const r = mode === 'CONTAINER' ? checkContainer(v) : mode === 'VEHICLE' ? checkVin(v) : checkPlate(v);
  const examples: Record<Mode, string[]> = { CONTAINER: ['MSKU 402117 8', 'MSKU 402117 3', 'CSQU3054383', 'MSKU 40217'], VEHICLE: ['JTMHV05J604123456', 'JTMHV05J6O4123456', 'NZE141-1234567'], PLATE: ['T 412 DKL', 'BAK 4471', 'T 41 DKL'] };
  return (
    <Panel title="Test a number" sub="Runs the same checks as the gate, the yard handheld and the manifest import">
      <div className="stack">
        <Segmented<Mode> label="What to test" value={mode} onChange={(m) => { setMode(m); setV(examples[m][0]); }} options={[{ id: 'CONTAINER', label: 'Container' }, { id: 'VEHICLE', label: 'VIN or frame' }, { id: 'PLATE', label: 'Truck plate' }]} />
        <div className="adm-test">
          <Input value={v} onChange={(e) => setV(e.target.value)} aria-label="Number to test" placeholder={examples[mode][0]} spellCheck={false} autoCapitalize="characters" />
        </div>
        <div className="row-wrap xs"><span className="faint">Try:</span>{examples[mode].map((x) => <button key={x} className="chip" style={{ height: 24 }} onClick={() => setV(x)}>{x}</button>)}</div>
        {r.title && (
          <div className={`banner ${r.ok ? 'banner-go' : 'banner-stop'}`} role="status" aria-live="polite">
            {r.ok ? <CheckCircle2 /> : <OctagonX />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="strong">{r.title}</div>
              <div className="small">{r.detail}</div>
              {r.ok && r.normalized && mode !== 'PLATE' && <div style={{ marginTop: 6 }}><UnitNo no={r.normalized} category={mode} size="md" /></div>}
              {mode === 'VEHICLE' && r.normalized && <div className="xs muted" style={{ marginTop: 4 }}>{r.normalized.length} of 17 characters</div>}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
