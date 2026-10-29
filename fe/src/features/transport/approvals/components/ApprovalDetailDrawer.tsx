import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, FileText, X } from 'lucide-react';
import {
  Banner, Button, DL, Drawer, Field, Money, Panel, Pill, StatusPill, Textarea, Timeline, useToast, type TLItem,
} from '@/ds/components';
import { at } from '@/mock/gen';
import { APPROVAL_LIMITS, entityLink, hoursUntil, type Apr } from '@/mock/cargo';
import { Countdown } from '@/features/container-management/shared';

const permLabel = (p: string) => APPROVAL_LIMITS[p]?.label ?? p;

export function ApprovalDetailDrawer({
  a,
  onClose,
  onDecide,
  onDelegate,
}: {
  a: Apr;
  onClose: () => void;
  onDecide: (p: Partial<Apr>) => void;
  onDelegate: () => void;
}) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const pending = a.status === 'PENDING';
  const [label, to] = entityLink(a.entityName, a.entityId);
  const lim = APPROVAL_LIMITS[a.permissionCode];
  const lvl = (a.currentLevel ?? 0) + 1;
  const why = a.mine
    ? 'You asked for this. Someone else must decide (maker-checker).'
    : !a.canDecide
    ? `Needs approve rights on ${a.permissionCode} at level ${lvl}. It is with someone else.`
    : null;

  const steps: TLItem[] = [
    { at: a.requestedAt!, title: `Requested by ${a.mine ? 'you' : a.requestedBy}`, detail: a.reason, tone: 'wait' },
    ...(a.steps ?? []).map((s) => ({
      at: s.decidedAt,
      title: `Level ${s.levelNo}: ${s.decision === 'APPROVE' ? 'approved' : 'rejected'} by ${s.decidedBy}${
        s.onBehalfOf ? ` for ${s.onBehalfOf}` : ''
      }`,
      detail: s.note,
      tone: s.decision === 'APPROVE' ? ('go' as const) : ('stop' as const),
    })),
  ];

  const decide = (d: 'APPROVE' | 'REJECT') => {
    setTried(true);
    if (d === 'REJECT' && !note.trim()) return;
    const step = { levelNo: lvl, decision: d, decidedBy: 'You', note: note || undefined, decidedAt: at(0) };
    const done = d === 'REJECT' || lvl >= (a.levelsRequired ?? 1);
    onDecide({
      steps: [...(a.steps ?? []), step],
      currentLevel: lvl,
      status: done ? (d === 'APPROVE' ? 'APPROVED' : 'REJECTED') : 'PENDING',
      canDecide: false,
      decidedAt: done ? at(0) : undefined,
    });
    toast(d === 'REJECT' ? 'Request rejected' : done ? 'Request approved' : `Level ${lvl} approved: sent to level ${lvl + 1}`);
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={a.summary}
      footer={
        pending ? (
          <>
            {why && <span className="xs muted spacer" role="note">{why}</span>}
            <Button
              variant="danger"
              icon={<X />}
              perm={a.permissionCode}
              level="APPR"
              disabled={!!why}
              title={why ?? undefined}
              onClick={() => decide('REJECT')}
            >
              Reject
            </Button>
            <Button
              variant="primary"
              icon={<Check />}
              perm={a.permissionCode}
              level="APPR"
              disabled={!!why}
              title={why ?? undefined}
              onClick={() => decide('APPROVE')}
            >
              {lvl < (a.levelsRequired ?? 1) ? `Approve level ${lvl}` : 'Approve'}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="stack-lg">
        <div className="row-wrap">
          <StatusPill value={a.status} />
          <Pill tone="info">{a.requestNo}</Pill>
          {pending && <Countdown hours={hoursUntil(a.expiresAt)} label="Expires in" />}
        </div>
        {a.mine && pending && (
          <Banner tone="wait" title="You asked for this">
            You can withdraw it, but you cannot approve it yourself, even with the permission.
          </Banner>
        )}
        <DL
          cols
          items={[
            ['What', permLabel(a.permissionCode)],
            ['On', to ? <Link to={to}>{label}</Link> : label],
            ['Amount', a.amount ? <Money amount={a.amount} currency={a.amountCurrency} /> : '—'],
            [
              'Limit',
              lim?.limit !== undefined ? `${a.amountCurrency ?? 'USD'} ${lim.limit.toLocaleString()}` : 'No amount limit',
            ],
            ['Levels', pending ? `Level ${lvl} of ${a.levelsRequired}` : `${a.levelsRequired}`],
            ['Asked by', a.mine ? 'You' : a.requestedBy],
          ]}
        />
        {lim && <p className="xs muted">Policy: {lim.levels}</p>}
        <Panel title="Why">
          <p className="small" style={{ margin: 0 }}>
            {a.reason}
          </p>
        </Panel>
        <Panel title="Evidence">
          {a.evidence?.length ? (
            <div className="grid-3">
              {a.evidence.map((e) => (
                <div key={e} className="photo">
                  <span className="row" style={{ gap: 4 }}>
                    <FileText size={12} />
                    {e}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              No files attached. Ask the requester if you need proof.
            </p>
          )}
        </Panel>
        <Panel title="History">
          <Timeline items={steps} />
        </Panel>
        {pending && !why && (
          <Field
            label="Note"
            hint="Required when rejecting; the requester sees it"
            error={tried && !note.trim() && 'Say why you reject, so they can fix it'}
          >
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        {pending && a.mine && (
          <div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onDecide({ status: 'CANCELLED' });
                toast('Request withdrawn');
                onClose();
              }}
            >
              Withdraw request
            </Button>
          </div>
        )}
        <p className="xs faint">
          Away?{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDelegate}>
            Delegate your approvals
          </button>{' '}
          to a colleague for a fixed period.
        </p>
      </div>
    </Drawer>
  );
}
