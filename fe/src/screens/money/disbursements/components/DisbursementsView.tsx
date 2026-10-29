import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  Button, Chips, CommonTable, Kpi,
  MoneyCell, Page, PageHeader, PartyCell, Pill, ReferenceCell,
  fmtD, useToast,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { consignment, partyName } from '@/mock/core';
import { CHARGE_NAMES, TODAY, fx, invoice, num, type Disb } from '@/mock/money';
import { whole } from '../../components/shared';
import { disbursementsApi } from '../api';
import { RecordDisbursementDrawer, type DisbRow } from './RecordDisbursementDrawer';
import { WriteOffDrawer } from './WriteOffDrawer';

type Recovery = 'NOT_BILLED' | 'ON_INVOICE' | 'RECOVERED' | 'WRITTEN_OFF' | 'WRITEOFF_PENDING';

const recovery = (d: DisbRow): Recovery => {
  if (d.pending) return 'WRITEOFF_PENDING';
  if (d.status === 'WRITTEN_OFF') return 'WRITTEN_OFF';
  if (d.status === 'RECORDED') return 'NOT_BILLED';
  const inv = d.invoiceId ? invoice(d.invoiceId) : undefined;
  return inv && num(inv.balance) <= 0.005 ? 'RECOVERED' : 'ON_INVOICE';
};

const REC: Record<Recovery, [string, 'wait' | 'go' | 'idle' | 'stop' | 'info']> = {
  NOT_BILLED: ['Not billed yet', 'wait'],
  ON_INVOICE: ['On invoice, unpaid', 'info'],
  RECOVERED: ['Recovered', 'go'],
  WRITTEN_OFF: ['Written off', 'idle'],
  WRITEOFF_PENDING: ['Write-off awaiting approval', 'wait'],
};

const usd = (d: Disb) => (d.currency === 'USD' ? num(d.amountPaid) : num(d.amountPaid) / fx(TODAY));

export function DisbursementsView() {
  const toast = useToast();
  const { data } = useQ(['disbursements'], () => disbursementsApi.getDisbursements());
  const [local, setLocal] = useState<DisbRow[] | null>(null);
  const rows: DisbRow[] = local ?? data ?? [];
  const [q, setQ] = useState('');
  const [f, setF] = useState<'all' | Recovery>('all');
  const [rec, setRec] = useState(false);
  const [wo, setWo] = useState<DisbRow | null>(null);

  const shown = rows.filter(
    (d) =>
      (f === 'all' || recovery(d) === f) &&
      (!q ||
        [d.disbNo, consignment(d.consignmentId)?.refNo, partyName(d.billToPartyId), d.payeeName]
          .join(' ')
          .toUpperCase()
          .includes(q.toUpperCase()))
  );

  const sum = (r: Recovery) => rows.filter((d) => recovery(d) === r).reduce((a, d) => a + usd(d), 0);

  return (
    <Page>
      <PageHeader
        title="Disbursements"
        ms="M3"
        sub="Paid on the customer's behalf and recovered on their invoice"
        actions={
          <Button variant="primary" icon={<Plus />} perm="finance.disbursement.record" onClick={() => setRec(true)}>
            Record disbursement
          </Button>
        }
      />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Not billed yet" value={whole(sum('NOT_BILLED'))} unit="USD" delta="Add to the next invoice" />
          <Kpi label="On invoice, unpaid" value={whole(sum('ON_INVOICE'))} unit="USD" />
          <Kpi label="Recovered" value={whole(sum('RECOVERED'))} unit="USD" />
          <Kpi label="Written off" value={whole(sum('WRITTEN_OFF'))} unit="USD" />
        </div>
        <CommonTable
          rows={shown}
          rowKey={(d) => d.disbursementId}
          searchValue={q}
          onSearchChange={setQ}
          searchPlaceholder="Number, B/L, customer or payee"
          itemLabel="disbursements"
          emptyTitle="No disbursements match"
          emptySubtitle="Clear the search or the filter."
          toolbarFilters={
            <Chips
              value={f}
              onChange={setF}
              options={[
                { id: 'all', label: 'All' },
                ...(['NOT_BILLED', 'ON_INVOICE', 'RECOVERED', 'WRITTEN_OFF'] as Recovery[]).map((r) => ({
                  id: r,
                  label: REC[r][0],
                  count: rows.filter((d) => recovery(d) === r).length,
                })),
              ]}
            />
          }
          cols={[
            {
              key: 'no',
              header: 'Disbursement',
              render: (d) => (
                <ReferenceCell refNo={d.disbNo} sub={<>{fmtD(d.paidAt)} · {d.recordedBy}</>} />
              ),
            },
            {
              key: 'what',
              header: 'Paid for',
              render: (d) => (
                <div className="stack" style={{ gap: 2 }}>
                  <span className="small">{d.description}</span>
                  <div className="xs faint">{CHARGE_NAMES[d.chargeCode]}</div>
                </div>
              ),
            },
            {
              key: 'payee',
              header: 'Paid to',
              render: (d) => <PartyCell name={d.payeeName} sub={`Receipt ${d.payeeReceiptNo}`} />,
            },
            {
              key: 'cons',
              header: 'Consignment / bill to',
              render: (d) => (
                <div className="stack" style={{ gap: 2 }}>
                  <span className="small">{consignment(d.consignmentId)?.refNo}</span>
                  <div className="xs faint">{partyName(d.billToPartyId)}</div>
                </div>
              ),
            },
            {
              key: 'amt',
              header: 'Paid',
              num: true,
              render: (d) => <MoneyCell amount={d.amountPaid} currency={d.currency} />,
            },
            {
              key: 'fee',
              header: 'Handling fee',
              num: true,
              render: (d) =>
                num(d.handlingFee) > 0 ? (
                  <MoneyCell amount={d.handlingFee} currency={d.currency} />
                ) : (
                  <span className="xs faint">At cost</span>
                ),
            },
            {
              key: 'rec',
              header: 'Recovery',
              render: (d) => {
                const r = recovery(d);
                const inv = d.invoiceId ? invoice(d.invoiceId) : undefined;
                return (
                  <span>
                    <Pill tone={REC[r][1]}>{REC[r][0]}</Pill>
                    {inv && (
                      <div className="xs">
                        <Link to={`/invoices/${inv.invoiceId}`}>{inv.invoiceNo}</Link>
                      </div>
                    )}
                  </span>
                );
              },
            },
            {
              key: 'act',
              header: '',
              render: (d) =>
                d.status === 'RECORDED' && !d.pending ? (
                  <Button size="sm" perm="finance.disbursement.record" level="REQ" onClick={() => setWo(d)}>
                    Write off
                  </Button>
                ) : null,
            },
          ]}
        />
        <p className="xs faint">
          Re-billed disbursements are outside the VAT scope; the handling fee carries VAT 18%. Verify both with tax
          adviser before go-live.
        </p>
      </div>

      <RecordDisbursementDrawer
        open={rec}
        onClose={() => setRec(false)}
        onDone={(d) => {
          setLocal([d, ...rows]);
          toast('Disbursement recorded');
        }}
      />
      <WriteOffDrawer
        wo={wo}
        onClose={() => setWo(null)}
        onRequest={(target) => {
          setLocal(rows.map((x) => (x === target ? { ...x, pending: true } : x)));
          toast('Write-off requested for approval');
        }}
      />
    </Page>
  );
}
