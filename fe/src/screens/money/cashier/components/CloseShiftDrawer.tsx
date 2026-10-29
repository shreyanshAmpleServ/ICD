import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Money, Textarea } from '@/ds/components';
import { num, type Shift } from '@/mock/money';
import { DiffBadge } from './DiffBadge';

export function CloseShiftDrawer({
  open,
  onClose,
  shifts: ss,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  shifts: Shift[];
  onDone: (c: Record<string, number>, note: string) => void;
}) {
  const [cnt, setCnt] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const diffs = ss.map((s) => ({
    s,
    d: (Number(cnt[s.currency] ?? '') || 0) - num(s.expectedCash),
    entered: cnt[s.currency] !== undefined && cnt[s.currency] !== '',
  }));
  const anyDiff = diffs.some((x) => x.entered && Math.abs(x.d) >= 0.005);
  const ready = diffs.every((x) => x.entered) && (!anyDiff || note.trim().length > 3);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Close shift and count cash"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<LockKeyhole />}
            perm="payment.record"
            disabled={!ready}
            onClick={() => {
              onDone(
                Object.fromEntries(ss.map((s) => [s.currency, Number(cnt[s.currency])])),
                note
              );
              onClose();
            }}
          >
            {anyDiff ? 'Close shift and send for approval' : 'Close shift'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p className="small muted">
          Count each drawer without looking at the expected figure first. It is shown after you enter the count.
        </p>
        {diffs.map(({ s, d, entered }) => (
          <div key={s.currency} className="panel" style={{ padding: 12 }}>
            <Field label={`Counted ${s.currency} cash`} required>
              <Input
                type="number"
                min={0}
                value={cnt[s.currency] ?? ''}
                onChange={(e) => setCnt((c) => ({ ...c, [s.currency]: e.target.value }))}
              />
            </Field>
            {entered && (
              <div className="row small" style={{ marginTop: 8 }}>
                <span className="muted spacer">
                  Expected <Money amount={s.expectedCash} currency={s.currency} />
                </span>
                <DiffBadge v={d} cur={s.currency} />
              </div>
            )}
          </div>
        ))}
        {anyDiff && (
          <Banner tone="wait" title="A difference needs approval">
            Your supervisor (cash-up approver) sees the shift with your note. Short cash may be recovered from the cashier
            per policy.
          </Banner>
        )}
        <Field label="Note" required={anyDiff} hint="Explain any difference">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  );
}
