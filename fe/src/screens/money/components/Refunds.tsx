import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Undo2, XCircle } from 'lucide-react';
import {
  Banner, Button, Chips, CommonTable, Drawer, Field, Input, Kpi, MoneyCell, Page, PageHeader, PartyCell, Pill, ReferenceCell, Select, Textarea, fmtDT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { partyName } from '@/mock/core';
import { APPROVERS, LIMITS, ME, TODAY, fx, m2, num, payments, refunds, type Refund, type RefundStatus } from '@/mock/money';
import { ApprovalSteps, fmtAmt } from './shared';

/* POST /refunds, /refunds/{id}:mark-paid. A refund always comes from a
   payment's unallocated money. From USD 500 (or the TZS equivalent) it
   needs two approvals before finance can pay it out. */
type Quick = 'all' | 'waiting' | 'toPay' | 'done';
const LABEL: Record<RefundStatus, [string, 'wait' | 'go' | 'idle' | 'stop']> = {
  PENDING_L1: ['Awaiting level 1', 'wait'], PENDING_L2: ['Awaiting level 2', 'wait'], APPROVED: ['Approved, to pay', 'go'],
  PAID: ['Paid', 'idle'], REJECTED: ['Rejected', 'stop'], CANCELLED: ['Cancelled', 'idle'],
};
const usdOf = (r: Refund) => (r.currency === 'USD' ? num(r.amount) : num(r.amount) / fx(TODAY));

export function Refunds() {
  const toast = useToast();
  const { can, userName } = useSession();
  const { data: dbRefunds } = useQ(['refunds'], () =>
    api.get<{ items: Refund[] }>('/refunds').then((r) => r.items).catch(() => refunds)
  );
  const [local, setLocal] = useState<Refund[] | null>(null);
  const rows = local ?? (dbRefunds && dbRefunds.length > 0 ? dbRefunds : refunds);
  const [quick, setQuick] = useState<Quick>('all');
  const [search, setSearch] = useState('');
  const [req, setReq] = useState(false);
  const [pay, setPay] = useState<Refund | null>(null);
  const update = (r: Refund, patch: Partial<Refund>) => setLocal(rows.map((x) => (x.refundId === r.refundId ? { ...x, ...patch } : x)));

  const decide = (r: Refund, ok: boolean) => {
    const lvl = r.status === 'PENDING_L1' ? 1 : 2;
    const levels = (r.levels || []).map((l) => (l.level === lvl ? { ...l, at: '2026-10-07T07:30:00Z', decision: ok ? 'APPROVED' as const : 'REJECTED' as const } : l));
    update(r, { levels, status: !ok ? 'REJECTED' : lvl === 1 && (r.levels || []).length > 1 ? 'PENDING_L2' : 'APPROVED' });
    toast(ok ? `Refund approved at level ${lvl}` : 'Refund rejected');
  };

  const shown = useMemo(() => {
    return rows.filter((r) => {
      const matchFilter = quick === 'all' || (quick === 'waiting' ? r.status.startsWith('PENDING') : quick === 'toPay' ? r.status === 'APPROVED' : ['PAID', 'REJECTED', 'CANCELLED'].includes(r.status));
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
      <PageHeader title="Refunds" ms="M3" sub="Money paid back to customers from overpayments or duplicate payments"
        actions={<Button variant="primary" icon={<Plus />} perm="payment.refund" level="REQ" onClick={() => setReq(true)}>Request refund</Button>} />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Waiting for approval" value={waiting.length} delta={fmtAmt(waiting.reduce((a, r) => a + usdOf(r), 0))} />
          <Kpi label="Approved, to pay out" value={toPay.length} delta={fmtAmt(toPay.reduce((a, r) => a + usdOf(r), 0))} />
          <Kpi label="Two approvals from" value={fmtAmt(LIMITS.refundApprovalUsd)} delta="Or TZS equivalent at today's rate" />
        </div>
        <CommonTable
          rows={shown}
          rowKey={(r) => r.refundId}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter refunds by refund #, customer, reason..."
          itemLabel="refunds"
          toolbarFilters={
            <Chips<Quick> value={quick} onChange={setQuick} options={[
              { id: 'all', label: 'All', count: rows.length }, { id: 'waiting', label: 'Waiting approval', count: waiting.length },
              { id: 'toPay', label: 'To pay', count: toPay.length }, { id: 'done', label: 'Closed' },
            ]} />
          }
          emptyTitle="No refunds here"
          emptySubtitle="Refunds are requested from a payment with money left on account."
          cols={[
            {
              key: 'no',
              header: 'Refund',
              render: (r) => (
                <ReferenceCell
                  refNo={r.refundNo}
                  sub={`${fmtDT(r.requestedAt)} · ${r.requestedBy}`}
                />
              )
            },
            {
              key: 'party',
              header: 'Customer',
              render: (r) => (
                <PartyCell
                  name={partyName(r.partyId)}
                  sub={`From ${payments.find((p) => p.paymentId === r.paymentId)?.receiptNo ?? 'Receipt'}`}
                />
              )
            },
            {
              key: 'why',
              header: 'Reason',
              render: (r) => <span className="xs" style={{ display: 'block', maxWidth: 320 }}>{r.reason}</span>
            },
            {
              key: 'amt',
              header: 'Amount',
              num: true,
              render: (r) => <MoneyCell amount={r.amount} currency={r.currency} strong />
            },
            {
              key: 'appr',
              header: 'Approvals',
              render: (r) => <ApprovalSteps levels={r.levels || []} />
            },
            {
              key: 'st',
              header: 'Status',
              render: (r) => (
                <span>
                  <Pill tone={LABEL[r.status]?.[1] ?? 'idle'}>{LABEL[r.status]?.[0] ?? r.status}</Pill>
                  {r.paidReference && <div className="xs faint">{r.paidReference}</div>}
                </span>
              )
            },
            {
              key: 'act',
              header: '',
              render: (r) => (
                <span className="row" style={{ gap: 6 }}>
                  {r.status.startsWith('PENDING') && can('payment.refund', 'APPR') && (
                    <>
                      <Button size="sm" icon={<XCircle />} perm="payment.refund" level="APPR" disabled={r.requestedBy === userName} onClick={() => decide(r, false)}>Reject</Button>
                      <Button size="sm" variant="primary" icon={<CheckCircle2 />} perm="payment.refund" level="APPR" disabled={r.requestedBy === userName} title={r.requestedBy === userName ? 'You requested it; someone else must approve' : undefined} onClick={() => decide(r, true)}>Approve level {r.status === 'PENDING_L1' ? 1 : 2}</Button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <Button size="sm" variant="primary" icon={<Undo2 />} perm="payment.refund" onClick={() => setPay(r)}>Mark paid</Button>
                  )}
                </span>
              )
            },
          ]}
        />
      </div>

      <RequestDrawer open={req} onClose={() => setReq(false)} onDone={(r) => { setLocal([r, ...rows]); toast(r.levels.length ? 'Refund requested for approval' : 'Refund approved, ready to pay'); }} />
      <PaidDrawer r={pay} onClose={() => setPay(null)} onDone={(r, ref) => { update(r, { status: 'PAID', paidAt: '2026-10-07T07:30:00Z', paidReference: ref }); toast('Refund marked paid'); }} />
    </Page>
  );
}

function RequestDrawer({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (r: Refund) => void }) {
  const candidates = payments.filter((p) => num(p.unallocated) > 0.005);
  const [pid, setPid] = useState(String(candidates[0]?.paymentId ?? ''));
  const p = payments.find((x) => String(x.paymentId) === pid);
  const [amt, setAmt] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('Bank transfer CRDB');
  const a = Number(amt) || 0;
  const usd = p ? (p.currency === 'USD' ? a : a / fx(TODAY)) : 0;
  const two = usd >= LIMITS.refundApprovalUsd;
  const tooMuch = p && a > num(p.unallocated) + 0.005;
  return (
    <Drawer open={open} onClose={onClose} title="Request a refund"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Undo2 />} perm="payment.refund" level="REQ" disabled={!p || !a || !!tooMuch || !reason.trim()}
        onClick={() => { onDone({ refundId: 70 + a, refundNo: 'RFD-DAR1-26-000072', paymentId: p!.paymentId, partyId: p!.partyId, currency: p!.currency, amount: m2(a), reason, status: two ? 'PENDING_L1' : 'APPROVED', requestedBy: ME, requestedAt: '2026-10-07T07:30:00Z', method, levels: two ? [{ level: 1, who: APPROVERS.l1 }, { level: 2, who: APPROVERS.l2 }] : [] }); onClose(); setAmt(''); setReason(''); }}>
        {two ? 'Request approval' : 'Request refund'}</Button></>}>
      <div className="stack">
        <Field label="From payment" required hint="Only money not allocated to invoices can be refunded">
          <Select value={pid} onChange={(e) => setPid(e.target.value)} options={candidates.map((c) => [String(c.paymentId), `${c.receiptNo} · ${partyName(c.partyId)} · ${fmtAmt(num(c.unallocated), c.currency)} on account`])} />
        </Field>
        <Field label={`Amount (${p?.currency ?? ''})`} required error={tooMuch ? `Only ${fmtAmt(num(p!.unallocated), p!.currency)} is on account.` : undefined}><Input type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
        <Field label="Pay back by"><Select value={method} onChange={(e) => setMethod(e.target.value)} options={['Bank transfer CRDB', 'Bank transfer NMB', 'M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Cash at counter']} /></Field>
        {a > 0 && (two
          ? <Banner tone="wait" title={`Needs two approvals: ${fmtAmt(LIMITS.refundApprovalUsd)} or more`}>Level 1: {APPROVERS.l1}. Level 2: {APPROVERS.l2}. Nobody can approve their own request.</Banner>
          : <Banner tone="go" title="Under the approval limit">It goes straight to finance to pay out.</Banner>)}
        <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Paid twice: by bank and by the agent" /></Field>
      </div>
    </Drawer>
  );
}

function PaidDrawer({ r, onClose, onDone }: { r: Refund | null; onClose: () => void; onDone: (r: Refund, ref: string) => void }) {
  const [ref, setRef] = useState('');
  return (
    <Drawer open={!!r} onClose={onClose} title={`Mark ${r?.refundNo ?? ''} paid`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" perm="payment.refund" disabled={!ref.trim()} onClick={() => { onDone(r!, ref); onClose(); setRef(''); }}>Mark paid</Button></>}>
      {r && <div className="stack">
        <p className="small">{fmtAmt(num(r.amount), r.currency)} to {partyName(r.partyId)} by {r.method}.</p>
        <Field label="Payout reference" required hint="Bank FT number or mobile money transaction ID"><Input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} /></Field>
        <Field label="Paid on"><Input type="date" defaultValue={TODAY} /></Field>
        <p className="xs muted">Posts Dr refunds payable / Cr bank to the NG ledger.</p>
      </div>}
    </Drawer>
  );
}
