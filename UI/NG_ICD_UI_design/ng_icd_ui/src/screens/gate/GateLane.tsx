import { useMemo, useState } from 'react';
import { Camera, CheckCircle2, DoorOpen, FileSignature, OctagonX, Printer, QrCode, ScanLine, ShieldQuestion, Undo2, WifiOff } from 'lucide-react';
import {
  Banner, Button, Conditions, Field, Input, Page, PageHeader, Panel, Pill, Segmented, StatusPill, Stepper, Textarea, UnitNo, cx, useToast, type Cond,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { stay } from '@/mock/core';
import { evaluate } from '@/mock/control';
import { CHECKPOINTS, VISIT_TYPES, visits } from '@/mock/gate';

/* Gate lane, built for a tablet in a booth: big targets, one truck at a time,
   works offline. POST /truck-visits/{id}/checkpoint-events with an
   Idempotency-Key; offline events queue on the device with occurredAt. */
type Step = 'identify' | 'check' | 'units' | 'done';

const IN_CHECKS = (plate: string): Cond[] => [
  { code: 'ANNOUNCED', name: 'Truck announced', result: 'PASS', detail: `${plate} on today’s list` },
  { code: 'DRIVER', name: 'Driver licence valid', result: 'PASS', detail: 'Expires 14 Mar 2028' },
  { code: 'TRUCK', name: 'Truck not barred', result: 'PASS', detail: 'No security flag' },
  { code: 'DOCS', name: 'Documents present', result: 'PASS', detail: 'Delivery order and release order attached' },
];

export function GateLane() {
  const { offline } = useSession();
  const toast = useToast();
  const [cp, setCp] = useState('INNER_OUT');
  const waiting = visits.filter((v) => v.nextCheckpointCode === cp && !['EXITED', 'REJECTED', 'CANCELLED'].includes(v.status!));
  const [visitId, setVisitId] = useState<number | null>(4411);
  const v = visits.find((x) => x.truckVisitId === visitId) ?? null;
  const [step, setStep] = useState<Step>('identify');
  const [plate, setPlate] = useState('');
  const [seal, setSeal] = useState<Record<number, string>>({});
  const [sig, setSig] = useState<'SCREEN' | 'PAPER'>('SCREEN');
  const [turnBack, setTurnBack] = useState(false);
  const isOut = cp.endsWith('OUT');

  const checks: Cond[] = useMemo(() => {
    if (!v) return [];
    if (!isOut) return IN_CHECKS(v.plateNo ?? '');
    return (v.units ?? []).flatMap((u) => {
      const s = stay(u.unitStayId);
      if (!s) return [];
      return evaluate(s, 'GATE_OUT').filter((c) => c.result !== 'NOT_APPLIC').map((c) => ({ code: `${u.unitStayId}-${c.conditionCode}`, name: `${c.conditionName}`, result: c.result, detail: c.detail }));
    });
  }, [v, isOut]);
  const failed = checks.filter((c) => c.result === 'FAIL');

  const pick = (id: number) => { setVisitId(id); setStep('identify'); setPlate(''); setTurnBack(false); };
  const steps: { id: Step; label: string }[] = [{ id: 'identify', label: 'Identify truck' }, { id: 'check', label: 'Checks' }, { id: 'units', label: isOut ? 'Units out' : 'Units in' }, { id: 'done', label: 'Pass' }];
  const idx = steps.findIndex((s) => s.id === step);

  return (
    <Page wide>
      <PageHeader title="Gate lane" ms="M1" sub="Lane In 2 · tablet GT-07"
        actions={<Segmented xl label="Checkpoint" value={cp} onChange={(c) => { setCp(c); setVisitId(null); setStep('identify'); }}
          options={CHECKPOINTS.map((c) => ({ id: c.code, label: c.short }))} />} />
      {offline && <div style={{ marginBottom: 16 }}><Banner tone="wait" title="Offline: 3 events queued on this tablet">You can keep working. Release checks use the data cached at 10:12; anything that changed since is re-checked on sync.</Banner></div>}

      <div className="lane-grid">
        <Panel title={`Waiting at ${CHECKPOINTS.find((c) => c.code === cp)?.short}`} flush>
          <div className="stack" style={{ padding: 8 }}>
            {waiting.length === 0 && <div className="small faint" style={{ padding: 8 }}>No trucks waiting. Scan a pass or type a plate to start.</div>}
            {waiting.map((w) => (
              <button key={w.truckVisitId} onClick={() => pick(w.truckVisitId!)} className={cx('btn', 'btn-xl')}
                style={{ justifyContent: 'flex-start', textAlign: 'left', borderColor: w.truckVisitId === visitId ? 'var(--ink)' : undefined, borderWidth: w.truckVisitId === visitId ? 2 : 1 }}>
                <span style={{ flex: 1 }}>
                  <span className="unitno unitno-sm" style={{ display: 'block' }}>{w.plateNo}</span>
                  <span className="xs muted" style={{ fontWeight: 500 }}>{VISIT_TYPES[w.visitTypeCode]} · {w.waitingMin} min</span>
                </span>
                {w.status === 'HELD' && <OctagonX color="var(--stop)" />}
              </button>
            ))}
          </div>
        </Panel>

        {!v ? (
          <Panel><div className="stack" style={{ alignItems: 'center', padding: 40 }}>
            <QrCode size={48} />
            <h2>Scan the gate pass or type the plate</h2>
            <div className="row" style={{ width: 'min(520px, 100%)' }}><Input xl placeholder="T 000 AAA" aria-label="Plate number" /><Button size="xl" variant="primary">Find</Button></div>
          </div></Panel>
        ) : (
          <div className="stack-lg">
            <Panel>
              <div className="row-wrap" style={{ gap: 16 }}>
                <span className="unitno unitno-lg">{v.plateNo}</span>
                <div className="spacer">
                  <div className="strong">{VISIT_TYPES[v.visitTypeCode]}</div>
                  <div className="small muted">{v.driverName} · {v.transporter} · {v.visitNo}</div>
                </div>
                <StatusPill value={v.status} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Stepper steps={steps.map((s, i) => ({ label: s.label, state: i < idx ? 'done' : i === idx ? (step === 'check' && failed.length ? 'fail' : 'current') : 'todo' }))} />
              </div>
            </Panel>

            {step === 'identify' && (
              <Panel title="Confirm the truck">
                <div className="stack">
                  <Banner tone="customs" title={`Camera read ${v.plateNo} (96%)`}>Confirm it matches the plate on the truck, or type it.</Banner>
                  <div className="row-wrap">
                    <div style={{ flex: 1, minWidth: 220 }}><Input xl value={plate || v.plateNo || ''} onChange={(e) => setPlate(e.target.value)} aria-label="Plate number" /></div>
                    <Button size="xl" icon={<ScanLine />}>Scan pass QR</Button>
                  </div>
                  <div className="row"><Button size="xl" variant="primary" icon={<CheckCircle2 />} onClick={() => setStep('check')}>Plate matches</Button></div>
                </div>
              </Panel>
            )}

            {step === 'check' && (
              <Panel title={isOut ? 'Can these units leave?' : 'Can this truck come in?'} sub={isOut ? 'Release engine, gate-out stage, per unit' : 'Gate-in checks'}>
                <div className="stack">
                  {isOut && (v.units ?? []).map((u) => <div key={u.unitStayId} className="row"><UnitNo no={u.unitNo!} category={u.unitNo!.length === 17 ? 'VEHICLE' : 'CONTAINER'} size="md" /></div>)}
                  <Conditions items={checks} />
                  {failed.length ? (
                    <>
                      <Banner tone="stop" title={`Stop: ${failed.length} check${failed.length > 1 ? 's' : ''} failed`}>
                        {failed.map((f) => `${f.name}: ${f.detail}`).join(' · ')}. The driver can not take this unit out today.
                      </Banner>
                      {!turnBack ? (
                        <div className="row-wrap">
                          <Button size="xl" variant="danger" icon={<Undo2 />} onClick={() => setTurnBack(true)}>Turn truck back</Button>
                          <Button size="xl" icon={<ShieldQuestion />} perm="gate.checkout.override" level="REQ" onClick={() => toast('Override requested from the duty manager')}>Request override</Button>
                        </div>
                      ) : (
                        <div className="stack">
                          <Field label="What did you tell the driver?" required><Textarea defaultValue="Customs exam not done and charges unpaid. Come back after the agent gets the release." /></Field>
                          <div className="row"><Button size="xl" variant="danger" onClick={() => { toast('Truck turned back. Exception opened for customer service.'); setVisitId(null); }}>Confirm turn back</Button><Button size="xl" variant="ghost" onClick={() => setTurnBack(false)}>Cancel</Button></div>
                        </div>
                      )}
                    </>
                  ) : (
                    <Button size="xl" variant="primary" icon={<CheckCircle2 />} onClick={() => setStep('units')}>All checks pass, continue</Button>
                  )}
                </div>
              </Panel>
            )}

            {step === 'units' && (
              <Panel title={isOut ? 'Hand over the units' : 'Receive the units'}>
                <div className="stack-lg">
                  {(v.units ?? []).map((u) => {
                    const val = seal[u.unitStayId] ?? '';
                    const ok = !u.sealExpected || val === '' || val === u.sealExpected;
                    return (
                      <div key={u.unitStayId} className="panel" style={{ padding: 16 }}>
                        <div className="row-wrap" style={{ marginBottom: 12 }}><UnitNo no={u.unitNo!} category={u.unitNo!.length === 17 ? 'VEHICLE' : 'CONTAINER'} size="md" /><span className="spacer" /><Pill tone="info">{u.direction === 'PICK' ? 'Leaving' : 'Arriving'}</Pill></div>
                        <div className="grid-2">
                          <Field label="Seal on the door" hint={u.sealExpected ? `Expected ${u.sealExpected}` : 'No seal expected'} error={!ok ? 'Does not match: the unit will be held and an exception opened' : undefined}>
                            <Input xl value={val} placeholder={u.sealExpected ?? '—'} onChange={(e) => setSeal({ ...seal, [u.unitStayId]: e.target.value.toUpperCase() })} />
                          </Field>
                          <Field label="Photos" hint="Four sides and the seal"><Button size="xl" icon={<Camera />}>Take photos (0 of 5)</Button></Field>
                        </div>
                      </div>
                    );
                  })}
                  <Field label="Driver signature">
                    <Segmented xl value={sig} onChange={setSig} options={[{ id: 'SCREEN', label: 'Sign on screen' }, { id: 'PAPER', label: 'Paper EIR, scan later' }]} />
                  </Field>
                  {sig === 'SCREEN' ? <div className="sig"><FileSignature size={18} />&nbsp;Driver signs here</div> : <Banner tone="wait">Print the EIR, have the driver sign it, then scan it within 24 hours. Until then the EIR shows “signature pending”.</Banner>}
                  <Button size="xl" variant="primary" icon={<CheckCircle2 />} onClick={() => setStep('done')}>Complete {isOut ? 'gate-out' : 'gate-in'}</Button>
                </div>
              </Panel>
            )}

            {step === 'done' && (
              <Panel>
                <div className="stack" style={{ alignItems: 'center', padding: 24, textAlign: 'center' }}>
                  <CheckCircle2 size={56} color="var(--go)" />
                  <h2 style={{ fontSize: 28 }}>{v.plateNo} may {isOut ? 'leave' : 'enter'}</h2>
                  <p className="muted">EIR and gate pass recorded{offline ? ' on this tablet; they sync when online' : ''}.</p>
                  <div className="row-wrap" style={{ justifyContent: 'center' }}>
                    <Button size="xl" variant="primary" icon={<DoorOpen />} onClick={() => toast('Barrier opened')}>Open barrier</Button>
                    <Button size="xl" icon={<Printer />} perm="gate.pass.print">Print gate pass</Button>
                  </div>
                  {offline && <span className="row small" style={{ color: 'var(--wait)' }}><WifiOff size={14} />Queued offline</span>}
                </div>
              </Panel>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
