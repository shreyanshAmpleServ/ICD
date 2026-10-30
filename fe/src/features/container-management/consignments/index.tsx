import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import {
  Button, Chips, CommonTable, DateCell, Drawer, Field, Input, Page, PageHeader, PartyCell, Pill,
  ReferenceCell, Select, StatusCell, Textarea, useToast,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { allStays, consignments, parties, partyName, vesselCalls } from '@/mock/core';
import { Progress } from '@/features/container-management/shared';

export { consignmentsApi } from './api';
export { ConsignmentDetail } from './components/ConsignmentDetail';

/* GET /consignments. One row per BL, booking or empty release, with how
   many units were expected, have arrived and have left. */
type Quick = 'all' | 'open' | 'waiting' | 'held' | 'transit';
const REF: Record<string, string> = { BL: 'BL', BOOKING: 'Booking', EMPTY_RELEASE: 'Empty release', CARGO_REF: 'Cargo ref.', DELIVERY_NOTE: 'Delivery note', DROPOFF_AUTH: 'Drop-off' };
const REGIME: Record<string, string> = { IMPORT_HOME: 'Import (home use)', TRANSIT: 'Transit', EXPORT: 'Export', EMPTY: 'Empty' };
export const regimeName = (r?: string | null) => (r ? REGIME[r] ?? r.toLowerCase().replace(/_/g, ' ') : '—');
export const refTypeName = (r?: string | null) => (r ? REF[r] ?? r : '—');
export const vcName = (id?: number | null, vcList: any[] = vesselCalls) => { const v = vcList.find((x) => x.vesselCallId === id); return v ? `${v.vesselName} ${v.voyageNo}` : null; };

export function Consignments() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('ALL');
  const [quick, setQuick] = useState<Quick>('open');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: dbConsignments = [] } = useQ(['consignments'], () =>
    api.get<{ items: any[] }>('/consignments').then((r) => r.items).catch(() => consignments)
  );
  const { data: dbVesselCalls = [] } = useQ(['vessel-calls'], () =>
    api.get<{ items: any[] }>('/vessel-calls').then((r) => r.items).catch(() => vesselCalls)
  );

  const data = dbConsignments.length > 0 ? dbConsignments : consignments;
  const calls = dbVesselCalls.length > 0 ? dbVesselCalls : vesselCalls;

  const held = useMemo(() => new Set(allStays.filter((s) => (s.activeHoldCount ?? 0) > 0).map((s) => s.consignmentId)), []);

  const counts = {
    open: data.filter((c: any) => c.status === 'OPEN').length,
    waiting: data.filter((c: any) => (c.unitsReceived ?? 0) < (c.unitsExpected ?? 0)).length,
    held: data.filter((c: any) => held.has(c.consignmentId) || c.hasActiveHolds).length,
    transit: data.filter((c: any) => c.cargoRegimeCode === 'TRANSIT').length,
  };
  const rows = data.filter((c: any) => {
    const n = q.trim().toUpperCase();
    const cName = c.consigneeName || partyName(c.consigneePartyId ?? c.shipperPartyId ?? c.billToPartyId);
    if (n && !c.refNo?.toUpperCase().includes(n) && !cName.toUpperCase().includes(n) && !partyName(c.agentPartyId).toUpperCase().includes(n) && !(c.cargoDescription ?? '').toUpperCase().includes(n)) return false;
    if (kind !== 'ALL' && c.refType !== kind) return false;
    if (quick === 'open') return c.status === 'OPEN';
    if (quick === 'waiting') return (c.unitsReceived ?? 0) < (c.unitsExpected ?? 0);
    if (quick === 'held') return held.has(c.consignmentId) || c.hasActiveHolds;
    if (quick === 'transit') return c.cargoRegimeCode === 'TRANSIT';
    return true;
  });

  return (
    <Page>
      <PageHeader
        title="Consignments"
        ms="M1"
        sub="Bills of lading, export bookings and empty releases, with their units"
        actions={
          <>
            <Button icon={<Download />} perm="reports.operational">Export</Button>
            <Button variant="primary" icon={<Plus />} perm="consignment.edit" onClick={() => setCreateOpen(true)}>New consignment</Button>
          </>
        }
      />
      <CommonTable
        rows={rows}
        rowKey={(c: any) => c.consignmentId!}
        onRow={(c: any) => nav(`/consignments/${c.consignmentId}`)}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="BL, booking, consignee or agent"
        itemLabel="consignments"
        emptyTitle="No consignments match"
        emptySubtitle="Clear the search or choose 'All'. New BLs arrive with the manifest import."
        toolbarFilters={
          <>
            <Select
              aria-label="Reference type"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              options={[['ALL', 'All types'], ['BL', 'Bills of lading'], ['BOOKING', 'Bookings'], ['EMPTY_RELEASE', 'Empty releases']]}
            />
            <Chips<Quick>
              value={quick}
              onChange={setQuick}
              options={[
                { id: 'open', label: 'Open', count: counts.open },
                { id: 'waiting', label: 'Units still to arrive', count: counts.waiting },
                { id: 'held', label: 'Has held units', count: counts.held },
                { id: 'transit', label: 'Transit', count: counts.transit },
                { id: 'all', label: 'All' },
              ]}
            />
          </>
        }
        cols={[
          {
            key: 'ref',
            header: 'Reference',
            render: (c: any) => (
              <ReferenceCell
                refNo={c.refNo}
                sub={`${refTypeName(c.refType)} · ${regimeName(c.cargoRegimeCode)}${c.destinationCountry ? ` → ${c.destinationCountry}` : ''}`}
              />
            )
          },
          {
            key: 'party',
            header: 'Consignee / shipper',
            render: (c: any) => (
              <PartyCell
                name={c.consigneeName || partyName(c.consigneePartyId ?? c.shipperPartyId ?? c.billToPartyId)}
                sub={c.cargoDescription}
              />
            )
          },
          {
            key: 'agent',
            header: 'Agent',
            render: (c: any) => <PartyCell name={c.agentPartyId ? partyName(c.agentPartyId) : '—'} />
          },
          {
            key: 'vc',
            header: 'Vessel call',
            render: (c: any) => (
              <div className="stack" style={{ gap: 2 }}>
                <span className="small">{c.vesselName ? `${c.vesselName} ${c.voyageNo || ''}` : vcName(c.vesselCallId, calls) ?? '—'}</span>
                <div className="xs faint">{partyName(c.shippingLinePartyId)}</div>
              </div>
            )
          },
          {
            key: 'units',
            header: 'Units in / expected',
            render: (c: any) => (
              <div style={{ minWidth: 120 }}>
                <div className="small row">
                  <strong>{c.unitsReceived ?? 0}</strong>
                  <span className="faint">/ {c.unitsExpected ?? 1}</span>
                  <span className="spacer" />
                  <span className="xs muted">{c.unitsDelivered ?? 0} out</span>
                </div>
                <Progress pct={c.unitsExpected ? ((c.unitsReceived ?? 0) / c.unitsExpected) * 100 : 0} label="Units received" />
              </div>
            )
          },
          {
            key: 'held',
            header: '',
            render: (c: any) => (held.has(c.consignmentId) || c.hasActiveHolds ? <Pill tone="hold">Held units</Pill> : null)
          },
          {
            key: 'status',
            header: 'Status',
            render: (c: any) => <StatusCell value={c.status} />
          },
          {
            key: 'valid',
            header: 'Valid to',
            render: (c: any) => <DateCell value={c.validTo} />
          },
        ]}
      />

      {createOpen && (
        <CreateConsignmentDrawer
          open={createOpen}
          calls={calls}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['consignments'] });
            toast('Consignment created successfully');
            setCreateOpen(false);
          }}
        />
      )}
    </Page>
  );
}

function CreateConsignmentDrawer({
  open,
  calls,
  onClose,
  onCreated,
}: {
  open: boolean;
  calls: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [refNo, setRefNo] = useState('');
  const [refType, setRefType] = useState('BL');
  const [vesselCallId, setVesselCallId] = useState(String(calls[0]?.vesselCallId || '1'));
  const [consigneePartyId, setConsigneePartyId] = useState('1');
  const [cargoRegimeCode, setCargoRegimeCode] = useState('IMPORT_HOME');
  const [destinationCountry, setDestinationCountry] = useState('Tanzania');
  const [cargoDescription, setCargoDescription] = useState('');
  const [unitsExpected, setUnitsExpected] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const consignees = useMemo(() => parties.filter((p) => p.roles.includes('CONSIGNEE' as never)), []);

  const handleSubmit = async () => {
    if (!refNo.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/consignments', {
        refNo: refNo.trim().toUpperCase(),
        refType,
        vesselCallId: Number(vesselCallId),
        consigneePartyId: Number(consigneePartyId),
        billToPartyId: Number(consigneePartyId),
        cargoRegimeCode,
        destinationCountry,
        cargoDescription: cargoDescription.trim() || 'General Merchandise',
        unitsExpected: Math.max(1, parseInt(unitsExpected, 10) || 1),
      });
      onCreated();
    } catch (err: any) {
      console.error('Failed to create consignment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New Consignment"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !refNo.trim()}>
            {submitting ? 'Creating...' : 'Create consignment'}
          </Button>
        </>
      }
    >
      <div className="stack-lg">
        <div className="form-grid">
          <Field label="Reference No (BL / Booking)" required>
            <Input
              value={refNo}
              onChange={(e) => setRefNo(e.target.value.toUpperCase())}
              placeholder="e.g. MSKU987654321"
            />
          </Field>
          <Field label="Reference type">
            <Select
              value={refType}
              onChange={(e) => setRefType(e.target.value)}
              options={[['BL', 'Bill of lading (BL)'], ['BOOKING', 'Booking'], ['EMPTY_RELEASE', 'Empty release']]}
            />
          </Field>
          <Field label="Vessel call" required>
            <Select
              value={vesselCallId}
              onChange={(e) => setVesselCallId(e.target.value)}
              options={calls.map((c) => [String(c.vesselCallId), `${c.vesselName} ${c.voyageNo} · ${(c.status || '').toLowerCase()}`])}
            />
          </Field>
          <Field label="Consignee" required>
            <Select
              value={consigneePartyId}
              onChange={(e) => setConsigneePartyId(e.target.value)}
              options={consignees.map((p) => [String(p.partyId), p.partyName])}
            />
          </Field>
          <Field label="Cargo regime">
            <Select
              value={cargoRegimeCode}
              onChange={(e) => setCargoRegimeCode(e.target.value)}
              options={[['IMPORT_HOME', 'Import (home use)'], ['TRANSIT', 'Transit'], ['EXPORT', 'Export'], ['EMPTY', 'Empty']]}
            />
          </Field>
          <Field label="Destination country">
            <Input
              value={destinationCountry}
              onChange={(e) => setDestinationCountry(e.target.value)}
              placeholder="e.g. Tanzania"
            />
          </Field>
          <Field label="Units expected">
            <Input
              type="number"
              min={1}
              value={unitsExpected}
              onChange={(e) => setUnitsExpected(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Cargo description">
          <Textarea
            value={cargoDescription}
            onChange={(e) => setCargoDescription(e.target.value)}
            placeholder="e.g. 500 Bags of Raw Cashew Nuts"
          />
        </Field>
      </div>
    </Drawer>
  );
}

export default Consignments;
