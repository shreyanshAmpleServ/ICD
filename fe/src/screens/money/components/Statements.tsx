import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, Mail, Printer } from 'lucide-react';
import {
  Banner, Button, CommonTable, DateCell, Empty, Field, Input, Kpi, Meter, Money, MoneyCell, Page, PageHeader, Panel, PartyCell, Pill, Segmented, Select, fmtD, useToast,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { party } from '@/mock/core';
import { COMPANY, TODAY, customers, dLong, num, statement } from '@/mock/money';
import { day } from '@/mock/gen';
import { AgeingBar, PrintSheet, fmtAmt, whole } from './shared';

/* GET /statements/{partyId}. Running balance in USD (TZS documents at their
   frozen rate), ageing by days past due, and how much credit is used. */
export function Statements() {
  const { partyId } = useParams();
  const nav = useNavigate();
  const id = Number(partyId) || 0;
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    return customers.map((c) => ({ c, s: statement(c.partyId!) })).sort((a, b) => b.s.outstanding - a.s.outstanding);
  }, []);

  const filteredList = useMemo(() => {
    if (!search) return list;
    const q = search.toUpperCase();
    return list.filter((r) =>
      r.c.partyName.toUpperCase().includes(q) ||
      (r.c.partyCode ?? '').toUpperCase().includes(q)
    );
  }, [list, search]);

  if (!id) {
    return (
      <Page>
        <PageHeader title="Statements" ms="M3" sub="Pick a customer to see their statement, ageing and credit use" />
        <CommonTable
          rows={filteredList}
          rowKey={(r) => r.c.partyId!}
          onRow={(r) => nav(`/statements/${r.c.partyId}`)}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter customers by name or code..."
          itemLabel="customer statements"
          cols={[
            {
              key: 'n',
              header: 'Customer',
              render: (r) => (
                <PartyCell
                  name={r.c.partyName}
                  sub={r.c.partyCode}
                />
              )
            },
            {
              key: 'cr',
              header: 'Terms',
              render: (r) => r.c.creditStatus === 'CREDIT' ? <Pill tone="go">Credit</Pill> : r.c.creditStatus === 'BLOCKED' ? <Pill tone="stop">Blocked</Pill> : <Pill>Cash</Pill>
            },
            {
              key: 'o',
              header: 'Outstanding (USD)',
              num: true,
              render: (r) => <MoneyCell amount={r.s.outstanding} currency="USD" strong={r.s.outstanding > 0} />
            },
            {
              key: 'od',
              header: 'Overdue',
              num: true,
              render: (r) => {
                const o = r.s.outstanding - r.s.ageing.current;
                return o > 0.005 ? <span style={{ color: 'var(--stop)' }}><MoneyCell amount={o} currency="USD" /></span> : <span className="xs faint">—</span>;
              }
            },
            {
              key: 'u',
              header: 'On account',
              num: true,
              render: (r) => r.s.unallocated > 0 ? <MoneyCell amount={r.s.unallocated} currency="USD" /> : <span className="xs faint">—</span>
            },
            {
              key: 'l',
              header: 'Credit used',
              render: (r) => r.c.creditLimit ? (
                <span style={{ display: 'block', minWidth: 120 }}>
                  <Meter pct={(r.s.outstanding / num(r.c.creditLimit)) * 100} label="Credit used" />
                  <span className="xs faint">{Math.round((r.s.outstanding / num(r.c.creditLimit)) * 100)}% of {fmtAmt(num(r.c.creditLimit))}</span>
                </span>
              ) : <span className="xs faint">No credit</span>
            },
          ]}
        />
      </Page>
    );
  }
  return <StatementView key={id} partyId={id} />;
}

function StatementView({ partyId }: { partyId: number }) {
  const nav = useNavigate();
  const toast = useToast();
  const [from, setFrom] = useState(day(-60));
  const [view, setView] = useState<'screen' | 'print'>('screen');
  const p = party(partyId);
  const { data: s } = useQ(['statement', partyId, from], () => delay(statement(partyId, from, TODAY)));
  if (!p) return <Page><Empty title="Customer not found" action={<Link to="/statements">Back to statements</Link>} /></Page>;
  if (!s) return <Page><Empty title="Loading statement" /></Page>;
  const limit = num(p.creditLimit);
  const used = limit ? (s.outstanding / limit) * 100 : 0;
  const invoiced = s.lines.reduce((a, l) => a + l.debit, 0), received = s.lines.reduce((a, l) => a + l.credit, 0);

  return (
    <Page>
      <PageHeader crumbs={[['Statements', '/statements'], [p.partyName]]} title={p.partyName} ms="M3"
        sub={`Statement in USD · ${fmtD(from)} to ${fmtD(TODAY)}`}
        actions={<>
          <Select aria-label="Customer" value={String(partyId)} onChange={(e) => nav(`/statements/${e.target.value}`)} options={customers.map((c) => [String(c.partyId), c.partyName])} />
          <Button icon={<Mail />} perm="billing.invoice.view" onClick={() => toast(`Statement emailed to ${p.email ?? 'the customer'}`)}>Email</Button>
          <Button icon={<Download />} perm="billing.invoice.view" onClick={() => toast('PDF downloaded')}>PDF</Button>
          <Button icon={<Printer />} perm="billing.invoice.view" onClick={() => setView('print')}>Print</Button>
        </>} />
      <div className="stack-lg">
        {p.creditStatus === 'BLOCKED' && <Banner tone="stop" title="Blocked for credit">Cargo for this customer leaves only against payment. Unblocking is done in Customers & parties.</Banner>}
        {limit > 0 && used >= 90 && <Banner tone="stop" title="Credit limit nearly used">New credit invoices will be refused once the limit is reached.</Banner>}
        <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
          <Segmented value={view} onChange={setView} options={[{ id: 'screen', label: 'Statement' }, { id: 'print', label: 'Print view' }]} />
          <Field label="From"><Input type="date" value={from} max={TODAY} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 180 }} /></Field>
        </div>

        {view === 'screen' ? (
          <>
            <div className="kpi-strip">
              <Kpi label="Opening balance" value={whole(s.openingBalance)} unit="USD" delta={fmtD(from)} />
              <Kpi label="Invoiced" value={whole(invoiced)} unit="USD" />
              <Kpi label="Payments and credits" value={whole(received)} unit="USD" />
              <Kpi label="Closing balance" value={whole(s.closingBalance)} unit="USD" delta={s.unallocated > 0 ? `Includes ${fmtAmt(s.unallocated)} on account` : 'Today'} />
            </div>
            <div className="grid-2">
              <Panel title="Ageing" sub="Open invoices by days past due date">
                <AgeingBar ageing={s.ageing} />
              </Panel>
              <Panel title="Credit limit">
                {limit ? (
                  <div className="stack" style={{ gap: 6 }}>
                    <Meter pct={used} label="Credit used" />
                    <div className="row small"><span className="spacer">{fmtAmt(s.outstanding)} used of {fmtAmt(limit)}</span><span className="strong">{Math.round(used)}%</span></div>
                    <span className="xs muted">Available {fmtAmt(Math.max(0, limit - s.outstanding))}. Terms 30 days from invoice date.</span>
                  </div>
                ) : <p className="small muted">{p.creditStatus === 'BLOCKED' ? 'Blocked: no credit allowed.' : 'Cash customer: pays before release.'}</p>}
              </Panel>
            </div>
            <CommonTable
              rows={s.lines}
              rowKey={(l) => l.docNo}
              itemLabel="transactions"
              emptyTitle="No transactions in this period"
              emptySubtitle="Move the From date back to see older documents."
              foot={
                <tr>
                  <td colSpan={4}>Closing balance</td>
                  <td className="num"><Money amount={invoiced} /></td>
                  <td className="num"><Money amount={received} /></td>
                  <td className="num"><Money amount={s.closingBalance} /></td>
                </tr>
              }
              cols={[
                { key: 'd', header: 'Date', render: (l) => <DateCell value={l.date} /> },
                { key: 'k', header: 'Type', render: (l) => <span className="small">{l.docKind}</span> },
                {
                  key: 'n',
                  header: 'Document',
                  render: (l) => l.to ? (
                    <Link className="small strong" to={l.to}>{l.docNo}</Link>
                  ) : (
                    <span className="small strong">{l.docNo}</span>
                  )
                },
                {
                  key: 'r',
                  header: 'Reference',
                  render: (l) => (
                    <span className="xs muted">
                      {l.reference}
                      {l.due && l.debit > 0 ? ` · due ${fmtD(l.due)}` : ''}
                    </span>
                  )
                },
                { key: 'dr', header: 'Debit', num: true, render: (l) => l.debit ? <MoneyCell amount={l.debit} /> : '' },
                { key: 'cr', header: 'Credit', num: true, render: (l) => l.credit ? <MoneyCell amount={l.credit} /> : '' },
                { key: 'b', header: 'Balance', num: true, render: (l) => <MoneyCell amount={l.balance} strong /> },
              ]}
            />
          </>
        ) : (
          <>
            <div className="row-wrap"><Button variant="primary" icon={<Printer />} perm="billing.invoice.view" onClick={() => window.print()}>Print</Button><span className="xs muted">Prints the sheet only, on A4.</span></div>
            <PrintSheet>
              <div className="hdr">
                <div><h1>{COMPANY.legalName}</h1><div>{COMPANY.address}</div><div><b>TIN</b> {COMPANY.tin} · <b>VRN</b> {COMPANY.vrn}</div></div>
                <div style={{ textAlign: 'right' }}><h1 style={{ fontSize: 20 }}>Statement of account</h1><div>{dLong(from)} to {dLong(TODAY)}</div><div>Currency USD</div></div>
              </div>
              <div className="box"><div className="lbl">Customer</div><b>{p.partyName}</b> · {p.partyCode}{p.taxId ? ` · TIN ${p.taxId}` : ''}</div>
              <table>
                <thead><tr><th>Date</th><th>Document</th><th>Reference</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
                <tbody>
                  <tr><td>{dLong(from)}</td><td colSpan={4}>Opening balance</td><td className="num">{s.openingBalance.toFixed(2)}</td></tr>
                  {s.lines.map((l) => <tr key={l.docNo}><td>{fmtD(l.date)}</td><td>{l.docKind} {l.docNo}</td><td>{l.reference}</td><td className="num">{l.debit ? l.debit.toFixed(2) : ''}</td><td className="num">{l.credit ? l.credit.toFixed(2) : ''}</td><td className="num">{l.balance.toFixed(2)}</td></tr>)}
                  <tr><td colSpan={5}><b>Closing balance</b></td><td className="num"><b>{s.closingBalance.toFixed(2)}</b></td></tr>
                </tbody>
              </table>
              <table>
                <thead><tr><th className="num">Current</th><th className="num">1–30</th><th className="num">31–60</th><th className="num">61–90</th><th className="num">Over 90</th><th className="num">Total due</th></tr></thead>
                <tbody><tr>{[s.ageing.current, s.ageing.d1_30, s.ageing.d31_60, s.ageing.d61_90, s.ageing.over90, s.outstanding].map((v, i) => <td key={i} className="num">{v.toFixed(2)}</td>)}</tr></tbody>
              </table>
              <div className="foot">Pay to {COMPANY.bank}. Please quote the invoice numbers. Questions: {COMPANY.email}, {COMPANY.phone}.</div>
            </PrintSheet>
          </>
        )}
      </div>
    </Page>
  );
}
