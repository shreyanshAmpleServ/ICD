import { DataTable, Panel, Pill, fmtDT } from '@/ds/components';
import { type ExportLog } from '@/mock/insight';

export function ExportLogTab({
  log,
}: {
  log: ExportLog[];
}) {
  return (
    <Panel
      flush
      title="Export log"
      sub="Every export and scheduled send. The full trail is in Audit trail with action “export”."
    >
      <DataTable
        rows={log}
        rowKey={(l) => l.id}
        cols={[
          { key: 'at', header: 'When', render: (l) => <span className="small nowrap">{fmtDT(l.at)}</span> },
          { key: 'r', header: 'Report', render: (l) => <strong className="small">{l.reportName}</strong> },
          {
            key: 'f',
            header: 'Format',
            render: (l) => <Pill tone="info">{l.format === 'XLSX' ? 'Excel' : l.format}</Pill>,
          },
          { key: 'p', header: 'Parameters', render: (l) => <span className="small">{l.params}</span> },
          { key: 'rows', header: 'Rows', num: true, render: (l) => l.rows.toLocaleString() },
          {
            key: 'by',
            header: 'By',
            render: (l) => (
              <span className="small">
                {l.by}
                <div className="xs faint">{l.device}</div>
              </span>
            ),
          },
        ]}
      />
    </Panel>
  );
}
