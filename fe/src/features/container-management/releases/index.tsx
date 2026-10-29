import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import {
  Button, Chips, CommonTable, DateCell, Kpi, MoneyCell, Page, PageHeader,
  PartyCell, ReferenceCell, StatusCell
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { consignment, partyName } from '@/mock/core';
import { RO_KIND, allReleaseOrders, hoursUntil, type RO } from '@/mock/cargo';
import { RequestRelease } from './components/RequestRelease';
import { Countdown } from '@/features/container-management/shared';

export { releasesApi } from './api';
export { ReleaseDetail } from './components/ReleaseDetail';
export { RequestRelease } from './components/RequestRelease';

/* GET /release-orders. Grouped the way the release desk works: what is
   waiting for checks, what is out there and valid, what has expired. */
type Quick = 'waiting' | 'valid' | 'expired' | 'closed' | 'all';
const GROUP: Record<Quick, RO['status'][]> = {
  waiting: ['REQUESTED', 'PENDING_CHECKS'], valid: ['APPROVED', 'PARTLY_USED'], expired: ['EXPIRED'], closed: ['USED', 'CANCELLED', 'REJECTED'], all: [],
};

export function Releases() {
  const nav = useNavigate();
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const { data = [] } = useQ(['release-orders'], () => delay(allReleaseOrders));
  const list = data.length ? allReleaseOrders : data;
  const count = (k: Quick) => list.filter((r) => GROUP[k].includes(r.status)).length;
  const rows = list.filter((r) => (quick === 'all' || GROUP[quick].includes(r.status)) && (!q || (r.releaseNo ?? '').includes(q.toUpperCase()) || (consignment(r.consignmentId)?.refNo ?? '').includes(q.toUpperCase()) || (r.collectorName ?? '').toUpperCase().includes(q.toUpperCase())));
  const expSoon = list.filter((r) => GROUP.valid.includes(r.status) && hoursUntil(r.validTo) < 24).length;

  return (
    <Page>
      <PageHeader
        title="Release orders"
        ms="M2"
        sub="Permission for named units to leave with a named collector, valid to the date storage is paid through"
        actions={<Button variant="primary" icon={<BadgeCheck />} perm="release.issue" onClick={() => setOpen(true)}>Request release</Button>}
      />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Waiting for checks" value={count('waiting')} />
          <Kpi label="Valid now" value={count('valid')} delta={expSoon ? `${expSoon} end within 24 h` : undefined} />
          <Kpi label="Expired" value={count('expired')} delta="Revalidate after payment" />
          <Kpi label="Units still to collect" value={list.filter((r) => GROUP.valid.includes(r.status)).reduce((n, r) => n + (r.unitsTotal ?? 0) - (r.unitsOut ?? 0), 0)} />
        </div>
        <CommonTable
          rows={rows}
          rowKey={(r) => r.releaseOrderId!}
          onRow={(r) => nav(`/releases/${r.releaseOrderId}`)}
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="RO number, BL or collector"
          itemLabel="release orders"
          emptyTitle="No release orders match"
          emptySubtitle="Clear the search or choose another group."
          toolbarFilters={
            <Chips<Quick>
              value={quick}
              onChange={setQuick}
              options={[
                { id: 'all', label: 'All', count: list.length },
                { id: 'waiting', label: 'Waiting', count: count('waiting') },
                { id: 'valid', label: 'Valid', count: count('valid') },
                { id: 'expired', label: 'Expired', count: count('expired') },
                { id: 'closed', label: 'Used or cancelled', count: count('closed') },
              ]}
            />
          }
          cols={[
            {
              key: 'no',
              header: 'Release order',
              render: (r) => (
                <ReferenceCell
                  refNo={r.releaseNo}
                  sub={RO_KIND[r.releaseKind]}
                />
              )
            },
            {
              key: 'c',
              header: 'Consignment',
              render: (r) => (
                <div className="stack" style={{ gap: 2 }}>
                  <span className="small">{consignment(r.consignmentId)?.refNo ?? '—'}</span>
                  <div className="xs faint">{partyName(consignment(r.consignmentId)?.consigneePartyId)}</div>
                </div>
              )
            },
            {
              key: 'u',
              header: 'Units out',
              num: true,
              render: (r) => <span className="small"><strong>{r.unitsOut ?? 0}</strong> / {r.unitsTotal}</span>
            },
            {
              key: 'col',
              header: 'Collector',
              render: (r) => (
                <PartyCell
                  name={r.collectorName ?? 'Not named yet'}
                  sub={partyName(r.transporterPartyId)}
                />
              )
            },
            {
              key: 'req',
              header: 'Requested',
              render: (r) => (
                <div className="stack" style={{ gap: 2 }}>
                  <DateCell value={r.requestedAt} withTime />
                  <div className="xs faint">by {partyName(r.requestedByPartyId)}</div>
                </div>
              )
            },
            {
              key: 'exit',
              header: 'Planned exit',
              render: (r) => <DateCell value={r.plannedExitDate} />
            },
            {
              key: 'valid',
              header: 'Valid to',
              render: (r) => r.validTo ? (
                <span className="small">
                  <DateCell value={r.validTo} withTime />
                  {GROUP.valid.includes(r.status) && <div className="xs"><Countdown hours={hoursUntil(r.validTo)} label="ends in" /></div>}
                </span>
              ) : <span className="small faint">Set on approval</span>
            },
            {
              key: 'due',
              header: 'Amount due',
              num: true,
              render: (r) => <MoneyCell amount={r.amountDue?.total} currency={r.amountDue?.currency || 'USD'} />
            },
            {
              key: 's',
              header: 'Status',
              render: (r) => <StatusCell value={r.status} track="release" />
            },
          ]}
        />
      </div>
      <RequestRelease open={open} onClose={() => setOpen(false)} onDone={(r) => { bump((n) => n + 1); nav(`/releases/${r.releaseOrderId}`); }} />
    </Page>
  );
}

export { Releases as ReleasesPage, Releases as ReleasesView };
export default Releases;
