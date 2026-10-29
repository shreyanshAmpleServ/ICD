import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Mail, Printer } from 'lucide-react';
import {
  Banner, Button, CommonTable, DateCell, Empty, Field, Input, Kpi, Meter, Money, MoneyCell, Page, PageHeader, Panel, Segmented, Select, fmtD, useToast,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { party } from '@/mock/core';
import { TODAY, customers, num } from '@/mock/money';
import { day } from '@/mock/gen';
import { AgeingBar, fmtAmt, whole } from '../../components/shared';
import { statementsApi, type Statement } from '../api';
import { StatementPrintSheet } from './StatementPrintSheet';

export interface StatementDetailViewProps {
  partyId: number;
}

export function StatementDetailView({ partyId }: StatementDetailViewProps) {
  const nav = useNavigate();
  const toast = useToast();
  const [from, setFrom] = useState(day(-60));
  const [view, setView] = useState<'screen' | 'print'>('screen');
  const p = party(partyId);
  const { data: s } = useQ<Statement>(['statement', partyId, from], () => statementsApi.getCustomerStatement(partyId, from, TODAY));

  if (!p) {
    return (
      <Page>
        <Empty title="Customer not found" action={<Link to="/statements">Back to statements</Link>} />
      </Page>
    );
  }
  if (!s) {
    return (
      <Page>
        <Empty title="Loading statement" />
      </Page>
    );
  }

  const limit = num(p.creditLimit);
  const used = limit ? (s.outstanding / limit) * 100 : 0;
  const invoiced = s.lines.reduce((a: number, l: any) => a + l.debit, 0);
  const received = s.lines.reduce((a: number, l: any) => a + l.credit, 0);

  return (
    <Page>
      <PageHeader
        crumbs={[['Statements', '/statements'], [p.partyName]]}
        title={p.partyName}
        ms="M3"
        sub={`Statement in USD · ${fmtD(from)} to ${fmtD(TODAY)}`}
        actions={
          <>
            <Select
              aria-label="Customer"
              value={String(partyId)}
              onChange={(e) => nav(`/statements/${e.target.value}`)}
              options={customers.map((c) => [String(c.partyId), c.partyName])}
            />
            <Button
              icon={<Mail />}
              perm="billing.invoice.view"
              onClick={() => toast(`Statement emailed to ${p.email ?? 'the customer'}`)}
            >
              Email
            </Button>
            <Button icon={<Download />} perm="billing.invoice.view" onClick={() => toast('PDF downloaded')}>
              PDF
            </Button>
            <Button icon={<Printer />} perm="billing.invoice.view" onClick={() => setView('print')}>
              Print
            </Button>
          </>
        }
      />
      <div className="stack-lg">
        {p.creditStatus === 'BLOCKED' && (
          <Banner tone="stop" title="Blocked for credit">
            Cargo for this customer leaves only against payment. Unblocking is done in Customers & parties.
          </Banner>
        )}
        {limit > 0 && used >= 90 && (
          <Banner tone="stop" title="Credit limit nearly used">
            New credit invoices will be refused once the limit is reached.
          </Banner>
        )}
        <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { id: 'screen', label: 'Statement' },
              { id: 'print', label: 'Print view' },
            ]}
          />
          <Field label="From">
            <Input
              type="date"
              value={from}
              max={TODAY}
              onChange={(e) => setFrom(e.target.value)}
              style={{ maxWidth: 180 }}
            />
          </Field>
        </div>

        {view === 'screen' ? (
          <>
            <div className="kpi-strip">
              <Kpi label="Opening balance" value={whole(s.openingBalance)} unit="USD" delta={fmtD(from)} />
              <Kpi label="Invoiced" value={whole(invoiced)} unit="USD" />
              <Kpi label="Payments and credits" value={whole(received)} unit="USD" />
              <Kpi
                label="Closing balance"
                value={whole(s.closingBalance)}
                unit="USD"
                delta={s.unallocated > 0 ? `Includes ${fmtAmt(s.unallocated)} on account` : 'Today'}
              />
            </div>
            <div className="grid-2">
              <Panel title="Ageing" sub="Open invoices by days past due date">
                <AgeingBar ageing={s.ageing} />
              </Panel>
              <Panel title="Credit limit">
                {limit ? (
                  <div className="stack" style={{ gap: 6 }}>
                    <Meter pct={used} label="Credit used" />
                    <div className="row small">
                      <span className="spacer">
                        {fmtAmt(s.outstanding)} used of {fmtAmt(limit)}
                      </span>
                      <span className="strong">{Math.round(used)}%</span>
                    </div>
                    <span className="xs muted">
                      Available {fmtAmt(Math.max(0, limit - s.outstanding))}. Terms 30 days from invoice date.
                    </span>
                  </div>
                ) : (
                  <p className="small muted">
                    {p.creditStatus === 'BLOCKED'
                      ? 'Blocked: no credit allowed.'
                      : 'Cash customer: pays before release.'}
                  </p>
                )}
              </Panel>
            </div>
            <CommonTable
              rows={s.lines}
              rowKey={(l: any) => l.docNo}
              itemLabel="transactions"
              emptyTitle="No transactions in this period"
              emptySubtitle="Move the From date back to see older documents."
              foot={
                <tr>
                  <td colSpan={4}>Closing balance</td>
                  <td className="num">
                    <Money amount={invoiced} />
                  </td>
                  <td className="num">
                    <Money amount={received} />
                  </td>
                  <td className="num">
                    <Money amount={s.closingBalance} />
                  </td>
                </tr>
              }
              cols={[
                { key: 'd', header: 'Date', render: (l: any) => <DateCell value={l.date} /> },
                { key: 'k', header: 'Type', render: (l: any) => <span className="small">{l.docKind}</span> },
                {
                  key: 'n',
                  header: 'Document',
                  render: (l: any) =>
                    l.to ? (
                      <Link className="small strong" to={l.to}>
                        {l.docNo}
                      </Link>
                    ) : (
                      <span className="small strong">{l.docNo}</span>
                    ),
                },
                {
                  key: 'r',
                  header: 'Reference',
                  render: (l: any) => (
                    <span className="xs muted">
                      {l.reference}
                      {l.due && l.debit > 0 ? ` · due ${fmtD(l.due)}` : ''}
                    </span>
                  ),
                },
                {
                  key: 'dr',
                  header: 'Debit',
                  num: true,
                  render: (l: any) => (l.debit ? <MoneyCell amount={l.debit} /> : ''),
                },
                {
                  key: 'cr',
                  header: 'Credit',
                  num: true,
                  render: (l: any) => (l.credit ? <MoneyCell amount={l.credit} /> : ''),
                },
                { key: 'b', header: 'Balance', num: true, render: (l: any) => <MoneyCell amount={l.balance} strong /> },
              ]}
            />
          </>
        ) : (
          <StatementPrintSheet p={p} s={s} from={from} />
        )}
      </div>
    </Page>
  );
}
