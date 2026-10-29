import { Banner, Button, Drawer, Field, Textarea } from '@/ds/components';
import { partyName } from '@/mock/core';
import { APPROVERS, num } from '@/mock/money';
import { fmtAmt } from '../../components/shared';
import type { DisbRow } from './RecordDisbursementDrawer';

export interface WriteOffDrawerProps {
  wo: DisbRow | null;
  onClose: () => void;
  onRequest: (wo: DisbRow) => void;
}

export function WriteOffDrawer({ wo, onClose, onRequest }: WriteOffDrawerProps) {
  return (
    <Drawer
      open={!!wo}
      onClose={onClose}
      title={`Write off ${wo?.disbNo ?? ''}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            perm="finance.disbursement.record"
            level="REQ"
            onClick={() => {
              if (wo) onRequest(wo);
              onClose();
            }}
          >
            Request write-off
          </Button>
        </>
      }
    >
      {wo && (
        <div className="stack">
          <p className="small">
            {fmtAmt(num(wo.amountPaid), wo.currency)} paid to {wo.payeeName} for {partyName(wo.billToPartyId)} will
            not be re-billed. It posts to disbursement write-off expense.
          </p>
          <Banner tone="wait">
            A write-off always needs approval by {APPROVERS.l1.split(' · ')[0]} (finance manager).
          </Banner>
          <Field label="Reason" required>
            <Textarea placeholder="e.g. Customer disputes; port charge was caused by depot delay" />
          </Field>
        </div>
      )}
    </Drawer>
  );
}
