import { Play } from 'lucide-react';
import { Banner, Button, DataTable, Panel, Pill, StatusPill, ago, fmtDT } from '@/ds/components';
import { syncStates as seedSync } from '@/mock/admin';
import { AuditNote, label } from '../../shared/AdminKit';

type Sync = (typeof seedSync)[number];
const ENTITY: Record<string, string> = {
  party: 'Parties (customers, agents, lines)',
  truck: 'Trucks',
  driver: 'Drivers',
  vessel: 'Vessels',
};

export function SyncMasterTable({
  sync,
  running,
  onRun,
}: {
  sync: Sync[];
  running: string | null;
  onRun: (entityName: string) => void;
}) {
  return (
    <>
      {sync
        .filter((s) => s.lastStatus === 'FAILED')
        .map((s) => (
          <Banner
            key={s.entityName}
            tone="stop"
            title={`${label(s.entityName)} sync failed ${ago(s.lastRunAt)}`}
            action={
              <Button size="sm" icon={<Play />} perm="integration.monitor" onClick={() => onRun(s.entityName)}>
                Run now
              </Button>
            }
          >
            {s.lastError}
          </Banner>
        ))}
      <Panel
        flush
        title="Master data from NG"
        sub="Runs every 15 minutes and on demand; only rows changed since the last run are fetched"
      >
        <DataTable
          rows={sync}
          rowKey={(s) => s.entityName}
          cols={[
            { key: 'e', header: 'What', render: (s) => <strong>{ENTITY[s.entityName]}</strong> },
            {
              key: 'r',
              header: 'Last run',
              render: (s) => (
                <span className="small nowrap" title={fmtDT(s.lastRunAt)}>
                  {running === s.entityName ? 'Running…' : ago(s.lastRunAt)}
                </span>
              ),
            },
            {
              key: 's',
              header: 'Result',
              render: (s) => <StatusPill value={running === s.entityName ? 'IN_PROGRESS' : s.lastStatus} />,
            },
            { key: 'n', header: 'Rows last run', num: true, render: (s) => s.rowsLastRun ?? '—' },
            { key: 't', header: 'In NG ICD', num: true, render: (s) => s.total.toLocaleString() },
            {
              key: 'p',
              header: 'Provisional',
              num: true,
              render: (s) => (s.provisional ? <Pill tone="wait">{s.provisional}</Pill> : <span className="faint">0</span>),
            },
            {
              key: 'hw',
              header: 'Up to NG change',
              render: (s) => <span className="small muted">{fmtDT(s.lastUpdatedate)}</span>,
            },
            {
              key: 'err',
              header: 'Note',
              render: (s) =>
                s.lastStatus === 'PARTIAL' ? (
                  <span className="small" style={{ color: 'var(--wait)' }}>
                    {s.lastError}
                  </span>
                ) : null,
            },
            {
              key: 'a',
              header: '',
              render: (s) => (
                <Button
                  size="sm"
                  icon={<Play />}
                  perm="integration.monitor"
                  disabled={!!running}
                  onClick={() => onRun(s.entityName)}
                >
                  Run now
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      <AuditNote>Each run is logged with the rows it changed. Rows from NG cannot be edited here.</AuditNote>
    </>
  );
}
