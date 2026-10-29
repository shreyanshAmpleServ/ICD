import { Banner } from '@/ds/components';
import { EditDrawer } from '../../shared/AdminKit';
import type { periods as seedPeriods } from '@/mock/admin';

type Period = (typeof seedPeriods)[number];

interface PeriodDrawerProps {
  per: Period | null;
  onClose: () => void;
  onSave: (why?: string) => void;
}

export function PeriodDrawer({ per, onClose, onSave }: PeriodDrawerProps) {
  if (!per) return null;

  return (
    <EditDrawer
      open={!!per}
      onClose={onClose}
      title={per.status === 'OPEN' ? `Close ${per.periodKey}` : `Reopen ${per.periodKey}`}
      saveLabel={per.status === 'OPEN' ? 'Close period' : 'Reopen period'}
      perm="finance.period.close"
      danger={per.status === 'CLOSED'}
      reason={per.status === 'CLOSED' ? 'Reopening is reported to the auditor. Say what must be corrected.' : undefined}
      onSave={onSave}
    >
      {per.status === 'OPEN' ? (
        <>
          <p className="small">Checks before closing:</p>
          <Banner tone="go" title="All invoices in the period are posted">0 drafts or proformas dated in {per.periodKey}.</Banner>
          <Banner tone="wait" title="3 receipts are not allocated">USD 1,840 sits in unallocated receipts. You can close; they stay open into the next period.</Banner>
          <Banner tone="go" title="Fiscal receipts issued">Every posted invoice has a VFD receipt.</Banner>
        </>
      ) : (
        <Banner tone="wait">While reopened, back-dated postings land in {per.periodKey}. Close it again when done.</Banner>
      )}
    </EditDrawer>
  );
}
