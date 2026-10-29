import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { Banner, Button, DL, Drawer, Field, Panel, Segmented, StatusPill, Textarea, UnitNo, fmtDT } from '@/ds/components';
import { SR_KINDS, type SR } from '@/mock/insight';

type Status = NonNullable<SR['status']>;
type Act = 'IN_REVIEW' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED' | 'CLOSED';
const OPEN: Status[] = ['SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO'];

export function RespondDrawer({
  r,
  onClose,
  onRespond,
}: {
  r: SR | null;
  onClose: () => void;
  onRespond: (r: SR, a: Act, text: string) => void;
}) {
  const [act, setAct] = useState<Act>('IN_REVIEW');
  const [text, setText] = useState('');
  if (!r) return null;
  const closed = !OPEN.includes(r.status!);
  const needsText = text.trim().length < 5;
  const perm = 'portal.request.handle';
  const verb = {
    IN_REVIEW: 'Send reply',
    NEEDS_INFO: 'Ask for information',
    APPROVED: 'Approve request',
    REJECTED: 'Reject request',
    CLOSED: 'Close request',
  }[act];

  return (
    <Drawer
      open
      wide
      onClose={() => {
        setText('');
        onClose();
      }}
      title={r.subject}
      footer={
        closed ? (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant={act === 'REJECTED' ? 'danger' : 'primary'}
              icon={<Send />}
              disabled={needsText}
              perm={perm}
              onClick={() => {
                onRespond(r, act, text.trim());
                setText('');
                setAct('IN_REVIEW');
              }}
            >
              {verb}
            </Button>
          </>
        )
      }
    >
      <div className="stack-lg">
        <div className="row-wrap">
          <StatusPill value={r.status === 'SUBMITTED' ? 'PENDING' : r.status} />
        </div>
        <DL
          cols
          items={[
            ['Request', r.requestNo],
            ['Type', SR_KINDS[r.requestKind].label],
            ['From', <Link key="p" to={`/parties/${r.partyId}`}>{r.partyName}</Link>],
            ['Unit', r.unitNo ? <UnitNo key="u" no={r.unitNo} to={r.unitStayId ? `/units/${r.unitStayId}` : undefined} /> : '—'],
            ['Consignment', r.consignmentRef ?? '—'],
            ['Received', fmtDT(r.createdAt)],
            ...(r.payload && 'days' in r.payload ? [['Extra days asked', String(r.payload.days)] as [string, string]] : []),
          ]}
        />
        <Panel title="Conversation" sub="The customer sees everything here except system notes">
          <div className="thread">
            {r.messages.map((m, i) => (
              <div key={i} className={`msg msg-${m.from}`}>
                <div className="m-who">
                  {m.who} · {fmtDT(m.at)}
                </div>
                <div className="small">{m.text}</div>
              </div>
            ))}
          </div>
        </Panel>
        {!closed && (
          <div className="stack">
            <Field label="What do you want to do?">
              <Segmented<Act>
                label="Response"
                value={act}
                onChange={setAct}
                options={[
                  { id: 'IN_REVIEW', label: 'Reply' },
                  { id: 'NEEDS_INFO', label: 'Ask for info' },
                  { id: 'APPROVED', label: 'Approve' },
                  { id: 'REJECTED', label: 'Reject' },
                  { id: 'CLOSED', label: 'Close' },
                ]}
              />
            </Field>
            {act === 'APPROVED' && r.requestKind === 'FREE_DAY_EXTENSION' && (
              <Banner tone="wait" title="Approving raises an approval request">
                Free days change only after someone with billing.freeday.extend approves. The customer is told when it is
                decided.
              </Banner>
            )}
            {act === 'APPROVED' && r.requestKind === 'DELIVERY' && (
              <Banner tone="info">
                Approving creates a draft release order. Release checks still run; holds and unpaid charges still block the
                gate.
              </Banner>
            )}
            {act === 'NEEDS_INFO' && <Banner tone="info">The reply-by clock pauses until the customer answers.</Banner>}
            <Field
              label="Message to the customer"
              required
              hint="Plain words; the customer may read it on a phone, in English or Swahili."
              error={text.length > 0 && needsText ? 'Write at least a short sentence' : undefined}
            >
              <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
            </Field>
          </div>
        )}
      </div>
    </Drawer>
  );
}
