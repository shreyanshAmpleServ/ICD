import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Banner, Button, Check, DL, Panel, Select } from '@/ds/components';
import { SaveBar } from '../../shared/AdminKit';
import type { checkpoints as seedCps, visitTypes as seedVts } from '@/mock/admin';

type VT = (typeof seedVts)[number];

interface VisitTypeEditorProps {
  vt: VT;
  cps: typeof seedCps;
  onSave: (v: VT) => void;
}

export function VisitTypeEditor({ vt, cps, onSave }: VisitTypeEditorProps) {
  const [v, setV] = useState(vt);
  const [add, setAdd] = useState('');
  const seq = v.checkpoints ?? [];
  const dirty = JSON.stringify(v) !== JSON.stringify(vt);
  const setSeq = (s: VT['checkpoints']) => setV({ ...v, checkpoints: s.map((x, i) => ({ ...x, seqNo: i + 1 })) });
  const move = (i: number, d: -1 | 1) => {
    const s = [...seq];
    [s[i], s[i + d]] = [s[i + d], s[i]];
    setSeq(s);
  };
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
              {seq.map((s, i) => (
                <span key={s.checkpointCode} className="row" style={{ gap: 6 }}>
                  {i > 0 && <ArrowRight />}
                  <span className={s.isMandatory ? 'cp' : 'cp opt'}>{name(s.checkpointCode)}{!s.isMandatory && ' (optional)'}</span>
                </span>
              ))}
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
