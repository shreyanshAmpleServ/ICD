import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Page, PageHeader, Panel, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { type Audit as Entry } from '@/mock/insight';
import { auditApi } from '../api';
import { AuditToolbar } from './AuditToolbar';
import { AuditTable } from './AuditTable';
import { AuditDetailDrawer } from './AuditDetailDrawer';

export function AuditView() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [action, setAction] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [entity, setEntity] = useState('ALL');
  const [from, setFrom] = useState('2026-10-01');
  const [to, setTo] = useState('2026-10-07');
  const [open, setOpen] = useState<Entry | null>(null);
  const { data = [] } = useQ(['audit'], () => auditApi.getAuditLog());
  const entities = Array.from(new Set(data.map((e: Entry) => e.entityName))).sort();

  const rows = data.filter((e: Entry) => {
    const d = e.occurredAt.slice(0, 10);
    if (d < from || d > to) return false;
    if (action !== 'ALL' && e.action !== action) return false;
    if (source !== 'ALL' && e.source !== source) return false;
    if (entity !== 'ALL' && e.entityName !== entity) return false;
    if (q) {
      const n = q.toLowerCase();
      return [e.userName, e.summary, e.entityId, e.reason, e.ipAddress].some((x) =>
        (x ?? '').toLowerCase().includes(n)
      );
    }
    return true;
  });

  const reset = () => {
    setQ('');
    setAction('ALL');
    setSource('ALL');
    setEntity('ALL');
    setFrom('2026-09-01');
    setTo('2026-10-07');
  };

  return (
    <Page>
      <PageHeader
        title="Audit trail"
        ms="M0"
        sub="Who did what, when, from where. Entries cannot be changed or deleted."
        actions={
          <Button
            icon={<Download />}
            perm="admin.audit.view"
            onClick={() =>
              toast(`Audit export started (${rows.length} entries) · the export is logged too`)
            }
          >
            Export
          </Button>
        }
      />
      <Panel flush>
        <AuditToolbar
          q={q}
          setQ={setQ}
          action={action}
          setAction={setAction}
          source={source}
          setSource={setSource}
          entity={entity}
          setEntity={setEntity}
          entities={entities}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          matchCount={rows.length}
          totalCount={data.length}
        />
        <AuditTable
          rows={rows}
          open={open}
          setOpen={setOpen}
          onReset={reset}
        />
      </Panel>

      <AuditDetailDrawer open={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
