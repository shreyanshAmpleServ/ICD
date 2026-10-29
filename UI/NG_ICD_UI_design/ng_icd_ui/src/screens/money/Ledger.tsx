import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Lock, LockOpen, RefreshCw, Search } from 'lucide-react';
import {
  Banner, Button, Chips, DL, DataTable, Drawer, Empty, Field, Kpi, Modal, Money, Page, PageHeader, Panel, Pill, SearchInput, Tabs, Textarea,
  fmtD, fmtDT, useToast,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { glPostings, periods, type GlPost, type Period } from '@/mock/money';
import { GlPill } from './shared';

/* GET /gl-postings, /accounting-periods. Every posted document and payment
   sends one balanced journal (TZS base) to NG Billing through the outbox.
   Failures wait here for a retry; a period closes only when its queue is clean. */
type TabId = 'postings' | 'periods';
type St = 'all' | GlPost['status'];

export function Ledger() {
  const toast = useToast();
  const { data } = useQ(['gl'], () => delay(glPostings));
  const [local, setLocal] = useState<GlPost[] | null>(null);
  const rows = local ?? data ?? [];
  const [per, setPer] = useState<Period[]>(periods);
  const [tab, setTab] = useState<TabId>('postings');
  const [st, setSt] = useState<St>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<GlPost | null>(null);
  const [closing, setClosing] = useState<Period | null>(null);
  const [reopen, setReopen] = useState<Period | null>(null);
  const count = (s: GlPost['status']) => rows.filter((r) => r.status === s).length;
  const shown = rows.filter((r) => (st === 'all' || r.status === st) && (!q || r.sourceNo.includes(q.toUpperCase()) || (r.externalRef ?? '').includes(q.toUpperCase())));
  const retry = (g: GlPost) => {
    setLocal(rows.map((x) => x.glPostingId === g.glPostingId ? { ...x, status: 'POSTED', attempts: x.attempts + 1, lastError: null, externalRef: `NG-JV-26-04${String(g.glPostingId).slice(-4)}`, postedAt: '2026-10-07T07:30:00Z' } : x));
    setOpen(null); toast('Posting retried: accepted by NG');
  };
  const inPeriod = (p: Period) => rows.filter((r) => r.postingDate >= p.periodStart && r.postingDate <= p.periodEnd);

  return (
    <Page>
      <PageHeader title="Ledger postings" ms="M3" sub="Journals sent to NG's general ledger, and accounting periods" />
      <div className="stack-lg">
        {count('FAILED') > 0 && <Banner tone="stop" title={`${count('FAILED')} postings failed`} action={<Button size="sm" onClick={() => { setTab('postings'); setSt('FAILED'); }}>Show</Button>}>NG's ledger is missing these until they are retried. Periods with failures can't be closed.</Banner>}
        <div className="kpi-strip">
          <Kpi label="Posted to NG" value={count('POSTED')} />
          <Kpi label="Queued" value={count('PENDING')} delta="Sent by the outbox within minutes" />
          <Kpi label="Failed" value={count('FAILED')} delta={count('FAILED') ? 'Retry after fixing the cause' : 'None'} />
          <Kpi label="Open periods" value={per.filter((p) => p.status === 'OPEN').length} />
        </div>
        <Tabs<TabId> value={tab} onChange={setTab} tabs={[{ id: 'postings', label: 'Postings', count: rows.length }, { id: 'periods', label: 'Accounting periods' }]} />

        {tab === 'postings' && (
          <Panel flush>
            <div className="toolbar">
              <div style={{ width: 240, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Document or NG reference" aria-label="Filter postings" /></div>
              <Chips<St> value={st} onChange={setSt} options={[{ id: 'all', label: 'All' }, { id: 'FAILED', label: 'Failed', count: count('FAILED') }, { id: 'PENDING', label: 'Queued', count: count('PENDING') }, { id: 'POSTED', label: 'Posted', count: count('POSTED') }]} />
            </div>
            <DataTable rows={shown} rowKey={(g) => g.glPostingId} onRow={setOpen} empty={<Empty title="No postings match">Clear the filters.</Empty>} cols={[
              { key: 'd', header: 'Posting date', render: (g) => <span className="small nowrap">{fmtD(g.postingDate)}</span> },
              { key: 's', header: 'Source', render: (g) => <span className="small"><span className="strong">{g.sourceNo}</span><div className="xs faint">{g.sourceKind}</div></span> },
              { key: 'a', header: 'Amount (TZS)', num: true, render: (g) => <Money amount={g.amountBase} /> },
              { key: 'l', header: 'Lines', num: true, render: (g) => g.journalLines.length },
              { key: 'st', header: 'Status', render: (g) => <span><GlPill status={g.status} />{g.lastError && <div className="xs" style={{ color: 'var(--stop)', maxWidth: 280 }}>{g.lastError}</div>}</span> },
              { key: 'r', header: 'NG reference', render: (g) => <span className="small">{g.externalRef ?? '—'}</span> },
              { key: 'n', header: 'Attempts', num: true, render: (g) => g.attempts },
              { key: 'x', header: '', render: (g) => g.status === 'FAILED' && <Button size="sm" icon={<RefreshCw />} perm="finance.period.close" onClick={(e) => { e.stopPropagation(); retry(g); }}>Retry</Button> },
            ]} />
          </Panel>
        )}

        {tab === 'periods' && (
          <Panel flush>
            <DataTable rows={per} rowKey={(p) => p.accountingPeriodId} cols={[
              { key: 'k', header: 'Period', render: (p) => <span className="strong">{new Date(p.periodStart + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span> },
              { key: 'd', header: 'Dates', render: (p) => <span className="small">{fmtD(p.periodStart)} – {fmtD(p.periodEnd)}</span> },
              { key: 'n', header: 'Postings', num: true, render: (p) => inPeriod(p).length },
              { key: 'q', header: 'Not yet in NG', render: (p) => { const f = inPeriod(p).filter((r) => r.status === 'FAILED').length, w = inPeriod(p).filter((r) => r.status === 'PENDING').length; return f || w ? <span className="row-wrap">{f > 0 && <Pill tone="stop">{f} failed</Pill>}{w > 0 && <Pill tone="wait">{w} queued</Pill>}</span> : <span className="xs faint">All posted</span>; } },
              { key: 's', header: 'Status', render: (p) => p.status === 'OPEN' ? <Pill tone="go">Open</Pill> : <span><Pill icon={<Lock />}>Closed</Pill><div className="xs faint">{fmtDT(p.closedAt)} · {p.closedBy}</div></span> },
              { key: 'a', header: '', render: (p) => p.status === 'OPEN'
                ? <Button size="sm" icon={<Lock />} perm="finance.period.close" onClick={() => setClosing(p)}>Close period</Button>
                : <Button size="sm" variant="ghost" icon={<LockOpen />} perm="finance.period.close" onClick={() => setReopen(p)}>Reopen</Button> },
            ]} />
          </Panel>
        )}
      </div>

      <Drawer wide open={!!open} onClose={() => setOpen(null)} title={open ? `Journal for ${open.sourceNo}` : ''}
        footer={open?.status === 'FAILED' ? <><Button variant="ghost" onClick={() => setOpen(null)}>Close</Button><Button variant="primary" icon={<RefreshCw />} perm="finance.period.close" onClick={() => retry(open)}>Retry posting</Button></> : undefined}>
        {open && <Journal g={open} />}
      </Drawer>

      <Modal open={!!closing} onClose={() => setClosing(null)} title={closing ? `Close ${closing.periodKey}?` : ''}
        footer={closing && <><Button variant="ghost" onClick={() => setClosing(null)}>Cancel</Button>
          <Button variant="primary" icon={<Lock />} perm="finance.period.close" disabled={inPeriod(closing).some((r) => r.status !== 'POSTED')}
            onClick={() => { setPer(per.map((p) => p === closing ? { ...p, status: 'CLOSED', closedAt: '2026-10-07T07:30:00Z', closedBy: 'Neema Mushi' } : p)); setClosing(null); toast('Period closed'); }}>Close period</Button></>}>
        {closing && (inPeriod(closing).some((r) => r.status !== 'POSTED')
          ? <Banner tone="stop" title="Can't close yet">{inPeriod(closing).filter((r) => r.status !== 'POSTED').length} postings in this period are not in NG. Retry or fix them first.</Banner>
          : <p className="small">No document can be posted with a date in {closing.periodKey} after this. Fiscal receipts are not affected. Reopening needs a reason and is logged.</p>)}
      </Modal>
      <Modal open={!!reopen} onClose={() => setReopen(null)} title={reopen ? `Reopen ${reopen.periodKey}?` : ''}
        footer={<><Button variant="ghost" onClick={() => setReopen(null)}>Cancel</Button><Button variant="primary" icon={<LockOpen />} perm="finance.period.close" onClick={() => { setPer(per.map((p) => p === reopen ? { ...p, status: 'OPEN' } : p)); setReopen(null); toast('Period reopened'); }}>Reopen period</Button></>}>
        <div className="stack">
          <Banner tone="wait">NG's ledger must also have the period open, or new postings for it will fail.</Banner>
          <Field label="Reason" required><Textarea placeholder="e.g. Late credit note agreed with auditors" /></Field>
        </div>
      </Modal>
    </Page>
  );
}

function Journal({ g }: { g: GlPost }) {
  const dr = g.journalLines.reduce((a, l) => a + l.debit, 0), cr = g.journalLines.reduce((a, l) => a + l.credit, 0);
  return (
    <div className="stack">
      <DL cols items={[
        ['Source', g.to ? <Link key="s" to={g.to}>{g.sourceNo}</Link> : g.sourceNo], ['Kind', g.sourceKind], ['Posting date', fmtD(g.postingDate)],
        ['Destination', 'NG Billing'], ['Status', <GlPill key="g" status={g.status} />], ['NG reference', g.externalRef ?? '—'], ['Attempts', g.attempts], ['Posted', fmtDT(g.postedAt)],
      ]} />
      {g.lastError && <Banner tone="stop" title="Last error">{g.lastError}</Banner>}
      <div className="table-wrap">
        <table className="dt">
          <thead><tr><th>Account</th><th>Description</th><th className="num">Debit (TZS)</th><th className="num">Credit (TZS)</th></tr></thead>
          <tbody>{g.journalLines.map((l, i) => <tr key={i}><td className="small strong">{l.account}</td><td className="small">{l.description}</td><td className="num">{l.debit ? <Money amount={l.debit} currency="TZS" /> : ''}</td><td className="num">{l.credit ? <Money amount={l.credit} currency="TZS" /> : ''}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={2}>Totals</td><td className="num"><Money amount={dr} currency="TZS" /></td><td className="num"><Money amount={cr} currency="TZS" /></td></tr></tfoot>
        </table>
      </div>
      <span className="row small" style={{ gap: 6, color: Math.abs(dr - cr) < 1 ? 'var(--go)' : 'var(--stop)' }}><CheckCircle2 size={16} />{Math.abs(dr - cr) < 1 ? 'Balanced: debits equal credits' : 'Not balanced'}</span>
      <p className="xs muted">Amounts in the base currency TZS at the document's frozen rate. Exchange differences on payments post to 7100 / 7110.</p>
    </div>
  );
}
