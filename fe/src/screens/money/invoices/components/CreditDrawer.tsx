import { useState } from 'react';
import { FileMinus2 } from 'lucide-react';
import { Button, Drawer, Field, Input, Money, Textarea, useToast } from '@/ds/components';
import { LIMITS, num, type Invoice } from '@/mock/money';
import { ApprovalPath, DualAmount, useOwnLimit } from '../../components/shared';

export function CreditDrawer({
  open,
  onClose,
  inv,
}: {
  open: boolean;
  onClose: () => void;
  inv: Invoice;
}) {
  const toast = useToast();
  const own = useOwnLimit('billing.creditnote');
  const [amt, setAmt] = useState<Record<number, string>>({});
  const [reason, setReason] = useState('');
  const total = inv.lines.reduce((a, l) => a + (Number(amt[l.lineNo]) || 0) * (1 + num(l.taxRatePct) / 100), 0);
  const usd = inv.currency === 'USD' ? total : total / num(inv.exchangeRate);
  const applies = usd < LIMITS.creditNoteTwoLevelsUsd && usd <= own;

  return (
    <Drawer
      wide
      open={open}
      onClose={onClose}
      title={`Credit note against ${inv.invoiceNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<FileMinus2 />}
            perm="billing.creditnote"
            level="REQ"
            disabled={!reason.trim() || total <= 0}
            onClick={() => {
              onClose();
              toast(applies ? 'Credit note CN-DAR1-26-000213 issued' : 'Credit note requested for approval');
            }}
          >
            {applies ? 'Issue credit note' : 'Request approval'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="small muted">
          A posted invoice is never changed. The credit note points to it, gets its own fiscal receipt and reduces the
          balance. Enter the amount to credit per line, before VAT.
        </p>
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Line</th>
                <th className="num">Billed</th>
                <th className="num" style={{ width: 140 }}>
                  Credit ({inv.currency})
                </th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.lineNo}>
                  <td className="small">
                    {l.unitNo ? `${l.unitNo} · ` : ''}
                    {l.description}
                  </td>
                  <td className="num">
                    <Money amount={l.amount} />
                  </td>
                  <td className="num">
                    <Input
                      aria-label={`Credit for line ${l.lineNo}`}
                      type="number"
                      min={0}
                      max={num(l.amount)}
                      step="0.01"
                      value={amt[l.lineNo] ?? ''}
                      placeholder="0.00"
                      onChange={(e) =>
                        setAmt((a) => ({
                          ...a,
                          [l.lineNo]: String(Math.min(num(l.amount), Number(e.target.value) || 0)),
                        }))
                      }
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">Credit including VAT</span>
          <DualAmount amount={total} currency={inv.currency} rate={num(inv.exchangeRate)} strong />
        </div>
        <ApprovalPath amountUsd={usd} ownLimit={own} twoLevelFrom={LIMITS.creditNoteTwoLevelsUsd} what="credit note" />
        <Field label="Reason" required hint="Printed on the credit note">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Storage days 12–14 waived: depot equipment breakdown"
          />
        </Field>
      </div>
    </Drawer>
  );
}
