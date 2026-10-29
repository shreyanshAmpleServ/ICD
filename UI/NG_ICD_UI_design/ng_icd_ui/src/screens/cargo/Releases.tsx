import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Search } from 'lucide-react';
import { Button, Chips, DataTable, Empty, Kpi, Money, Page, PageHeader, Panel, SearchInput, StatusPill, fmtD, fmtDT } from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { consignment, partyName } from '@/mock/core';
import { RO_KIND, allReleaseOrders, hoursUntil, type RO } from '@/mock/cargo';
import { RequestRelease } from './RequestRelease';
import { Countdown } from './shared';

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
      <PageHeader title="Release orders" ms="M2" sub="Permission for named units to leave with a named collector, valid to the date storage is paid through"
        actions={<Button variant="primary" icon={<BadgeCheck />} perm="release.issue" onClick={() => setOpen(true)}>Request release</Button>} />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Waiting for checks" value={count('waiting')} />
          <Kpi label="Valid now" value={count('valid')} delta={expSoon ? `${expSoon} end within 24 h` : undefined} />
          <Kpi label="Expired" value={count('expired')} delta="Revalidate after payment" />
          <Kpi label="Units still to collect" value={list.filter((r) => GROUP.valid.includes(r.status)).reduce((n, r) => n + (r.unitsTotal ?? 0) - (r.unitsOut ?? 0), 0)} />
        </div>
        <Panel flush>
          <div className="toolbar">
            <div style={{ width: 280, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="RO number, BL or collector" aria-label="Filter release orders" /></div>
            <Chips<Quick> value={quick} onChange={setQuick} options={[
              { id: 'all', label: 'All', count: list.length }, { id: 'waiting', label: 'Waiting', count: count('waiting') }, { id: 'valid', label: 'Valid', count: count('valid') },
              { id: 'expired', label: 'Expired', count: count('expired') }, { id: 'closed', label: 'Used or cancelled', count: count('closed') },
            ]} />
          </div>
          <DataTable rows={rows} rowKey={(r) => r.releaseOrderId!} onRow={(r) => nav(`/releases/${r.releaseOrderId}`)}
            empty={<Empty title="No release orders match">Clear the search or choose another group.</Empty>}
            cols={[
              { key: 'no', header: 'Release order', render: (r) => <><span className="unitno">{r.releaseNo}</span><div className="xs faint">{RO_KIND[r.releaseKind]}</div></> },
              { key: 'c', header: 'Consignment', render: (r) => <span className="small">{consignment(r.consignmentId)?.refNo ?? '—'}<div className="xs faint">{partyName(consignment(r.consignmentId)?.consigneePartyId)}</div></span> },
              { key: 'u', header: 'Units out', num: true, render: (r) => <span className="small"><strong>{r.unitsOut ?? 0}</strong> / {r.unitsTotal}</span> },
              { key: 'col', header: 'Collector', render: (r) => <span className="small">{r.collectorName ?? <span className="faint">Not named yet</span>}<div className="xs faint">{partyName(r.transporterPartyId)}</div></span> },
              { key: 'req', header: 'Requested', render: (r) => <span className="small">{fmtDT(r.requestedAt)}<div className="xs faint">by {partyName(r.requestedByPartyId)}</div></span> },
              { key: 'exit', header: 'Planned exit', render: (r) => <span className="small">{fmtD(r.plannedExitDate)}</span> },
              { key: 'valid', header: 'Valid to', render: (r) => r.validTo ? <span className="small">{fmtDT(r.validTo)}{GROUP.valid.includes(r.status) && <div className="xs"><Countdown hours={hoursUntil(r.validTo)} label="ends in" /></div>}</span> : <span className="small faint">Set on approval</span> },
              { key: 'due', header: 'Amount due', num: true, render: (r) => <Money amount={r.amountDue?.total} currency={r.amountDue?.currency} /> },
              { key: 's', header: 'Status', render: (r) => <StatusPill value={r.status} /> },
            ]} />
        </Panel>
      </div>
      <RequestRelease open={open} onClose={() => setOpen(false)} onDone={(r) => { bump((n) => n + 1); nav(`/releases/${r.releaseOrderId}`); }} />
    </Page>
  );
}
