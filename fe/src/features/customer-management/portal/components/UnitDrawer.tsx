import { Banner, Button, Conditions, DL, Drawer, Money, Pill, UnitNo, fmtD, fmtDT, type Cond } from '@/ds/components';
import type { Stay } from '@/mock/core';
import { plainStatus, whyCantCollect, type Why } from '@/mock/insight';

export function UnitDrawer({
  s,
  onClose,
  onNext,
}: {
  s: Stay | null;
  onClose: () => void;
  onNext: (w: Why, s: Stay) => void;
}) {
  if (!s) return null;
  const p = plainStatus(s);
  const why = whyCantCollect(s);
  const blockers = why.filter((w) => w.ok === false);
  const items: Cond[] = why.map((w) => ({
    code: w.code,
    name: w.title,
    result: w.ok === null ? 'NOT_APPLIC' : w.ok ? 'PASS' : 'FAIL',
    detail: w.detail,
  }));
  const label = {
    pay: 'Pay charges',
    extend: 'Ask for more free days',
    request: s.customsStatus === 'NOT_LODGED' ? 'Send customs entry' : 'Request delivery',
    book: 'Book a truck',
    contact: 'Ask us about this hold',
  } as const;
  const actions = Array.from(
    new Set(
      why
        .filter((w) => w.next && (w.ok === false || (w.next === 'book' && blockers.length === 0)))
        .map((w) => w.next!)
    )
  );
  if (blockers.some((b) => b.code === 'COMMERCIAL') && (s.unitSummary.dwellDays ?? 0) > 7) actions.push('extend');

  return (
    <Drawer open onClose={onClose} title={<UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} size="md" />}>
      <div className="stack-lg">
        <div>
          <Pill tone={p.tone}>{p.label}</Pill>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            {s.unitSummary.consignmentRef} · {s.cargoDescription}
          </p>
        </div>
        {blockers.length === 0 ? (
          <Banner tone="go" title="You can collect this unit">
            Book a truck slot and bring the delivery order. The driver and truck must match the booking.
          </Banner>
        ) : (
          <Banner
            tone={blockers.some((b) => b.code === 'NO_HOLD') ? 'stop' : 'wait'}
            title={`Why can't I collect? ${blockers.length} thing${blockers.length === 1 ? '' : 's'} to sort out`}
          >
            Work through the items marked with a cross. We check again automatically as each one changes.
          </Banner>
        )}
        <Conditions items={items} />
        {actions.length > 0 && (
          <div className="stack">
            <h3>What you can do now</h3>
            {actions.map((a) => {
              const w = why.find((x) => x.next === a) ?? { code: 'X', ok: false, title: '', detail: '', next: a };
              return (
                <Button
                  key={a}
                  size="xl"
                  variant={a === actions[0] ? 'primary' : 'secondary'}
                  perm={a === 'book' ? 'appointment.book' : 'portal.request.submit'}
                  onClick={() => onNext({ ...w, next: a }, s)}
                >
                  {label[a]}
                </Button>
              );
            })}
          </div>
        )}
        <DL
          items={[
            ['Free time until', fmtD(s.freeUntil)],
            ['Charges so far', <Money key="m" amount={s.accruedCharges?.total} currency="USD" />],
            ['Arrived', fmtDT(s.gatedInAt)],
          ]}
        />
        <p className="xs faint" style={{ margin: 0 }}>
          Questions? Call customer service on +255 22 200 0000 or reply in “My requests”.
        </p>
      </div>
    </Drawer>
  );
}
