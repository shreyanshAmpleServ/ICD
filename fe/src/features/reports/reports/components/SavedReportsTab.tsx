import { CalendarClock, Pause, Play } from 'lucide-react';
import { Button, DataTable, Empty, Panel, Pill, fmtDT, useToast } from '@/ds/components';
import { reports, type Report, type Saved } from '@/mock/insight';

export function SavedReportsTab({
  saved,
  setSaved,
  onRun,
}: {
  saved: Saved[];
  setSaved: React.Dispatch<React.SetStateAction<Saved[]>>;
  onRun: (r: Report | null) => void;
}) {
  const toast = useToast();

  return (
    <Panel
      flush
      title="Saved & scheduled reports"
      sub="Scheduled reports are emailed as attachments; each send is logged like an export"
    >
      <DataTable
        rows={saved}
        rowKey={(s) => s.savedReportId!}
        empty={
          <Empty title="Nothing saved yet">Run a report and choose “Save report” to keep its parameters.</Empty>
        }
        cols={[
          {
            key: 'name',
            header: 'Report',
            render: (s) => (
              <>
                <strong>{s.reportName}</strong>
                <div className="xs faint">
                  {reports.find((r) => r.reportCode === s.reportCode)?.reportName} · {s.owner}
                  {s.isShared ? ' · shared' : ''}
                </div>
              </>
            ),
          },
          {
            key: 'sch',
            header: 'Schedule',
            render: (s) =>
              s.scheduleCron ? (
                <span className="small row" style={{ gap: 6 }}>
                  <CalendarClock size={14} />
                  {s.scheduleText} · {s.format === 'PDF' ? 'PDF' : 'Excel'}
                </span>
              ) : (
                <span className="small faint">On demand</span>
              ),
          },
          {
            key: 'to',
            header: 'Email to',
            render: (s) => (
              <span className="small" style={{ overflowWrap: 'anywhere' }}>
                {s.recipients ?? '—'}
              </span>
            ),
          },
          {
            key: 'next',
            header: 'Next send',
            render: (s) => (
              <span className="small">{s.isActive && s.scheduleCron ? fmtDT(s.nextRunAt) : '—'}</span>
            ),
          },
          {
            key: 'last',
            header: 'Last run',
            render: (s) =>
              s.lastRunAt ? (
                <span className="row small" style={{ gap: 6 }}>
                  {fmtDT(s.lastRunAt)}
                  {s.lastStatus === 'FAILED' ? <Pill tone="stop">Failed</Pill> : null}
                </span>
              ) : (
                <span className="faint small">Never</span>
              ),
          },
          {
            key: 'act',
            header: '',
            render: (s) => (
              <span className="row" style={{ gap: 6 }}>
                <Button
                  size="sm"
                  icon={<Play />}
                  perm={reports.find((r) => r.reportCode === s.reportCode)?.permissionCode}
                  onClick={() => onRun(reports.find((r) => r.reportCode === s.reportCode) ?? null)}
                >
                  Run now
                </Button>
                {s.scheduleCron && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={s.isActive ? <Pause /> : <Play />}
                    perm={reports.find((r) => r.reportCode === s.reportCode)?.permissionCode}
                    onClick={() => {
                      setSaved((x) =>
                        x.map((y) => (y.savedReportId === s.savedReportId ? { ...y, isActive: !y.isActive } : y))
                      );
                      toast(s.isActive ? 'Schedule paused' : 'Schedule resumed');
                    }}
                  >
                    {s.isActive ? 'Pause' : 'Resume'}
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
    </Panel>
  );
}
