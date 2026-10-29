import { Link } from 'react-router-dom';
import { DL, DataTable, Drawer, Panel, Pill, fmtDT } from '@/ds/components';
import { SITES } from '@/app/session';
import { AUDIT_SOURCES, type Audit as Entry } from '@/mock/insight';
import { ACTION, ENTITY } from './AuditToolbar';

export const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

export function AuditDetailDrawer({
  open,
  onClose,
}: {
  open: Entry | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!open} onClose={onClose} title="Audit entry" wide>
      {open && (
        <div className="stack-lg">
          <div className="row-wrap">
            <Pill tone={ACTION[open.action]?.[1] ?? 'idle'}>{ACTION[open.action]?.[0] ?? open.action}</Pill>
            <strong>{open.summary}</strong>
          </div>
          <DL
            items={[
              ['When', fmtDT(open.occurredAt)],
              ['Who', `${open.userName} (${open.userSub})`],
              [
                'Record',
                open.to ? (
                  <Link to={open.to}>
                    {ENTITY(open.entityName)} #{open.entityId}
                  </Link>
                ) : (
                  `${ENTITY(open.entityName)} #${open.entityId}`
                ),
              ],
              ['Source', AUDIT_SOURCES.find(([k]) => k === open.source)?.[1]],
              ['Site', SITES.find((s) => s.siteId === open.siteId)?.siteName ?? 'All sites'],
              ['Device', open.deviceId ? `Device ${open.deviceId}` : '—'],
              ['IP address', open.ipAddress ?? '—'],
              ['Reason given', open.reason ?? '—'],
              ['Entry number', String(open.auditLogId)],
            ]}
          />
          <Panel flush title="Field changes">
            <DataTable
              rows={open.changes ?? []}
              rowKey={(c) => c.field}
              empty={<p className="small muted" style={{ padding: 16, margin: 0 }}>No fields changed (a view, print or export).</p>}
              cols={[
                { key: 'f', header: 'Field', render: (c) => <span className="cond strong">{c.field}</span> },
                { key: 'o', header: 'Before', render: (c) => <span className="diff-old small">{show(c.old)}</span> },
                { key: 'n', header: 'After', render: (c) => <span className="diff-new small">{show(c.new)}</span> },
              ]}
            />
          </Panel>
        </div>
      )}
    </Drawer>
  );
}
