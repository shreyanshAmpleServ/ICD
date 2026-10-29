import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import {
  Banner, Button, Drawer, Field, Input, Select, Textarea,
} from '@/ds/components';
import { partyName } from '@/mock/core';
import { APPROVERS, LIMITS, ME, TODAY, fx, m2, num, payments, type Refund } from '@/mock/money';
import { fmtAmt } from '../../components/shared';

export interface RequestDrawerProps {
  open: boolean;
  onClose: () => void;
  onDone: (r: Refund) => void;
}

export function RequestDrawer({ open, onClose, onDone }: RequestDrawerProps) {
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
    <Drawer
      open={open}
      onClose={onClose}
      title="Request a refund"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Undo2 />}
            perm="payment.refund"
            level="REQ"
            disabled={!p || !a || !!tooMuch || !reason.trim()}
            onClick={() => {
              onDone({
                refundId: 70 + a,
                refundNo: 'RFD-DAR1-26-000072',
                paymentId: p!.paymentId,
                partyId: p!.partyId,
                currency: p!.currency,
                amount: m2(a),
                reason,
                status: two ? 'PENDING_L1' : 'APPROVED',
                requestedBy: ME,
                requestedAt: '2026-10-07T07:30:00Z',
                method,
                levels: two
                  ? [
                      { level: 1, who: APPROVERS.l1 },
                      { level: 2, who: APPROVERS.l2 },
                    ]
                  : [],
              });
              onClose();
              setAmt('');
              setReason('');
            }}
          >
            {two ? 'Request approval' : 'Request refund'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="From payment" required hint="Only money not allocated to invoices can be refunded">
          <Select
            value={pid}
            onChange={(e) => setPid(e.target.value)}
            options={candidates.map((c) => [
              String(c.paymentId),
              `${c.receiptNo} · ${partyName(c.partyId)} · ${fmtAmt(num(c.unallocated), c.currency)} on account`,
            ])}
          />
        </Field>
        <Field
          label={`Amount (${p?.currency ?? ''})`}
          required
          error={tooMuch ? `Only ${fmtAmt(num(p!.unallocated), p!.currency)} is on account.` : undefined}
        >
          <Input type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} />
        </Field>
        <Field label="Pay back by">
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={[
              'Bank transfer CRDB',
              'Bank transfer NMB',
              'M-Pesa',
              'Tigo Pesa',
              'Airtel Money',
              'Cash at counter',
            ]}
          />
        </Field>
        {a > 0 &&
          (two ? (
            <Banner tone="wait" title={`Needs two approvals: ${fmtAmt(LIMITS.refundApprovalUsd)} or more`}>
              Level 1: {APPROVERS.l1}. Level 2: {APPROVERS.l2}. Nobody can approve their own request.
            </Banner>
          ) : (
            <Banner tone="go" title="Under the approval limit">
              It goes straight to finance to pay out.
            </Banner>
          ))}
        <Field label="Reason" required>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Paid twice: by bank and by the agent"
          />
        </Field>
      </div>
    </Drawer>
  );
}
