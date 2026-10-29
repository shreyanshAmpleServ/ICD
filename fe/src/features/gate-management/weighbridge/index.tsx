import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Save, ShieldQuestion } from 'lucide-react';
import {
  Banner, Button, DataTable, Field, Input, Page, PageHeader, Panel, Pill, Segmented, Select, Textarea, UnitNo, fmtDT, useToast,
} from '@/ds/components';
import type { Tone } from '@/ds/status';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { VISIT_TYPES } from '@/features/gate-management/types';
import { TOLERANCE_PCT, WB_LIVE_KG, type Ticket } from './types';
import { weighbridgeApi } from './api';
import { gateQueueApi } from '@/features/gate-management/queue/api';
import { TicketDrawer, kg } from './components/TicketDrawer';
import { ScaleStatusCards } from './components/ScaleStatusCards';

export { weighbridgeApi } from './api';
export * from './types';

type Kind = 'IN' | 'OUT' | 'VGM';
const TARE: Record<number, number> = { 4410: 15400, 4411: 15750, 4412: 15800, 4413: 15600, 4414: 15900, 4416: 17200 };
const DECLARED: Record<number, number> = { 4410: 22400, 4411: 16400, 4412: 14200, 4414: 20100 };
const STATUS: Record<Ticket['status'], [string, Tone]> = {
  OK: ['Within tolerance', 'go'],
  OVERRIDE_PENDING: ['Override requested', 'wait'],
  OVERRIDDEN: ['Overridden', 'wait'],
  NO_DECLARED: ['No declared weight', 'idle'],
};

export function WeighbridgeView() {
  const toast = useToast();
  const { offline } = useSession();
  const { data = [] } = useQ(['weighings'], () => weighbridgeApi.getTickets());
  const { data: queueVisitsRaw = [] } = useQ<any[]>(['gate-queue-visits'], () => gateQueueApi.visits());
  const queueVisits: any[] = Array.isArray(queueVisitsRaw) ? queueVisitsRaw : [];
  const [added, setAdded] = useState<Ticket[]>([]);
  const [open, setOpen] = useState<Ticket | null>(null);

  const onSite: any[] = queueVisits.filter((item: any) => !['EXITED', 'CANCELLED', 'REJECTED', 'ANNOUNCED'].includes(item.status!));
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const activeVisitId = selectedVisitId ?? (onSite[0]?.truckVisitId ?? 1);
  const v: any = onSite.find((x: any) => x.truckVisitId === activeVisitId) ?? onSite[0] ?? null;

  const [kind, setKind] = useState<Kind>('OUT');
  const [source, setSource] = useState<'DEVICE' | 'MANUAL'>('DEVICE');
  const [gross, setGross] = useState(String(WB_LIVE_KG));
  const [tare, setTare] = useState(String(TARE[activeVisitId] ?? '15400'));
  const [ctrTare, setCtrTare] = useState('3750');
  const [declared, setDeclared] = useState(String(DECLARED[activeVisitId] ?? '22400'));
  const [manualWhy, setManualWhy] = useState('');
  const [overrideWhy, setOverrideWhy] = useState('');
  const [requested, setRequested] = useState(false);

  const firstUnit = (v?.units || [])[0];
  useEffect(() => {
    setTare(String(TARE[activeVisitId] ?? '15400'));
    setDeclared(DECLARED[activeVisitId] ? String(DECLARED[activeVisitId]) : '22400');
    setRequested(false);
    setOverrideWhy('');
  }, [activeVisitId]);
  useEffect(() => {
    if (source === 'DEVICE') setGross(String(WB_LIVE_KG));
  }, [source]);

  const g = Number(gross),
    t = Number(tare);
  const net = g && t ? g - t : NaN;
  const d = Number(declared);
  const variance = d && !Number.isNaN(net) ? ((net - d) / d) * 100 : NaN;
  const out = !Number.isNaN(variance) && Math.abs(variance) > TOLERANCE_PCT;
  const invalid =
    !g || !t || net <= 0
      ? 'Gross must be more than tare'
      : g > 80000
        ? 'Above the 80 t capacity of WB-01: check the reading'
        : undefined;
  const manualOk = source === 'DEVICE' || manualWhy.trim().length >= 5;
  const canSave = !invalid && manualOk && (!out || requested);

  const save = () => {
    const id = 5532 + added.length;
    const tkt: Ticket = {
      weighingId: id,
      ticketNo: `WT-DAR1-26-${id}`,
      weighKind: kind,
      truckVisitId: activeVisitId,
      plateNo: v?.plateNo ?? '',
      unitNo: firstUnit?.unitNo || undefined,
      grossKg: String(g),
      tareKg: String(t),
      netKg: String(net),
      containerTareKg: kind === 'VGM' ? ctrTare : undefined,
      declaredKg: declared || undefined,
      variancePct: Number.isNaN(variance) ? undefined : variance.toFixed(1),
      withinTolerance: Number.isNaN(variance) ? undefined : !out,
      source,
      deviceRef: source === 'DEVICE' ? 'WB-01' : undefined,
      weighedAt: new Date().toISOString(),
      operator: 'You',
      status: Number.isNaN(variance) ? 'NO_DECLARED' : out ? 'OVERRIDE_PENDING' : 'OK',
      approvalNo: out ? 'APR-26-00417' : undefined,
    };
    setAdded((a) => [tkt, ...a]);
    setOpen(tkt);
    toast(offline ? `Ticket ${tkt.ticketNo} saved on this device` : `Ticket ${tkt.ticketNo} saved`);
    setRequested(false);
    setOverrideWhy('');
    setManualWhy('');
  };

  const rows = [...added, ...data];

  return (
    <Page wide>
      <PageHeader
        title="Weighbridge"
        ms="M1"
        sub="WB-01 · 80 t platform at the inner gate · tolerance ±5% of declared"
      />
      <div className="stack-lg">
        {offline && (
          <Banner tone="wait" title="Offline">
            Tickets save on this PC and sync when the connection returns. The scale still reads live over the serial cable.
          </Banner>
        )}
        <div className="grid-main-side ops-gms">
          <style>{'.ops-gms > * { min-width: 0; }'}</style>
          <Panel title="Weigh a truck">
            <div className="stack">
              <div className="form-grid">
                <Field label="Truck visit" required>
                  <Select
                    value={String(activeVisitId)}
                    onChange={(e) => setSelectedVisitId(Number(e.target.value))}
                    options={onSite.map((x: any) => [String(x.truckVisitId), `${x.plateNo} · ${VISIT_TYPES[x.visitTypeCode] || x.visitTypeCode}`])}
                  />
                </Field>
                <Field label="Weighing">
                  <div>
                    <Segmented
                      value={kind}
                      onChange={setKind}
                      options={[
                        { id: 'IN', label: 'In' },
                        { id: 'OUT', label: 'Out' },
                        { id: 'VGM', label: 'VGM' },
                      ]}
                    />
                  </div>
                </Field>
              </div>
              <div className="row-wrap small muted">
                <Link to={`/gate/visits/${activeVisitId}`}>{v?.visitNo || `TV-${activeVisitId}`}</Link>·<span>{v?.driverName || 'Driver'}</span>·
                {firstUnit?.unitNo ? <UnitNo no={firstUnit.unitNo} category="CONTAINER" /> : <span>no unit yet</span>}
              </div>

              <Field label="Gross weight" required error={invalid}>
                <div className="stack" style={{ gap: 8 }}>
                  <div>
                    <Segmented
                      value={source}
                      onChange={setSource}
                      options={[
                        { id: 'DEVICE', label: 'From scale WB-01' },
                        { id: 'MANUAL', label: 'Type it in' },
                      ]}
                    />
                  </div>
                  <div className="row-wrap">
                    <Input
                      xl
                      value={gross}
                      readOnly={source === 'DEVICE'}
                      inputMode="numeric"
                      onChange={(e) => setGross(e.target.value.replace(/\D/g, ''))}
                      aria-label="Gross kg"
                      style={{ maxWidth: 220, fontVariantNumeric: 'tabular-nums' }}
                    />
                    <span className="strong">kg</span>
                    {source === 'DEVICE' && (
                      <Pill tone="go" icon={<Activity />}>
                        Live, stable 4 s
                      </Pill>
                    )}
                  </div>
                </div>
              </Field>
              {source === 'MANUAL' && (
                <Field label="Why type it in?" required hint="The ticket shows “manual” and the reason">
                  <Textarea
                    value={manualWhy}
                    onChange={(e) => setManualWhy(e.target.value)}
                    placeholder="e.g. Scale display froze, read from the backup indicator"
                  />
                </Field>
              )}
              <div className="form-grid">
                <Field label="Truck and trailer tare" hint="From the truck record, last weighed 12 Sep">
                  <Input
                    value={tare}
                    inputMode="numeric"
                    onChange={(e) => setTare(e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
                {kind === 'VGM' && (
                  <Field label="Container tare" hint="From the door plate">
                    <Input
                      value={ctrTare}
                      inputMode="numeric"
                      onChange={(e) => setCtrTare(e.target.value.replace(/\D/g, ''))}
                    />
                  </Field>
                )}
                <Field
                  label={kind === 'VGM' ? 'Declared VGM' : 'Declared gross of the unit'}
                  hint="From the manifest or shipper"
                >
                  <Input
                    value={declared}
                    inputMode="numeric"
                    onChange={(e) => setDeclared(e.target.value.replace(/\D/g, ''))}
                    placeholder="None declared"
                  />
                </Field>
              </div>

              <div className="kpi-strip">
                <div className="kpi">
                  <span className="label">{kind === 'VGM' ? 'VGM (gross − truck tare)' : 'Net (unit on the truck)'}</span>
                  <span className="value" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Number.isNaN(net) ? '—' : net.toLocaleString('en-US')}
                    <small>kg</small>
                  </span>
                </div>
                <div className="kpi">
                  <span className="label">Declared</span>
                  <span className="value">
                    {d ? d.toLocaleString('en-US') : '—'}
                    <small>kg</small>
                  </span>
                </div>
                <div className="kpi">
                  <span className="label">Variance</span>
                  <span
                    className="value"
                    style={{ color: out ? 'var(--stop)' : Number.isNaN(variance) ? undefined : 'var(--go)' }}
                  >
                    {Number.isNaN(variance) ? '—' : `${variance > 0 ? '+' : ''}${variance.toFixed(1)}`}
                    <small>%</small>
                  </span>
                  <span className="delta">Tolerance ±{TOLERANCE_PCT}%</span>
                </div>
              </div>

              {out && !requested && (
                <Banner tone="stop" title={`Outside tolerance by ${(Math.abs(variance) - TOLERANCE_PCT).toFixed(1)} points`}>
                  The truck can not leave on this ticket. Re-weigh if the truck was not fully on the platform; otherwise ask the duty manager for an override.
                </Banner>
              )}
              {out && !requested && (
                <div className="stack">
                  <Field label="Reason for the override" required>
                    <Textarea
                      value={overrideWhy}
                      onChange={(e) => setOverrideWhy(e.target.value)}
                      placeholder="e.g. Shipper declared net instead of gross; agent sending corrected VGM"
                    />
                  </Field>
                  <div className="row-wrap">
                    <Button
                      icon={<ShieldQuestion />}
                      perm="weighbridge.override"
                      level="REQ"
                      disabled={overrideWhy.trim().length < 5}
                      onClick={() => {
                        setRequested(true);
                        toast('Override requested from the duty manager');
                      }}
                    >
                      Request override
                    </Button>
                    <Button variant="ghost" onClick={() => toast('Re-weigh: ask the driver to pull forward and stop on the marks')}>
                      Re-weigh
                    </Button>
                  </div>
                </div>
              )}
              {out && requested && (
                <Banner tone="wait" title="Override requested">
                  Save the ticket now; it stays “override requested” until the duty manager decides. The gate-out check waits for the decision.
                </Banner>
              )}
              {!out && !Number.isNaN(variance) && (
                <Banner tone="go">Within ±{TOLERANCE_PCT}% of the declared weight.</Banner>
              )}
              <div className="row">
                <Button size="xl" variant="primary" icon={<Save />} perm="weighbridge.ticket" disabled={!canSave} onClick={save}>
                  Save ticket
                </Button>
              </div>
            </div>
          </Panel>

          <ScaleStatusCards v={v} rows={rows} />
        </div>

        <Panel title="Tickets" flush>
          <DataTable
            rows={rows}
            rowKey={(r) => r.weighingId!}
            onRow={setOpen}
            cols={[
              {
                key: 'no',
                header: 'Ticket',
                render: (r) => (
                  <span className="small strong">
                    {r.ticketNo}
                    <div className="xs faint">{fmtDT(r.weighedAt)}</div>
                  </span>
                ),
              },
              { key: 'kind', header: 'Kind', render: (r) => <span className="tag">{r.weighKind}</span> },
              { key: 'truck', header: 'Truck', render: (r) => <span className="unitno unitno-sm">{r.plateNo}</span> },
              { key: 'unit', header: 'Unit', render: (r) => (r.unitNo ? <UnitNo no={r.unitNo} /> : '—') },
              { key: 'g', header: 'Gross', num: true, render: (r) => kg(r.grossKg) },
              { key: 'net', header: 'Net', num: true, render: (r) => kg(r.netKg) },
              { key: 'dec', header: 'Declared', num: true, render: (r) => kg(r.declaredKg) },
              {
                key: 'var',
                header: 'Variance',
                num: true,
                render: (r) =>
                  r.variancePct ? (
                    <span
                      style={{
                        color: r.withinTolerance ? undefined : 'var(--stop)',
                        fontWeight: r.withinTolerance ? 400 : 700,
                      }}
                    >
                      {Number(r.variancePct) > 0 ? '+' : ''}
                      {r.variancePct}%
                    </span>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'src',
                header: 'Source',
                render: (r) => <span className="xs">{r.source === 'DEVICE' ? r.deviceRef : 'Manual'}</span>,
              },
              {
                key: 'st',
                header: 'Status',
                render: (r) => <Pill tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Pill>,
              },
            ]}
          />
        </Panel>
      </div>

      <TicketDrawer open={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

export { WeighbridgeView as Weighbridge };
export default WeighbridgeView;
