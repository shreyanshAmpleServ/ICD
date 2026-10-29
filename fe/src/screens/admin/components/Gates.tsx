import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, DoorOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Banner, Button, Check, DL, DataTable, Field, Input, Panel, Pill, Segmented, Select, Tabs, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { SRC, checkpoints as seedCps, gates as seedGates, visitTypes as seedVts, type Gate } from '@/mock/admin';
import { AuditNote, SaveBar, EditDrawer, ListPanel, SetupPage, Split, YesNo, useEditable } from './AdminKit';
import { adminApi } from '../api';

/* Gates and visit types: /gates, /checkpoints, /visit-types. The visit
   type's checkpoint sequence is what the gate lane walks a truck through;
   optional checkpoints (dashed) can be skipped by the gate officer. */
type Tab = 'gates' | 'checkpoints' | 'visits';
type VT = (typeof seedVts)[number];
type Lane = NonNullable<Gate['lanes']>[number];
const DIR: Record<string, string> = { IN: 'In', OUT: 'Out', BOTH: 'In and out' };
const KIND: Record<string, string> = { OUTER: 'Outer gate', INNER: 'Inner gate', WEIGHBRIDGE: 'Weighbridge', OTHER: 'Other' };

export function Gates() {
  const { site } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('visits');
  const [gates, setGates] = useEditable<Gate>('gates', seedGates);
  const [cps, setCps] = useEditable('checkpoints', seedCps);
  const [vts, setVts] = useEditable<VT>('visitTypes', seedVts);
  const siteGates = gates.filter((g) => g.siteId === site.siteId);
  const [gateId, setGateId] = useState<number | null>(null);
  const [vtId, setVtId] = useState<number>(2);
  const [lane, setLane] = useState<{ gate: Gate; lane?: Lane } | null>(null);
  const [cpEdit, setCpEdit] = useState<(typeof seedCps)[number] | null>(null);
  const gate = siteGates.find((g) => g.gateId === gateId) ?? siteGates[0];
  const vt = vts.find((v) => v.visitTypeId === vtId) ?? vts[0];

  return (
    <SetupPage title="Gates & visit types" ms="M0" sub={`Gates, lanes, checkpoints and the route each kind of truck visit takes at ${site.siteName}`}
      sources={[SRC.gates, SRC.visitTypes]}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'visits', label: 'Visit types', count: vts.length }, { id: 'gates', label: 'Gates and lanes', count: siteGates.length },
        { id: 'checkpoints', label: 'Checkpoints', count: cps.length },
      ]} />

      {tab === 'gates' && (
        <Split narrow list={
          <ListPanel title="Gates" selected={gate?.gateId} onSelect={(id) => setGateId(Number(id))}
            actions={<Button size="sm" icon={<Plus />} perm="admin.gate.configure" onClick={() => {
              const newGate: any = { siteId: site.siteId, gateCode: `GATE-${siteGates.length + 1}`, gateName: `Gate ${siteGates.length + 1}`, gateKind: 'INNER', lanes: [{ gateLaneId: Date.now() % 10000, laneCode: 'L1', direction: 'IN', isActive: true }] };
              adminApi.createGate(newGate).then(g => { if (g?.gateId) setGates(all => [...all, g]); }).catch(() => {});
              toast('Gate added');
            }}>Add gate</Button>}
            items={siteGates.map((g) => ({ id: g.gateId!, lead: <DoorOpen size={18} />, title: `${g.gateCode} · ${g.gateName}`, sub: `${KIND[g.gateKind]} · ${g.lanes?.length ?? 0} lanes` }))} />
        }>
          {gate && (
            <Panel flush title={`${gate.gateCode} · ${gate.gateName}`} sub={KIND[gate.gateKind]}
              actions={<Button size="sm" icon={<Plus />} perm="admin.gate.configure" onClick={() => setLane({ gate })}>Add lane</Button>}>
              <DataTable rows={gate.lanes ?? []} rowKey={(l) => l.gateLaneId!} cols={[
                { key: 'c', header: 'Lane', render: (l) => <strong>{l.laneCode}</strong> },
                { key: 'd', header: 'Direction', render: (l) => <span className="row">{l.direction === 'OUT' ? <ArrowUp size={14} /> : l.direction === 'IN' ? <ArrowDown size={14} /> : <><ArrowDown size={14} /><ArrowUp size={14} /></>}{DIR[l.direction]}</span> },
                { key: 'a', header: 'Status', render: (l) => l.isActive ? <Pill tone="go">Open</Pill> : <Pill>Closed</Pill> },
                { key: 'e', header: '', render: (l) => <Button size="sm" variant="ghost" icon={<Pencil />} perm="admin.gate.configure" onClick={() => setLane({ gate, lane: l })}>Edit</Button> },
              ]} />
            </Panel>
          )}
          <AuditNote />
        </Split>
      )}

      {tab === 'checkpoints' && (
        <Panel flush title="Checkpoints" sub="Places where a truck is checked. A checkpoint belongs to a gate; the tablet at that gate shows trucks waiting for it.">
          <DataTable rows={cps} rowKey={(c) => c.checkpointId!} onRow={setCpEdit} cols={[
            { key: 'c', header: 'Code', render: (c) => <span className="adm-code">{c.checkpointCode}</span> },
            { key: 'n', header: 'Name', render: (c) => <strong>{c.checkpointName}</strong> },
            { key: 'k', header: 'Kind', render: (c) => <span className="small">{c.checkpointKind.replace('_', ' ').toLowerCase()}</span> },
            { key: 'g', header: 'At gate', render: (c) => gates.find((g) => g.gateId === c.gateId)?.gateName ?? '—' },
            { key: 'u', header: 'Used by', render: (c) => <span className="small">{vts.filter((v) => v.checkpoints.some((x) => x.checkpointCode === c.checkpointCode)).length} visit types</span> },
            { key: 'a', header: 'Active', render: (c) => <YesNo v={c.isActive} /> },
          ]} />
        </Panel>
      )}

      {tab === 'visits' && vt && (
        <Split list={
          <ListPanel title="Visit types" selected={vt.visitTypeId} onSelect={(id) => setVtId(Number(id))}
            actions={<Button size="sm" icon={<Plus />} perm="admin.gate.configure" onClick={() => toast('Visit type added')}>Add</Button>}
            items={vts.map((v) => ({ id: v.visitTypeId!, title: v.visitTypeName, sub: `${v.checkpoints.length} checkpoints${v.requiresAppointment ? ' · appointment' : ''}` }))} />
        }>
          <VisitTypeEditor key={vt.visitTypeId} vt={vt} cps={cps} onSave={(nv) => {
            if (nv.visitTypeId) adminApi.updateVisitType(Number(nv.visitTypeId), nv).catch(() => {});
            setVts((all) => all.map((x) => (x.visitTypeId === nv.visitTypeId ? nv : x)));
            toast('Visit type saved');
          }} />
        </Split>
      )}

      {lane && <LaneDrawer key={lane.lane?.gateLaneId ?? 'new'} gate={lane.gate} lane={lane.lane} onClose={() => setLane(null)}
        onSave={(l) => {
          const updatedLanes = lane.lane ? lane.gate.lanes!.map((x) => (x.gateLaneId === l.gateLaneId ? l : x)) : [...(lane.gate.lanes ?? []), l];
          if (lane.gate.gateId) adminApi.updateGate(Number(lane.gate.gateId), { lanes: updatedLanes }).catch(() => {});
          setGates((all) => all.map((g) => g.gateId !== lane.gate.gateId ? g : { ...g, lanes: updatedLanes }));
          toast(lane.lane ? 'Lane saved' : 'Lane added');
        }} />}

      {cpEdit && (
        <EditDrawer open onClose={() => setCpEdit(null)} title={`Checkpoint ${cpEdit.checkpointCode}`} saveLabel="Save checkpoint" perm="admin.gate.configure"
          onSave={() => {
            if (cpEdit.checkpointId) adminApi.updateCheckpoint(Number(cpEdit.checkpointId), cpEdit).catch(() => {});
            setCps((all) => all.map((c) => (c.checkpointId === cpEdit.checkpointId ? cpEdit : c)));
            toast('Checkpoint saved');
          }}>
          <Field label="Name"><Input value={cpEdit.checkpointName} onChange={(e) => setCpEdit({ ...cpEdit, checkpointName: e.target.value })} /></Field>
          <Field label="At gate"><Select value={String(cpEdit.gateId ?? '')} onChange={(e) => setCpEdit({ ...cpEdit, gateId: Number(e.target.value) })} options={siteGates.map((g) => [String(g.gateId), g.gateName])} /></Field>
          <Check label="Active" checked={cpEdit.isActive} onChange={(e) => setCpEdit({ ...cpEdit, isActive: e.target.checked })} />
          {!cpEdit.isActive && <Banner tone="wait">Visit types that use this checkpoint skip it while it is inactive.</Banner>}
        </EditDrawer>
      )}
    </SetupPage>
  );
}

function VisitTypeEditor({ vt, cps, onSave }: { vt: VT; cps: typeof seedCps; onSave: (v: VT) => void }) {
  const [v, setV] = useState(vt);
  const [add, setAdd] = useState('');
  const seq = v.checkpoints;
  const dirty = JSON.stringify(v) !== JSON.stringify(vt);
  const setSeq = (s: VT['checkpoints']) => setV({ ...v, checkpoints: s.map((x, i) => ({ ...x, seqNo: i + 1 })) });
  const move = (i: number, d: -1 | 1) => { const s = [...seq]; [s[i], s[i + d]] = [s[i + d], s[i]]; setSeq(s); };
  const name = (c: string) => cps.find((x) => x.checkpointCode === c)?.checkpointName ?? c;
  const unused = cps.filter((c) => !seq.some((s) => s.checkpointCode === c.checkpointCode));
  const codes = seq.map((s) => s.checkpointCode);
  const problems = [
    codes[0] !== 'OUTER_IN' && 'The first checkpoint should be Outer gate in: that is where the visit starts.',
    codes.includes('OUTER_OUT') && codes.indexOf('INNER_OUT') > codes.indexOf('OUTER_OUT') && 'Inner gate out comes after outer gate out.',
    codes.includes('INNER_IN') && codes.includes('INNER_OUT') && codes.indexOf('INNER_IN') > codes.indexOf('INNER_OUT') && 'Inner gate in comes after inner gate out.',
  ].filter(Boolean) as string[];
  return (
    <>
      <Panel title={v.visitTypeName} sub={<span className="adm-code">{v.visitTypeCode}</span>}>
        <div className="stack">
          <div className="row-wrap" style={{ gap: 24 }}>
            <Check label="Needs a nomination (release order, booking or drop-off authorisation)" checked={!!v.requiresNomination} onChange={(e) => setV({ ...v, requiresNomination: e.target.checked })} />
            <Check label="Needs an appointment (Phase 2)" checked={!!v.requiresAppointment} onChange={(e) => setV({ ...v, requiresAppointment: e.target.checked })} />
          </div>
          <div>
            <div className="xs faint" style={{ marginBottom: 6 }}>Route the gate lane follows</div>
            <div className="adm-flow" aria-label="Checkpoint sequence">
              {seq.map((s, i) => <span key={s.checkpointCode} className="row" style={{ gap: 6 }}>{i > 0 && <ArrowRight />}<span className={s.isMandatory ? 'cp' : 'cp opt'}>{name(s.checkpointCode)}{!s.isMandatory && ' (optional)'}</span></span>)}
            </div>
          </div>
        </div>
      </Panel>
      <Panel title="Checkpoint sequence" sub="Order matters: the truck cannot pass a checkpoint before the ones above it">
        <div className="stack">
          {problems.map((p) => <Banner key={p} tone="stop">{p}</Banner>)}
          <ol className="adm-order">
            {seq.map((s, i) => (
              <li key={s.checkpointCode}>
                <span className="n">{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}><strong>{name(s.checkpointCode)}</strong><div className="xs faint">{s.checkpointCode}</div></span>
                <Check label="Required" checked={!!s.isMandatory} onChange={(e) => setSeq(seq.map((x, j) => (j === i ? { ...x, isMandatory: e.target.checked } : x)))} />
                <Button size="sm" variant="ghost" aria-label={`Move ${name(s.checkpointCode)} up`} icon={<ArrowUp />} disabled={i === 0} onClick={() => move(i, -1)} />
                <Button size="sm" variant="ghost" aria-label={`Move ${name(s.checkpointCode)} down`} icon={<ArrowDown />} disabled={i === seq.length - 1} onClick={() => move(i, 1)} />
                <Button size="sm" variant="ghost" aria-label={`Remove ${name(s.checkpointCode)}`} icon={<Trash2 />} onClick={() => setSeq(seq.filter((_, j) => j !== i))} />
              </li>
            ))}
          </ol>
          {unused.length > 0 && (
            <div className="row-wrap">
              <Select aria-label="Checkpoint to add" value={add} onChange={(e) => setAdd(e.target.value)} options={[['', 'Add a checkpoint…'], ...unused.map((c) => [c.checkpointCode, c.checkpointName] as [string, string])]} style={{ width: 240 }} />
              <Button size="sm" icon={<Plus />} disabled={!add} onClick={() => { setSeq([...seq, { seqNo: seq.length + 1, checkpointCode: add, isMandatory: true }]); setAdd(''); }}>Add to sequence</Button>
            </div>
          )}
          <SaveBar note="Trucks already on site keep the route they started with.">
            <Button variant="ghost" disabled={!dirty} onClick={() => setV(vt)}>Undo changes</Button>
            <Button variant="primary" perm="admin.gate.configure" disabled={!dirty || problems.length > 0} onClick={() => onSave(v)}>Save visit type</Button>
          </SaveBar>
        </div>
      </Panel>
      <Panel title="Where it is used"><DL items={[['Trucks today', '23'], ['On site now', '4'], ['Last changed', '12 Sep 2026 by Ashok K.']]} /></Panel>
    </>
  );
}

function LaneDrawer({ gate, lane, onClose, onSave }: { gate: Gate; lane?: Lane; onClose: () => void; onSave: (l: Lane) => void }) {
  const [l, setL] = useState<Lane>(lane ?? { gateLaneId: Date.parse('2026-10-07') % 1000, laneCode: '', direction: 'IN', isActive: true });
  return (
    <EditDrawer open onClose={onClose} title={lane ? `Edit lane ${lane.laneCode}` : `Add lane to ${gate.gateName}`} saveLabel={lane ? 'Save lane' : 'Add lane'} perm="admin.gate.configure"
      disabled={!l.laneCode} onSave={() => onSave(l)}>
      <Field label="Lane code" required hint="As painted on the lane"><Input value={l.laneCode} onChange={(e) => setL({ ...l, laneCode: e.target.value })} /></Field>
      <Field label="Direction"><Segmented value={l.direction} onChange={(d) => setL({ ...l, direction: d })} options={[{ id: 'IN', label: 'In' }, { id: 'OUT', label: 'Out' }, { id: 'BOTH', label: 'Both' }]} /></Field>
      <Check label="Open for traffic" checked={!!l.isActive} onChange={(e) => setL({ ...l, isActive: e.target.checked })} />
    </EditDrawer>
  );
}
