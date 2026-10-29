import { useState } from 'react';
import {
  Chips, DataTable, Empty, Kpi, Page, PageHeader, Panel, Pill, Select, UnitNo, ago, fmtDT, useToast, NOW,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { SR_KINDS, serviceRequests, type SR } from '@/mock/insight';
import { RespondDrawer } from './RespondDrawer';

type Status = NonNullable<SR['status']>;
type Q = 'open' | 'overdue' | 'NEEDS_INFO' | 'done' | 'all';
type Act = 'IN_REVIEW' | 'NEEDS_INFO' | 'APPROVED' | 'REJECTED' | 'CLOSED';
const OPEN: Status[] = ['SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO'];
const isOverdue = (r: SR) => OPEN.includes(r.status!) && r.status !== 'NEEDS_INFO' && Date.parse(r.slaDueAt) < NOW.getTime();
const STATUS_LABEL: Record<Status, string> = {
  SUBMITTED: 'New',
  IN_REVIEW: 'In review',
  NEEDS_INFO: 'Waiting for customer',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

function Sla({ r }: { r: SR }) {
  if (!OPEN.includes(r.status!)) return <span className="small faint">Answered</span>;
  if (r.status === 'NEEDS_INFO') return <span className="small muted">Paused (waiting for customer)</span>;
  const mins = Math.round((Date.parse(r.slaDueAt) - NOW.getTime()) / 60000);
  if (mins < 0)
    return (
      <Pill tone="stop">
        {`Overdue ${Math.abs(mins) >= 60 ? `${Math.round(-mins / 60)} h` : `${-mins} min`}`}
      </Pill>
    );
  return (
    <span className="small">
      {mins >= 60 ? `${Math.round(mins / 60)} h left` : `${mins} min left`}
      <div className="xs faint">by {fmtDT(r.slaDueAt)}</div>
    </span>
  );
}

export function ServiceRequestsView() {
  const { userName } = useSession();
  const toast = useToast();
  const { data: seed = [] } = useQ(['service-requests'], () => delay(serviceRequests));
  const [edits, setEdits] = useState<Record<number, SR>>({});
  const list = seed.map((r) => edits[r.serviceRequestId!] ?? r);
  const [q, setQ] = useState<Q>('open');
  const [kind, setKind] = useState('ALL');
  const [openId, setOpenId] = useState<number | null>(null);
  const open = list.find((r) => r.serviceRequestId === openId) ?? null;

  const rows = list
    .filter((r) => {
      if (kind !== 'ALL' && r.requestKind !== kind) return false;
      if (q === 'open') return OPEN.includes(r.status!);
      if (q === 'overdue') return isOverdue(r);
      if (q === 'NEEDS_INFO') return r.status === 'NEEDS_INFO';
      if (q === 'done') return !OPEN.includes(r.status!);
      return true;
    })
    .sort(
      (a, b) =>
        Number(isOverdue(b)) - Number(isOverdue(a)) ||
        Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt)
    );

  const respond = (r: SR, act: Act, text: string) => {
    const now = NOW.toISOString();
    const msgs = [...r.messages, { from: 'staff' as const, who: userName, at: now, text }];
    if (act === 'APPROVED' && r.requestKind === 'FREE_DAY_EXTENSION')
      msgs.push({
        from: 'system',
        who: 'System',
        at: now,
        text: 'Approval request APR-26-00421 raised for billing.freeday.extend',
      });
    setEdits((e) => ({
      ...e,
      [r.serviceRequestId!]: {
        ...r,
        status: act,
        messages: msgs,
        assignedTo: r.assignedTo ?? userName,
        respondedAt: now,
      },
    }));
    toast(
      {
        IN_REVIEW: 'Reply sent',
        NEEDS_INFO: 'Question sent to the customer',
        APPROVED: 'Request approved',
        REJECTED: 'Request rejected',
        CLOSED: 'Request closed',
      }[act]
    );
  };

  return (
    <Page>
      <PageHeader
        title="Service requests"
        ms="M5"
        sub="Requests from the customer portal. Reply in plain words; the customer sees every reply."
      />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi
            label="Open"
            value={list.filter((r) => OPEN.includes(r.status!)).length}
            delta={`${list.filter((r) => r.status === 'SUBMITTED').length} not picked up`}
          />
          <Kpi
            label="Past reply-by time"
            value={list.filter(isOverdue).length}
            delta={list.some(isOverdue) ? 'Answer these first' : 'All on time'}
          />
          <Kpi
            label="Waiting for customer"
            value={list.filter((r) => r.status === 'NEEDS_INFO').length}
            delta="Clock paused"
          />
          <Kpi label="Answered within time" value={86} unit="%" delta="Last 30 days" />
        </div>
        <Panel flush>
          <div className="toolbar">
            <Chips<Q>
              value={q}
              onChange={setQ}
              options={[
                { id: 'open', label: 'Open', count: list.filter((r) => OPEN.includes(r.status!)).length },
                { id: 'overdue', label: 'Overdue', count: list.filter(isOverdue).length },
                {
                  id: 'NEEDS_INFO',
                  label: 'Waiting for customer',
                  count: list.filter((r) => r.status === 'NEEDS_INFO').length,
                },
                { id: 'done', label: 'Answered' },
                { id: 'all', label: 'All' },
              ]}
            />
            <Select
              aria-label="Request type"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              options={[
                ['ALL', 'All types'],
                ...Object.entries(SR_KINDS).map(([k, v]) => [k, `${v.label} (${v.slaHours} h)`] as [string, string]),
              ]}
            />
          </div>
          <DataTable
            rows={rows}
            rowKey={(r) => r.serviceRequestId!}
            onRow={(r) => setOpenId(r.serviceRequestId!)}
            selected={openId}
            empty={<Empty title="Nothing in this queue">New portal requests land in “Open”.</Empty>}
            cols={[
              {
                key: 'no',
                header: 'Request',
                render: (r) => (
                  <span>
                    <strong className="small">{r.subject}</strong>
                    <div className="xs faint">
                      {r.requestNo} · {ago(r.createdAt)}
                    </div>
                  </span>
                ),
              },
              { key: 'k', header: 'Type', render: (r) => <span className="small">{SR_KINDS[r.requestKind].label}</span> },
              { key: 'p', header: 'From', render: (r) => <span className="small">{r.partyName}</span> },
              {
                key: 'u',
                header: 'Unit / BL',
                render: (r) => (r.unitNo ? <UnitNo no={r.unitNo} /> : <span className="small">{r.consignmentRef ?? '—'}</span>),
              },
              {
                key: 's',
                header: 'Status',
                render: (r) => (
                  <Pill
                    tone={
                      r.status === 'SUBMITTED'
                        ? 'info'
                        : r.status === 'NEEDS_INFO'
                        ? 'wait'
                        : r.status === 'APPROVED'
                        ? 'go'
                        : r.status === 'REJECTED'
                        ? 'stop'
                        : r.status === 'IN_REVIEW'
                        ? 'wait'
                        : 'idle'
                    }
                  >
                    {STATUS_LABEL[r.status!]}
                  </Pill>
                ),
              },
              { key: 'sla', header: 'Reply by', render: (r) => <Sla r={r} /> },
              {
                key: 'a',
                header: 'Handler',
                render: (r) => <span className="small">{r.assignedTo ?? <span className="faint">Nobody yet</span>}</span>,
              },
            ]}
          />
        </Panel>
      </div>
      <RespondDrawer r={open} onClose={() => setOpenId(null)} onRespond={respond} />
    </Page>
  );
}
