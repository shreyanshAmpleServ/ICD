import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Banknote,
  FileSpreadsheet,
  Hourglass,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from 'lucide-react';
import { Button, ago, cx, fmtDT } from '@/ds/components';
import type { Note } from '@/mock/cargo';

export const INBOX_ICONS: Record<Note['kind'], [LucideIcon, string]> = {
  RELEASE: [BadgeCheck, 'var(--go)'],
  FREE_TIME: [Hourglass, 'var(--wait)'],
  EXCEPTION: [Siren, 'var(--stop)'],
  HOLD: [ShieldAlert, 'var(--stop)'],
  PAYMENT: [Banknote, 'var(--go)'],
  APPROVAL: [ShieldCheck, 'var(--wait)'],
  CUSTOMS: [Landmark, 'var(--customs)'],
  MANIFEST: [FileSpreadsheet, 'var(--ink-2)'],
};

export interface InboxNotificationItemProps {
  note: Note & { readAt?: string | null };
  onMarkRead: (id: number) => void;
}

export function InboxNotificationItem({ note, onMarkRead }: InboxNotificationItemProps) {
  const [Icon, color] = INBOX_ICONS[note.kind] ?? [BadgeCheck, 'var(--ink)'];

  return (
    <li
      className={cx('row')}
      style={{
        padding: '12px 16px',
        gap: 14,
        alignItems: 'flex-start',
        background: note.readAt ? undefined : 'var(--hivis-soft)',
      }}
    >
      <span aria-hidden style={{ color, marginTop: 2 }}>
        <Icon size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row-wrap" style={{ gap: 8 }}>
          {!note.readAt && <span className="sr-only">Unread.</span>}
          {note.to ? (
            <Link
              to={note.to}
              onClick={() => onMarkRead(note.notificationId)}
              className={note.readAt ? 'small' : 'small strong'}
              style={{ color: 'var(--ink)' }}
            >
              {note.subject}
            </Link>
          ) : (
            <span className="small strong">{note.subject}</span>
          )}
          {!note.readAt && (
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: 'var(--hivis)',
                border: '1px solid var(--ink-3)',
              }}
            />
          )}
        </div>
        <div className="small muted">{note.body}</div>
        <div className="xs faint" title={fmtDT(note.createdAt)}>
          {ago(note.createdAt)}
        </div>
      </div>
      {!note.readAt && (
        <Button size="sm" variant="ghost" onClick={() => onMarkRead(note.notificationId)}>
          Mark read
        </Button>
      )}
    </li>
  );
}
