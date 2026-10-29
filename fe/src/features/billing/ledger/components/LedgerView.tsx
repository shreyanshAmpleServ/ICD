import { useState } from 'react';
import { Lock, LockOpen, RefreshCw } from 'lucide-react';
import {
  Banner, Button, Chips, CommonTable, DateCell, Kpi, MoneyCell, Page, PageHeader, Pill, ReferenceCell, Tabs,
  fmtD, fmtDT, useToast,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { glPostings, periods, type GlPost, type Period } from '@/mock/money';
import { GlPill } from '../../components/shared';
import { ledgerApi } from '../api';
import { JournalDrawer } from './JournalDrawer';
import { PeriodCloseModal } from './PeriodCloseModal';

type TabId = 'postings' | 'periods';
type St = 'all' | GlPost['status'];

export function LedgerView() {
  const toast = useToast();
  const { data: dbGl } = useQ(['gl'], () => ledgerApi.getGlPostings());
  const { data: dbPeriods } = useQ(['periods'], () => ledgerApi.getAccountingPeriods());

  const [local, setLocal] = useState<GlPost[] | null>(null);
  const rows = local ?? (dbGl && dbGl.length > 0 ? dbGl : glPostings);
  const [per, setPer] = useState<Period[]>(dbPeriods && dbPeriods.length > 0 ? dbPeriods : periods);
  const [tab, setTab] = useState<TabId>('postings');
  const [st, setSt] = useState<St>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<GlPost | null>(null);
  const [closing, setClosing] = useState<Period | null>(null);
  const [reopen, setReopen] = useState<Period | null>(null);

  const count = (s: GlPost['status']) => rows.filter((r) => r.status === s).length;
  const shown = rows.filter(
    (r) =>
      (st === 'all' || r.status === st) &&
      (!q || r.sourceNo.includes(q.toUpperCase()) || (r.externalRef ?? '').includes(q.toUpperCase()))
  );

  const retry = (g: GlPost) => {
    setLocal(
      rows.map((x) =>
        x.glPostingId === g.glPostingId
          ? {
              ...x,
              status: 'POSTED',
              attempts: x.attempts + 1,
              lastError: null,
              externalRef: `NG-JV-26-04${String(g.glPostingId).slice(-4)}`,
              postedAt: '2026-10-07T07:30:00Z',
            }
          : x
      )
    );
    setOpen(null);
    toast('Posting retried: accepted by NG');
  };

  const inPeriod = (p: Period) => rows.filter((r) => r.postingDate >= p.periodStart && r.postingDate <= p.periodEnd);

  return (
    <Page>
      <PageHeader title="Ledger postings" ms="M3" sub="Journals sent to NG's general ledger, and accounting periods" />
      <div className="stack-lg">
        {count('FAILED') > 0 && (
          <Banner
            tone="stop"
            title={`${count('FAILED')} postings failed`}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setTab('postings');
                  setSt('FAILED');
                }}
              >
                Show
              </Button>
            }
          >
            NG's ledger is missing these until they are retried. Periods with failures can't be closed.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi label="Posted to NG" value={count('POSTED')} />
          <Kpi label="Queued" value={count('PENDING')} delta="Sent by the outbox within minutes" />
          <Kpi
            label="Failed"
            value={count('FAILED')}
            delta={count('FAILED') ? 'Retry after fixing the cause' : 'None'}
          />
          <Kpi label="Open periods" value={per.filter((p) => p.status === 'OPEN').length} />
        </div>
        <Tabs<TabId>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'postings', label: 'Postings', count: rows.length },
            { id: 'periods', label: 'Accounting periods' },
          ]}
        />

        {tab === 'postings' && (
          <CommonTable
            rows={shown}
            rowKey={(g) => g.glPostingId}
            onRow={setOpen}
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="Filter postings by document or NG reference..."
            itemLabel="postings"
            toolbarFilters={
              <Chips<St>
                value={st}
                onChange={setSt}
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'FAILED', label: 'Failed', count: count('FAILED') },
                  { id: 'PENDING', label: 'Queued', count: count('PENDING') },
                  { id: 'POSTED', label: 'Posted', count: count('POSTED') },
                ]}
              />
            }
            emptyTitle="No postings match"
            emptySubtitle="Clear the filters."
            cols={[
              { key: 'd', header: 'Posting date', render: (g) => <DateCell value={g.postingDate} /> },
              {
                key: 's',
                header: 'Source',
                render: (g) => <ReferenceCell refNo={g.sourceNo} sub={g.sourceKind} />,
              },
              {
                key: 'a',
                header: 'Amount (TZS)',
                num: true,
                render: (g) => <MoneyCell amount={g.amountBase} currency="TZS" strong />,
              },
              { key: 'l', header: 'Lines', num: true, render: (g) => g.journalLines?.length || 0 },
              {
                key: 'st',
                header: 'Status',
                render: (g) => (
                  <span>
                    <GlPill status={g.status} />
                    {g.lastError && (
                      <div className="xs" style={{ color: 'var(--stop)', maxWidth: 280 }}>
                        {g.lastError}
                      </div>
                    )}
                  </span>
                ),
              },
              { key: 'r', header: 'NG reference', render: (g) => <span className="small">{g.externalRef ?? '—'}</span> },
              { key: 'n', header: 'Attempts', num: true, render: (g) => g.attempts },
              {
                key: 'x',
                header: '',
                render: (g) =>
                  g.status === 'FAILED' && (
                    <Button
                      size="sm"
                      icon={<RefreshCw />}
                      perm="finance.period.close"
                      onClick={(e) => {
                        e.stopPropagation();
                        retry(g);
                      }}
                    >
                      Retry
                    </Button>
                  ),
              },
            ]}
          />
        )}

        {tab === 'periods' && (
          <CommonTable
            rows={per}
            rowKey={(p) => p.accountingPeriodId}
            itemLabel="accounting periods"
            cols={[
              {
                key: 'k',
                header: 'Period',
                render: (p) => (
                  <span className="strong">
                    {new Date(p.periodStart + 'T00:00:00Z').toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </span>
                ),
              },
              {
                key: 'd',
                header: 'Dates',
                render: (p) => (
                  <span className="small">
                    {fmtD(p.periodStart)} – {fmtD(p.periodEnd)}
                  </span>
                ),
              },
              { key: 'n', header: 'Postings', num: true, render: (p) => inPeriod(p).length },
              {
                key: 'q',
                header: 'Not yet in NG',
                render: (p) => {
                  const f = inPeriod(p).filter((r) => r.status === 'FAILED').length;
                  const w = inPeriod(p).filter((r) => r.status === 'PENDING').length;
                  return f || w ? (
                    <span className="row-wrap">
                      {f > 0 && <Pill tone="stop">{f} failed</Pill>}
                      {w > 0 && <Pill tone="wait">{w} queued</Pill>}
                    </span>
                  ) : (
                    <span className="xs faint">All posted</span>
                  );
                },
              },
              {
                key: 's',
                header: 'Status',
                render: (p) =>
                  p.status === 'OPEN' ? (
                    <Pill tone="go">Open</Pill>
                  ) : (
                    <span>
                      <Pill icon={<Lock />}>Closed</Pill>
                      <div className="xs faint">
                        {fmtDT(p.closedAt)} · {p.closedBy}
                      </div>
                    </span>
                  ),
              },
              {
                key: 'a',
                header: '',
                render: (p) =>
                  p.status === 'OPEN' ? (
                    <Button
                      size="sm"
                      icon={<Lock />}
                      perm="finance.period.close"
                      onClick={() => setClosing(p)}
                    >
                      Close period
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<LockOpen />}
                      perm="finance.period.close"
                      onClick={() => setReopen(p)}
                    >
                      Reopen
                    </Button>
                  ),
              },
            ]}
          />
        )}
      </div>

      <JournalDrawer open={open} onClose={() => setOpen(null)} onRetry={retry} />

      <PeriodCloseModal
        closing={closing}
        onCloseClosing={() => setClosing(null)}
        onConfirmClose={(p) => {
          setPer(
            per.map((item) =>
              item === p
                ? { ...item, status: 'CLOSED', closedAt: '2026-10-07T07:30:00Z', closedBy: 'Neema Mushi' }
                : item
            )
          );
          toast('Period closed');
        }}
        hasBlockingPostings={!!closing && inPeriod(closing).some((r) => r.status !== 'POSTED')}
        blockingCount={closing ? inPeriod(closing).filter((r) => r.status !== 'POSTED').length : 0}
        reopen={reopen}
        onCloseReopen={() => setReopen(null)}
        onConfirmReopen={(p) => {
          setPer(per.map((item) => (item === p ? { ...item, status: 'OPEN' } : item)));
          toast('Period reopened');
        }}
      />
    </Page>
  );
}
