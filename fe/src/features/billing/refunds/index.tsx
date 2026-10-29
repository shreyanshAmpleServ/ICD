import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Undo2, XCircle } from 'lucide-react';
import {
  Button, Chips, CommonTable, Kpi, MoneyCell, Page, PageHeader, PartyCell, Pill, ReferenceCell, fmtDT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { partyName } from '@/mock/core';
import { LIMITS, TODAY, fx, num, payments, type Refund, type RefundStatus } from '@/mock/money';
import { ApprovalSteps, fmtAmt } from '../components/shared';
import { refundsApi } from './api';
import { RequestDrawer } from './components/RequestDrawer';
import { PaidDrawer } from './components/PaidDrawer';

export { refundsApi } from './api';

type Quick = 'all' | 'waiting' | 'toPay' | 'done';

const LABEL: Record<RefundStatus, [string, 'wait' | 'go' | 'idle' | 'stop']> = {
  PENDING_L1: ['Awaiting level 1', 'wait'],
  PENDING_L2: ['Awaiting level 2', 'wait'],
  APPROVED: ['Approved, to pay', 'go'],
  PAID: ['Paid', 'idle'],
  REJECTED: ['Rejected', 'stop'],
  CANCELLED: ['Cancelled', 'idle'],
};

const usdOf = (r: Refund) => (r.currency === 'USD' ? num(r.amount) : num(r.amount) / fx(TODAY));

export function RefundsView() {
  const toast = useToast();
  const { can, userName } = useSession();
  const { data: dbRefunds } = useQ(['refunds'], () => refundsApi.getRefunds());
  const [local, setLocal] = useState<Refund[] | null>(null);
  const rows = local ?? (dbRefunds && dbRefunds.length > 0 ? dbRefunds : []);
  const [quick, setQuick] = useState<Quick>('all');
  const [search, setSearch] = useState('');
  const [req, setReq] = useState(false);
  const [pay, setPay] = useState<Refund | null>(null);

  const update = (r: Refund, patch: Partial<Refund>) =>
    setLocal(rows.map((x) => (x.refundId === r.refundId ? { ...x, ...patch } : x)));

  const decide = (r: Refund, ok: boolean) => {
    const lvl = r.status === 'PENDING_L1' ? 1 : 2;
    const levels = (r.levels || []).map((l) =>
      l.level === lvl
        ? { ...l, at: '2026-10-07T07:30:00Z', decision: ok ? ('APPROVED' as const) : ('REJECTED' as const) }
        : l
    );
    update(r, {
      levels,
      status: !ok ? 'REJECTED' : lvl === 1 && (r.levels || []).length > 1 ? 'PENDING_L2' : 'APPROVED',
    });
    toast(ok ? `Refund approved at level ${lvl}` : 'Refund rejected');
  };

  const shown = useMemo(() => {
    return rows.filter((r) => {
      const matchFilter =
        quick === 'all' ||
        (quick === 'waiting'
          ? r.status.startsWith('PENDING')
          : quick === 'toPay'
          ? r.status === 'APPROVED'
          : ['PAID', 'REJECTED', 'CANCELLED'].includes(r.status));
      if (!matchFilter) return false;
      if (!search) return true;
      const q = search.toUpperCase();
      return (
        r.refundNo?.toUpperCase().includes(q) ||
        partyName(r.partyId).toUpperCase().includes(q) ||
        r.reason?.toUpperCase().includes(q) ||
        (r.paidReference ?? '').toUpperCase().includes(q)
      );
    });
  }, [rows, quick, search]);

  const waiting = rows.filter((r) => r.status.startsWith('PENDING'));
  const toPay = rows.filter((r) => r.status === 'APPROVED');

  return (
    <Page>
      <PageHeader
        title="Refunds"
        ms="M3"
        sub="Money paid back to customers from overpayments or duplicate payments"
        actions={
          <Button variant="primary" icon={<Plus />} perm="payment.refund" level="REQ" onClick={() => setReq(true)}>
            Request refund
          </Button>
        }
      />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi
            label="Waiting for approval"
            value={waiting.length}
            delta={fmtAmt(waiting.reduce((a, r) => a + usdOf(r), 0))}
          />
          <Kpi label="Approved, to pay out" value={toPay.length} delta={fmtAmt(toPay.reduce((a, r) => a + usdOf(r), 0))} />
          <Kpi
            label="Two approvals from"
            value={fmtAmt(LIMITS.refundApprovalUsd)}
            delta="Or TZS equivalent at today's rate"
          />
        </div>
        <CommonTable
          rows={shown}
          rowKey={(r) => r.refundId}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter refunds by refund #, customer, reason..."
          itemLabel="refunds"
          toolbarFilters={
            <Chips<Quick>
              value={quick}
              onChange={setQuick}
              options={[
                { id: 'all', label: 'All', count: rows.length },
                { id: 'waiting', label: 'Waiting approval', count: waiting.length },
                { id: 'toPay', label: 'To pay', count: toPay.length },
                { id: 'done', label: 'Closed' },
              ]}
            />
          }
          emptyTitle="No refunds here"
          emptySubtitle="Refunds are requested from a payment with money left on account."
          cols={[
            {
              key: 'no',
              header: 'Refund',
              render: (r) => (
                <ReferenceCell refNo={r.refundNo} sub={`${fmtDT(r.requestedAt)} · ${r.requestedBy}`} />
              ),
            },
            {
              key: 'party',
              header: 'Customer',
              render: (r) => (
                <PartyCell
                  name={partyName(r.partyId)}
                  sub={`From ${payments.find((p) => p.paymentId === r.paymentId)?.receiptNo ?? 'Receipt'}`}
                />
              ),
            },
            {
              key: 'why',
              header: 'Reason',
              render: (r) => (
                <span className="xs" style={{ display: 'block', maxWidth: 320 }}>
                  {r.reason}
                </span>
              ),
            },
            {
              key: 'amt',
              header: 'Amount',
              num: true,
              render: (r) => <MoneyCell amount={r.amount} currency={r.currency} strong />,
            },
            {
              key: 'appr',
              header: 'Approvals',
              render: (r) => <ApprovalSteps levels={r.levels || []} />,
            },
            {
              key: 'st',
              header: 'Status',
              render: (r) => (
                <span>
                  <Pill tone={LABEL[r.status]?.[1] ?? 'idle'}>{LABEL[r.status]?.[0] ?? r.status}</Pill>
                  {r.paidReference && <div className="xs faint">{r.paidReference}</div>}
                </span>
              ),
            },
            {
              key: 'act',
              header: '',
              render: (r) => (
                <span className="row" style={{ gap: 6 }}>
                  {r.status.startsWith('PENDING') && can('payment.refund', 'APPR') && (
                    <>
                      <Button
                        size="sm"
                        icon={<XCircle />}
                        perm="payment.refund"
                        level="APPR"
                        disabled={r.requestedBy === userName}
                        onClick={() => decide(r, false)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<CheckCircle2 />}
                        perm="payment.refund"
                        level="APPR"
                        disabled={r.requestedBy === userName}
                        title={
                          r.requestedBy === userName
                            ? 'You requested it; someone else must approve'
                            : undefined
                        }
                        onClick={() => decide(r, true)}
                      >
                        Approve level {r.status === 'PENDING_L1' ? 1 : 2}
                      </Button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <Button size="sm" variant="primary" icon={<Undo2 />} perm="payment.refund" onClick={() => setPay(r)}>
                      Mark paid
                    </Button>
                  )}
                </span>
              ),
            },
          ]}
        />
      </div>

      <RequestDrawer
        open={req}
        onClose={() => setReq(false)}
        onDone={(r) => {
          setLocal([r, ...rows]);
          toast(r.levels.length ? 'Refund requested for approval' : 'Refund approved, ready to pay');
        }}
      />
      <PaidDrawer
        r={pay}
        onClose={() => setPay(null)}
        onDone={(r, ref) => {
          update(r, { status: 'PAID', paidAt: '2026-10-07T07:30:00Z', paidReference: ref });
          toast('Refund marked paid');
        }}
      />
    </Page>
  );
}

export { RefundsView as Refunds };
export default RefundsView;
