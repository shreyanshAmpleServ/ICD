import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import {
  Button, Chips, CommonTable, DateCell, HoldPill, MiniTracks, Page,
  PageHeader, ReferenceCell, Select, StatusCell, NOW,
} from '@/ds/components';
import { FLOW } from '@/ds/status';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { staysAt } from '@/mock/core';

/* GET /units with filters. The quick filters are the questions people ask
   most: what is held, what can leave, what is about to start costing money. */
type Quick = 'all' | 'held' | 'ready' | 'expected' | 'freeEnding' | 'long';

export function Units() {
  const { site } = useSession();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState<Quick>('all');
  const [cat, setCat] = useState('ALL');
  const { data = [] } = useQ(['units', site.siteId], () => delay(staysAt(site.siteId)));

  const counts = useMemo(() => ({
    held: data.filter((s) => (s.activeHoldCount ?? 0) > 0).length,
    ready: data.filter((s) => s.releaseStatus === 'APPROVED' && s.physicalStatus === 'IN_YARD').length,
    expected: data.filter((s) => s.physicalStatus === 'EXPECTED').length,
    freeEnding: data.filter((s) => s.freeUntil && Math.abs(Date.parse(s.freeUntil) - NOW.getTime()) < 3 * 86400000).length,
    long: data.filter((s) => (s.unitSummary.dwellDays ?? 0) > 14).length,
  }), [data]);

  const rows = data.filter((s) => {
    const u = s.unitSummary;
    if (q && !u.unitNo.toUpperCase().includes(q.replace(/\s/g, '').toUpperCase()) && !(u.consignmentRef ?? '').includes(q.toUpperCase())) return false;
    if (cat !== 'ALL' && u.category !== cat) return false;
    if (quick === 'held') return u.activeHoldCount > 0;
    if (quick === 'ready') return u.releaseStatus === 'APPROVED' && u.physicalStatus === 'IN_YARD';
    if (quick === 'expected') return u.physicalStatus === 'EXPECTED';
    if (quick === 'freeEnding') return s.freeUntil && Math.abs(Date.parse(s.freeUntil) - NOW.getTime()) < 3 * 86400000;
    if (quick === 'long') return (u.dwellDays ?? 0) > 14;
    return true;
  });

  return (
    <Page>
      <PageHeader
        title="Units"
        ms="M1"
        sub={`${data.length} units at ${site.siteName}`}
        actions={
          <>
            <Button icon={<Download />} perm="reports.operational">Export</Button>
            <Button variant="primary" icon={<Plus />} perm="consignment.edit">Add expected unit</Button>
          </>
        }
      />
      <CommonTable
        rows={rows}
        rowKey={(s) => s.unitStayId!}
        onRow={(s) => nav(`/units/${s.unitStayId}`)}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Container, VIN or BL"
        itemLabel="units"
        emptyTitle="No units match these filters"
        emptySubtitle="Clear the search or pick another quick filter."
        toolbarFilters={
          <>
            <Select
              aria-label="Category"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              options={[['ALL', 'All categories'], ['CONTAINER', 'Containers'], ['VEHICLE', 'Vehicles'], ['LOT', 'Cargo lots']]}
            />
            <Chips<Quick>
              value={quick}
              onChange={setQuick}
              options={[
                { id: 'all', label: 'All' },
                { id: 'held', label: 'On hold', count: counts.held },
                { id: 'ready', label: 'Ready to leave', count: counts.ready },
                { id: 'freeEnding', label: 'Free time ending', count: counts.freeEnding },
                { id: 'expected', label: 'Expected', count: counts.expected },
                { id: 'long', label: 'Over 14 days', count: counts.long },
              ]}
            />
          </>
        }
        cols={[
          {
            key: 'no',
            header: 'Unit',
            render: (s) => <ReferenceCell refNo={s.cargoUnit.unitNo} category={s.cargoUnit.category} />
          },
          {
            key: 'type',
            header: 'Type',
            render: (s) => (
              <span className="small">
                {s.cargoUnit.unitTypeCode}
                {s.cargoUnit.make ? <div className="xs faint">{s.cargoUnit.make} {s.cargoUnit.model}</div> : null}
              </span>
            )
          },
          {
            key: 'flow',
            header: 'Flow',
            render: (s) => <span className="small">{FLOW[s.flow]}{s.fullEmpty === 'E' ? ' (empty)' : ''}</span>
          },
          {
            key: 'tracks',
            header: 'Status',
            render: (s) => (
              <span className="row" style={{ gap: 4 }}>
                <MiniTracks s={s} />
                <StatusCell value={s.physicalStatus} track="physical" />
                <HoldPill count={s.activeHoldCount ?? 0} />
              </span>
            )
          },
          {
            key: 'customs',
            header: 'Customs',
            render: (s) => <StatusCell value={s.customsStatus} track="customs" />
          },
          {
            key: 'release',
            header: 'Release',
            render: (s) => <StatusCell value={s.releaseStatus} track="release" />
          },
          {
            key: 'loc',
            header: 'Location',
            render: (s) => <span className="cond strong">{s.currentLocation?.fullCode ?? '—'}</span>
          },
          {
            key: 'bl',
            header: 'Consignment',
            render: (s) => <span className="small">{s.unitSummary.consignmentRef ?? '—'}</span>
          },
          {
            key: 'free',
            header: 'Free until',
            render: (s) => <DateCell value={s.freeUntil} />
          },
          {
            key: 'dwell',
            header: 'Days',
            num: true,
            render: (s) => s.unitSummary.dwellDays ?? '—'
          },
        ]}
      />
    </Page>
  );
}
