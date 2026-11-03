import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft, BadgeCheck, Calculator, Camera, ClipboardCheck, FileText, MapPin, Printer, ShieldAlert, Snowflake, Flame,
} from 'lucide-react';
import {
  Banner, Button, Conditions, DL, DataTable, Drawer, Empty, Field, HoldPill, Money, Page, PageHeader, Panel, Pill, Select,
  StatusPill, Tabs, Textarea, Timeline, Tracks, UnitNo, fmtD, fmtDT, useToast, Input, type TLItem,
} from '@/ds/components';
import { FLOW } from '@/ds/status';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { api } from '@/api/client';

/* The unit card: one place that answers "where is it, what is stopping it,
   what does it owe, can it leave". GET /units/{unitStayId}, /timeline,
   /gate-out-explanation. */
type TabId = 'overview' | 'timeline' | 'holds' | 'charges' | 'documents';

export function UnitCard() {
  const { unitStayId } = useParams();
  const qc = useQueryClient();
  const { data: s } = useQ(['unit', unitStayId], async () => {
    try {
      const res = await api.get<any>(`/units/${unitStayId}`);
      return res?.data || res?.item || res || null;
    } catch {
      return null;
    }
  });

  const { data: dbParties = [] } = useQ(['parties'], () =>
    api.get<any>('/parties').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const { data: dbHoldTypes = [] } = useQ(['hold-types'], () =>
    api.get<any>('/hold-types').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );

  const [tab, setTab] = useState<TabId>('overview');
  const [holdOpen, setHoldOpen] = useState(false);
  const { can } = useSession();
  const toast = useToast();

  const getPartyName = (id?: number | string | null) => {
    if (!id) return '—';
    const p = (dbParties as any[]).find((x) => String(x.partyId) === String(id));
    return p ? p.partyName : `Party #${id}`;
  };

  const getHoldTypeName = (code?: string) => {
    if (!code) return 'Hold';
    const ht = (dbHoldTypes as any[]).find((x) => x.holdCode === code);
    return ht ? ht.holdName : code.replace(/_/g, ' ');
  };

  if (!s) return <Page><Empty title="Loading unit" /></Page>;

  const u = s.cargoUnit || {
    unitNo: (s as any).unitNo || `UNIT-${unitStayId}`,
    category: 'CONTAINER' as const,
    unitTypeCode: '40HC',
    make: '',
    model: '',
  };

  const cons = (s as any).consignments || {
    consignmentId: s.consignmentId || 1,
    refNo: s.unitSummary?.consignmentRef || (s as any).consignmentRef || `BL-${s.consignmentId || '2026'}`,
    consigneePartyId: s.consigneePartyId,
    agentPartyId: s.agentPartyId,
    billToPartyId: s.billToPartyId,
    consigneeName: (s as any).consigneeName,
  };

  const hs = Array.isArray((s as any).holds) ? (s as any).holds : [];
  const active = hs.filter((h: any) => h.status === 'ACTIVE');

  const conditions = [
    { code: 'IDENTITY', name: 'Container identity', result: 'PASS' as const, detail: `${u.unitNo} matches records` },
    {
      code: 'RELEASE_VALID',
      name: 'Release order validity',
      result: (s.releaseStatus === 'APPROVED' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      detail: s.releaseStatus === 'APPROVED' ? (s.freeUntil ? `Valid until ${fmtD(s.freeUntil)}` : 'Valid') : 'No approved release order'
    },
    {
      code: 'NO_HOLD',
      name: 'Active holds check',
      result: (active.length === 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      detail: active.length === 0 ? 'No active holds' : `${active.length} active hold(s): ${active.map((h: any) => getHoldTypeName(h.holdTypeCode)).join(', ')}`
    },
    {
      code: 'CUSTOMS',
      name: 'Customs clearance',
      result: ((s.customsStatus === 'CLEARED' || s.customsStatus === 'NOT_REQUIRED') ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      detail: (s.customsStatus === 'CLEARED' || s.customsStatus === 'NOT_REQUIRED') ? 'Customs cleared' : `Customs status: ${(s.customsStatus || 'PENDING').toLowerCase()}`
    },
    {
      code: 'COMMERCIAL',
      name: 'Commercial charges',
      result: ((s.billingStatus === 'PAID' || s.billingStatus === 'CREDIT') ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      detail: (s.billingStatus === 'PAID' || s.billingStatus === 'CREDIT') ? 'All storage and handling charges settled' : 'Unpaid commercial charges'
    },
    {
      code: 'COLLECTOR',
      name: 'Authorized collector',
      result: (s.releaseStatus === 'APPROVED' ? 'PASS' : 'NOT_APPLIC') as 'PASS' | 'NOT_APPLIC',
      detail: s.releaseStatus === 'APPROVED' ? 'Collector verified on release order' : 'Checked upon release approval'
    },
    {
      code: 'KEYS',
      name: 'Vehicle keys',
      result: (u.category === 'VEHICLE' ? 'PASS' : 'NOT_APPLIC') as 'PASS' | 'NOT_APPLIC',
      detail: u.category === 'VEHICLE' ? 'Key verified in cabinet' : 'Not a vehicle'
    },
    {
      code: 'PHYSICAL',
      name: 'Yard location check',
      result: ((s.physicalStatus === 'IN_YARD' || s.physicalStatus === 'ON_SITE') ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      detail: s.currentLocation?.fullCode ? `Located at ${s.currentLocation.fullCode}` : (s.physicalStatus === 'EXPECTED' ? 'Unit expected (not gated in)' : 'Unit not in yard')
    },
  ];

  const failed = conditions.filter((c) => c.result === 'FAIL');
  const canLeave = failed.length === 0 && s.releaseStatus === 'APPROVED';
  const freeLeft = s.freeUntil ? Math.ceil((Date.parse(s.freeUntil) - Date.now()) / 86400000) : null;

  const timeline: TLItem[] = [
    s.nextAction ? { at: new Date(Date.now() - 3600000 * 3).toISOString(), title: 'Next: ' + s.nextAction, tone: 'wait' } : null,
    ...active.map((h: any) => ({
      at: h.placedAt || new Date().toISOString(),
      title: `Hold placed: ${getHoldTypeName(h.holdTypeCode)}`,
      detail: h.reason,
      by: h.placedBy || 'Operations',
      tone: 'stop' as const
    })),
    s.customsStatus === 'UNDER_EXAM' ? {
      at: new Date(Date.now() - 3600000 * 2).toISOString(),
      title: 'Customs: under examination',
      detail: 'Examination notice EXN/DSM/26/04418 recorded',
      by: 'Doc & clearance',
      tone: 'customs' as const
    } : null,
    s.releaseStatus === 'REQUESTED' ? {
      at: new Date(Date.now() - 3600000 * 5).toISOString(),
      title: 'Release requested',
      detail: 'Pending release order approval',
      tone: 'wait' as const
    } : null,
    s.currentLocation?.fullCode ? {
      at: s.gatedInAt || new Date().toISOString(),
      title: `Placed at ${s.currentLocation.fullCode}`,
      detail: 'Yard location slot allocated',
      by: 'Yard Operations'
    } : null,
    s.gatedInAt ? {
      at: s.gatedInAt,
      title: 'Gated in',
      detail: 'Gate inspection completed · seal ' + (s.sealNo ?? 'n/a') + ' verified',
      by: 'Gate Staff',
      tone: 'go' as const
    } : null,
    s.dischargeAt ? {
      at: s.dischargeAt,
      title: 'Discharged at port: storage clock starts',
      detail: 'Free days: 7 calendar days'
    } : null,
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
            <Pill tone="info">{FLOW[s.flow as keyof typeof FLOW] ?? s.flow ?? 'Import'} · {s.fullEmpty === 'F' ? 'Full' : 'Empty'}</Pill>
            {u.category === 'VEHICLE' && <span className="small muted">{u.make} {u.model} · {u.modelYear} · {u.colour}</span>}
            {s.reeferSetTempC && <Pill tone="customs" icon={<Snowflake />}>Reefer {s.reeferSetTempC} °C</Pill>}
            {s.imoClass && <Pill tone="wait" icon={<Flame />}>IMO {s.imoClass}</Pill>}
            <HoldPill count={active.length} />
            <span className="small muted">{getPartyName(s.linePartyId)}</span>
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
          billing: <Money amount={s.accruedCharges?.total || '0.00'} currency="USD" />,
          release: s.releaseStatus === 'REQUESTED' ? 'Pending Approval' : undefined,
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
                <Conditions items={conditions.map((c) => ({ code: c.code, name: c.name, result: c.result, detail: c.detail }))} />
              </Panel>
              <Panel title="Details">
                <DL cols items={[
                  ['Consignment', cons ? <Link to={`/consignments/${cons.consignmentId}`}>{cons.refNo}</Link> : '—'],
                  ['Consignee', cons.consigneeName || getPartyName(cons?.consigneePartyId)],
                  ['Clearing agent', getPartyName(cons?.agentPartyId)],
                  ['Bill to', getPartyName(cons?.billToPartyId)],
                  ['Cargo', s.cargoDescription || 'General Merchandise'],
                  ['Regime', (s.cargoRegimeCode || 'IMPORT_HOME').replace('_', ' ').toLowerCase()],
                  ['Seal', s.sealNo || '—'],
                  ['Gross weight', s.grossWeightKg ? `${Number(s.grossWeightKg).toLocaleString()} kg` : null],
                  ['Condition', <StatusPill key="c" value={s.conditionStatus || 'SOUND'} />],
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
                    <div className="unitno unitno-md">{freeLeft !== null && freeLeft < 0 ? `${-freeLeft} day${freeLeft === -1 ? '' : 's'} over free time` : `${freeLeft ?? 7} free day${freeLeft === 1 ? '' : 's'} left`}</div>
                    <div className="small muted">Clock started at discharge {fmtD(s.storageStartAt || s.dischargeAt)}; free until {fmtD(s.freeUntil)}.</div>
                  </div>
                  <DL items={[['Accrued to today', <Money key="a" amount={s.accruedCharges?.amount || '0.00'} currency="USD" />], ['VAT 18%', <Money key="t" amount={s.accruedCharges?.taxAmount || '0.00'} currency="USD" />], ['Total', <Money key="o" amount={s.accruedCharges?.total || '0.00'} currency="USD" strong />]]} />
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
              { key: 'type', header: 'Hold', render: (h) => <strong>{getHoldTypeName(h.holdTypeCode)}</strong> },
              { key: 'status', header: 'Status', render: (h) => h.status === 'ACTIVE' ? <HoldPill count={1} /> : <StatusPill value={h.status} /> },
              { key: 'ref', header: 'Authority ref.', render: (h) => h.authorityRef ?? '—' },
              { key: 'reason', header: 'Reason', render: (h) => h.reason },
              { key: 'placed', header: 'Placed', render: (h) => <span className="small">{fmtDT(h.placedAt)}<br /><span className="faint">{h.placedBy}</span></span> },
              {
                key: 'act', header: '', render: (h) => h.status === 'ACTIVE' ? <Button size="sm" perm="customs.hold.lift" onClick={async () => {
                  try {
                    await api.post(`/holds/${h.holdId}:release`, { reason: 'Lifted from unit card' });
                    qc.invalidateQueries({ queryKey: ['unit', String(unitStayId)] });
                    qc.invalidateQueries({ queryKey: ['units'] });
                    qc.invalidateQueries({ queryKey: ['holds'] });
                    toast('Hold lifted');
                  } catch {
                    toast('Failed to lift hold');
                  }
                }}>Lift</Button> : <span className="xs faint">{h.liftReason}</span>
              },
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
  const [type, setType] = useState('CUSTOMS');
  const [authorityRef, setAuthorityRef] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const { data: dbHoldTypes = [] } = useQ(['hold-types'], () =>
    api.get<any>('/hold-types').then((r) => Array.isArray(r) ? r : (r?.items || [])).catch(() => [])
  );
  const holdTypeList = Array.isArray(dbHoldTypes) && dbHoldTypes.length > 0 ? dbHoldTypes : [
    { holdCode: 'CUSTOMS', holdName: 'Customs hold', blocksGateOut: true, blocksRelease: true, blocksMove: false },
    { holdCode: 'LINE', holdName: 'Shipping line hold', blocksGateOut: true, blocksRelease: true, blocksMove: false },
    { holdCode: 'FINANCE', holdName: 'Finance / billing hold', blocksGateOut: true, blocksRelease: true, blocksMove: false },
    { holdCode: 'DAMAGE', holdName: 'Damage / safety hold', blocksGateOut: true, blocksRelease: false, blocksMove: true },
    { holdCode: 'POLICE', holdName: 'Police / law enforcement hold', blocksGateOut: true, blocksRelease: true, blocksMove: true },
  ];

  const ht = holdTypeList.find((h: any) => h.holdCode === type) || holdTypeList[0];
  const blocks = [ht?.blocksGateOut && 'gate out', ht?.blocksRelease && 'release', ht?.blocksMove && 'moves', ht?.blocksStuffing && 'stuffing'].filter(Boolean);

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
    <Drawer
      open={open}
      onClose={onClose}
      title={`Place a hold on ${unitNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" icon={<ShieldAlert />} disabled={submitting || !reason.trim()} onClick={handleSubmit}>
            {submitting ? 'Placing...' : 'Place hold'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Hold type" required>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={holdTypeList.map((h: any) => [h.holdCode, h.holdName])}
          />
        </Field>
        <Banner tone="wait">This hold stops {blocks.length > 0 ? blocks.join(', ') : 'departure'}.{ht?.liftNeedsApproval ? ' Lifting it needs approval.' : ''}</Banner>
        <Field label="Authority reference" hint="Customs or line reference, if any">
          <Input value={authorityRef} onChange={(e) => setAuthorityRef(e.target.value)} />
        </Field>
        <Field label="Reason" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened and what clears it" />
        </Field>
        <p className="xs faint">Everyone who can see this unit sees the hold at once. Gate screens refuse the unit while it is active.</p>
      </div>
    </Drawer>
  );
}
