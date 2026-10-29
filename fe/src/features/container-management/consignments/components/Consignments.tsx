import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import {
  Button, Chips, CommonTable, DateCell, Page, PageHeader, PartyCell, Pill,
  ReferenceCell, Select, StatusCell
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { allStays, consignments, partyName, vesselCalls } from '@/mock/core';
import { Progress } from '@/features/container-management/shared';

/* GET /consignments. One row per BL, booking or empty release, with how
   many units were expected, have arrived and have left. */
type Quick = 'all' | 'open' | 'waiting' | 'held' | 'transit';
const REF: Record<string, string> = { BL: 'BL', BOOKING: 'Booking', EMPTY_RELEASE: 'Empty release', CARGO_REF: 'Cargo ref.', DELIVERY_NOTE: 'Delivery note', DROPOFF_AUTH: 'Drop-off' };
const REGIME: Record<string, string> = { IMPORT_HOME: 'Import (home use)', TRANSIT: 'Transit', EXPORT: 'Export', EMPTY: 'Empty' };
export const regimeName = (r?: string | null) => (r ? REGIME[r] ?? r.toLowerCase().replace(/_/g, ' ') : '—');
export const refTypeName = (r?: string | null) => (r ? REF[r] ?? r : '—');
export const vcName = (id?: number | null) => { const v = vesselCalls.find((x) => x.vesselCallId === id); return v ? `${v.vesselName} ${v.voyageNo}` : null; };

export function Consignments() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('ALL');
  const [quick, setQuick] = useState<Quick>('open');
  const { data = [] } = useQ(['consignments'], () => delay(consignments));
  const held = useMemo(() => new Set(allStays.filter((s) => (s.activeHoldCount ?? 0) > 0).map((s) => s.consignmentId)), []);

  const counts = {
    open: data.filter((c) => c.status === 'OPEN').length,
    waiting: data.filter((c) => (c.unitsReceived ?? 0) < (c.unitsExpected ?? 0)).length,
    held: data.filter((c) => held.has(c.consignmentId)).length,
    transit: data.filter((c) => c.cargoRegimeCode === 'TRANSIT').length,
  };
  const rows = data.filter((c) => {
    const n = q.trim().toUpperCase();
    if (n && !c.refNo.includes(n) && !partyName(c.consigneePartyId ?? c.shipperPartyId ?? c.billToPartyId).toUpperCase().includes(n) && !partyName(c.agentPartyId).toUpperCase().includes(n) && !(c.cargoDescription ?? '').toUpperCase().includes(n)) return false;
    if (kind !== 'ALL' && c.refType !== kind) return false;
    if (quick === 'open') return c.status === 'OPEN';
    if (quick === 'waiting') return (c.unitsReceived ?? 0) < (c.unitsExpected ?? 0);
    if (quick === 'held') return held.has(c.consignmentId);
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
            <Button variant="primary" icon={<Plus />} perm="consignment.edit">New consignment</Button>
          </>
        }
      />
      <CommonTable
        rows={rows}
        rowKey={(c) => c.consignmentId!}
        onRow={(c) => nav(`/consignments/${c.consignmentId}`)}
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
            render: (c) => (
              <ReferenceCell
                refNo={c.refNo}
                sub={`${refTypeName(c.refType)} · ${regimeName(c.cargoRegimeCode)}${c.destinationCountry ? ` → ${c.destinationCountry}` : ''}`}
              />
            )
          },
          {
            key: 'party',
            header: 'Consignee / shipper',
            render: (c) => (
              <PartyCell
                name={partyName(c.consigneePartyId ?? c.shipperPartyId ?? c.billToPartyId)}
                sub={c.cargoDescription}
              />
            )
          },
          {
            key: 'agent',
            header: 'Agent',
            render: (c) => <PartyCell name={c.agentPartyId ? partyName(c.agentPartyId) : '—'} />
          },
          {
            key: 'vc',
            header: 'Vessel call',
            render: (c) => (
              <div className="stack" style={{ gap: 2 }}>
                <span className="small">{vcName(c.vesselCallId) ?? '—'}</span>
                <div className="xs faint">{partyName(c.shippingLinePartyId)}</div>
              </div>
            )
          },
          {
            key: 'units',
            header: 'Units in / expected',
            render: (c) => (
              <div style={{ minWidth: 120 }}>
                <div className="small row">
                  <strong>{c.unitsReceived}</strong>
                  <span className="faint">/ {c.unitsExpected}</span>
                  <span className="spacer" />
                  <span className="xs muted">{c.unitsDelivered} out</span>
                </div>
                <Progress pct={c.unitsExpected ? ((c.unitsReceived ?? 0) / c.unitsExpected) * 100 : 0} label="Units received" />
              </div>
            )
          },
          {
            key: 'held',
            header: '',
            render: (c) => (held.has(c.consignmentId) ? <Pill tone="hold">Held units</Pill> : null)
          },
          {
            key: 'status',
            header: 'Status',
            render: (c) => <StatusCell value={c.status} />
          },
          {
            key: 'valid',
            header: 'Valid to',
            render: (c) => <DateCell value={c.validTo} />
          },
        ]}
      />
    </Page>
  );
}
