import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpCircle, CheckCircle2, MessageSquare, RotateCcw, UserPlus, XCircle } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, DL, Empty, Page, PageHeader, Panel, Pill, StatusPill, Textarea, Timeline, ago, fmtDT, useToast, type TLItem,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { at } from '@/mock/gen';
import { EXCEPTION_NAME, RESOLUTION_CODES, ROLE_NAME, SLA_MIN, allApprovals, allExceptions, entityLink, exceptionComments, hoursUntil, ME, type Cmt } from '@/mock/cargo';
import { Countdown } from '@/features/container-management/shared';
import { isOpen } from '../index';
import { AssignDrawer } from './AssignDrawer';
import { ResolveDrawer } from './ResolveDrawer';

type Ex = S<'ExceptionCase'>;
const KIND_TONE: Record<string, TLItem['tone']> = { SYSTEM: 'idle', COMMENT: 'info', ASSIGN: 'wait', ESCALATE: 'stop', STATUS: 'go' };

export function ExceptionDetailView() {
  const { exceptionCaseId } = useParams();
  const id = Number(exceptionCaseId);
  const toast = useToast();
  const { data: seed } = useQ(['exception', id], () => delay(allExceptions.find((e) => e.exceptionCaseId === id)));
  const [patch, setPatch] = useState<Partial<Ex>>({});
  const [comments, setComments] = useState<Cmt[]>(exceptionComments[id] ?? []);
  const [text, setText] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  if (!seed) return <Page><Empty title="Loading exception" action={<Link to="/exceptions">Back to exceptions</Link>} /></Page>;
  const e: Ex = { ...seed, ...patch };
  const open = isOpen(e);
  const [label, to] = entityLink(e.entityName, e.entityId, e.unitStayId);
  const apr = allApprovals.find((a) => a.approvalRequestId === e.approvalRequestId);
  const sla = SLA_MIN[e.exceptionCode];
  const add = (c: Omit<Cmt, 'exceptionCommentId' | 'createdAt' | 'createdBy'>) =>
    setComments((x) => [...x, { ...c, exceptionCommentId: 1000 + x.length, createdAt: at(0), createdBy: `Doc & clearance · ${ME}` }]);
  const items: TLItem[] = [...comments].reverse().map((c) => ({
    at: c.createdAt!,
    title: c.kind === 'COMMENT' ? c.createdBy : `${(c.kind ?? 'SYSTEM').charAt(0)}${(c.kind ?? '').slice(1).toLowerCase()}`,
    detail: c.text,
    by: c.kind === 'COMMENT' ? undefined : c.createdBy,
    tone: KIND_TONE[c.kind ?? 'SYSTEM'],
  }));

  return (
    <Page>
      <PageHeader
        crumbs={[['Exceptions', '/exceptions'], [e.caseNo ?? '']]}
        title={e.title}
        ms="M2"
        sub={
          <span className="row-wrap" style={{ marginTop: 6 }}>
            <StatusPill value={e.severity} />
            <StatusPill value={e.status} />
            <Pill tone="info">{EXCEPTION_NAME[e.exceptionCode] ?? e.exceptionCode}</Pill>
            <span className="small muted">
              {e.caseNo} · raised {ago(e.raisedAt)} by {e.raisedBy}
            </span>
          </span>
        }
        actions={
          open ? (
            <>
              <Button icon={<UserPlus />} perm="exception.manage" onClick={() => setAssignOpen(true)}>
                Assign
              </Button>
              <Button
                icon={<ArrowUpCircle />}
                perm="exception.manage"
                onClick={() => {
                  const lv = (e.escalationLevel ?? 0) + 1;
                  setPatch((p) => ({ ...p, escalationLevel: lv }));
                  add({ kind: 'ESCALATE', text: `Escalated by hand to level ${lv}.` });
                  toast(`Escalated to level ${lv}`);
                }}
              >
                Escalate
              </Button>
              <Button variant="primary" icon={<CheckCircle2 />} perm="exception.manage" onClick={() => setResolveOpen(true)}>
                Resolve
              </Button>
            </>
          ) : (
            <>
              {e.status === 'RESOLVED' && (
                <Button
                  variant="primary"
                  icon={<XCircle />}
                  perm="exception.manage"
                  onClick={() => {
                    setPatch((p) => ({ ...p, status: 'CLOSED', closedAt: at(0) }));
                    add({ kind: 'STATUS', text: 'Closed.' });
                    toast('Exception closed');
                  }}
                >
                  Close
                </Button>
              )}
              <Button
                icon={<RotateCcw />}
                perm="exception.manage"
                onClick={() => {
                  setPatch((p) => ({ ...p, status: 'IN_PROGRESS', resolvedAt: undefined, closedAt: undefined }));
                  add({ kind: 'STATUS', text: 'Reopened.' });
                  toast('Exception reopened');
                }}
              >
                Reopen
              </Button>
            </>
          )
        }
      />

      <div className="stack-lg">
        {open && e.isOverdue && (
          <Banner tone="stop" title={`Overdue: SLA was ${sla ? (sla >= 60 ? `${sla / 60} h` : `${sla} min`) : 'set by type'}`}>
            It escalates one level each time the SLA passes again. Now at level {e.escalationLevel}.
          </Banner>
        )}
        {!open && (
          <Banner
            tone="go"
            title={`${e.status === 'CLOSED' ? 'Closed' : 'Resolved'}: ${RESOLUTION_CODES.find(([k]) => k === e.resolutionCode)?.[1] ?? e.resolutionCode ?? ''
              }`}
          >
            {e.resolutionNote ?? 'No note.'}
          </Banner>
        )}

        <div className="grid-main-side">
          <div className="stack-lg">
            <Panel title="What happened">
              <p className="small" style={{ margin: 0 }}>
                {e.description ?? 'No further detail was recorded when it was raised.'}
              </p>
              <div style={{ marginTop: 12 }}>
                <DL
                  cols
                  items={[
                    ['On', to ? <Link to={to}>{label}</Link> : label],
                    ['Raised', `${fmtDT(e.raisedAt)} · ${e.raisedBy}`],
                    ['Approval', apr ? <Link to="/approvals">{apr.requestNo} · {apr.status?.toLowerCase()}</Link> : null],
                    ['Hold placed', e.holdId ? `Hold ${e.holdId}` : null],
                  ]}
                />
              </div>
            </Panel>
            <Panel title="Conversation" sub="Comments, assignments and escalations, newest first">
              <div className="stack-lg">
                {open && (
                  <div className="stack" style={{ gap: 8 }}>
                    <Textarea
                      aria-label="Add a comment"
                      value={text}
                      onChange={(x) => setText(x.target.value)}
                      placeholder="What you did or found. Everyone assigned is notified."
                    />
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button
                        icon={<MessageSquare />}
                        perm="exception.view"
                        disabled={!text.trim()}
                        onClick={() => {
                          add({ kind: 'COMMENT', text });
                          setText('');
                          toast('Comment added');
                        }}
                      >
                        Add comment
                      </Button>
                    </div>
                  </div>
                )}
                {items.length ? <Timeline items={items} /> : <p className="small muted">No comments yet.</p>}
              </div>
            </Panel>
          </div>
          <div className="stack-lg">
            <Panel title="Ownership">
              <DL
                items={[
                  ['Team', ROLE_NAME[e.assignedRoleCode ?? ''] ?? e.assignedRoleCode],
                  ['Person', e.assignedTo ?? <span className="faint">Not assigned</span>],
                  ['Escalation', e.escalationLevel ? <Pill key="e" tone="wait">Level {e.escalationLevel}</Pill> : 'None'],
                ]}
              />
            </Panel>
            <Panel title="Time">
              <DL
                items={[
                  ['SLA', sla ? (sla >= 60 ? `${sla / 60} hours` : `${sla} minutes`) : '—'],
                  ['Due', fmtDT(e.dueAt)],
                  [
                    'Left',
                    open && e.dueAt ? (
                      <Countdown key="c" hours={hoursUntil(e.dueAt)} label={hoursUntil(e.dueAt) < 0 ? 'due' : 'in'} />
                    ) : (
                      '—'
                    ),
                  ],
                  ['Resolved', fmtDT(e.resolvedAt)],
                  ['Closed', fmtDT(e.closedAt)],
                ]}
              />
            </Panel>
          </div>
        </div>
      </div>

      <AssignDrawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        initialRole={e.assignedRoleCode}
        onAssign={(who) => {
          setPatch((p) => ({ ...p, assignedTo: who, status: 'ASSIGNED' }));
          add({ kind: 'ASSIGN', text: `Assigned to ${who}.` });
          toast(`Assigned to ${who}`);
        }}
      />

      <ResolveDrawer
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onDone={(code, note) => {
          setPatch((p) => ({
            ...p,
            status: 'RESOLVED',
            resolutionCode: code,
            resolutionNote: note,
            resolvedAt: at(0),
            isOverdue: false,
          }));
          add({ kind: 'STATUS', text: `Resolved: ${RESOLUTION_CODES.find(([k]) => k === code)?.[1]}. ${note}` });
          toast('Exception resolved');
        }}
      />
    </Page>
  );
}
