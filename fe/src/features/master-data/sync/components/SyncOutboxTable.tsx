import { RotateCcw } from 'lucide-react';
import { Button, Chips, DataTable, Panel, Pill, StatusPill, ago } from '@/ds/components';
import { outbox as seedOutbox } from '@/mock/admin';

type Ob = (typeof seedOutbox)[number];
const DEST: Record<string, string> = {
  NG_EVENTS: 'NG events',
  NG_BILLING: 'NG Billing',
  NOTIFY: 'Notifications',
  ERP: 'ERP',
};

export function SyncOutboxTable({
  ob,
  filter,
  problems,
  onFilterChange,
  onRetry,
}: {
  ob: Ob[];
  filter: 'all' | 'problem' | 'PENDING' | 'SENT';
  problems: Ob[];
  onFilterChange: (f: 'all' | 'problem' | 'PENDING' | 'SENT') => void;
  onRetry: (o: Ob) => void;
}) {
  const filtered = ob.filter((o) =>
    filter === 'all' ? true : filter === 'problem' ? o.status === 'FAILED' || o.status === 'DEAD' : o.status === filter
  );

  return (
    <Panel
      flush
      title="Outbox"
      sub="Every business event is written with the change that caused it, then delivered to each destination separately"
    >
      <div className="toolbar">
        <Chips
          value={filter}
          onChange={onFilterChange}
          options={[
            { id: 'problem', label: 'Failed', count: problems.length },
            { id: 'PENDING', label: 'Waiting', count: ob.filter((o) => o.status === 'PENDING').length },
            { id: 'SENT', label: 'Sent' },
            { id: 'all', label: 'All' },
          ]}
        />
      </div>
      <DataTable
        rows={filtered}
        rowKey={(o) => `${o.id}-${o.destination}`}
        empty={<p className="small muted" style={{ padding: 16 }}>Nothing here. Pick another filter.</p>}
        cols={[
          {
            key: 'e',
            header: 'Event',
            render: (o) => (
              <>
                <span className="adm-code">{o.eventType}</span>
                <div className="xs faint">
                  #{o.id} · {o.aggregate}
                </div>
              </>
            ),
          },
          { key: 'd', header: 'To', render: (o) => DEST[o.destination] },
          { key: 'w', header: 'Happened', render: (o) => <span className="small">{ago(o.occurredAt)}</span> },
          {
            key: 's',
            header: 'Status',
            render: (o) => (o.status === 'DEAD' ? <Pill tone="stop">Gave up</Pill> : <StatusPill value={o.status} />),
          },
          { key: 'n', header: 'Tries', num: true, render: (o) => o.attempts },
          {
            key: 'r',
            header: 'Detail',
            render: (o) =>
              o.lastError ? (
                <span className="small" style={{ color: o.status === 'PENDING' ? 'var(--ink-2)' : 'var(--stop)' }}>
                  {o.lastError}
                </span>
              ) : (
                <span className="small muted">{o.responseRef ?? ''}</span>
              ),
          },
          {
            key: 'a',
            header: '',
            render: (o) =>
              o.status === 'FAILED' || o.status === 'DEAD' ? (
                <Button size="sm" icon={<RotateCcw />} perm="integration.monitor" onClick={() => onRetry(o)}>
                  Retry
                </Button>
              ) : null,
          },
        ]}
      />
    </Panel>
  );
}
