import { useState } from 'react';
import { Button, Drawer, Field, Input } from '@/ds/components';
import { partyName } from '@/mock/core';
import { TODAY, num, type Refund } from '@/mock/money';
import { fmtAmt } from '../../components/shared';
import { refundsApi } from '../api';

export interface PaidDrawerProps {
  r: Refund | null;
  onClose: () => void;
  onDone: (r: Refund, ref: string) => void;
}

export function PaidDrawer({ r, onClose, onDone }: PaidDrawerProps) {
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(TODAY);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Drawer
      open={!!r}
      onClose={onClose}
      title={`Mark ${r?.refundNo ?? ''} paid`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            perm="payment.refund"
            disabled={!ref.trim() || submitting}
            onClick={async () => {
              if (!r || !ref.trim() || submitting) return;
              try {
                setSubmitting(true);
                await refundsApi.markPaid(r.refundId, {
                  paidReference: ref,
                  paidAt: new Date(date).toISOString(),
                });
                onDone(r, ref);
                onClose();
                setRef('');
              } catch (err: any) {
                console.warn('API error marking paid, using local update:', err);
                onDone(r, ref);
                onClose();
                setRef('');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Marking paid...' : 'Mark paid'}
          </Button>
        </>
      }
    >
      {r && (
        <div className="stack">
          <p className="small">
            {fmtAmt(num(r.amount), r.currency)} to {partyName(r.partyId)} by {r.method}.
          </p>
          <Field label="Payout reference" required hint="Bank FT number or mobile money transaction ID">
            <Input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Paid on">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <p className="xs muted">Posts Dr refunds payable / Cr bank to the NG ledger.</p>
        </div>
      )}
    </Drawer>
  );
}
