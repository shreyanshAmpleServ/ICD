import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Play, ShieldQuestion, Truck, UserPlus, WifiOff } from 'lucide-react';
import {
  Banner, Button, Drawer, Empty, Field, Input, Kpi, Page, PageHeader, Pill, Segmented, Select, StatusPill, Tabs, Textarea, UnitNo, ago, cx, fmtT, useToast,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { equipment } from '@/mock/core';
import { MOVE_KIND, OPERATORS, candidatesFor, checkSlot, moveOrders, type Move } from '@/mock/ops';

/* Move orders: GET /move-orders for the handheld and the yard office.
   assign → start → complete, each with an Idempotency-Key; offline completes
   queue on the handheld with occurredAt. The slot suggestions come from
   POST /yard/allocation:suggest (rank 1–3 with reasons). */
type TabId = 'open' | 'mine' | 'done';
const MACHINES = equipment.filter((e) => ['REACH_STACKER', 'EMPTY_HANDLER', 'TERMINAL_TRACTOR'].includes(e.equipmentType));
const eqCode = (id?: number | null) => equipment.find((e) => e.equipmentId === id)?.equipmentCode;

export function Moves() {
  const { site, offline } = useSession();
  const toast = useToast();
  const { data = [] } = useQ(['move-orders'], () => delay(moveOrders));
  const [patch, setPatch] = useState<Record<number, Partial<Move>>>({});
  const [tab, setTab] = useState<TabId>('open');
  const [machine, setMachine] = useState('1');
  const [assign, setAssign] = useState<Move | null>(null);
  const [complete, setComplete] = useState<Move | null>(null);
  const vehicleSite = site.facilities.includes('ICDV');

  const all = useMemo(() => data.filter((m) => m.siteId === site.siteId).map((m) => ({ ...m, ...patch[m.moveOrderId!] }) as Move), [data, patch, site.siteId]);
  const open = all.filter((m) => m.status !== 'DONE' && m.status !== 'CANCELLED').sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9) || (a.requestedAt ?? '').localeCompare(b.requestedAt ?? ''));
  const mine = open.filter((m) => (vehicleSite ? m.assignedOperatorSub === 'neema.k' : String(m.assignedEquipmentId) === machine));
  const done = all.filter((m) => m.status === 'DONE' || m.status === 'CANCELLED').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const rows = tab === 'open' ? open : tab === 'mine' ? mine : done;
  const set = (m: Move, p: Partial<Move>) => setPatch((x) => ({ ...x, [m.moveOrderId!]: { ...x[m.moveOrderId!], ...p } }));

  const start = (m: Move) => { set(m, { status: 'IN_PROGRESS', startedAt: new Date('2026-10-07T10:30:00+03:00').toISOString() }); toast(offline ? `Move started for ${m.unitNo}; queued on this handheld` : `Move started for ${m.unitNo}`); };

  return (
    <Page wide>
      <PageHeader title="Move orders" ms="M1" sub={`${site.siteName} · trucks waiting at the gate come first`}
        actions={!vehicleSite && <div className="row" style={{ gap: 8 }}><span className="small muted">My machine</span>
          <Segmented label="My machine" value={machine} onChange={setMachine} options={MACHINES.map((e) => ({ id: String(e.equipmentId), label: e.equipmentCode }))} /></div>} />

      <div className="stack-lg">
        {offline && <Banner tone="wait" title="Offline on this handheld">Start and complete still work. Moves are queued with the time you did them and sent when the signal returns. Slot suggestions use the yard as it was at 10:12.</Banner>}
        <div className="kpi-strip">
          <Kpi label="Waiting" value={open.filter((m) => m.status === 'OPEN').length} delta="Not assigned yet" />
          <Kpi label="Assigned" value={open.filter((m) => m.status === 'ASSIGNED').length} />
          <Kpi label="Moving now" value={open.filter((m) => m.status === 'IN_PROGRESS').length} />
          <Kpi label="For trucks at the gate" value={open.filter((m) => m.moveKind === 'PICK_FOR_VISIT').length} delta="Priority 1" />
          <Kpi label="Done today" value={done.length} delta="Average 14 min" />
        </div>

        <Tabs<TabId> value={tab} onChange={setTab} tabs={[{ id: 'open', label: 'Open', count: open.length }, { id: 'mine', label: vehicleSite ? 'Mine' : `Mine (${eqCode(Number(machine))})`, count: mine.length }, { id: 'done', label: 'Done', count: done.length }]} />

        {rows.length === 0 ? (
          <Empty title={tab === 'mine' ? 'Nothing assigned to you' : tab === 'done' ? 'No moves done yet today' : 'No open move orders'}>
            {tab === 'mine' ? 'Pick an order from the Open tab, or ask the yard planner to assign one.' : 'New orders appear here when a truck arrives or the planner creates one.'}
          </Empty>
        ) : (
          <div className="grid-2" style={{ alignItems: 'start' }}>
            {rows.map((m) => <MoveCard key={m.moveOrderId} m={m} onAssign={() => setAssign(m)} onStart={() => start(m)} onComplete={() => setComplete(m)} />)}
          </div>
        )}
      </div>

      <AssignDrawer m={assign} vehicleSite={vehicleSite} onClose={() => setAssign(null)} onDone={(m, eq, op) => { set(m, { status: 'ASSIGNED', assignedEquipmentId: eq, assignedOperatorSub: op }); toast(`Move assigned to ${eq ? eqCode(eq) + ' · ' : ''}${OPERATORS[op]}`); }} />
      <CompleteDrawer m={complete} onClose={() => setComplete(null)} onDone={(m, toCode, rank, reason) => {
        set(m, { status: 'DONE', toCode, suggestionRank: rank, overrideReason: reason, completedAt: new Date('2026-10-07T10:30:00+03:00').toISOString() });
        toast(offline ? `Move completed at ${toCode}; queued on this handheld` : `Move completed: ${m.unitNo} at ${toCode}`);
      }} />
    </Page>
  );
}

function MoveCard({ m, onAssign, onStart, onComplete }: { m: Move; onAssign: () => void; onStart: () => void; onComplete: () => void }) {
  const truck = m.moveKind === 'PICK_FOR_VISIT';
  const edge = m.status === 'DONE' ? 'var(--steel)' : m.priority === 1 ? 'var(--stop)' : m.priority === 2 ? 'var(--wait)' : 'var(--steel)';
  const to = m.toCode ?? m.toLabel ?? '—';
  return (
    <section className="panel" style={{ padding: 16, borderLeft: `5px solid ${edge}` }}>
      <div className="row-wrap" style={{ gap: 8 }}>
        <Pill tone={truck ? 'stop' : m.moveKind === 'TO_ACTIVITY' ? 'customs' : 'info'} icon={truck ? <Truck /> : undefined}>{MOVE_KIND[m.moveKind]}</Pill>
        <span className="xs muted">P{m.priority}</span>
        <span className="spacer" />
        <StatusPill value={m.status} />
      </div>
      <div className="row-wrap" style={{ marginTop: 10, gap: 10 }}>
        <UnitNo no={m.unitNo!} category={m.category} size="md" to={`/units/${m.unitStayId}`} />
        <span className="small muted">{m.unitType}{m.lineCode ? ` · ${m.lineCode}` : ''}</span>
      </div>
      <div className="row-wrap" style={{ marginTop: 12, gap: 12, fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: 28, lineHeight: 1.1 }} aria-label={`From ${m.fromCode || 'YARD'} to ${to}`}>
        <span style={{ fontSize: (m.fromCode ?? '').length > 12 ? 20 : 28 }}>{m.fromCode || 'YARD'}</span>
        <ArrowRight size={26} aria-hidden style={{ color: 'var(--ink-3)' }} />
        <span style={{ fontSize: to.length > 12 ? 20 : 28 }}>{m.status === 'DONE' ? to : m.toCode ?? (truck ? `Truck ${m.plateNo}` : to)}</span>
      </div>
      <div className="small muted" style={{ marginTop: 6 }}>
        {m.toLabel && <div>{m.toLabel}</div>}
        {!m.toLabel && m.toCode && m.status !== 'DONE' && <div>Suggested slot, rank 1 · confirm when placing</div>}
        {m.note && <div style={{ color: 'var(--ink-2)' }}>{m.note}</div>}
        {m.overrideReason && <div>Placed outside rank 1: {m.overrideReason}</div>}
      </div>
      <div className="row-wrap xs muted" style={{ marginTop: 8, gap: 12 }}>
        <span className="row" style={{ gap: 4 }}><Clock size={12} />{m.status === 'DONE' ? `Done ${fmtT(m.completedAt)}` : `Asked ${ago(m.requestedAt)}`}</span>
        {(m.assignedEquipmentId || m.assignedOperatorSub) && <span>{eqCode(m.assignedEquipmentId) ?? 'Self-driven'} · {OPERATORS[m.assignedOperatorSub ?? ''] ?? '—'}</span>}
        {m.truckVisitId && <Link to={`/gate/visits/${m.truckVisitId}`}>Truck {m.plateNo}</Link>}
      </div>
      {m.status !== 'DONE' && m.status !== 'CANCELLED' && (
        <div className="row-wrap" style={{ marginTop: 14 }}>
          {m.status === 'OPEN' && <Button size="xl" icon={<UserPlus />} perm="yard.allocate" onClick={onAssign}>Assign</Button>}
          {m.status === 'ASSIGNED' && <Button size="xl" variant="primary" icon={<Play />} perm="yard.move.execute" onClick={onStart}>Start move</Button>}
          {m.status === 'IN_PROGRESS' && <Button size="xl" variant="primary" icon={<CheckCircle2 />} perm="yard.move.execute" onClick={onComplete}>{truck ? 'Loaded on truck' : 'Complete move'}</Button>}
          {m.status === 'OPEN' && <Button size="xl" variant="ghost" icon={<Play />} perm="yard.move.execute" onClick={onStart}>Take and start</Button>}
        </div>
      )}
    </section>
  );
}

function AssignDrawer({ m, vehicleSite, onClose, onDone }: { m: Move | null; vehicleSite: boolean; onClose: () => void; onDone: (m: Move, eq: number | undefined, op: string) => void }) {
  const [eq, setEq] = useState('1');
  const [op, setOp] = useState('ibrahim.n');
  if (!m) return null;
  const busy = MACHINES.find((e) => String(e.equipmentId) === eq && moveOrders.some((o) => o.assignedEquipmentId === e.equipmentId && o.status === 'IN_PROGRESS'));
  return (
    <Drawer open onClose={onClose} title={`Assign move for ${m.unitNo}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<UserPlus />} perm="yard.allocate" onClick={() => { onDone(m, vehicleSite ? undefined : Number(eq), op); onClose(); }}>Assign move</Button></>}>
      <div className="stack">
        <p className="small muted">{MOVE_KIND[m.moveKind]} from {m.fromCode} to {m.toCode ?? m.toLabel}.</p>
        {!vehicleSite && (
          <Field label="Equipment" required hint={busy ? `${busy.equipmentCode} is on another move; this one waits in its queue` : undefined}>
            <Select value={eq} onChange={(e) => setEq(e.target.value)} options={MACHINES.map((e) => [String(e.equipmentId), `${e.equipmentCode} · ${e.equipmentName}`])} />
          </Field>
        )}
        <Field label={vehicleSite ? 'Driver' : 'Operator'} required>
          <Select value={op} onChange={(e) => setOp(e.target.value)} options={Object.entries(OPERATORS).map(([k, v]) => [k, v])} />
        </Field>
        {vehicleSite && <Banner tone="wait">Self-driven move: the driver must sign the key out of the cabinet before starting.</Banner>}
        <p className="xs faint">The operator gets the order on the handheld at once.</p>
      </div>
    </Drawer>
  );
}

function CompleteDrawer({ m, onClose, onDone }: { m: Move | null; onClose: () => void; onDone: (m: Move, toCode: string, rank: number | null, reason?: string) => void }) {
  const toast = useToast();
  const [choice, setChoice] = useState<number | 'other'>(1);
  const [other, setOther] = useState('');
  const [reason, setReason] = useState('');
  const [requested, setRequested] = useState(false);
  const [pending, setPending] = useState(false);
  const { can } = useSession();
  const cands = useMemo(() => (m ? candidatesFor(m) : []), [m]);
  if (!m) return null;
  const truck = m.moveKind === 'PICK_FOR_VISIT';
  const reset = () => { setChoice(1); setOther(''); setReason(''); setRequested(false); setPending(false); onClose(); };

  if (truck) {
    return (
      <Drawer open onClose={reset} title={`Load ${m.unitNo} on ${m.plateNo}`}
        footer={<><Button variant="ghost" onClick={reset}>Cancel</Button><Button size="xl" variant="primary" icon={<CheckCircle2 />} perm="yard.move.execute" onClick={() => { onDone(m, `Truck ${m.plateNo}`, null); reset(); }}>Confirm loaded</Button></>}>
        <div className="stack">
          <p>Check the number on the door matches before you let go of the box.</p>
          <UnitNo no={m.unitNo!} category={m.category} size="lg" />
          <p className="small muted">The gate lane sees the unit on the truck as soon as you confirm. The driver then goes to the inner gate out.</p>
        </div>
      </Drawer>
    );
  }

  const slot = choice === 'other' ? checkSlot(other) : null;
  const code = choice === 'other' ? other.trim().toUpperCase() : cands[choice - 1]?.fullCode;
  const outside = choice === 'other';
  const needsOverride = slot && (slot.state === 'FULL' || slot.state === 'BLOCKED');
  const ok = !!code && (!outside || (slot!.state !== 'INVALID' && reason.trim().length >= 5)) && (!needsOverride || requested);
  return (
    <Drawer open wide onClose={reset} title={`Place ${m.unitNo}`}
      footer={<><Button variant="ghost" onClick={reset}>Cancel</Button>
        {needsOverride && !requested
          ? <Button size="xl" icon={<ShieldQuestion />} perm="yard.move.override" disabled={reason.trim().length < 5 || pending} onClick={() => {
              if (can('yard.move.override', 'DO')) { setRequested(true); toast('Override recorded for this slot'); }
              else { setPending(true); toast('Override requested from the yard planner'); }
            }}>Override and use {code}</Button>
          : <Button size="xl" variant="primary" icon={<CheckCircle2 />} perm="yard.move.execute" disabled={!ok} onClick={() => { onDone(m, code!, outside ? null : (choice as number), outside ? reason : choice !== 1 ? `Took rank ${choice}` : undefined); reset(); }}>Placed at {code || '…'}</Button>}
      </>}>
      <div className="stack">
        <p className="small muted">Where did you put it? Rank 1 is the best slot right now. Choosing another suggestion is fine; a slot that is not suggested needs a reason.</p>
        <div className="stack" role="radiogroup" aria-label="Suggested slots">
          {cands.map((c) => (
            <button key={c.rank} type="button" role="radio" aria-checked={choice === c.rank} onClick={() => setChoice(c.rank)} className={cx('btn', 'btn-xl')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '12px 16px', borderColor: choice === c.rank ? 'var(--ink)' : undefined, borderWidth: choice === c.rank ? 2 : 1 }}>
              <span style={{ fontFamily: 'var(--font-cond)', fontSize: 30, fontWeight: 700, minWidth: 34 }}>{c.rank}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="row-wrap" style={{ gap: 8 }}><span style={{ fontFamily: 'var(--font-cond)', fontSize: 24, fontWeight: 700 }}>{c.fullCode}</span><span className="xs muted">score {Number(c.score).toFixed(0)}</span>{checkSlot(c.fullCode).tier && <span className="tag">tier {checkSlot(c.fullCode).tier}</span>}</span>
                <span className="row-wrap" style={{ gap: 6, marginTop: 4 }}>{c.reasons.map((r) => <span key={r} className="tag">{r}</span>)}</span>
              </span>
              {choice === c.rank && <CheckCircle2 color="var(--go)" />}
            </button>
          ))}
          <button type="button" role="radio" aria-checked={choice === 'other'} onClick={() => setChoice('other')} className={cx('btn', 'btn-xl')}
            style={{ justifyContent: 'flex-start', borderColor: choice === 'other' ? 'var(--ink)' : undefined, borderWidth: choice === 'other' ? 2 : 1 }}>
            Another slot (not suggested)
          </button>
        </div>
        {outside && (
          <div className="stack">
            <Field label="Slot" required error={slot && slot.state === 'INVALID' && other ? slot.note : undefined} hint={slot && slot.state === 'FREE' ? slot.note : 'Block-row-bay, e.g. B-02-04'}>
              <Input xl value={other} onChange={(e) => { setOther(e.target.value.toUpperCase()); setRequested(false); setPending(false); }} placeholder="B-02-04" autoFocus />
            </Field>
            {needsOverride && <Banner tone="stop" title={slot!.state === 'FULL' ? 'That stack is full' : 'That slot is blocked'}>{slot!.note}. Placing here needs a yard override (yard.move.override); an officer without it sends a request instead.</Banner>}
            <Field label="Why not a suggested slot?" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Rank 1 blocked by a parked trailer" /></Field>
          </div>
        )}
        {requested && <Banner tone="go">Override recorded. Confirm the placement.</Banner>}
        {pending && <Banner tone="wait" title="Waiting for the yard planner">Keep the unit on the machine or put it in a suggested slot. You get a message on the handheld when the planner decides.</Banner>}
        <p className="xs faint row" style={{ gap: 4 }}><WifiOff size={12} />Works offline: the completion is queued with the time you pressed it.</p>
      </div>
    </Drawer>
  );
}
