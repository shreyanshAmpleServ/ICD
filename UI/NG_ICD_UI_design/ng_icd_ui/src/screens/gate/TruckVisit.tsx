import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Camera, CheckCircle2, Plus, Printer, ShieldCheck, Trash2, Undo2, WifiOff } from 'lucide-react';
import {
  Banner, Button, DL, DataTable, Drawer, Empty, Field, Input, Page, PageHeader, Panel, Pill, Segmented, Select, StatusPill, Stepper, Textarea, Timeline,
  UnitNo, fmtDT, fmtT, useToast,
} from '@/ds/components';
import type { Tone } from '@/ds/status';
import type { S } from '@/api/types';
import { useQ, delay } from '@/api/query';
import { allStays } from '@/mock/core';
import { CHECKPOINTS, VISIT_TYPES, visit } from '@/mock/gate';
import { visitExtras, type SealStatus } from '@/mock/ops';

/* Truck visit: GET /truck-visits/{id} and /checkpoint-events. One truck,
   its four checkpoints, the units it drops or picks, and every event. */
const SEAL: Record<SealStatus, [string, Tone]> = {
  MATCH: ['Matches', 'go'], MISMATCH: ['Does not match', 'stop'], MISSING: ['Missing', 'stop'], NEW_APPLIED: ['New seal applied', 'info'], NOT_SEALED: ['Not sealed', 'idle'],
};
const CANCEL_REASONS = ['Driver left without entering', 'Wrong truck announced', 'Release not ready, customer asked to cancel', 'Duplicate visit', 'Other'];
type VU = S<'VisitUnit'> & { sealFound?: string; sealStatus?: SealStatus };

export function TruckVisit() {
  const { truckVisitId } = useParams();
  const id = Number(truckVisitId);
  const { data: v, isLoading } = useQ(['visit', id], () => delay(visit(id)));
  const toast = useToast();
  const x = visitExtras[id];
  const [status, setStatus] = useState<string | undefined>();
  const [units, setUnits] = useState<VU[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!v) return;
    setStatus(v.status);
    setUnits((v.units ?? []).map((u) => ({ ...u, sealExpected: x?.seals[u.unitStayId]?.expected ?? u.sealExpected, sealFound: x?.seals[u.unitStayId]?.found, sealStatus: x?.seals[u.unitStayId]?.status })));
  }, [v, x]);

  if (isLoading) return <Page><Empty title="Loading truck visit" /></Page>;
  if (!v || !x) return <Page><Empty title="No truck visit with this number" action={<Link to="/gate">Back to the gate queue</Link>}>Check the visit number on the gate pass, or search by plate number from the top bar.</Empty></Page>;

  const cps = v.checkpoints ?? [];
  const nextIdx = CHECKPOINTS.findIndex((c) => c.code === v.nextCheckpointCode);
  const done = ['EXITED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(status ?? '');
  const canPrint = ['ADMITTED', 'WORKING', 'CHECKED_OUT'].includes(status ?? '');
  const anyOffline = cps.some((c) => c.isOffline) || v.isOfflineEntry;

  const steps = CHECKPOINTS.map((c, i) => {
    const ev = cps.find((e) => e.checkpointCode === c.code);
    if (ev) return { label: c.name, state: ev.result === 'FAILED' ? 'fail' as const : 'done' as const, note: `${ev.result === 'FAILED' ? 'Failed' : 'Passed'} ${fmtT(ev.occurredAt)} · ${ev.by.replace('Gate · ', '')}${ev.isOffline ? ' · offline' : ''}` };
    if (i === nextIdx && !done) return { label: c.name, state: 'current' as const, note: status === 'ANNOUNCED' ? 'Not arrived yet' : 'Waiting here' };
    return { label: c.name, state: 'todo' as const, note: done ? 'Not reached' : undefined };
  });

  const removeUnit = (u: VU) => { setUnits((us) => us.filter((y) => y.unitStayId !== u.unitStayId)); toast(`${u.unitNo} removed from the visit`); };

  return (
    <Page>
      <PageHeader
        crumbs={[['Gate queue', '/gate'], [v.visitNo ?? String(id)]]}
        title={<span className="unitno unitno-lg">{v.plateNo}</span>}
        ms="M1"
        sub={
          <span className="row-wrap" style={{ marginTop: 8 }}>
            <Pill tone="info">{VISIT_TYPES[v.visitTypeCode]}</Pill>
            <StatusPill value={status} />
            {anyOffline && <Pill tone="wait" icon={<WifiOff />}>Entered offline</Pill>}
            <span className="small muted">{v.driverName} · licence {x.licenceNo} · {v.transporter}</span>
          </span>
        }
        actions={<>
          <Button icon={<Plus />} perm="gate.visit.checkin" disabled={done || status === 'CHECKED_OUT'} onClick={() => setAddOpen(true)}>Add unit</Button>
          <Button icon={<Ban />} variant="danger" perm="gate.visit.checkin" disabled={done || status === 'CHECKED_OUT'} title="Cancel this visit" onClick={() => setCancelOpen(true)}>Cancel visit</Button>
          <Button icon={<Printer />} variant="primary" perm="gate.pass.print" disabled={!canPrint} title={canPrint ? undefined : 'A gate pass prints once the truck is admitted and not held'}
            onClick={() => toast(`Gate pass ${v.gatePassNo ?? 'GP-26-08' + (800 + (id % 100))} printed at lane ${v.lane ?? 'In 2'}`)}>Print gate pass</Button>
        </>}
      />

      <div className="stack-lg">
        {status === 'HELD' && !approved && (
          <Banner tone="stop" title="Held at the inner gate: seal does not match">
            Seal found {x.seals[units[0]?.unitStayId]?.found}, expected {x.seals[units[0]?.unitStayId]?.expected}. Override {x.approvalNo} is waiting for the operations manager
            {' '}(<Link to="/approvals">open in approvals</Link>). Exception {x.exceptionNo} is open. The truck stays at the inner gate until the decision.
            <div className="row-wrap" style={{ marginTop: 8 }}><Button size="sm" perm="gate.checkout.override" level="APPR" icon={<ShieldCheck />} onClick={() => { setApproved(true); setStatus('ADMITTED'); toast('Override approved. Truck admitted to the yard.'); }}>Approve override</Button></div>
          </Banner>
        )}
        {approved && <Banner tone="go" title={`Override ${x.approvalNo} approved`}>The seal mismatch is recorded on the EIR and the exception stays open for the line to confirm.</Banner>}
        {status === 'REJECTED' && (
          <Banner tone="stop" title="Turned back: release order expired">
            The release order ran out at 07:30, before the truck reached the inner gate out. The unit was not handed over. Kilele C&amp;F must renew the release; exception {x.exceptionNo} is with customer service.
          </Banner>
        )}
        {status === 'CANCELLED' && <Banner title="Visit cancelled">The gate pass no longer opens the barrier. Planned units are free for another visit.</Banner>}

        <Panel title="Checkpoints" sub={v.lane ? `Lane ${v.lane}` : undefined}>
          <Stepper steps={steps} />
        </Panel>

        <div className="grid-main-side ops-gms">
          <style>{'.ops-gms > * { min-width: 0; }'}</style>
          <div className="stack-lg">
            <Panel title="Units on this visit" flush actions={<Button size="sm" icon={<Plus />} perm="gate.visit.checkin" disabled={done || status === 'CHECKED_OUT'} onClick={() => setAddOpen(true)}>Add unit</Button>}>
              <DataTable rows={units} rowKey={(u) => u.unitStayId}
                empty={<Empty title="No units on this visit yet">Add the unit the driver is dropping off or picking up, or scan the delivery order at the lane.</Empty>}
                cols={[
                  { key: 'unit', header: 'Unit', render: (u) => <UnitNo no={u.unitNo!} category={u.unitNo!.length === 17 ? 'VEHICLE' : 'CONTAINER'} to={`/units/${u.unitStayId}`} /> },
                  { key: 'dir', header: 'Direction', render: (u) => u.direction === 'PICK' ? 'Pick up' : 'Drop off' },
                  { key: 'status', header: 'Status', render: (u) => <StatusPill value={u.status} /> },
                  { key: 'exp', header: 'Seal expected', render: (u) => <span className="small">{u.sealExpected ?? '—'}</span> },
                  { key: 'found', header: 'Seal found', render: (u) => <span className="small" style={{ color: u.sealStatus === 'MISMATCH' ? 'var(--stop)' : undefined, fontWeight: u.sealStatus === 'MISMATCH' ? 700 : undefined }}>{u.sealFound ?? '—'}</span> },
                  { key: 'seal', header: 'Seal check', render: (u) => u.sealStatus ? <Pill tone={SEAL[u.sealStatus][1]}>{SEAL[u.sealStatus][0]}</Pill> : <span className="xs faint">Not checked yet</span> },
                  { key: 'eir', header: 'EIR', render: (u) => u.eirNo ? <span className="small">{u.eirNo}</span> : <span className="xs faint">After hand-over</span> },
                  { key: 'act', header: '', render: (u) => u.status === 'PLANNED' && !done ? <Button size="sm" variant="ghost" icon={<Trash2 />} aria-label={`Remove ${u.unitNo}`} perm="gate.visit.checkin" onClick={() => removeUnit(u)} /> : null },
                ]} />
            </Panel>
            <Panel title="What happened" sub="Checkpoint events and gate actions, newest first">
              <Timeline items={x.events} />
            </Panel>
          </div>
          <div className="stack-lg">
            <Panel title="Visit">
              <DL items={[
                ['Visit no.', v.visitNo], ['Truck', <span key="p" className="unitno unitno-sm">{v.plateNo}</span>], ['Trailer', x.trailerPlate ?? '—'],
                ['Conveyance', v.conveyance === 'CAR_CARRIER' ? 'Car carrier' : v.conveyance === 'SELF_DRIVEN' ? 'Self-driven' : 'Truck'],
                ['Driver', v.driverName], ['Transporter', v.transporter], ['Release / nomination', v.nominationRef ?? '—'], ['Appointment', x.appointmentNo ?? 'Walk-in'],
                ['Arrived', fmtDT(v.arrivedAt)], ['Admitted', fmtDT(v.admittedAt)], ['Checked out', fmtDT(v.checkedOutAt)], ['Exited', fmtDT(v.exitedAt)],
                ['Gate pass', v.gatePassNo ?? '—'], ['Waiting', v.waitingMin ? `${v.waitingMin} min` : '—'],
              ]} />
            </Panel>
            <Panel title="Photos">
              <div className="grid-2">
                {['Plate (ANPR)', 'Front', 'Seal close-up', 'Rear'].map((p) => <div key={p} className="photo">{p}</div>)}
              </div>
              <div style={{ marginTop: 12 }}><Button size="sm" icon={<Camera />} perm="gate.visit.checkin">Add photo</Button></div>
            </Panel>
          </div>
        </div>
      </div>

      <CancelVisit open={cancelOpen} onClose={() => setCancelOpen(false)} plate={v.plateNo ?? ''} onDone={() => { setStatus('CANCELLED'); setUnits((us) => us.map((u) => ({ ...u, status: 'CANCELLED' }))); }} />
      <AddUnit open={addOpen} onClose={() => setAddOpen(false)} existing={units.map((u) => u.unitStayId)}
        onAdd={(u) => setUnits((us) => [...us, u])} />
    </Page>
  );
}

function CancelVisit({ open, onClose, plate, onDone }: { open: boolean; onClose: () => void; plate: string; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [note, setNote] = useState('');
  const needNote = reason === 'Other';
  return (
    <Drawer open={open} onClose={onClose} title={`Cancel visit for ${plate}`}
      footer={<><Button variant="ghost" onClick={onClose}>Keep visit</Button>
        <Button variant="danger" icon={<Ban />} disabled={needNote && note.trim().length < 5} onClick={() => { onDone(); onClose(); toast('Visit cancelled'); }}>Cancel visit</Button></>}>
      <div className="stack">
        <Banner tone="wait">The gate pass stops working at once. Units already handed over are not reversed: cancel only before any unit moves.</Banner>
        <Field label="Reason" required><Select value={reason} onChange={(e) => setReason(e.target.value)} options={CANCEL_REASONS} /></Field>
        <Field label="Note" required={needNote} hint={needNote ? 'Say what happened, at least a few words' : 'Optional'}><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}

function AddUnit({ open, onClose, existing, onAdd }: { open: boolean; onClose: () => void; existing: number[]; onAdd: (u: VU) => void }) {
  const toast = useToast();
  const [dir, setDir] = useState<'DROP' | 'PICK'>('PICK');
  const [q, setQ] = useState('');
  const n = q.replace(/\s/g, '').toUpperCase();
  const hit = n.length >= 4 ? allStays.find((s) => s.cargoUnit.unitNo.replace(/\s/g, '').toUpperCase().includes(n)) : undefined;
  const problem = !hit ? (n.length >= 4 ? 'No unit with that number. Check the digits or register the unit as expected first.' : undefined)
    : existing.includes(hit.unitStayId!) ? 'Already on this visit.'
    : dir === 'PICK' && hit.physicalStatus !== 'IN_YARD' ? 'This unit is not in the yard, so it cannot be picked up.'
    : dir === 'DROP' && hit.physicalStatus === 'IN_YARD' ? 'This unit is already in the yard. Did you mean pick up?' : undefined;
  return (
    <Drawer open={open} onClose={onClose} title="Add a unit to this visit"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={<CheckCircle2 />} disabled={!hit || !!problem} onClick={() => {
          onAdd({ visitUnitTxnId: hit!.unitStayId! * 10, unitStayId: hit!.unitStayId!, unitNo: hit!.cargoUnit.unitNo, direction: dir, status: 'PLANNED', sealExpected: hit!.sealNo ?? undefined });
          toast(`${hit!.cargoUnit.unitNo} added to the visit`); setQ(''); onClose();
        }}>Add unit</Button></>}>
      <div className="stack">
        <Field label="Direction"><div><Segmented value={dir} onChange={setDir} options={[{ id: 'PICK', label: 'Pick up' }, { id: 'DROP', label: 'Drop off' }]} /></div></Field>
        <Field label="Container number or VIN" required error={problem} hint="At least 4 characters, e.g. 4021">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="BMLU 402117 3" autoFocus />
        </Field>
        {hit && !problem && (
          <div className="panel" style={{ padding: 12 }}>
            <div className="row-wrap"><UnitNo no={hit.cargoUnit.unitNo} category={hit.cargoUnit.category} size="md" /><span className="spacer" /><StatusPill value={hit.physicalStatus} track="physical" /></div>
            <div className="small muted" style={{ marginTop: 6 }}>{hit.cargoUnit.unitTypeCode} · {hit.cargoDescription} · {hit.currentLocation?.fullCode ?? 'no slot'}</div>
            {dir === 'PICK' && <div className="row-wrap" style={{ marginTop: 6 }}><span className="xs muted">Release</span><StatusPill value={hit.releaseStatus} track="release" /><span className="xs muted">Checked again at inner gate out.</span></div>}
          </div>
        )}
        <p className="xs faint"><Undo2 size={12} /> Planned units can be removed until the hand-over starts.</p>
      </div>
    </Drawer>
  );
}
