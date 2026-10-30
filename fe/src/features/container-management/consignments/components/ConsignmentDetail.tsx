import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, FileText, Landmark, Pencil, Ship, Upload } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, DL, DataTable, Drawer, Empty, Field, HoldPill, Input, Kpi, MiniTracks, Money, Page, PageHeader, Panel, Pill, Select,
  StatusPill, Tabs, Textarea, UnitNo, fmtD, fmtDT, useToast,
} from '@/ds/components';
import { REF_TYPE_NAME } from '@/mock/control';
import { useQ, delay } from '@/api/query';
import { api } from '@/api/client';
import { consignment, parties, partyName, unitsOf, vesselCalls } from '@/mock/core';
import { allCustomsRefs, documentsOf, linesOf, releasesFor } from '@/mock/cargo';
import { regimeName, refTypeName } from '../index';
import { CustomsRefDrawer } from '@/features/customs';
import { RequestRelease } from '@/features/container-management/releases';
import { Progress } from '@/features/container-management/shared';

/* GET /consignments/{id} with its units, lines, customs references,
   documents and release orders. */
type TabId = 'units' | 'lines' | 'customs' | 'releases' | 'documents';

export function ConsignmentDetail() {
  const { consignmentId } = useParams();
  const id = Number(consignmentId);
  const nav = useNavigate();
  const toast = useToast();
  const { data: c } = useQ(['consignment', id], () => delay(consignment(id)));
  const [tab, setTab] = useState<TabId>('units');
  const [edit, setEdit] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [newRefs, setNewRefs] = useState<S<'CustomsRef'>[]>([]);
  const [cleared, setCleared] = useState<Record<number, string>>({});
  const [, bump] = useState(0);

  const baseUnits = useMemo(() => {
    if ((c as any)?.units && (c as any).units.length > 0) {
      return (c as any).units.map((u: any) => ({
        unitStayId: u.unitStayId,
        unitNo: u.unitNo,
        cargoUnit: {
          unitNo: u.unitNo,
          category: u.category || 'CONTAINER',
          unitTypeCode: u.unitTypeCode || '40HC',
        },
        currentLocation: { fullCode: u.location || 'In yard' },
        physicalStatus: u.physicalStatus || 'ON_SITE',
        customsStatus: u.customsStatus || 'PENDING',
        releaseStatus: u.releaseStatus || 'PENDING_CHARGES',
        billingStatus: u.billingStatus || 'UNBILLED',
        activeHoldCount: u.activeHoldCount || 0,
        sealNo: u.sealNo || 'SEAL-01',
        freeUntil: u.freeUntil || new Date(Date.now() + 5 * 86400000).toISOString(),
        accruedCharges: { total: 0 },
      }));
    }
    return unitsOf(id);
  }, [c, id]);

  const units = useMemo(() => baseUnits.map((s: any) => (cleared[s.unitStayId!] ? { ...s, customsStatus: cleared[s.unitStayId!] as S<'UnitStay'>['customsStatus'] } : s)), [baseUnits, cleared]);

  if (!c) {
    return <Page><Empty title={consignment(id) === undefined && Number.isFinite(id) ? 'Loading consignment' : 'Consignment not found'} action={<Link to="/consignments">Back to consignments</Link>} /></Page>;
  }

  const vc = (c as any).vesselName
    ? {
        vesselName: (c as any).vesselName,
        voyageNo: (c as any).voyageNo,
        portCallRef: (c as any).portCallRef || 'PC-2601',
        status: (c as any).status || 'ALONGSIDE',
        ata: new Date().toISOString(),
        eta: new Date().toISOString(),
        dischargeCompletedAt: null,
      }
    : vesselCalls.find((v) => v.vesselCallId === c.vesselCallId);

  const refs = [...newRefs, ...allCustomsRefs.filter((r) => r.consignmentId === id || units.some((u: any) => u.unitStayId === r.unitStayId))];
  const ros = releasesFor(id);
  const lines = (c as any)?.lines && (c as any).lines.length > 0 ? (c as any).lines.map((l: any) => ({
    consignmentLineId: l.consignmentLineId,
    lineNo: l.lineNo,
    unitTypeCode: l.commodityCode || l.packageType || '40HC',
    description: l.goodsDescription || 'General Merchandise',
    qtyExpected: l.packageCount || 1,
    uom: l.packageType || 'PK',
    qtyReceived: l.packageCount || 1,
    qtyDelivered: 0,
    weightKg: l.grossWeightKg || 25000,
  })) : linesOf(id);
  const docs = documentsOf(id);
  const held = units.filter((u: any) => (u.activeHoldCount ?? 0) > 0);
  const notCleared = units.filter((u: any) => u.physicalStatus !== 'DEPARTED' && !['CLEARED', 'NOT_REQUIRED'].includes(u.customsStatus ?? ''));
  const accrued = units.reduce((n: number, u: any) => n + (u.physicalStatus === 'DEPARTED' ? 0 : Number(u.accruedCharges?.total ?? 0)), 0);

  return (
    <Page>
      <PageHeader
        crumbs={[['Consignments', '/consignments'], [c.refNo]]}
        title={c.refNo} ms="M1"
        sub={
          <span className="row-wrap" style={{ marginTop: 6 }}>
            <Pill tone="info">{refTypeName(c.refType)}</Pill>
            <Pill tone="info">{regimeName(c.cargoRegimeCode)}{c.destinationCountry ? ` → ${c.destinationCountry}` : ''}</Pill>
            <StatusPill value={c.status} />
            <HoldPill count={held.length} />
            <span className="small muted">{c.cargoDescription}</span>
          </span>
        }
        actions={<>
          <Button icon={<Pencil />} perm="consignment.edit" onClick={() => setEdit(true)}>Edit</Button>
          <Button icon={<Landmark />} perm="customs.ref.edit" onClick={() => setRefOpen(true)}>Add customs ref</Button>
          <Button variant="primary" icon={<BadgeCheck />} perm="release.issue" onClick={() => setRelOpen(true)}>Request release</Button>
        </>}
      />

      <div className="stack-lg">
        {held.length > 0 && <Banner tone="stop" title={`${held.length} unit${held.length === 1 ? ' is' : 's are'} on hold`} action={<Button size="sm" onClick={() => nav('/holds')}>See holds</Button>}>Held units cannot be released until the hold is lifted.</Banner>}
        {held.length === 0 && notCleared.length > 0 && c.refType === 'BL' && <Banner tone="customs" title={`${notCleared.length} unit${notCleared.length === 1 ? '' : 's'} not yet cleared by customs`}>Record the customs release when the agent brings it; units are set to cleared at once.</Banner>}

        <div className="kpi-strip">
          <Kpi label="Expected" value={c.unitsExpected} unit="units" />
          <Kpi label="Received" value={c.unitsReceived} delta={<Progress pct={c.unitsExpected ? ((c.unitsReceived ?? 0) / c.unitsExpected) * 100 : 0} label="Units received" />} />
          <Kpi label="Delivered" value={c.unitsDelivered} />
          <Kpi label="On hold" value={held.length} delta={held.length ? 'Blocks release' : 'None'} />
          <Kpi label="Charges so far" value={<Money amount={accrued} currency="USD" />} delta={`Bill to ${partyName(c.billToPartyId)}`} />
        </div>

        <div className="grid-3">
          <Panel title="Parties">
            <DL items={[
              ['Consignee', c.consigneePartyId ? <Link to={`/parties/${c.consigneePartyId}`}>{partyName(c.consigneePartyId)}</Link> : '—'],
              ['Shipper', c.shipperPartyId ? partyName(c.shipperPartyId) : '—'],
              ['Clearing agent', c.agentPartyId ? <Link to={`/parties/${c.agentPartyId}`}>{partyName(c.agentPartyId)}</Link> : '—'],
              ['Bill to', partyName(c.billToPartyId)],
              ['Shipping line', partyName(c.shippingLinePartyId)],
            ]} />
          </Panel>
          <Panel title="Vessel call" actions={vc && <Button size="sm" variant="ghost" icon={<Ship />} onClick={() => nav('/vessel-calls')}>Open</Button>}>
            {vc ? (
              <DL items={[
                ['Vessel', `${vc.vesselName} ${vc.voyageNo}`],
                ['Port call', vc.portCallRef],
                ['Arrived', fmtDT(vc.ata ?? vc.eta)],
                ['Discharge done', vc.dischargeCompletedAt ? fmtDT(vc.dischargeCompletedAt) : <span className="faint">Not yet</span>],
                ['Status', <StatusPill key="s" value={vc.status} />],
              ]} />
            ) : <p className="small muted">No vessel call. {c.refType === 'EMPTY_RELEASE' ? 'Empty releases are handed out from the depot stock.' : ''}</p>}
            {vc?.dischargeCompletedAt && <p className="xs faint" style={{ marginTop: 8 }}>The storage clock started when discharge finished.</p>}
          </Panel>
          <Panel title="Cargo">
            <DL items={[
              ['Description', c.cargoDescription],
              ['Packages', c.declaredPackages?.toLocaleString()],
              ['Declared weight', c.declaredWeightKg ? `${Number(c.declaredWeightKg).toLocaleString()} kg` : null],
              ['Destination', c.destinationCountry ?? 'Tanzania'],
              ['Valid', c.validFrom || c.validTo ? `${fmtD(c.validFrom)} – ${fmtD(c.validTo)}` : null],
            ]} />
          </Panel>
        </div>

        <div>
          <Tabs<TabId> value={tab} onChange={setTab} tabs={[
            { id: 'units', label: 'Units', count: units.length }, { id: 'lines', label: 'Lines', count: lines.length },
            { id: 'customs', label: 'Customs refs', count: refs.length }, { id: 'releases', label: 'Release orders', count: ros.length },
            { id: 'documents', label: 'Documents', count: docs.length },
          ]} />

          {tab === 'units' && (
            <Panel flush>
              <DataTable<any> rows={units} rowKey={(s) => s.unitStayId!} onRow={(s) => nav(`/units/${s.unitStayId}`)}
                empty={<Empty title="No units yet">Units appear when the manifest is applied or when they gate in.</Empty>}
                cols={[
                  { key: 'no', header: 'Unit', render: (s) => <UnitNo no={s.cargoUnit?.unitNo || s.unitNo} category={s.cargoUnit?.category} to={`/units/${s.unitStayId}`} /> },
                  { key: 'type', header: 'Type', render: (s) => <span className="small">{s.cargoUnit?.unitTypeCode || '40HC'}{s.cargoUnit?.make && <div className="xs faint">{s.cargoUnit.make} {s.cargoUnit.model}</div>}</span> },
                  { key: 'tracks', header: 'Status', render: (s) => <span className="row"><MiniTracks s={s} /><StatusPill value={s.physicalStatus} track="physical" /><HoldPill count={s.activeHoldCount ?? 0} /></span> },
                  { key: 'customs', header: 'Customs', render: (s) => <span className="row"><StatusPill value={s.customsStatus} track="customs" />{cleared[s.unitStayId!] && <span className="xs" style={{ color: 'var(--go)' }}>just now</span>}</span> },
                  { key: 'release', header: 'Release', render: (s) => <StatusPill value={s.releaseStatus} track="release" /> },
                  { key: 'loc', header: 'Location', render: (s) => <span className="unitno">{s.currentLocation?.fullCode ?? '—'}</span> },
                  { key: 'seal', header: 'Seal', render: (s) => <span className="small">{s.sealNo ?? '—'}</span> },
                  { key: 'free', header: 'Free until', render: (s) => <span className="small">{fmtD(s.freeUntil)}</span> },
                  { key: 'chg', header: 'Charges', num: true, render: (s) => <Money amount={s.accruedCharges?.total} /> },
                ]} />
            </Panel>
          )}

          {tab === 'lines' && (
            <Panel flush sub="What the BL or booking says is coming, against what has arrived" title="Consignment lines">
              <DataTable<any> rows={lines} rowKey={(l) => l.consignmentLineId!} cols={[
                { key: 'n', header: '#', render: (l) => l.lineNo },
                { key: 't', header: 'Unit type', render: (l) => <strong>{l.unitTypeCode}</strong> },
                { key: 'd', header: 'Description', render: (l) => <span className="small">{l.description ?? '—'}</span> },
                { key: 'e', header: 'Expected', num: true, render: (l) => `${l.qtyExpected} ${l.uom?.toLowerCase() || 'pk'}` },
                { key: 'r', header: 'Received', num: true, render: (l) => l.qtyReceived },
                { key: 'o', header: 'Delivered', num: true, render: (l) => l.qtyDelivered },
                { key: 'w', header: 'Weight', num: true, render: (l) => (l.weightKg && Number(l.weightKg) ? `${Number(l.weightKg).toLocaleString()} kg` : '—') },
              ]} />
            </Panel>
          )}

          {tab === 'customs' && (
            <Panel flush actions={<Button size="sm" icon={<Landmark />} perm="customs.ref.edit" onClick={() => setRefOpen(true)}>Add customs ref</Button>} title="Customs references">
              <DataTable rows={refs} rowKey={(r) => r.customsRefId!} empty={<Empty title="No customs references yet">Add the entry number when the agent lodges it.</Empty>} cols={[
                { key: 't', header: 'Type', render: (r) => <strong className="small">{REF_TYPE_NAME[r.refTypeCode] ?? r.refTypeCode}</strong> },
                { key: 'n', header: 'Number', render: (r) => <span className="unitno">{r.refNo}</span> },
                { key: 'on', header: 'On', render: (r) => r.unitStayId ? <UnitNo no={units.find((u: any) => u.unitStayId === r.unitStayId)?.cargoUnit?.unitNo ?? String(r.unitStayId)} /> : <span className="small muted">Whole consignment</span> },
                { key: 'd', header: 'Date', render: (r) => <span className="small">{fmtD(r.refDate)}</span> },
                { key: 'v', header: 'Valid to', render: (r) => <span className="small">{fmtD(r.validTo)}</span> },
                { key: 'a', header: 'Amount', num: true, render: (r) => <Money amount={r.amount} currency={r.amountCurrency} /> },
                { key: 's', header: 'Status', render: (r) => <span className="row"><StatusPill value={r.status} />{newRefs.includes(r) && <span className="xs" style={{ color: 'var(--go)' }}>new</span>}</span> },
              ]} />
            </Panel>
          )}

          {tab === 'releases' && (
            <Panel flush title="Release orders" actions={<Button size="sm" icon={<BadgeCheck />} perm="release.issue" onClick={() => setRelOpen(true)}>Request release</Button>}>
              <DataTable rows={ros} rowKey={(r) => r.releaseOrderId!} onRow={(r) => nav(`/releases/${r.releaseOrderId}`)}
                empty={<Empty title="No release orders yet">Request one when customs has cleared the units and charges are settled.</Empty>}
                cols={[
                  { key: 'no', header: 'Release order', render: (r) => <span className="unitno">{r.releaseNo}</span> },
                  { key: 's', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
                  { key: 'u', header: 'Units', num: true, render: (r) => `${r.unitsOut ?? 0} out of ${r.unitsTotal}` },
                  { key: 'c', header: 'Collector', render: (r) => <span className="small">{r.collectorName ?? '—'}<div className="xs faint">{partyName(r.transporterPartyId)}</div></span> },
                  { key: 'x', header: 'Planned exit', render: (r) => <span className="small">{fmtD(r.plannedExitDate)}</span> },
                  { key: 'v', header: 'Valid to', render: (r) => <span className="small">{fmtDT(r.validTo)}</span> },
                ]} />
            </Panel>
          )}

          {tab === 'documents' && (
            <Panel flush title="Documents" actions={<Button size="sm" icon={<Upload />} perm="consignment.edit" onClick={() => toast('Document uploaded')}>Upload</Button>}>
              <DataTable rows={docs} rowKey={(d) => d.id} empty={<Empty title="No documents">Upload the BL, delivery order or entry.</Empty>} cols={[
                { key: 'n', header: 'Document', render: (d) => <span className="row"><FileText size={16} /><span className="small strong">{d.name}</span></span> },
                { key: 'k', header: 'Kind', render: (d) => <span className="small">{d.kind}</span> },
                { key: 'b', header: 'Added by', render: (d) => <span className="small">{d.by}<div className="xs faint">{fmtDT(d.at)}</div></span> },
                { key: 's', header: 'Status', render: (d) => <StatusPill value={d.status} /> },
              ]} />
            </Panel>
          )}
        </div>
      </div>

      <EditConsignment open={edit} onClose={() => setEdit(false)} c={c} />
      <CustomsRefDrawer open={refOpen} onClose={() => setRefOpen(false)} consignmentId={id}
        onSaved={(r: any, affected: any[], sets?: string) => {
          setNewRefs((x) => [r, ...x]);
          if (sets) setCleared((m) => ({ ...m, ...Object.fromEntries(affected.map((a: any) => [a, sets])) }));
          setTab(sets === 'CLEARED' ? 'units' : 'customs');
        }} />
      <RequestRelease open={relOpen} onClose={() => setRelOpen(false)} consignmentId={id} onDone={() => { bump((n) => n + 1); setTab('releases'); }} />
    </Page>
  );
}

function EditConsignment({ open, onClose, c }: { open: boolean; onClose: () => void; c: S<'Consignment'> }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [consigneePartyId, setConsigneePartyId] = useState(String(c.consigneePartyId ?? ''));
  const [agentPartyId, setAgentPartyId] = useState(String(c.agentPartyId ?? ''));
  const [billToPartyId, setBillToPartyId] = useState(String(c.billToPartyId ?? ''));
  const [regime, setRegime] = useState(c.cargoRegimeCode || 'IMPORT_HOME');
  const [destCountry, setDestCountry] = useState(c.destinationCountry ?? 'Tanzania');
  const [cargoDesc, setCargoDesc] = useState(c.cargoDescription ?? '');
  const [saving, setSaving] = useState(false);

  const opts = (role: string) => [['', '—'] as [string, string], ...parties.filter((p) => p.roles.includes(role as never)).map((p) => [String(p.partyId), p.partyName] as [string, string])];

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/consignments/${c.consignmentId}`, {
        consigneePartyId: consigneePartyId ? Number(consigneePartyId) : undefined,
        agentPartyId: agentPartyId ? Number(agentPartyId) : undefined,
        billToPartyId: billToPartyId ? Number(billToPartyId) : undefined,
        cargoRegimeCode: regime,
        destinationCountry: destCountry,
        cargoDescription: cargoDesc,
      });
      qc.invalidateQueries({ queryKey: ['consignment', c.consignmentId] });
      qc.invalidateQueries({ queryKey: ['consignments'] });
      toast('Consignment saved');
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to update consignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Edit ${c.refNo}`}
      footer={<><Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button><Button variant="primary" perm="consignment.edit" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save consignment'}</Button></>}>
      <div className="stack-lg">
        <Banner>Changing the bill-to moves charges not yet invoiced to the new party. Invoiced charges stay where they are.</Banner>
        <div className="form-grid">
          <Field label="Consignee"><Select value={consigneePartyId} onChange={(e) => setConsigneePartyId(e.target.value)} options={opts('CONSIGNEE')} /></Field>
          <Field label="Clearing agent"><Select value={agentPartyId} onChange={(e) => setAgentPartyId(e.target.value)} options={opts('CLEARING_AGENT')} /></Field>
          <Field label="Bill to" required><Select value={billToPartyId} onChange={(e) => setBillToPartyId(e.target.value)} options={opts('CUSTOMER')} /></Field>
          <Field label="Regime"><Select value={regime} onChange={(e) => setRegime(e.target.value)} options={[['IMPORT_HOME', 'Import (home use)'], ['TRANSIT', 'Transit'], ['EXPORT', 'Export'], ['EMPTY', 'Empty']]} /></Field>
          <Field label="Destination country"><Input value={destCountry} onChange={(e) => setDestCountry(e.target.value)} /></Field>
          <Field label="Declared packages"><Input inputMode="numeric" defaultValue={c.declaredPackages ?? ''} /></Field>
          <Field label="Valid to" hint="Delivery order expiry, if any"><Input type="date" defaultValue={c.validTo ?? ''} /></Field>
        </div>
        <Field label="Cargo description"><Textarea value={cargoDesc} onChange={(e) => setCargoDesc(e.target.value)} /></Field>
        <Field label="Remarks"><Textarea defaultValue={c.remarks ?? ''} placeholder="Visible to everyone handling this consignment" /></Field>
      </div>
    </Drawer>
  );
}
