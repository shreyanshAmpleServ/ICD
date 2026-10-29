import { Lock, LockOpen } from 'lucide-react';
import { Banner, Button, Field, Modal, Textarea } from '@/ds/components';
import type { Period } from '@/mock/money';

export interface PeriodCloseModalProps {
  closing: Period | null;
  onCloseClosing: () => void;
  onConfirmClose: (p: Period) => void;
  hasBlockingPostings: boolean;
  blockingCount: number;

  reopen: Period | null;
  onCloseReopen: () => void;
  onConfirmReopen: (p: Period) => void;
}

export function PeriodCloseModal({
  closing,
  onCloseClosing,
  onConfirmClose,
  hasBlockingPostings,
  blockingCount,
  reopen,
  onCloseReopen,
  onConfirmReopen,
}: PeriodCloseModalProps) {
  return (
    <>
      <Modal
        open={!!closing}
        onClose={onCloseClosing}
        title={closing ? `Close ${closing.periodKey}?` : ''}
        footer={
          closing && (
            <>
              <Button variant="ghost" onClick={onCloseClosing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<Lock />}
                perm="finance.period.close"
                disabled={hasBlockingPostings}
                onClick={() => {
                  onConfirmClose(closing);
                  onCloseClosing();
                }}
              >
                Close period
              </Button>
            </>
          )
        }
      >
        {closing &&
          (hasBlockingPostings ? (
            <Banner tone="stop" title="Can't close yet">
              {blockingCount} postings in this period are not in NG. Retry or fix them first.
            </Banner>
          ) : (
            <p className="small">
              No document can be posted with a date in {closing.periodKey} after this. Fiscal receipts are not affected.
              Reopening needs a reason and is logged.
            </p>
          ))}
      </Modal>

      <Modal
        open={!!reopen}
        onClose={onCloseReopen}
        title={reopen ? `Reopen ${reopen.periodKey}?` : ''}
        footer={
          <Button
            variant="primary"
            icon={<LockOpen />}
            perm="finance.period.close"
            onClick={() => {
              if (reopen) onConfirmReopen(reopen);
              onCloseReopen();
            }}
          >
            Reopen period
          </Button>
        }
      >
        <div className="stack">
          <Banner tone="wait">
            NG's ledger must also have the period open, or new postings for it will fail.
          </Banner>
          <Field label="Reason" required>
            <Textarea placeholder="e.g. Late credit note agreed with auditors" />
          </Field>
        </div>
      </Modal>
    </>
  );
}
