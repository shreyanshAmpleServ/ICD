import { useMemo, useState } from 'react';
import { CalendarClock, FileSpreadsheet, FileText, Lock, Pause, Play, Save, Search } from 'lucide-react';
import {
  Banner, Button, Check, Chips, DataTable, Drawer, Empty, Field, Input, Page, PageHeader, Panel, Pill, SearchInput, Select,
  Tabs, fmtDT, useToast,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { SITES, useSession } from '@/app/session';
import { parties } from '@/mock/core';
import { day } from '@/mock/gen';
import {
  REPORT_GROUPS, exportLog as seedLog, reportPreview, reports, savedReports as seedSaved, type ExportLog, type Preview, type Report,
  type ReportGroup, type Saved,
} from '@/mock/insight';
import './insight.css';

/* Reports: GET /reports (already filtered by permission server-side; the
   client also hides what the role cannot run), POST /reports/{code}/run,
   saved and scheduled reports. Every export writes an audit entry. */
type Tab = 'catalogue' | 'saved' | 'log';

export function Reports() {
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
  const list = allowed.filter((r) => (group === 'all' || r.group === group) && (!q || (r.reportName + r.description).toLowerCase().includes(q.toLowerCase())));
  const groups = REPORT_GROUPS.filter(([g]) => list.some((r) => r.group === g));

  const onExport = (r: Report, format: 'XLSX' | 'PDF', rows: number, params: string) => {
    setLog((l) => [{ id: Date.parse('2026-10-07') + l.length, reportName: r.reportName, format, by: userName, at: new Date('2026-10-07T07:30:00Z').toISOString(), rows, params, device: 'This browser' }, ...l]);
    toast(`${format === 'XLSX' ? 'Excel' : 'PDF'} export started · logged in the audit trail`);
  };
  const onSave = (s: Saved) => { setSaved((x) => [s, ...x]); toast(s.scheduleCron ? 'Report saved and scheduled' : 'Report saved'); };

  return (
    <Page>
      <PageHeader title="Reports" ms="M4" sub="Run a report on screen, export it, or have it emailed on a schedule" />
      <div className="stack-lg">
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'catalogue', label: 'Catalogue', count: allowed.length },
          { id: 'saved', label: 'Saved & scheduled', count: saved.length },
          { id: 'log', label: 'Export log', count: log.length },
        ]} />

        {tab === 'catalogue' && (
          <>
            <div className="row-wrap">
              <div style={{ width: 280, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a report" aria-label="Find a report" /></div>
              <Chips<ReportGroup | 'all'> value={group} onChange={setGroup} options={[{ id: 'all', label: 'All' }, ...REPORT_GROUPS.filter(([g]) => allowed.some((r) => r.group === g)).map(([id, label]) => ({ id, label, count: allowed.filter((r) => r.group === id).length }))]} />
            </div>
            {hidden > 0 && (
              <p className="small muted row" style={{ margin: 0, gap: 6 }}><Lock size={14} />{hidden} more report{hidden === 1 ? '' : 's'} need{hidden === 1 ? 's' : ''} {can('reports.financial') ? 'reports.operational' : 'reports.financial'}. Ask your administrator if your work needs {hidden === 1 ? 'it' : 'them'}.</p>
            )}
            {groups.length === 0 && <Panel><Empty title="No reports match">Clear the search or choose another group.</Empty></Panel>}
            {groups.map(([g, label]) => (
              <Panel key={g} flush title={label}>
                {list.filter((r) => r.group === g).map((r) => (
                  <div key={r.reportCode} className="rep-row">
                    {r.formats.includes('PDF') ? <FileText size={18} color="var(--ink-3)" aria-hidden /> : <FileSpreadsheet size={18} aria-hidden />}
                    <div className="spacer" style={{ minWidth: 220 }}>
                      <div className="strong">{r.reportName}</div>
                      <div className="small muted">{r.description}</div>
                    </div>
                    <span className="xs faint nowrap">{r.parameters.map((p) => p.name.toLowerCase()).join(' · ')}</span>
                    <Button size="sm" variant="primary" icon={<Play />} perm={r.permissionCode} onClick={() => setRun(r)}>Run</Button>
                  </div>
                ))}
              </Panel>
            ))}
          </>
        )}

        {tab === 'saved' && (
          <Panel flush title="Saved & scheduled reports" sub="Scheduled reports are emailed as attachments; each send is logged like an export">
            <DataTable rows={saved} rowKey={(s) => s.savedReportId!} empty={<Empty title="Nothing saved yet">Run a report and choose “Save report” to keep its parameters.</Empty>} cols={[
              { key: 'name', header: 'Report', render: (s) => <><strong>{s.reportName}</strong><div className="xs faint">{reports.find((r) => r.reportCode === s.reportCode)?.reportName} · {s.owner}{s.isShared ? ' · shared' : ''}</div></> },
              { key: 'sch', header: 'Schedule', render: (s) => s.scheduleCron ? <span className="small row" style={{ gap: 6 }}><CalendarClock size={14} />{s.scheduleText} · {s.format === 'PDF' ? 'PDF' : 'Excel'}</span> : <span className="small faint">On demand</span> },
              { key: 'to', header: 'Email to', render: (s) => <span className="small" style={{ overflowWrap: 'anywhere' }}>{s.recipients ?? '—'}</span> },
              { key: 'next', header: 'Next send', render: (s) => <span className="small">{s.isActive && s.scheduleCron ? fmtDT(s.nextRunAt) : '—'}</span> },
              { key: 'last', header: 'Last run', render: (s) => s.lastRunAt ? <span className="row small" style={{ gap: 6 }}>{fmtDT(s.lastRunAt)}{s.lastStatus === 'FAILED' ? <Pill tone="stop">Failed</Pill> : null}</span> : <span className="faint small">Never</span> },
              { key: 'act', header: '', render: (s) => (
                <span className="row" style={{ gap: 6 }}>
                  <Button size="sm" icon={<Play />} perm={reports.find((r) => r.reportCode === s.reportCode)?.permissionCode} onClick={() => setRun(reports.find((r) => r.reportCode === s.reportCode) ?? null)}>Run now</Button>
                  {s.scheduleCron && <Button size="sm" variant="ghost" icon={s.isActive ? <Pause /> : <Play />} perm={reports.find((r) => r.reportCode === s.reportCode)?.permissionCode}
                    onClick={() => { setSaved((x) => x.map((y) => y.savedReportId === s.savedReportId ? { ...y, isActive: !y.isActive } : y)); toast(s.isActive ? 'Schedule paused' : 'Schedule resumed'); }}>{s.isActive ? 'Pause' : 'Resume'}</Button>}
                </span>
              ) },
            ]} />
          </Panel>
        )}

        {tab === 'log' && (
          <Panel flush title="Export log" sub="Every export and scheduled send. The full trail is in Audit trail with action “export”.">
            <DataTable rows={log} rowKey={(l) => l.id} cols={[
              { key: 'at', header: 'When', render: (l) => <span className="small nowrap">{fmtDT(l.at)}</span> },
              { key: 'r', header: 'Report', render: (l) => <strong className="small">{l.reportName}</strong> },
              { key: 'f', header: 'Format', render: (l) => <Pill tone="info">{l.format === 'XLSX' ? 'Excel' : l.format}</Pill> },
              { key: 'p', header: 'Parameters', render: (l) => <span className="small">{l.params}</span> },
              { key: 'rows', header: 'Rows', num: true, render: (l) => l.rows.toLocaleString() },
              { key: 'by', header: 'By', render: (l) => <span className="small">{l.by}<div className="xs faint">{l.device}</div></span> },
            ]} />
          </Panel>
        )}
      </div>

      <RunDrawer report={run} onClose={() => setRun(null)} onExport={onExport} onSave={onSave} />
    </Page>
  );
}

function RunDrawer({ report, onClose, onExport, onSave }: {
  report: Report | null; onClose: () => void; onExport: (r: Report, f: 'XLSX' | 'PDF', rows: number, params: string) => void; onSave: (s: Saved) => void;
}) {
  const { site, userName } = useSession();
  const [from, setFrom] = useState(day(-7));
  const [to, setTo] = useState(day(0));
  const [siteId, setSiteId] = useState(String(site.siteId));
  const [party, setParty] = useState('');
  const [result, setResult] = useState<Preview | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [weekly, setWeekly] = useState(true);
  const [fmt, setFmt] = useState<'XLSX' | 'PDF'>('XLSX');
  const [emails, setEmails] = useState('');
  const has = (t: string) => !!report?.parameters.some((p) => p.type === t);
  const rangeBad = has('dateRange') && from > to;
  const customers = useMemo(() => parties.filter((p) => p.roles.includes('CUSTOMER') || p.roles.includes('CLEARING_AGENT')), []);
  const close = () => { setResult(null); setSaveOpen(false); setParty(''); onClose(); };
  if (!report) return null;
  const paramText = [has('dateRange') && `${from} to ${to}`, SITES.find((s) => String(s.siteId) === siteId)?.siteCode, party ? parties.find((p) => String(p.partyId) === party)?.partyName : has('party') ? 'all customers' : null].filter(Boolean).join(' · ');

  return (
    <Drawer open wide onClose={close} title={report.reportName}
      footer={saveOpen ? (
        <>
          <Button variant="ghost" onClick={() => setSaveOpen(false)}>Back</Button>
          <Button variant="primary" icon={<Save />} disabled={!name.trim() || (weekly && !emails.trim())} perm={report.permissionCode}
            onClick={() => { onSave({ savedReportId: 60 + Math.floor(name.length), reportCode: report.reportCode, reportName: name, isShared: false, siteId: Number(siteId), parameters: { from, to, party }, scheduleCron: weekly ? '0 7 * * 1' : null, scheduleText: weekly ? 'Every Monday 07:00' : undefined, format: fmt, recipients: weekly ? emails : null, isActive: true, owner: userName, nextRunAt: '2026-10-12T04:00:00Z' }); close(); }}>
            {weekly ? 'Save and schedule' : 'Save report'}
          </Button>
        </>
      ) : (
        <>
          <Button icon={<Save />} disabled={!result} onClick={() => { setName(report.reportName); setSaveOpen(true); }}>Save report</Button>
          <span className="spacer" />
          <Button icon={<FileSpreadsheet />} disabled={!result} perm={report.permissionCode} onClick={() => result && onExport(report, 'XLSX', result.total, paramText)}>Export Excel</Button>
          <Button icon={<FileText />} disabled={!result} perm={report.permissionCode} onClick={() => result && onExport(report, 'PDF', result.total, paramText)}>Export PDF</Button>
        </>
      )}>
      {saveOpen ? (
        <div className="stack">
          <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <p className="small muted" style={{ margin: 0 }}>Saved with: {paramText}. Date ranges move with the calendar (for example “last 7 days”).</p>
          <Check label="Email it every Monday at 07:00" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
          {weekly && (
            <>
              <Field label="Format"><Select value={fmt} onChange={(e) => setFmt(e.target.value as 'XLSX' | 'PDF')} options={[['XLSX', 'Excel'], ['PDF', 'PDF']]} /></Field>
              <Field label="Send to" required hint="Email addresses, separated by commas. Only people with access to this report should receive it." error={weekly && !emails.trim() ? 'Add at least one address' : undefined}>
                <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="name@ngicd.example" />
              </Field>
            </>
          )}
        </div>
      ) : (
        <div className="stack-lg">
          <p className="small muted" style={{ margin: 0 }}>{report.description}</p>
          <div className="form-grid">
            {has('dateRange') && <>
              <Field label="From" required error={rangeBad ? 'Start must be before the end' : undefined}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To" required><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            </>}
            {has('site') && <Field label="Site" required><Select value={siteId} onChange={(e) => setSiteId(e.target.value)} options={SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`])} /></Field>}
            {has('party') && <Field label="Customer" hint="Leave empty for all customers"><Select value={party} onChange={(e) => setParty(e.target.value)} options={[['', 'All customers'], ...customers.map((p) => [String(p.partyId), p.partyName] as [string, string])]} /></Field>}
          </div>
          <div className="row"><Button variant="primary" icon={<Play />} disabled={rangeBad} perm={report.permissionCode} onClick={() => setResult(reportPreview(report, party ? Number(party) : undefined))}>{result ? 'Run again' : 'Run preview'}</Button></div>
          {result && (
            <Panel flush title="Preview" sub={`${result.total.toLocaleString()} rows · showing the first ${Math.min(result.rows.length, 12)} · ${paramText}`}>
              <DataTable dense rows={result.rows} rowKey={(r) => JSON.stringify(r)} empty={<Empty title="No rows for these parameters">Widen the date range or choose all customers.</Empty>}
                cols={result.cols.map((c) => ({ key: c.key, header: c.label, num: c.num }))} />
            </Panel>
          )}
          {result && <Banner tone="info">Exports include all {result.total.toLocaleString()} rows. Your name, the parameters and the time are written to the audit trail.</Banner>}
          {!result && <p className="xs faint" style={{ margin: 0 }}>Preview shows the first rows on screen. Nothing is logged until you export.</p>}
        </div>
      )}
    </Drawer>
  );
}

