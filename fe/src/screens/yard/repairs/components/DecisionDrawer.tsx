import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Drawer, Field, Input, Money, Segmented } from '@/ds/components';
import type { S } from '@/api/types';
import { repairName, type Estimate } from '@/mock/ops';

type L = S<'RepairEstimateLine'>;
const RESP: Record<string, string> = { OWNER: 'Line (owner)', USER: 'User (consignee)', DEPOT: 'Depot' };
const lineTotal = (l: L) => Number(l.labourCost ?? 0) + Number(l.materialCost ?? 0);

export interface DecisionDrawerProps {
  open: boolean;
  est: Estimate;
  lines: L[];
  onClose: () => void;
  onSave: (d: Record<number, 'APPROVED' | 'REJECTED'>, ref: string) => void;
}

export function DecisionDrawer({ open, est, lines, onClose, onSave }: DecisionDrawerProps) {
  const [dec, setDec] = useState<Record<number, 'APPROVED' | 'REJECTED'>>({});
  const [ref, setRef] = useState('');
  const all = lines.every((l) => dec[l.repairEstimateLineId!]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      title={`${est.lineCode} decision on ${est.estimateNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<CheckCircle2 />}
            perm="repair.estimate"
            disabled={!all || ref.trim().length < 3}
            onClick={() => {
              onSave(dec, ref);
              onClose();
            }}
          >
            Record decision
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Line's reference" required hint="From their reply email or EDI message">
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={`${est.lineCode}-MNR-0000`} />
        </Field>
        <div className="row-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDec(Object.fromEntries(lines.map((l) => [l.repairEstimateLineId!, 'APPROVED'])))}
          >
            Approve all
          </Button>
        </div>
        {lines.map((l) => (
          <div key={l.repairEstimateLineId} className="row-wrap panel" style={{ padding: 12, justifyContent: 'space-between' }}>
            <div style={{ minWidth: 200, flex: 1 }}>
              <strong className="small">
                {l.lineNo}. {repairName(l.repairCode)}
              </strong>
              <div className="xs muted">
                {l.locationDetail} · {RESP[l.responsibility ?? 'OWNER']} · <Money amount={lineTotal(l)} currency="USD" />
              </div>
            </div>
            <Segmented
              value={dec[l.repairEstimateLineId!] ?? ('' as 'APPROVED')}
              onChange={(v) => setDec((d) => ({ ...d, [l.repairEstimateLineId!]: v }))}
              options={[
                { id: 'APPROVED', label: 'Approved' },
                { id: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </div>
        ))}
        {!all && <p className="xs" style={{ color: 'var(--wait)' }}>Answer every line to record the decision.</p>}
      </div>
    </Drawer>
  );
}
