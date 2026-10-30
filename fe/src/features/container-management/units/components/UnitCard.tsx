import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft, BadgeCheck, Calculator, Camera, ClipboardCheck, FileText, MapPin, Printer, ShieldAlert, Snowflake, Flame,
} from 'lucide-react';
import {
  Banner, Button, Conditions, DL, DataTable, Drawer, Empty, Field, HoldPill, Money, Page, PageHeader, Panel, Pill, Select,
  StatusPill, Tabs, Textarea, Timeline, Tracks, UnitNo, fmtD, fmtDT, useToast, type TLItem,
} from '@/ds/components';
import { FLOW } from '@/ds/status';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { api } from '@/api/client';
import { consignment, partyName, stay } from '@/mock/core';
import { evaluate, holdTypeName, holdTypes, holdsOf } from '@/mock/control';
import { at } from '@/mock/gen';

/* The unit card: one place that answers "where is it, what is stopping it,
   what does it owe, can it leave". GET /units/{unitStayId}, /timeline,
   /gate-out-explanation. */
type TabId = 'overview' | 'timeline' | 'holds' | 'charges' | 'documents';

export function UnitCard() {
  const { unitStayId } = useParams();
  const { data: s } = useQ(['unit', unitStayId], () => delay(stay(Number(unitStayId))));
  const [tab, setTab] = useState<TabId>('overview');
  const [holdOpen, setHoldOpen] = useState(false);
  const { can } = useSession();
  const toast = useToast();

  if (!s) return <Page><Empty title="Loading unit" /></Page>;
  const u = s.cargoUnit || {
    unitNo: (s as any).unitNo || `UNIT-${unitStayId}`,
    category: 'CONTAINER' as const,
    unitTypeCode: '40HC',
    make: '',
    model: '',
  };
  const cons = (s as any).consignments || consignment(s.consignmentId);
  const hs = (s as any).holds && (s as any).holds.length > 0 ? (s as any).holds : holdsOf(s.unitStayId!);
  const active = hs.filter((h: any) => h.status === 'ACTIVE');
  const checks = evaluate(s, 'PREVIEW');
  const failed = checks.filter((c) => c.result === 'FAIL');
  const canLeave = failed.length === 0 && s.releaseStatus === 'APPROVED';
  const freeLeft = s.freeUntil ? Math.ceil((Date.parse(s.freeUntil) - Date.parse(at(0))) / 86400000) : null;

  const timeline: TLItem[] = [
    s.nextAction ? { at: at(-3.5), title: 'Next: ' + s.nextAction, tone: 'wait' } : null,
    ...active.map((h: any) => ({ at: h.placedAt || new Date().toISOString(), title: `Hold placed: ${holdTypeName(h.holdTypeCode)}`, detail: h.reason, by: h.placedBy || 'Operations', tone: 'stop' as const })),
    s.customsStatus === 'UNDER_EXAM' ? { at: at(30), title: 'Customs: under examination', detail: 'Examination notice EXN/DSM/26/04418 recorded', by: 'Doc & clearance · Rehema K.', tone: 'customs' as const } : null,
    { at: at(52), title: 'Release requested by Kilele Clearing & Forwarding', detail: 'RO-DAR1-26-01942 · collector Baraka Mwita', tone: 'wait' as const },
    s.gatedInAt ? { at: new Date(Date.parse(s.gatedInAt) + 3600_000 * 0.6).toISOString(), title: `Placed at ${s.currentLocation?.fullCode ?? 'yard'}`, detail: 'Move by RS-01 · suggested slot 1 of 3', by: 'Yard · Ibrahim N.' } : null,
    s.gatedInAt ? { at: new Date(Date.parse(s.gatedInAt) + 3600_000 * 0.3).toISOString(), title: 'Gate-in inspection: sound', detail: '6 photos · EIR-DAR1-26-' + s.unitStayId, by: 'Inspection · Juma M.', tone: 'go' as const } : null,
    s.gatedInAt ? { at: s.gatedInAt, title: 'Gated in from port', detail: 'Truck T 337 DKA · seal ' + (s.sealNo ?? 'n/a') + ' matched', by: 'Gate · Rose A.', tone: 'go' as const } : null,
    s.dischargeAt ? { at: s.dischargeAt, title: 'Discharged at port: storage clock starts', detail: 'Free days: 7 calendar days (Sundays and holidays count)' } : null,
  ].filter(Boolean) as TLItem[];

  return (
    <Page>
      <PageHeader
        crumbs={[['Units', '/units'], [u.unitNo]]}
        title={<UnitNo no={u.unitNo} category={u.category} size="lg" />}
        ms="M1"
        sub={
          <span className="row-wrap" style={{ marginTop: 8 }}>
            <Pill tone="info">{u.unitTypeCode}</Pill>
            <Pill tone="info">{FLOW[s.flow]} · {s.fullEmpty === 'F' ? 'Full' : 'Empty'}</Pill>
            {u.category === 'VEHICLE' && <span className="small muted">{u.make} {u.model} · {u.modelYear} · {u.colour}</span>}
            {s.reeferSetTempC && <Pill tone="customs" icon={<Snowflake />}>Reefer {s.reeferSetTempC} °C</Pill>}
            {s.imoClass && <Pill tone="wait" icon={<Flame />}>IMO {s.imoClass}</Pill>}
            <HoldPill count={active.length} />
            <span className="small muted">{partyName(s.linePartyId)}</span>
          </span>
        }
        actions={
          <>
            <Button icon={<ShieldAlert />} perm="customs.hold.place" level="REQ" onClick={() => setHoldOpen(true)}>Place hold</Button>
            <Button icon={<ArrowRightLeft />} perm="yard.allocate">Move</Button>
            <Button icon={<Printer />} perm="gate.pass.print">Print EIR</Button>
            <Button variant="primary" icon={<BadgeCheck />} perm="release.issue">Release</Button>
          </>
        }
      />

      <div className="stack-lg">
        {canLeave ? (
          <Banner tone="go" title="Can leave today">Release RO valid; all eight conditions pass.</Banner>
        ) : (
          <Banner tone={active.length ? 'stop' : 'wait'} title={`Cannot leave yet: ${failed.length} of 8 conditions not met`}
            action={<Button size="sm" onClick={() => setTab('overview')}>See why</Button>}>
            {failed.map((f) => f.detail).join('. ')}.
          </Banner>
        )}

        <Tracks s={s} notes={{
          physical: s.currentLocation ? <span className="row" style={{ gap: 4 }}><MapPin size={12} />{s.currentLocation.fullCode}</span> : undefined,
          customs: s.customsStatus === 'UNDER_EXAM' ? 'Exam today 14:00, bay X-01' : undefined,
          billing: <Money amount={s.accruedCharges?.total} currency="USD" />,
          release: s.releaseStatus === 'REQUESTED' ? 'RO-DAR1-26-01942' : undefined,
        }} />

        <Tabs<TabId> value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: 'Overview' }, { id: 'timeline', label: 'Timeline', count: timeline.length },
          { id: 'holds', label: 'Holds', count: active.length }, { id: 'charges', label: 'Charges', hidden: !can('billing.invoice.view') },
          { id: 'documents', label: 'Documents & photos', count: 9 },
        ]} />

        {tab === 'overview' && (
          <div className="grid-main-side">
            <div className="stack-lg">
              <Panel title="Can it leave?" sub="Release conditions, checked now (preview)">
                <Conditions items={checks.map((c) => ({ code: c.conditionCode, name: c.conditionName, result: c.result, detail: c.detail }))} />
              </Panel>
              <Panel title="Details">
                <DL cols items={[
                  ['Consignment', cons ? <Link to={`/consignments/${cons.consignmentId}`}>{cons.refNo}</Link> : '—'],
                  ['Consignee', partyName(cons?.consigneePartyId)],
                  ['Clearing agent', partyName(cons?.agentPartyId)],
                  ['Bill to', partyName(cons?.billToPartyId)],
                  ['Cargo', s.cargoDescription],
                  ['Regime', s.cargoRegimeCode.replace('_', ' ').toLowerCase()],
                  ['Seal', s.sealNo],
                  ['Gross weight', s.grossWeightKg ? `${Number(s.grossWeightKg).toLocaleString()} kg` : null],
                  ['Condition', <StatusPill key="c" value={s.conditionStatus} />],
                  ['Discharged at port', fmtDT(s.dischargeAt)],
                  ['Gated in', fmtDT(s.gatedInAt)],
                  ['Destination', s.destinationCountry ?? 'Tanzania'],
                ]} />
              </Panel>
            </div>
            <div className="stack-lg">
              <Panel title="Storage clock">
                <div className="stack">
                  <div>
                    <div className="unitno unitno-md">{freeLeft !== null && freeLeft < 0 ? `${-freeLeft} day${freeLeft === -1 ? '' : 's'} over free time` : `${freeLeft} free day${freeLeft === 1 ? '' : 's'} left`}</div>
                    <div className="small muted">Clock started at discharge {fmtD(s.storageStartAt)}; free until {fmtD(s.freeUntil)}.</div>
                  </div>
                  <DL items={[['Accrued to today', <Money key="a" amount={s.accruedCharges?.amount} currency="USD" />], ['VAT 18%', <Money key="t" amount={s.accruedCharges?.taxAmount} currency="USD" />], ['Total', <Money key="o" amount={s.accruedCharges?.total} currency="USD" strong />]]} />
                  <Button icon={<Calculator />} perm="billing.rates.view">Preview to a date</Button>
                </div>
              </Panel>
              <Panel title="Quick actions">
                <div className="stack">
                  <Button icon={<ClipboardCheck />} perm="inspection.perform">Start inspection</Button>
                  <Button icon={<Camera />} perm="inspection.perform">Add photos</Button>
                  <Button icon={<FileText />} perm="billing.invoice.create">Create proforma</Button>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {tab === 'timeline' && <Panel><Timeline items={timeline} /></Panel>}

        {tab === 'holds' && (
          <Panel flush title="Holds" actions={<Button size="sm" icon={<ShieldAlert />} perm="customs.hold.place" level="REQ" onClick={() => setHoldOpen(true)}>Place hold</Button>}>
            <DataTable<any> rows={hs} rowKey={(h) => h.holdId!} empty={<Empty title="No holds on this unit">Holds stop the gate, the release or moves depending on their type.</Empty>} cols={[
              { key: 'type', header: 'Hold', render: (h) => <strong>{holdTypeName(h.holdTypeCode)}</strong> },
              { key: 'status', header: 'Status', render: (h) => h.status === 'ACTIVE' ? <HoldPill count={1} /> : <StatusPill value={h.status} /> },
              { key: 'ref', header: 'Authority ref.', render: (h) => h.authorityRef ?? '—' },
              { key: 'reason', header: 'Reason', render: (h) => h.reason },
              { key: 'placed', header: 'Placed', render: (h) => <span className="small">{fmtDT(h.placedAt)}<br /><span className="faint">{h.placedBy}</span></span> },
              { key: 'act', header: '', render: (h) => h.status === 'ACTIVE' ? <Button size="sm" perm="customs.hold.lift" onClick={async () => {
                try {
                  await api.post(`/holds/${h.holdId}:lift`, { reason: 'Lifted from unit card' });
                  toast('Hold lifted');
                } catch (e: any) {
                  toast('Failed to lift hold');
                }
              }}>Lift</Button> : <span className="xs faint">{h.liftReason}</span> },
            ]} />
          </Panel>
        )}

        {tab === 'charges' && (
          <Panel flush title="Charges so far" sub="Rated by the active tariff; nothing is invoiced until you create a proforma or invoice.">
            <DataTable rowKey={(r) => r.code} rows={[
              { code: 'LIFT_ON_OFF', name: 'Lift off at gate-in', qty: '1 move', rate: '90.00', amt: '90.00' },
              { code: 'STORAGE', name: `Storage after free days (${fmtD(s.freeUntil)} → today)`, qty: `${Math.max(0, -(freeLeft ?? 0))} days`, rate: '16.00', amt: (Math.max(0, -(freeLeft ?? 0)) * 16).toFixed(2) },
            ]} cols={[
              { key: 'name', header: 'Charge', render: (r) => <><strong>{r.name}</strong><div className="xs faint">{r.code}</div></> },
              { key: 'qty', header: 'Quantity' },
              { key: 'rate', header: 'Rate', num: true, perm: 'billing.rates.view', render: (r) => <Money amount={r.rate} /> },
              { key: 'amt', header: 'Amount (USD)', num: true, render: (r) => <Money amount={r.amt} /> },
            ]} />
          </Panel>
        )}

        {tab === 'documents' && (
          <div className="grid-4">
            {['Gate-in front', 'Gate-in left', 'Gate-in right', 'Gate-in rear', 'Seal close-up', 'Door', 'EIR (signed)', 'Exam notice', 'Delivery order'].map((p) => (
              <div key={p} className="photo">{p}</div>
            ))}
          </div>
        )}
      </div>

      <PlaceHold open={holdOpen} onClose={() => setHoldOpen(false)} unitNo={u.unitNo} unitStayId={Number(unitStayId)} />
    </Page>
  );
}

function PlaceHold({ open, onClose, unitNo, unitStayId }: { open: boolean; onClose: () => void; unitNo: string; unitStayId: number }) {
  const qc = useQueryClient();
  const [type, setType] = useState('LINE');
  const [authorityRef, setAuthorityRef] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const ht = holdTypes.find((h) => h.holdCode === type)!;
  const blocks = [ht.blocksGateOut && 'gate out', ht.blocksRelease && 'release', ht.blocksMove && 'moves', ht.blocksStuffing && 'stuffing'].filter(Boolean);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/holds', {
        unitStayId,
        holdTypeCode: type,
        authorityRef: authorityRef.trim() || undefined,
        reason: reason.trim(),
      });
      qc.invalidateQueries({ queryKey: ['unit', String(unitStayId)] });
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['holds'] });
      toast('Hold placed successfully');
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to place hold');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Place a hold on ${unitNo}`}
      footer={<><Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button><Button variant="primary" icon={<ShieldAlert />} disabled={submitting || !reason.trim()} onClick={handleSubmit}>{submitting ? 'Placing...' : 'Place hold'}</Button></>}>
      <div className="stack">
        <Field label="Hold type" required><Select value={type} onChange={(e) => setType(e.target.value)} options={holdTypes.map((h) => [h.holdCode, h.holdName])} /></Field>
        <Banner tone="wait">This hold stops {blocks.join(', ')}.{ht.liftNeedsApproval ? ' Lifting it needs approval.' : ''}</Banner>
        <Field label="Authority reference" hint="Customs or line reference, if any">
          <input className="input" value={authorityRef} onChange={(e) => setAuthorityRef(e.target.value)} />
        </Field>
        <Field label="Reason" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened and what clears it" />
        </Field>
        <Field label="Evidence" hint={ht.liftNeedsEvidence ? 'Required to lift this hold later' : 'Optional'}><Button icon={<Camera />}>Attach file or photo</Button></Field>
        <p className="xs faint">Everyone who can see this unit sees the hold at once. Gate screens refuse the unit while it is active.</p>
      </div>
    </Drawer>
  );
}

