import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Banknote, CheckCheck, FileSpreadsheet, Hourglass, Landmark, ShieldAlert, ShieldCheck, Siren, type LucideIcon } from 'lucide-react';
import { Button, Chips, Empty, Page, PageHeader, Panel, ago, cx, fmtDT, useToast } from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { at } from '@/mock/gen';
import { notifications, type Note } from '@/mock/cargo';

/* GET /me/inbox, POST /me/inbox:mark-read. In-app copies of the
   notifications rules send; each links to the thing it is about. */
type Quick = 'all' | 'unread' | 'action';
const ICON: Record<Note['kind'], [LucideIcon, string]> = {
  RELEASE: [BadgeCheck, 'var(--go)'], FREE_TIME: [Hourglass, 'var(--wait)'], EXCEPTION: [Siren, 'var(--stop)'], HOLD: [ShieldAlert, 'var(--stop)'],
  PAYMENT: [Banknote, 'var(--go)'], APPROVAL: [ShieldCheck, 'var(--wait)'], CUSTOMS: [Landmark, 'var(--customs)'], MANIFEST: [FileSpreadsheet, 'var(--ink-2)'],
};
const ACTION: Note['kind'][] = ['APPROVAL', 'EXCEPTION', 'FREE_TIME', 'HOLD'];

export function Inbox() {
  const toast = useToast();
  const { data = [] } = useQ(['inbox'], () => delay(notifications));
  const [read, setRead] = useState<Record<number, string>>({});
  const [quick, setQuick] = useState<Quick>('all');
  const list = data.map((n) => ({ ...n, readAt: n.readAt ?? read[n.notificationId] }));
  const unread = list.filter((n) => !n.readAt);
  const rows = list.filter((n) => quick === 'all' || (quick === 'unread' ? !n.readAt : ACTION.includes(n.kind)));
  const mark = (id: number) => setRead((r) => ({ ...r, [id]: at(0) }));

  return (
    <Page>
      <PageHeader title="Inbox" ms="M2" sub={unread.length ? `${unread.length} unread` : 'All read'}
        actions={<Button icon={<CheckCheck />} disabled={!unread.length} onClick={() => { setRead((r) => ({ ...r, ...Object.fromEntries(unread.map((n) => [n.notificationId, at(0)])) })); toast('All marked as read'); }}>Mark all read</Button>} />
      <Panel flush>
        <div className="toolbar">
          <Chips<Quick> value={quick} onChange={setQuick} options={[{ id: 'all', label: 'All', count: list.length }, { id: 'unread', label: 'Unread', count: unread.length }, { id: 'action', label: 'Needs action' }]} />
          <span className="spacer" />
          <Link className="small" to="/admin/notifications">Notification settings</Link>
        </div>
        {rows.length === 0 ? <Empty title={quick === 'unread' ? 'Nothing unread' : 'No notifications'}>New approvals, holds and expiring free time land here.</Empty> : (
          <ul className="list-plain" style={{ padding: 0 }}>
            {rows.map((n) => {
              const [Icon, color] = ICON[n.kind];
              return (
                <li key={n.notificationId} className={cx('row')} style={{ padding: '12px 16px', gap: 14, alignItems: 'flex-start', background: n.readAt ? undefined : 'var(--hivis-soft)' }}>
                  <span aria-hidden style={{ color, marginTop: 2 }}><Icon size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-wrap" style={{ gap: 8 }}>
                      {!n.readAt && <span className="sr-only">Unread.</span>}
                      {n.to ? <Link to={n.to} onClick={() => mark(n.notificationId)} className={n.readAt ? 'small' : 'small strong'} style={{ color: 'var(--ink)' }}>{n.subject}</Link> : <span className="small strong">{n.subject}</span>}
                      {!n.readAt && <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--hivis)', border: '1px solid var(--ink-3)' }} />}
                    </div>
                    <div className="small muted">{n.body}</div>
                    <div className="xs faint" title={fmtDT(n.createdAt)}>{ago(n.createdAt)}</div>
                  </div>
                  {!n.readAt && <Button size="sm" variant="ghost" onClick={() => mark(n.notificationId)}>Mark read</Button>}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
