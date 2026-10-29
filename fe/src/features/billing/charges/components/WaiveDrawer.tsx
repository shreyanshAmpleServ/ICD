import { useState } from 'react';
import { Percent } from 'lucide-react';
import { Button, Drawer, Field, Input, Money, Segmented, Textarea } from '@/ds/components';
import { LIMITS, num, type ChargeRow } from '@/mock/money';
import { ApprovalPath, fmtAmt, useOwnLimit } from '../../components/shared';

export type Row = Omit<ChargeRow, 'status'> & { status: ChargeRow['status'] | 'MANUAL_PENDING' | 'WAIVER' };

export function WaiveDrawer({
  open,
  onClose,
  rows,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  rows: Row[];
  onDone: (applied: boolean, pct: number, reason: string) => void;
}) {
  const [mode, setMode] = useState<'FULL' | 'PCT'>('PCT');
  const [pct, setPct] = useState('25');
  const [reason, setReason] = useState('');
  const own = useOwnLimit('billing.waiver');
  const base = rows.reduce((a, r) => a + num(r.amount), 0);
  const p = mode === 'FULL' ? 100 : Math.min(100, Math.max(0, Number(pct) || 0));
  const amt = (base * p) / 100;
  const applies = amt < LIMITS.waiverTwoLevelsUsd && amt <= own;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Waive or discount charges"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Percent />}
            perm="billing.waiver"
            level="REQ"
            disabled={!reason.trim() || amt <= 0}
            onClick={() => {
              onDone(applies, p, reason);
              onClose();
              setReason('');
            }}
          >
            {applies ? 'Waive charges' : 'Request approval'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="small muted">
          {rows.length} charge{rows.length === 1 ? '' : 's'} selected, {fmtAmt(base)} before VAT. A waiver adds a credit
          line against each charge; the rated charge itself is kept.
        </p>
        <Segmented
          value={mode}
          onChange={setMode}
          label="Waiver type"
          options={[
            { id: 'PCT', label: 'Discount %' },
            { id: 'FULL', label: 'Waive in full' },
          ]}
        />
        {mode === 'PCT' && (
          <Field label="Discount" hint="Percent of each selected charge">
            <Input
              type="number"
              min={1}
              max={100}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              style={{ maxWidth: 140 }}
            />
          </Field>
        )}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">Amount waived</span>
          <Money amount={amt} currency="USD" strong />
        </div>
        <ApprovalPath amountUsd={amt} ownLimit={own} twoLevelFrom={LIMITS.waiverTwoLevelsUsd} what="waiver" />
        <Field label="Reason" required hint="The approver and the customer statement see this">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customs exam delayed by depot equipment breakdown"
          />
        </Field>
        <div className="table-wrap" style={{ maxHeight: 240 }}>
          <table className="dt" style={{ fontSize: 12 }}>
            <tbody>
              {rows.slice(0, 40).map((r) => (
                <tr key={r.chargeId}>
                  <td>{r.unitNo ?? '—'}</td>
                  <td>{r.description}</td>
                  <td className="num">
                    <Money amount={r.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}
