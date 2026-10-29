import { useMemo, useState } from 'react';
import { CheckCircle2, FileSignature, KeyRound, Search, Undo2 } from 'lucide-react';
import {
  Banner, Button, DL, DataTable, Drawer, Empty, Field, Input, Kpi, Page, PageHeader, Panel, Pill, SearchInput, Segmented, Select, Textarea, Timeline, UnitNo, ago, cx, useToast,
} from '@/ds/components';
import type { Tone } from '@/ds/status';
import type { S } from '@/api/types';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { KEY_HOOKS, keys, type Key } from '@/mock/ops';

/* Vehicle key cabinet (ICDV): GET /keys, POST /keys/{id}/movements with an
   Idempotency-Key. Every movement names the holder and is signed. */
const STATUS: Record<string, [string, Tone]> = { IN_CABINET: ['In cabinet', 'go'], ISSUED: ['Issued', 'wait'], HANDED_OVER: ['Handed over', 'idle'], LOST: ['Lost', 'stop'] };
const ACTION: Record<string, string> = { RECEIVE: 'Received from driver', STORE: 'Put on hook', ISSUE: 'Issued', RETURN: 'Returned', HAND_OVER: 'Handed over with the vehicle', LOST: 'Reported lost', FOUND: 'Found' };
const HOLDERS = ['Shabani R. (yard driver)', 'Neema K. (yard driver)', 'Juma M. (inspection)', 'Rehema K. (customs, TRA)', 'Workshop: Bahari Motors technician'];
type Flow = 'ISSUE' | 'RETURN' | 'LOST' | 'FOUND';
const NOW_ISO = new Date('2026-10-07T10:30:00+03:00').toISOString();

export function Keys() {
  const { site } = useSession();
  const toast = useToast();
  const { data = [] } = useQ(['keys'], () => delay(keys));
  const [patch, setPatch] = useState<Record<number, Partial<Key>>>({});
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const all = useMemo(() => data.map((k) => ({ ...k, ...patch[k.keyCustodyId!] }) as Key), [data, patch]);
  const open = all.find((k) => k.keyCustodyId === openId) ?? null;

  if (!site.facilities.includes('ICDV')) {
    return (
      <Page>
        <PageHeader title="Vehicle keys" ms="M1" />
        <Empty title="No key cabinet at this site">Vehicle keys are kept at the vehicle yard. Switch the site to DAR2 · Dar es Salaam vehicle yard from the top bar.</Empty>
      </Page>
    );
  }

  const n = q.replace(/\s/g, '').toUpperCase();
  const match = (k: Key) => !n || k.vin.includes(n) || k.keyTagNo.includes(n) || k.make.includes(n) || k.model.toUpperCase().includes(n);
  const byHook = new Map(all.filter((k) => k.hook).map((k) => [k.hook!, k]));
  const out = all.filter((k) => k.status === 'ISSUED' || k.status === 'LOST');

  const record = (k: Key, action: S<'KeyMovement'>['action'], p: Partial<Key>, extra: Partial<S<'KeyMovement'>>, msg: string) => {
    const mvmt: S<'KeyMovement'> = { keyMovementId: Date.parse(NOW_ISO) % 100000 + k.movements.length, action, occurredAt: NOW_ISO, by: 'Yard · you', ...extra };
    setPatch((x) => ({ ...x, [k.keyCustodyId!]: { ...x[k.keyCustodyId!], ...p, movements: [mvmt, ...k.movements] } }));
    toast(msg);
  };

  return (
    <Page wide>
      <PageHeader title="Vehicle keys" ms="M1" sub={`${site.siteName} · cabinet KC1 in the yard office, ${KEY_HOOKS} hooks`}
        actions={<SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="VIN, tag or make" aria-label="Find a key" />} />
      <div className="stack-lg">
        {all.some((k) => k.status === 'LOST') && <Banner tone="stop" title="1 key reported lost">The vehicle cannot be delivered with that key. Tell the consignee and record the replacement or the found key here.</Banner>}
        <div className="kpi-strip">
          <Kpi label="In the cabinet" value={all.filter((k) => k.status === 'IN_CABINET').length} />
          <Kpi label="Issued now" value={all.filter((k) => k.status === 'ISSUED').length} delta="Must come back by end of shift" />
          <Kpi label="Handed over" value={all.filter((k) => k.status === 'HANDED_OVER').length} delta="With delivered vehicles" />
          <Kpi label="Lost" value={all.filter((k) => k.status === 'LOST').length} />
          <Kpi label="Free hooks" value={KEY_HOOKS - byHook.size} />
        </div>

        <Panel title="Cabinet KC1" sub="One hook per vehicle. Select a hook to issue or return its key.">
          <div className="key-grid">
            {Array.from({ length: KEY_HOOKS }, (_, i) => {
              const k = byHook.get(i + 1);
              if (!k) return <div key={i} className="key-hook key-empty"><span className="xs faint">Hook {i + 1}</span><span className="xs faint">free</span></div>;
              const [label, tone] = STATUS[k.status!];
              return (
                <button key={i} className={cx('key-hook', `key-${tone}`, !match(k) && 'key-dim')} onClick={() => setOpenId(k.keyCustodyId!)}
                  aria-label={`Hook ${i + 1}, ${k.keyTagNo}, ${k.make} ${k.model}, ${label}`}>
                  <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}><span className="xs faint">Hook {i + 1}</span><KeyRound size={14} /></span>
                  <span className="strong" style={{ fontFamily: 'var(--font-cond)', fontSize: 16 }}>{k.keyTagNo}</span>
                  <span className="xs">{k.vin.slice(-6)} · {k.model}</span>
                  <span className="xs strong">{label}</span>
                </button>
              );
            })}
          </div>
          <div className="legend" style={{ marginTop: 12 }}>
            <span><i style={{ background: 'var(--go-soft)', border: '1px solid var(--go)' }} />In cabinet</span>
            <span><i style={{ background: 'var(--wait-soft)', border: '1px solid var(--wait)' }} />Issued</span>
            <span><i style={{ background: 'var(--stop-soft)', border: '1px solid var(--stop)' }} />Lost</span>
            <span><i style={{ background: 'var(--paper)', border: '1px dashed var(--ink-3)' }} />Free hook</span>
          </div>
        </Panel>

        <Panel title="Keys out of the cabinet" flush>
          <DataTable rows={out} rowKey={(k) => k.keyCustodyId!} onRow={(k) => setOpenId(k.keyCustodyId!)}
            empty={<Empty title="All keys are in the cabinet" />}
            cols={[
              { key: 'tag', header: 'Tag', render: (k) => <strong>{k.keyTagNo}</strong> },
              { key: 'vin', header: 'Vehicle', render: (k) => <><UnitNo no={k.vin} category="VEHICLE" /><div className="xs faint">{k.make} {k.model}</div></> },
              { key: 'st', header: 'Status', render: (k) => <Pill tone={STATUS[k.status!][1]}>{STATUS[k.status!][0]}</Pill> },
              { key: 'h', header: 'Holder', render: (k) => k.holderName ?? <span className="faint">Unknown</span> },
              { key: 'since', header: 'Since', render: (k) => ago(k.movements[0]?.occurredAt) },
              { key: 'why', header: 'Reason', render: (k) => <span className="small">{k.movements[0]?.reason}</span> },
            ]} />
        </Panel>
      </div>

      <Drawer open={!!open && !flow} onClose={() => setOpenId(null)} title={open ? `Key ${open.keyTagNo}` : ''}
        footer={open && <>
          {open.status === 'IN_CABINET' && <Button variant="primary" size="xl" icon={<KeyRound />} perm="yard.key.custody" onClick={() => setFlow('ISSUE')}>Issue key</Button>}
          {open.status === 'ISSUED' && <><Button size="xl" variant="danger" perm="yard.key.custody" onClick={() => setFlow('LOST')}>Report lost</Button><Button size="xl" variant="primary" icon={<Undo2 />} perm="yard.key.custody" onClick={() => setFlow('RETURN')}>Return key</Button></>}
          {open.status === 'LOST' && <Button size="xl" variant="primary" icon={<CheckCircle2 />} perm="yard.key.custody" onClick={() => setFlow('FOUND')}>Key found</Button>}
        </>}>
        {open && (
          <div className="stack">
            <UnitNo no={open.vin} category="VEHICLE" size="md" to={`/units/${open.unitStayId}`} />
            <DL items={[
              ['Vehicle', `${open.make} ${open.model}${open.colour ? ` · ${open.colour}` : ''}`], ['Parked at', open.unitLocation ?? '—'],
              ['Status', <Pill key="s" tone={STATUS[open.status!][1]}>{STATUS[open.status!][0]}</Pill>], ['Hook', open.hook ? `KC1 hook ${open.hook}` : '—'],
              ['Holder', open.holderName ?? '—'], ['Keys on the ring', `${open.keyCount}${open.hasRemote ? ' + remote' : ''}`],
            ]} />
            <h3 style={{ marginTop: 8 }}>Movements</h3>
            <Timeline items={open.movements.map((m) => ({
              at: m.occurredAt, title: ACTION[m.action] + (m.toHolderName ? ` · ${m.toHolderName}` : ''), detail: m.reason, by: m.by,
              tone: m.action === 'LOST' ? 'stop' : m.action === 'ISSUE' ? 'wait' : m.action === 'RETURN' || m.action === 'FOUND' || m.action === 'STORE' ? 'go' : undefined,
            }))} />
          </div>
        )}
      </Drawer>

      {open && flow && <MovementDrawer k={open} flow={flow} onClose={() => setFlow(null)} onDone={(holder, reason) => {
        if (flow === 'ISSUE') record(open, 'ISSUE', { status: 'ISSUED', holderName: holder }, { toHolderName: holder, reason }, `Key ${open.keyTagNo} issued to ${holder}`);
        if (flow === 'RETURN') record(open, 'RETURN', { status: 'IN_CABINET', holderName: undefined }, { reason: `Back on hook ${open.hook}. ${reason}`.trim() }, `Key ${open.keyTagNo} returned to hook ${open.hook}`);
        if (flow === 'LOST') record(open, 'LOST', { status: 'LOST', holderName: undefined }, { reason }, `Key ${open.keyTagNo} reported lost`);
        if (flow === 'FOUND') record(open, 'FOUND', { status: 'IN_CABINET', holderName: undefined }, { reason }, `Key ${open.keyTagNo} found and back on hook ${open.hook}`);
        setFlow(null);
      }} />}

      <style>{`
        .key-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 1100px) { .key-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 480px) { .key-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .key-hook { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 92px; padding: 8px 10px; border-radius: var(--r-md); border: 1px solid var(--steel); background: var(--paper); color: var(--ink); text-align: left; cursor: pointer; font: inherit; }
        .key-hook:focus-visible { outline: 3px solid var(--hivis); outline-offset: 2px; }
        .key-go { background: var(--go-soft); border-color: var(--go); }
        .key-wait { background: var(--wait-soft); border-color: var(--wait); }
        .key-stop { background: var(--stop-soft); border-color: var(--stop); }
        .key-empty { border-style: dashed; border-color: var(--ink-3); cursor: default; justify-content: space-between; }
        .key-dim { opacity: .3; }
      `}</style>
    </Page>
  );
}

function MovementDrawer({ k, flow, onClose, onDone }: { k: Key; flow: Flow; onClose: () => void; onDone: (holder: string, reason: string) => void }) {
  const [holder, setHolder] = useState(HOLDERS[0]);
  const [reason, setReason] = useState('');
  const [rings, setRings] = useState<'ALL' | 'PART'>('ALL');
  const [signed, setSigned] = useState(false);
  const needReason = flow !== 'RETURN';
  const ok = signed && (!needReason || reason.trim().length >= 3) && (flow !== 'RETURN' || rings === 'ALL' || reason.trim().length >= 3);
  const title = { ISSUE: `Issue ${k.keyTagNo}`, RETURN: `Return ${k.keyTagNo} to hook ${k.hook}`, LOST: `Report ${k.keyTagNo} lost`, FOUND: `Record ${k.keyTagNo} found` }[flow];
  const verb = { ISSUE: 'Issue key', RETURN: 'Return key', LOST: 'Report lost', FOUND: 'Put back on hook' }[flow];
  return (
    <Drawer open onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button size="xl" variant={flow === 'LOST' ? 'danger' : 'primary'} perm="yard.key.custody" disabled={!ok} onClick={() => onDone(holder, reason)}>{verb}</Button></>}>
      <div className="stack">
        <div className="row-wrap"><UnitNo no={k.vin} category="VEHICLE" /><span className="small muted">{k.make} {k.model} · {k.keyCount} key{k.keyCount === 1 ? '' : 's'}{k.hasRemote ? ' + remote' : ''}</span></div>
        {flow === 'ISSUE' && (
          <>
            <Field label="Who takes it?" required><Select value={holder} onChange={(e) => setHolder(e.target.value)} options={HOLDERS} /></Field>
            <Field label="What for?" required><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Move to wash bay" /></Field>
          </>
        )}
        {flow === 'RETURN' && (
          <>
            <p className="small">From <strong>{k.holderName}</strong>.</p>
            <Field label="Everything on the ring?"><div><Segmented xl value={rings} onChange={setRings} options={[{ id: 'ALL', label: `All ${k.keyCount}${k.hasRemote ? ' + remote' : ''}` }, { id: 'PART', label: 'Something missing' }]} /></div></Field>
            <Field label={rings === 'PART' ? 'What is missing?' : 'Note'} required={rings === 'PART'}><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          </>
        )}
        {flow === 'LOST' && (
          <>
            <Banner tone="stop">The vehicle cannot be handed over with this key. The holder ({k.holderName}) and the yard supervisor are notified.</Banner>
            <Field label="What happened?" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Where it was last seen, who searched" /></Field>
          </>
        )}
        {flow === 'FOUND' && <Field label="Where was it found?" required><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. In the ignition of the vehicle at V2-02-03" /></Field>}
        <Field label={flow === 'ISSUE' ? `${holder.split(' (')[0]} signs` : 'Holder signs'} required>
          <button type="button" className="sig" onClick={() => setSigned(true)} style={{ width: '100%', cursor: 'pointer', color: signed ? 'var(--go)' : undefined, borderColor: signed ? 'var(--go)' : undefined }}>
            {signed ? <><CheckCircle2 size={18} />&nbsp;Signed</> : <><FileSignature size={18} />&nbsp;Sign here</>}
          </button>
        </Field>
      </div>
    </Drawer>
  );
}
