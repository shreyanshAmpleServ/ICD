import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { Button, Chips, Empty, Page, PageHeader, Panel, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { at } from '@/mock/gen';
import type { Note } from '@/mock/cargo';
import { inboxApi } from './api';
import { InboxNotificationItem } from './components/InboxNotificationItem';

export { inboxApi } from './api';

type Quick = 'all' | 'unread' | 'action';
const ACTION: Note['kind'][] = ['APPROVAL', 'EXCEPTION', 'FREE_TIME', 'HOLD'];

export function InboxView() {
  const toast = useToast();
  const { data = [] } = useQ(['inbox'], () => inboxApi.getNotifications());
  const [read, setRead] = useState<Record<number, string>>({});
  const [quick, setQuick] = useState<Quick>('all');

  const list = data.map((n) => ({ ...n, readAt: n.readAt ?? read[n.notificationId] }));
  const unread = list.filter((n) => !n.readAt);
  const rows = list.filter((n) => quick === 'all' || (quick === 'unread' ? !n.readAt : ACTION.includes(n.kind)));
  const mark = (id: number) => setRead((r) => ({ ...r, [id]: at(0) }));

  return (
    <Page>
      <PageHeader
        title="Inbox"
        ms="M2"
        sub={unread.length ? `${unread.length} unread` : 'All read'}
        actions={
          <Button
            icon={<CheckCheck />}
            disabled={!unread.length}
            onClick={() => {
              setRead((r) => ({
                ...r,
                ...Object.fromEntries(unread.map((n) => [n.notificationId, at(0)])),
              }));
              toast('All marked as read');
            }}
          >
            Mark all read
          </Button>
        }
      />
      <Panel flush>
        <div className="toolbar">
          <Chips<Quick>
            value={quick}
            onChange={setQuick}
            options={[
              { id: 'all', label: 'All', count: list.length },
              { id: 'unread', label: 'Unread', count: unread.length },
              { id: 'action', label: 'Needs action' },
            ]}
          />
          <span className="spacer" />
          <Link className="small" to="/admin/notifications">
            Notification settings
          </Link>
        </div>
        {rows.length === 0 ? (
          <Empty title={quick === 'unread' ? 'Nothing unread' : 'No notifications'}>
            New approvals, holds and expiring free time land here.
          </Empty>
        ) : (
          <ul className="list-plain" style={{ padding: 0 }}>
            {rows.map((n) => (
              <InboxNotificationItem key={n.notificationId} note={n} onMarkRead={mark} />
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}

export { InboxView as Inbox };
export default InboxView;
