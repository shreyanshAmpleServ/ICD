import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Camera, CheckCircle2, FileSignature, Play, Printer, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import {
  Banner, Button, DL, Empty, Field, Input, Page, PageHeader, Panel, Pill, Segmented, StatusPill, Textarea, UnitNo, fmtDT, useToast,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { stay } from '@/mock/core';
import { checklists, damageName, inspections, type Finding, type Insp } from '@/mock/ops';
import { DamageDiagram, type Zone } from './DamageDiagram';
import { FindingDrawer } from './FindingDrawer';

export const INSP_KIND: Record<string, string> = {
  GATE_IN: 'Gate-in',
  GATE_OUT: 'Gate-out',
  PERIODIC: 'Periodic',
  EXAM: 'Customs exam',
  DESTUFF: 'De-stuffing',
  STUFF: 'Stuffing',
};

export const CONDITION: Record<string, [string, any]> = {
  SOUND: ['Sound', 'go'],
  MINOR_DAMAGE: ['Minor damage', 'wait'],
  MAJOR_DAMAGE: ['Major damage', 'stop'],
  REJECTED: ['Rejected', 'stop'],
};

type R = 'OK' | 'DAMAGED' | 'NA';
const MIN_PHOTOS = 4;
const SEV_TONE = { MINOR: 'wait', MAJOR: 'stop', CRITICAL: 'stop' } as const;
const FUEL = ['E', '1/4', '1/2', '3/4', 'F'] as const;

export function InspectionFormView() {
  const { inspectionId } = useParams();
  const id = Number(inspectionId);
  const { data: insp, isLoading } = useQ(['inspection', id], () =>
    delay(inspections.find((i) => i.inspectionId === id))
  );
  const toast = useToast();
  const [status, setStatus] = useState<Insp['status']>();
  const [needsAppr, setNeedsAppr] = useState(false);
  const [results, setResults] = useState<Record<number, R | undefined>>({});
  const [findings, setFindings] = useState<Finding[]>([]);
  const [photos, setPhotos] = useState(0);
  const [odo, setOdo] = useState('');
  const [fuel, setFuel] = useState<string>('');
  const [battery, setBattery] = useState<string>('');
  const [effects, setEffects] = useState('');
  const [sigMode, setSigMode] = useState<'SCREEN' | 'PAPER'>('SCREEN');
  const [signed, setSigned] = useState(false);
  const [zone, setZone] = useState<Zone | null>(null);

  useEffect(() => {
    if (!insp) return;
    setStatus(insp.status);
    setNeedsAppr(!!insp.approvalNeeded);
    setResults(
      Object.fromEntries(
        (insp.results ?? []).map((r) => [r.inspectionItemId, (r.resultValue as R) ?? (r.isOk ? 'OK' : 'DAMAGED')])
      )
    );
    setFindings(insp.findings ?? []);
    setPhotos(insp.photoCount ?? 0);
    setOdo(insp.odometerKm ? String(insp.odometerKm) : '');
    setFuel(insp.fuelLevel ?? '');
    setBattery(
      insp.batteryOk === undefined || insp.batteryOk === null ? '' : insp.batteryOk ? 'OK' : 'WEAK'
    );
    setEffects(insp.personalEffects ?? '');
    setSigMode(insp.signatureMode ?? 'SCREEN');
    setSigned(!!insp.signedBy);
  }, [insp]);

  if (isLoading) {
    return (
      <Page>
        <Empty title="Loading inspection" />
      </Page>
    );
  }
  if (!insp) {
    return (
      <Page>
        <Empty
          title="No inspection with this number"
          action={<Link to="/inspections">Back to inspections</Link>}
        >
          It may belong to another site. Switch site from the top bar and try again.
        </Empty>
      </Page>
    );
  }

  const s = stay(insp.unitStayId);
  const items = checklists[insp.category];
  const editable = status === 'IN_PROGRESS' || status === 'REINSPECT';
  const veh = insp.category === 'VEHICLE';
  const worst = findings.some((f) => f.severity === 'CRITICAL')
    ? 'REJECTED'
    : findings.some((f) => f.severity === 'MAJOR')
    ? 'MAJOR_DAMAGE'
    : findings.length
    ? 'MINOR_DAMAGE'
    : 'SOUND';
  const condition = editable ? worst : insp.overallCondition ?? worst;
  const unanswered = items.filter((i) => !results[i.inspectionItemId]).length;
  const damagedNoFinding =
    items.filter((i) => results[i.inspectionItemId] === 'DAMAGED').length > 0 && findings.length === 0;
  const missing = [
    unanswered && `${unanswered} checklist item${unanswered > 1 ? 's' : ''} not answered`,
    photos < MIN_PHOTOS && `${MIN_PHOTOS - photos} more photo${MIN_PHOTOS - photos > 1 ? 's' : ''}`,
    damagedNoFinding && 'mark where the damage is on the diagram',
    veh && !odo && 'odometer reading',
    veh && !fuel && 'fuel level',
    sigMode === 'SCREEN' && !signed && 'driver signature',
  ].filter(Boolean) as string[];
  const major = condition === 'MAJOR_DAMAGE' || condition === 'REJECTED';

  const complete = () => {
    setStatus('COMPLETED');
    if (major) {
      setNeedsAppr(true);
      toast('Inspection completed. Major damage sent for approval.');
    } else {
      toast('Inspection completed. EIR updated.');
    }
  };

  const damagePanel = (
    <Panel
      title="Damage"
      sub={editable ? 'Tap the area where the damage is' : `${findings.length} finding${findings.length === 1 ? '' : 's'}`}
    >
      <div className="stack">
        <DamageDiagram category={insp.category} findings={findings} onPick={setZone} readOnly={!editable} />
        {findings.length === 0 ? (
          <p className="small muted">No damage recorded.</p>
        ) : (
          <ul className="list-plain stack">
            {findings.map((f) => (
              <li key={f.inspectionFindingId} className="panel" style={{ padding: 12 }}>
                <div className="row-wrap" style={{ gap: 8 }}>
                  <strong>{f.locationDetail}</strong>
                  <span>
                    {damageName(f.damageCode)} <span className="xs faint">({f.damageCode})</span>
                  </span>
                  <Pill tone={SEV_TONE[f.severity]}>
                    {f.severity.charAt(0) + f.severity.slice(1).toLowerCase()}
                  </Pill>
                  {f.sizeCm && <span className="tag">{f.sizeCm} cm</span>}
                  {f.isPreexisting && <span className="tag">Already there before</span>}
                  {f.needsRepair && <span className="tag">Needs repair</span>}
                  <span className="spacer" />
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 />}
                      aria-label="Remove finding"
                      onClick={() => {
                        setFindings((x) => x.filter((y) => y !== f));
                        toast('Finding removed');
                      }}
                    />
                  )}
                </div>
                {f.description && <div className="small muted" style={{ marginTop: 4 }}>{f.description}</div>}
                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                  {(f.photoDocumentIds ?? []).map((p) => (
                    <div key={p} className="photo" style={{ width: 92 }}>
                      Photo
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );

  return (
    <Page>
      <PageHeader
        crumbs={[['Inspections', '/inspections'], [`${INSP_KIND[insp.inspectionKind]} · ${insp.unitNo}`]]}
        title={<UnitNo no={insp.unitNo} category={insp.category} size="lg" to={`/units/${insp.unitStayId}`} />}
        ms="M1"
        sub={
          <span className="row-wrap" style={{ marginTop: 8 }}>
            <Pill tone="info">{INSP_KIND[insp.inspectionKind]}</Pill>
            {needsAppr && status === 'COMPLETED' ? <Pill tone="wait">Needs approval</Pill> : <StatusPill value={status} />}
            <Pill tone={CONDITION[condition][1]}>{CONDITION[condition][0]}</Pill>
            <span className="small muted">
              {insp.unitType} · {s?.unitSummary.lineCode ?? ''} · {s?.currentLocation?.fullCode ?? 'at gate'} ·{' '}
              {insp.templateCode} · {insp.inspector}
            </span>
          </span>
        }
        actions={
          <Button
            icon={<Printer />}
            perm="inspection.perform"
            disabled={status !== 'COMPLETED' && status !== 'APPROVED'}
            title="Prints once the inspection is completed"
            onClick={() => toast('Inspection report printed')}
          >
            Print report
          </Button>
        }
      />

      <div className="stack-lg">
        {status === 'PENDING' && (
          <Banner
            tone="wait"
            title="Not started yet"
            action={
              <Button
                variant="primary"
                icon={<Play />}
                perm="inspection.perform"
                onClick={() => {
                  setStatus('IN_PROGRESS');
                  toast('Inspection started');
                }}
              >
                Start inspection
              </Button>
            }
          >
            {insp.remarks ?? 'Starting records the time and your name on the inspection.'}
          </Banner>
        )}
        {status === 'COMPLETED' && needsAppr && (
          <Banner tone="stop" title="Major damage: needs approval before the unit moves on">
            {findings
              .filter((f) => f.severity !== 'MINOR')
              .map((f) => `${f.locationDetail}: ${damageName(f.damageCode)}${f.sizeCm ? ` ${f.sizeCm} cm` : ''}`)
              .join(' · ')}
            . A damage hold stays on the unit and the line is told once approved.
            <div style={{ marginTop: 8 }}>
              <div className="row-wrap">
                <Button
                  size="sm"
                  icon={<RotateCcw />}
                  perm="inspection.damage.approve"
                  level="APPR"
                  onClick={() => {
                    setStatus('REINSPECT');
                    setNeedsAppr(false);
                    toast('Sent back for re-inspection');
                  }}
                >
                  Ask to re-inspect
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<ShieldCheck />}
                  perm="inspection.damage.approve"
                  level="APPR"
                  onClick={() => {
                    setStatus('APPROVED');
                    setNeedsAppr(false);
                    toast('Damage approved');
                  }}
                >
                  Approve damage
                </Button>
              </div>
            </div>
          </Banner>
        )}
        {status === 'APPROVED' && (
          <Banner tone="go" title="Damage approved">
            Findings are final. The line has the damage report and a repair estimate can be raised from it.
          </Banner>
        )}
        {status === 'REINSPECT' && (
          <Banner tone="wait" title="Re-inspect">
            {insp.remarks ?? 'The approver asked for a second look. Check the marked areas again and complete.'}
          </Banner>
        )}
        {status === 'COMPLETED' && !needsAppr && (
          <Banner tone="go" title={`Completed ${fmtDT(insp.completedAt ?? '2026-10-07T07:30:00Z')}`}>
            EIR {insp.eirNo ?? 'updated'} carries this condition.
          </Banner>
        )}

        <div className="grid-main-side ops-gms">
          <style>{'.ops-gms > * { min-width: 0; }'}</style>
          <div className="stack-lg">
            {!editable && damagePanel}
            <Panel
              title="Checklist"
              sub={editable ? `${items.length - unanswered} of ${items.length} answered` : undefined}
              actions={
                editable &&
                unanswered > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setResults((r) => ({
                        ...r,
                        ...Object.fromEntries(
                          items.filter((i) => !r[i.inspectionItemId]).map((i) => [i.inspectionItemId, 'OK' as R])
                        ),
                      }))
                    }
                  >
                    Mark the rest OK
                  </Button>
                )
              }
            >
              <div className="stack">
                {items.map((i) => {
                  const v = results[i.inspectionItemId];
                  return (
                    <div
                      key={i.inspectionItemId}
                      className="row-wrap"
                      style={{
                        justifyContent: 'space-between',
                        gap: 8,
                        paddingBottom: 10,
                        borderBottom: '1px solid var(--steel-2)',
                      }}
                    >
                      <div style={{ minWidth: 180, flex: 1 }}>
                        <div className="strong">{i.itemName}</div>
                        <div className="xs faint">{i.area.toLowerCase()}</div>
                      </div>
                      {editable ? (
                        <Segmented
                          xl
                          label={i.itemName}
                          value={(v ?? '') as R}
                          onChange={(x) => setResults((r) => ({ ...r, [i.inspectionItemId]: x }))}
                          options={[
                            { id: 'OK', label: 'OK' },
                            { id: 'DAMAGED', label: 'Damaged' },
                            { id: 'NA', label: 'N/A' },
                          ]}
                        />
                      ) : v ? (
                        <Pill tone={v === 'OK' ? 'go' : v === 'DAMAGED' ? 'stop' : 'idle'}>
                          {v === 'NA' ? 'N/A' : v === 'OK' ? 'OK' : 'Damaged'}
                        </Pill>
                      ) : (
                        <span className="xs faint">Not answered</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>

            {editable && damagePanel}
            {veh && (
              <Panel title="Vehicle">
                <div className="stack">
                  <div className="form-grid">
                    <Field label="Odometer (km)" required>
                      <Input
                        xl
                        value={odo}
                        inputMode="numeric"
                        disabled={!editable}
                        onChange={(e) => setOdo(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Battery">
                      <div>
                        <Segmented
                          xl
                          value={battery}
                          onChange={(b) => editable && setBattery(b)}
                          options={[
                            { id: 'OK', label: 'Starts' },
                            { id: 'WEAK', label: 'Weak' },
                            { id: 'FLAT', label: 'Flat' },
                          ]}
                        />
                      </div>
                    </Field>
                  </div>
                  <Field label="Fuel level" required>
                    <div>
                      <Segmented
                        xl
                        value={fuel}
                        onChange={(f) => editable && setFuel(f)}
                        options={FUEL.map((f) => ({ id: f, label: f }))}
                      />
                    </div>
                  </Field>
                  <Field label="Personal effects left in the vehicle" hint="List them; they go on the EIR and the key tag">
                    <Textarea
                      value={effects}
                      disabled={!editable}
                      onChange={(e) => setEffects(e.target.value)}
                      placeholder="None"
                    />
                  </Field>
                </div>
              </Panel>
            )}

            <Panel title="Signature">
              <div className="stack">
                <div>
                  <Segmented
                    xl
                    value={sigMode}
                    onChange={(m) => editable && setSigMode(m)}
                    options={[
                      { id: 'SCREEN', label: 'Driver signs on screen' },
                      { id: 'PAPER', label: 'Paper, scan later' },
                    ]}
                  />
                </div>
                {sigMode === 'SCREEN' ? (
                  <button
                    type="button"
                    className="sig"
                    disabled={!editable}
                    onClick={() => setSigned(true)}
                    style={{
                      width: '100%',
                      cursor: editable ? 'pointer' : 'default',
                      color: signed ? 'var(--go)' : undefined,
                      borderColor: signed ? 'var(--go)' : undefined,
                    }}
                  >
                    {signed ? (
                      <>
                        <CheckCircle2 size={18} />
                        &nbsp;Signed by {insp.signedBy ?? 'the driver'}
                      </>
                    ) : (
                      <>
                        <FileSignature size={18} />
                        &nbsp;Driver signs here
                      </>
                    )}
                  </button>
                ) : (
                  <Banner tone="wait">
                    Print the report, get it signed, and scan it within 24 hours. Until then it shows “signature pending”.
                  </Banner>
                )}
                {editable && (
                  <>
                    {missing.length > 0 && (
                      <p className="small" style={{ color: 'var(--wait)' }}>
                        Still to do: {missing.join(', ')}.
                      </p>
                    )}
                    {major && (
                      <Banner tone="wait">
                        Major damage recorded: completing sends this inspection to the operations manager for approval.
                      </Banner>
                    )}
                    <div className="row">
                      <Button
                        size="xl"
                        variant="primary"
                        icon={<CheckCircle2 />}
                        perm="inspection.perform"
                        disabled={missing.length > 0}
                        onClick={complete}
                      >
                        Complete inspection
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Panel>
          </div>

          <div className="stack-lg">
            <Panel title="Unit">
              <DL
                items={[
                  ['Unit', <UnitNo key="u" no={insp.unitNo} category={insp.category} />],
                  ['Type', insp.unitType],
                  ['Line', s?.unitSummary.lineCode],
                  ['Where', s?.currentLocation?.fullCode ?? 'Gate'],
                  ['Truck', insp.plateNo ? <Link key="t" to={`/gate/visits/${insp.truckVisitId}`}>{insp.plateNo}</Link> : '—'],
                  ['Seal', s?.sealNo],
                  ...(veh
                    ? ([
                        ['Make', `${s?.cargoUnit.make} ${s?.cargoUnit.model}`],
                        ['Colour', s?.cargoUnit.colour ?? '—'],
                      ] as [string, string][])
                    : []),
                  ['Started', fmtDT(insp.startedAt)],
                  ['Template', insp.templateCode],
                ]}
              />
            </Panel>
            <Panel title="Photos" sub={`${photos} taken · at least ${MIN_PHOTOS}`}>
              <div className="grid-2">
                {Array.from({ length: photos }, (_, i) => (
                  <div key={i} className="photo">
                    {
                      (veh
                        ? ['Front', 'Rear', 'Left', 'Right', 'Dashboard', 'Odometer', 'Interior', 'Boot']
                        : ['Front', 'Left', 'Right', 'Rear', 'Doors', 'Seal', 'Inside', 'Roof'])[i % 8]
                    }
                  </div>
                ))}
              </div>
              {editable && (
                <div style={{ marginTop: 12 }}>
                  <Button size="xl" icon={<Camera />} onClick={() => setPhotos((p) => p + 1)}>
                    Take photo
                  </Button>
                </div>
              )}
              {!photos && !editable && <p className="small muted">No photos.</p>}
            </Panel>
            {insp.remarks && (
              <Panel title="Remarks">
                <p className="small">{insp.remarks}</p>
              </Panel>
            )}
          </div>
        </div>
      </div>

      <FindingDrawer
        zone={zone}
        category={insp.category}
        onClose={() => setZone(null)}
        onAdd={(f) => {
          setFindings((x) => [...x, f]);
          toast(`Finding added: ${f.locationDetail}`);
        }}
      />
    </Page>
  );
}
