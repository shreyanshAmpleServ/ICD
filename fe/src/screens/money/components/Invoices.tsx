import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import {
  Button, Chips, CommonTable, DateCell, Kpi, MoneyCell, Page, PageHeader, Panel,
  PartyCell, Pill, ReferenceCell, StatusCell, Tabs, fmtD,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { partyName } from '@/mock/core';
import { DOC_KIND, TODAY, fx, invoices, num, type DocKind, type Invoice } from '@/mock/money';
import { DocKindPill, FiscalPill, fmtAmt, whole } from './shared';

/* GET /invoices. Proformas, tax invoices and notes in one list, because the
   counter asks "what does this customer owe and is it fiscalised" in one go. */
type Kind = 'ALL' | DocKind;
type Quick = 'all' | 'unpaid' | 'overdue' | 'convert' | 'fiscal' | 'draft';

export const isOverdue = (i: Invoice) => i.docKind === 'TAX_INVOICE' && num(i.balance) > 0 && !!i.dueDate && i.dueDate < TODAY && i.status !== 'DRAFT';
export const toConvert = (i: Invoice) => i.docKind === 'PROFORMA' && i.status === 'ISSUED' && num(i.amountPaid) >= num(i.total) - 0.005;
export const usdOf = (i: Invoice, field: 'total' | 'balance') => (i.currency === 'USD' ? num(i[field]) : num(i[field]) / num(i.exchangeRate));

export function Invoices() {
  const { site } = useSession();
  const nav = useNavigate();
  const { data = [] } = useQ(['invoices', site.siteId], () => delay(invoices.filter((i) => i.siteId === site.siteId)));
  const [kind, setKind] = useState<Kind>('ALL');
  const [quick, setQuick] = useState<Quick>('all');
  const [q, setQ] = useState('');

  const receivable = data.filter((i) => (i.docKind === 'TAX_INVOICE' || i.docKind === 'DEBIT_NOTE') && i.status !== 'DRAFT');
  const counts = {
    unpaid: data.filter((i) => num(i.balance) > 0 && i.docKind !== 'PROFORMA' && i.docKind !== 'CREDIT_NOTE' && i.status !== 'DRAFT').length,
    overdue: data.filter(isOverdue).length,
    convert: data.filter(toConvert).length,
    fiscal: data.filter((i) => i.fiscalReceipt?.status === 'FAILED').length,
    draft: data.filter((i) => i.status === 'DRAFT').length,
  };
  const rows = data.filter((i) => {
    if (kind !== 'ALL' && i.docKind !== kind) return false;
    if (q) {
      const n = q.replace(/[\s-]/g, '').toUpperCase();
      const no = (i.invoiceNo ?? '').replace(/-/g, '');
      const pName = partyName(i.billToPartyId) ?? '';
      if (!no.includes(n) && !pName.toUpperCase().includes(q.toUpperCase()) && !(i.consignmentRef ?? '').includes(n)) return false;
    }
    if (quick === 'unpaid') return num(i.balance) > 0 && i.docKind !== 'PROFORMA' && i.docKind !== 'CREDIT_NOTE' && i.status !== 'DRAFT';
    if (quick === 'overdue') return isOverdue(i);
    if (quick === 'convert') return toConvert(i);
    if (quick === 'fiscal') return i.fiscalReceipt?.status === 'FAILED';
    if (quick === 'draft') return i.status === 'DRAFT';
    return true;
  }).sort((a, b) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? '') || (b.invoiceNo ?? '').localeCompare(a.invoiceNo ?? ''));

  return (
    <Page>
      <PageHeader
        title="Invoices"
        ms="M3"
        sub={`Proformas, tax invoices, credit and debit notes at ${site.siteName}`}
        actions={
          <>
            <Button icon={<Download />} perm="reports.financial">Export</Button>
            <Button variant="primary" icon={<Plus />} perm="billing.invoice.create" onClick={() => nav('/invoices/new')}>New invoice or proforma</Button>
          </>
        }
      />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Open balance" value={whole(receivable.reduce((a, i) => a + usdOf(i, 'balance'), 0))} unit="USD" delta={`${counts.unpaid} documents unpaid`} />
          <Kpi label="Overdue" value={whole(receivable.filter(isOverdue).reduce((a, i) => a + usdOf(i, 'balance'), 0))} unit="USD" delta={`${counts.overdue} past due date`} />
          <Kpi label="Paid proformas to convert" value={counts.convert} delta="Release needs the tax invoice" />
          <Kpi label="Fiscal receipts failed" value={counts.fiscal} delta={counts.fiscal ? 'Retry from the invoice' : 'All sent to TRA'} />
        </div>

        <Panel flush>
          <div style={{ padding: '8px 16px 0' }}>
            <Tabs<Kind>
              value={kind}
              onChange={setKind}
              tabs={[
                { id: 'ALL', label: 'All', count: data.length },
                ...(['TAX_INVOICE', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE'] as DocKind[]).map((k) => ({ id: k, label: DOC_KIND[k] + 's', count: data.filter((i) => i.docKind === k).length })),
              ]}
            />
          </div>
          <CommonTable
            rows={rows}
            rowKey={(i) => i.invoiceId}
            onRow={(i) => nav(`/invoices/${i.invoiceId}`)}
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="Number, customer or B/L"
            itemLabel="invoices"
            emptyTitle="No documents match"
            emptySubtitle="Clear the search or pick another filter."
            toolbarFilters={
              <Chips<Quick>
                value={quick}
                onChange={setQuick}
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'unpaid', label: 'Unpaid', count: counts.unpaid },
                  { id: 'overdue', label: 'Overdue', count: counts.overdue },
                  { id: 'convert', label: 'Paid, not converted', count: counts.convert },
                  { id: 'fiscal', label: 'Fiscal failed', count: counts.fiscal },
                  { id: 'draft', label: 'Drafts', count: counts.draft },
                ]}
              />
            }
            cols={[
              {
                key: 'no',
                header: 'Number',
                render: (i) => <ReferenceCell refNo={i.invoiceNo} />
              },
              {
                key: 'kind',
                header: 'Kind',
                render: (i) => <DocKindPill kind={i.docKind} />
              },
              {
                key: 'bill',
                header: 'Bill to',
                render: (i) => (
                  <PartyCell
                    name={partyName(i.billToPartyId)}
                    sub={i.consignmentRef}
                  />
                )
              },
              {
                key: 'date',
                header: 'Date',
                render: (i) => (
                  <div className="stack" style={{ gap: 2 }}>
                    <DateCell value={i.invoiceDate} />
                    {isOverdue(i) && <div className="xs" style={{ color: 'var(--stop)' }}>Due {fmtD(i.dueDate)}</div>}
                  </div>
                )
              },
              {
                key: 'status',
                header: 'Status',
                render: (i) => toConvert(i) ? <Pill tone="wait">Paid, convert</Pill> : <StatusCell value={i.status} track="billing" />
              },
              {
                key: 'fiscal',
                header: 'Fiscal (VFD)',
                render: (i) => i.docKind === 'PROFORMA' ? <span className="xs faint">Not a tax document</span> : <FiscalPill status={i.fiscalReceipt?.status} />
              },
              {
                key: 'total',
                header: 'Total',
                num: true,
                render: (i) => <MoneyCell amount={i.total} currency={i.currency} />
              },
              {
                key: 'bal',
                header: 'Balance',
                num: true,
                render: (i) => num(i.balance) > 0 ? <MoneyCell amount={i.balance} currency={i.currency} strong /> : <span className="xs faint">Nil</span>
              },
            ]}
          />
        </Panel>
        <p className="xs faint">Balances in USD use each document's frozen rate. Today's rate {fmtAmt(fx(TODAY), 'TZS')} per USD applies to new documents only.</p>
      </div>
    </Page>
  );
}
