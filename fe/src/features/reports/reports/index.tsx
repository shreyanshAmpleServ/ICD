import { useState } from 'react';
import { Page, PageHeader, Tabs, useToast } from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import {
  REPORT_GROUPS, exportLog as seedLog, reports, savedReports as seedSaved, type ExportLog, type Report,
  type ReportGroup, type Saved,
} from '@/mock/insight';
import { ReportCatalogueTab } from './components/ReportCatalogueTab';
import { SavedReportsTab } from './components/SavedReportsTab';
import { ExportLogTab } from './components/ExportLogTab';
import { RunReportDrawer } from './components/RunReportDrawer';
import '../insight.css';

export { reportsApi } from './api';

type Tab = 'catalogue' | 'saved' | 'log';

export function ReportsView() {
  const { can, userName } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('catalogue');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<ReportGroup | 'all'>('all');
  const [run, setRun] = useState<Report | null>(null);
  const [saved, setSaved] = useState<Saved[]>(seedSaved);
  const [log, setLog] = useState<ExportLog[]>(seedLog);
  const { data: all = [] } = useQ(['reports'], () => delay(reports));

  const allowed = all.filter((r) => can(r.permissionCode));
  const hidden = all.length - allowed.length;
  const list = allowed.filter(
    (r) =>
      (group === 'all' || r.group === group) &&
      (!q || (r.reportName + r.description).toLowerCase().includes(q.toLowerCase()))
  );
  const groups = REPORT_GROUPS.filter(([g]) => list.some((r) => r.group === g));

  const onExport = (r: Report, format: 'XLSX' | 'PDF', rows: number, params: string) => {
    setLog((l) => [
      {
        id: Date.parse('2026-10-07') + l.length,
        reportName: r.reportName,
        format,
        by: userName,
        at: new Date('2026-10-07T07:30:00Z').toISOString(),
        rows,
        params,
        device: 'This browser',
      },
      ...l,
    ]);
    toast(`${format === 'XLSX' ? 'Excel' : 'PDF'} export started · logged in the audit trail`);
  };
  const onSave = (s: Saved) => {
    setSaved((x) => [s, ...x]);
    toast(s.scheduleCron ? 'Report saved and scheduled' : 'Report saved');
  };

  return (
    <Page>
      <PageHeader
        title="Reports"
        ms="M4"
        sub="Run a report on screen, export it, or have it emailed on a schedule"
      />
      <div className="stack-lg">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'catalogue', label: 'Catalogue', count: allowed.length },
            { id: 'saved', label: 'Saved & scheduled', count: saved.length },
            { id: 'log', label: 'Export log', count: log.length },
          ]}
        />

        {tab === 'catalogue' && (
          <ReportCatalogueTab
            q={q}
            setQ={setQ}
            group={group}
            setGroup={setGroup}
            allowed={allowed}
            list={list}
            groups={groups}
            hidden={hidden}
            hasFinancialPerm={can('reports.financial')}
            onRun={(r) => setRun(r)}
          />
        )}

        {tab === 'saved' && (
          <SavedReportsTab
            saved={saved}
            setSaved={setSaved}
            onRun={(r) => setRun(r)}
          />
        )}

        {tab === 'log' && (
          <ExportLogTab log={log} />
        )}
      </div>

      <RunReportDrawer
        report={run}
        onClose={() => setRun(null)}
        onExport={onExport}
        onSave={onSave}
      />
    </Page>
  );
}

export { ReportsView as Reports };
export default ReportsView;
