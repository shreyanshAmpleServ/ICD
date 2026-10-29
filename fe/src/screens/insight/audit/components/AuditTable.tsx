import { Button, DataTable, Empty, Pill, Tag, fmtDT } from '@/ds/components';
import { AUDIT_SOURCES, type Audit as Entry } from '@/mock/insight';
import { ACTION, ENTITY } from './AuditToolbar';

export function AuditTable({
  rows,
  open,
  setOpen,
  onReset,
}: {
  rows: Entry[];
  open: Entry | null;
  setOpen: (e: Entry | null) => void;
  onReset: () => void;
}) {
  return (
    <DataTable
      rows={rows}
      rowKey={(e) => e.auditLogId}
      onRow={setOpen}
      selected={open?.auditLogId}
      empty={
        <Empty
          title="No entries match"
          action={
            <Button size="sm" onClick={onReset}>
              Clear filters
            </Button>
          }
        >
          Widen the dates or clear a filter.
        </Empty>
      }
      cols={[
        {
          key: 'at',
          header: 'When',
          width: 120,
          render: (e) => <span className="small nowrap">{fmtDT(e.occurredAt)}</span>,
        },
        {
          key: 'who',
          header: 'Who',
          render: (e) => (
            <span className="small">
              {e.userName}
              <div className="xs faint">{e.deviceId ? `device ${e.deviceId}` : e.ipAddress ?? ''}</div>
            </span>
          ),
        },
        {
          key: 'act',
          header: 'Action',
          render: (e) => <Pill tone={ACTION[e.action]?.[1] ?? 'idle'}>{ACTION[e.action]?.[0] ?? e.action}</Pill>,
        },
        {
          key: 'ent',
          header: 'Record',
          render: (e) => (
            <span className="small nowrap">
              {ENTITY(e.entityName)} <span className="faint">#{e.entityId}</span>
            </span>
          ),
        },
        {
          key: 'sum',
          header: 'What happened',
          render: (e) => (
            <span className="small">
              {e.summary}
              {e.changes && e.changes.length > 0 && (
                <span className="faint">
                  {' '}
                  · {e.changes.length} field{e.changes.length === 1 ? '' : 's'}
                </span>
              )}
            </span>
          ),
        },
        {
          key: 'src',
          header: 'Source',
          render: (e) => <Tag>{AUDIT_SOURCES.find(([k]) => k === e.source)?.[1]}</Tag>,
        },
      ]}
    />
  );
}
