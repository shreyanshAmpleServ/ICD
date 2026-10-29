import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import {
  Button, DL, DataTable, Drawer, Empty, Input, Page, PageHeader, Panel, Pill, SearchInput, Select, Tag, fmtDT, useToast,
} from '@/ds/components';
import type { Tone } from '@/ds/status';
import { useQ, delay } from '@/api/query';
import { SITES } from '@/app/session';
import { AUDIT_ACTIONS, AUDIT_SOURCES, auditLog, type Audit as Entry } from '@/mock/insight';

/* Audit trail: GET /audit with filters. Append-only; nobody can edit it.
   Field-level changes show old → new. Exporting the trail is itself logged. */
const ACTION: Record<string, [string, Tone]> = {
  CREATE: ['Create', 'info'], UPDATE: ['Update', 'info'], DELETE: ['Delete', 'stop'], APPROVE: ['Approve', 'go'], REJECT: ['Reject', 'stop'],
  OVERRIDE: ['Override', 'wait'], PRINT: ['Print', 'idle'], EXPORT: ['Export', 'idle'], SYNC: ['Sync', 'idle'], VIEW_SENSITIVE: ['Viewed sensitive', 'wait'],
  LOGIN: ['Sign in', 'idle'], LOGOUT: ['Sign out', 'idle'],
};
const ENTITY = (e: string) => e.replace(/_/g, ' ');
const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

export function Audit() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [action, setAction] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [entity, setEntity] = useState('ALL');
  const [from, setFrom] = useState('2026-10-01');
  const [to, setTo] = useState('2026-10-07');
  const [open, setOpen] = useState<Entry | null>(null);
  const { data = [] } = useQ(['audit'], () => delay(auditLog));
  const entities = Array.from(new Set(data.map((e) => e.entityName))).sort();

  const rows = data.filter((e) => {
    const d = e.occurredAt.slice(0, 10);
    if (d < from || d > to) return false;
    if (action !== 'ALL' && e.action !== action) return false;
    if (source !== 'ALL' && e.source !== source) return false;
    if (entity !== 'ALL' && e.entityName !== entity) return false;
    if (q) {
      const n = q.toLowerCase();
      return [e.userName, e.summary, e.entityId, e.reason, e.ipAddress].some((x) => (x ?? '').toLowerCase().includes(n));
    }
    return true;
  });
  const reset = () => { setQ(''); setAction('ALL'); setSource('ALL'); setEntity('ALL'); setFrom('2026-09-01'); setTo('2026-10-07'); };

  return (
    <Page>
      <PageHeader title="Audit trail" ms="M0" sub="Who did what, when, from where. Entries cannot be changed or deleted."
        actions={<Button icon={<Download />} perm="admin.audit.view" onClick={() => toast(`Audit export started (${rows.length} entries) · the export is logged too`)}>Export</Button>} />
      <Panel flush>
        <div className="toolbar">
          <div style={{ width: 260, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Person, record number, IP" aria-label="Search the audit trail" /></div>
          <Select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)} options={[['ALL', 'All actions'], ...AUDIT_ACTIONS.map((a) => [a, ACTION[a][0]] as [string, string])]} />
          <Select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)} options={[['ALL', 'All sources'], ...AUDIT_SOURCES.map(([k, l]) => [k, l] as [string, string])]} />
          <Select aria-label="Record type" value={entity} onChange={(e) => setEntity(e.target.value)} options={[['ALL', 'All record types'], ...entities.map((x) => [x, ENTITY(x)] as [string, string])]} />
          <span className="row" style={{ gap: 6 }}>
            <Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="small muted">to</span>
            <Input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} />
          </span>
          <span className="spacer" />
          <span className="small muted">{rows.length} of {data.length}</span>
        </div>
        <DataTable rows={rows} rowKey={(e) => e.auditLogId} onRow={setOpen} selected={open?.auditLogId}
          empty={<Empty title="No entries match" action={<Button size="sm" onClick={reset}>Clear filters</Button>}>Widen the dates or clear a filter.</Empty>}
          cols={[
            { key: 'at', header: 'When', width: 120, render: (e) => <span className="small nowrap">{fmtDT(e.occurredAt)}</span> },
            { key: 'who', header: 'Who', render: (e) => <span className="small">{e.userName}<div className="xs faint">{e.deviceId ? `device ${e.deviceId}` : e.ipAddress ?? ''}</div></span> },
            { key: 'act', header: 'Action', render: (e) => <Pill tone={ACTION[e.action][1]}>{ACTION[e.action][0]}</Pill> },
            { key: 'ent', header: 'Record', render: (e) => <span className="small nowrap">{ENTITY(e.entityName)} <span className="faint">#{e.entityId}</span></span> },
            { key: 'sum', header: 'What happened', render: (e) => <span className="small">{e.summary}{e.changes && e.changes.length > 0 && <span className="faint"> · {e.changes.length} field{e.changes.length === 1 ? '' : 's'}</span>}</span> },
            { key: 'src', header: 'Source', render: (e) => <Tag>{AUDIT_SOURCES.find(([k]) => k === e.source)?.[1]}</Tag> },
          ]} />
      </Panel>

      <Drawer open={!!open} onClose={() => setOpen(null)} title="Audit entry" wide>
        {open && (
          <div className="stack-lg">
            <div className="row-wrap"><Pill tone={ACTION[open.action][1]}>{ACTION[open.action][0]}</Pill><strong>{open.summary}</strong></div>
            <DL items={[
              ['When', fmtDT(open.occurredAt)],
              ['Who', `${open.userName} (${open.userSub})`],
              ['Record', open.to ? <Link to={open.to}>{ENTITY(open.entityName)} #{open.entityId}</Link> : `${ENTITY(open.entityName)} #${open.entityId}`],
              ['Source', AUDIT_SOURCES.find(([k]) => k === open.source)?.[1]],
              ['Site', SITES.find((s) => s.siteId === open.siteId)?.siteName ?? 'All sites'],
              ['Device', open.deviceId ? `Device ${open.deviceId}` : '—'],
              ['IP address', open.ipAddress ?? '—'],
              ['Reason given', open.reason ?? '—'],
              ['Entry number', String(open.auditLogId)],
            ]} />
            <Panel flush title="Field changes">
              <DataTable rows={open.changes ?? []} rowKey={(c) => c.field} empty={<p className="small muted" style={{ padding: 16, margin: 0 }}>No fields changed (a view, print or export).</p>} cols={[
                { key: 'f', header: 'Field', render: (c) => <span className="cond strong">{c.field}</span> },
                { key: 'o', header: 'Before', render: (c) => <span className="diff-old small">{show(c.old)}</span> },
                { key: 'n', header: 'After', render: (c) => <span className="diff-new small">{show(c.new)}</span> },
              ]} />
            </Panel>
          </div>
        )}
      </Drawer>
    </Page>
  );
}
