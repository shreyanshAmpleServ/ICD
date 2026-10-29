import { useMemo, useState } from 'react';
import { CheckCircle2, ShieldQuestion, WifiOff } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Textarea, UnitNo, cx, useToast } from '@/ds/components';
import { useSession } from '@/app/session';
import { candidatesFor, checkSlot, type Move } from '@/mock/ops';

export interface CompleteDrawerProps {
  m: Move | null;
  onClose: () => void;
  onDone: (m: Move, toCode: string, rank: number | null, reason?: string) => void;
}

export function CompleteDrawer({ m, onClose, onDone }: CompleteDrawerProps) {
  const toast = useToast();
  const [choice, setChoice] = useState<number | 'other'>(1);
  const [other, setOther] = useState('');
  const [reason, setReason] = useState('');
  const [requested, setRequested] = useState(false);
  const [pending, setPending] = useState(false);
  const { can } = useSession();
  const cands = useMemo(() => (m ? candidatesFor(m) : []), [m]);

  if (!m) return null;
  const truck = m.moveKind === 'PICK_FOR_VISIT';
  const reset = () => {
    setChoice(1);
    setOther('');
    setReason('');
    setRequested(false);
    setPending(false);
    onClose();
  };

  if (truck) {
    return (
      <Drawer
        open
        onClose={reset}
        title={`Load ${m.unitNo} on ${m.plateNo}`}
        footer={
          <>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button
              size="xl"
              variant="primary"
              icon={<CheckCircle2 />}
              perm="yard.move.execute"
              onClick={() => {
                onDone(m, `Truck ${m.plateNo}`, null);
                reset();
              }}
            >
              Confirm loaded
            </Button>
          </>
        }
      >
        <div className="stack">
          <p>Check the number on the door matches before you let go of the box.</p>
          <UnitNo no={m.unitNo!} category={m.category} size="lg" />
          <p className="small muted">
            The gate lane sees the unit on the truck as soon as you confirm. The driver then goes to the inner gate out.
          </p>
        </div>
      </Drawer>
    );
  }

  const slot = choice === 'other' ? checkSlot(other) : null;
  const code = choice === 'other' ? other.trim().toUpperCase() : cands[choice - 1]?.fullCode;
  const outside = choice === 'other';
  const needsOverride = slot && (slot.state === 'FULL' || slot.state === 'BLOCKED');
  const ok = !!code && (!outside || (slot!.state !== 'INVALID' && reason.trim().length >= 5)) && (!needsOverride || requested);

  return (
    <Drawer
      open
      wide
      onClose={reset}
      title={`Place ${m.unitNo}`}
      footer={
        <>
          <Button variant="ghost" onClick={reset}>
            Cancel
          </Button>
          {needsOverride && !requested ? (
            <Button
              size="xl"
              icon={<ShieldQuestion />}
              perm="yard.move.override"
              disabled={reason.trim().length < 5 || pending}
              onClick={() => {
                if (can('yard.move.override', 'DO')) {
                  setRequested(true);
                  toast('Override recorded for this slot');
                } else {
                  setPending(true);
                  toast('Override requested from the yard planner');
                }
              }}
            >
              Override and use {code}
            </Button>
          ) : (
            <Button
              size="xl"
              variant="primary"
              icon={<CheckCircle2 />}
              perm="yard.move.execute"
              disabled={!ok}
              onClick={() => {
                onDone(
                  m,
                  code!,
                  outside ? null : (choice as number),
                  outside ? reason : choice !== 1 ? `Took rank ${choice}` : undefined
                );
                reset();
              }}
            >
              Placed at {code || '…'}
            </Button>
          )}
        </>
      }
    >
      <div className="stack">
        <p className="small muted">
          Where did you put it? Rank 1 is the best slot right now. Choosing another suggestion is fine; a slot that is
          not suggested needs a reason.
        </p>
        <div className="stack" role="radiogroup" aria-label="Suggested slots">
          {cands.map((c) => (
            <button
              key={c.rank}
              type="button"
              role="radio"
              aria-checked={choice === c.rank}
              onClick={() => setChoice(c.rank)}
              className={cx('btn', 'btn-xl')}
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                height: 'auto',
                padding: '12px 16px',
                borderColor: choice === c.rank ? 'var(--ink)' : undefined,
                borderWidth: choice === c.rank ? 2 : 1,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-cond)',
                  fontSize: 30,
                  fontWeight: 700,
                  minWidth: 34,
                }}
              >
                {c.rank}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="row-wrap" style={{ gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-cond)', fontSize: 24, fontWeight: 700 }}>{c.fullCode}</span>
                  <span className="xs muted">score {Number(c.score).toFixed(0)}</span>
                  {checkSlot(c.fullCode).tier && <span className="tag">tier {checkSlot(c.fullCode).tier}</span>}
                </span>
                <span className="row-wrap" style={{ gap: 6, marginTop: 4 }}>
                  {c.reasons.map((r) => (
                    <span key={r} className="tag">
                      {r}
                    </span>
                  ))}
                </span>
              </span>
              {choice === c.rank && <CheckCircle2 color="var(--go)" />}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={choice === 'other'}
            onClick={() => setChoice('other')}
            className={cx('btn', 'btn-xl')}
            style={{
              justifyContent: 'flex-start',
              borderColor: choice === 'other' ? 'var(--ink)' : undefined,
              borderWidth: choice === 'other' ? 2 : 1,
            }}
          >
            Another slot (not suggested)
          </button>
        </div>
        {outside && (
          <div className="stack">
            <Field
              label="Slot"
              required
              error={slot && slot.state === 'INVALID' && other ? slot.note : undefined}
              hint={slot && slot.state === 'FREE' ? slot.note : 'Block-row-bay, e.g. B-02-04'}
            >
              <Input
                xl
                value={other}
                onChange={(e) => {
                  setOther(e.target.value.toUpperCase());
                  setRequested(false);
                  setPending(false);
                }}
                placeholder="B-02-04"
                autoFocus
              />
            </Field>
            {needsOverride && (
              <Banner tone="stop" title={slot!.state === 'FULL' ? 'That stack is full' : 'That slot is blocked'}>
                {slot!.note}. Placing here needs a yard override (yard.move.override); an officer without it sends a
                request instead.
              </Banner>
            )}
            <Field label="Why not a suggested slot?" required>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Rank 1 blocked by a parked trailer"
              />
            </Field>
          </div>
        )}
        {requested && <Banner tone="go">Override recorded. Confirm the placement.</Banner>}
        {pending && (
          <Banner tone="wait" title="Waiting for the yard planner">
            Keep the unit on the machine or put it in a suggested slot. You get a message on the handheld when the
            planner decides.
          </Banner>
        )}
        <p className="xs faint row" style={{ gap: 4 }}>
          <WifiOff size={12} />
          Works offline: the completion is queued with the time you pressed it.
        </p>
      </div>
    </Drawer>
  );
}
