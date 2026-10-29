import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Play, Save } from 'lucide-react';
import {
  Banner, Button, Check, DataTable, Drawer, Empty, Field, Input, Panel, Select,
} from '@/ds/components';
import { SITES, useSession } from '@/app/session';
import { parties } from '@/mock/core';
import { day } from '@/mock/gen';
import { type Preview, type Report, type Saved } from '@/mock/insight';
import { reportsApi } from '../api';

export function RunReportDrawer({
  report,
  onClose,
  onExport,
  onSave,
}: {
  report: Report | null;
  onClose: () => void;
  onExport: (r: Report, f: 'XLSX' | 'PDF', rows: number, params: string) => void;
  onSave: (s: Saved) => void;
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
  const customers = useMemo(
    () => parties.filter((p) => p.roles.includes('CUSTOMER') || p.roles.includes('CLEARING_AGENT')),
    []
  );
  const close = () => {
    setResult(null);
    setSaveOpen(false);
    setParty('');
    onClose();
  };
  if (!report) return null;
  const paramText = [
    has('dateRange') && `${from} to ${to}`,
    SITES.find((s) => String(s.siteId) === siteId)?.siteCode,
    party ? parties.find((p) => String(p.partyId) === party)?.partyName : has('party') ? 'all customers' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Drawer
      open
      wide
      onClose={close}
      title={report.reportName}
      footer={
        saveOpen ? (
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Back
            </Button>
            <Button
              variant="primary"
              icon={<Save />}
              disabled={!name.trim() || (weekly && !emails.trim())}
              perm={report.permissionCode}
              onClick={() => {
                onSave({
                  savedReportId: 60 + Math.floor(name.length),
                  reportCode: report.reportCode,
                  reportName: name,
                  isShared: false,
                  siteId: Number(siteId),
                  parameters: { from, to, party },
                  scheduleCron: weekly ? '0 7 * * 1' : null,
                  scheduleText: weekly ? 'Every Monday 07:00' : undefined,
                  format: fmt,
                  recipients: weekly ? emails : null,
                  isActive: true,
                  owner: userName,
                  nextRunAt: '2026-10-12T04:00:00Z',
                });
                close();
              }}
            >
              {weekly ? 'Save and schedule' : 'Save report'}
            </Button>
          </>
        ) : (
          <>
            <Button
              icon={<Save />}
              disabled={!result}
              onClick={() => {
                setName(report.reportName);
                setSaveOpen(true);
              }}
            >
              Save report
            </Button>
            <span className="spacer" />
            <Button
              icon={<FileSpreadsheet />}
              disabled={!result}
              perm={report.permissionCode}
              onClick={() => result && onExport(report, 'XLSX', result.total, paramText)}
            >
              Export Excel
            </Button>
            <Button
              icon={<FileText />}
              disabled={!result}
              perm={report.permissionCode}
              onClick={() => result && onExport(report, 'PDF', result.total, paramText)}
            >
              Export PDF
            </Button>
          </>
        )
      }
    >
      {saveOpen ? (
        <div className="stack">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <p className="small muted" style={{ margin: 0 }}>
            Saved with: {paramText}. Date ranges move with the calendar (for example “last 7 days”).
          </p>
          <Check
            label="Email it every Monday at 07:00"
            checked={weekly}
            onChange={(e) => setWeekly(e.target.checked)}
          />
          {weekly && (
            <>
              <Field label="Format">
                <Select
                  value={fmt}
                  onChange={(e) => setFmt(e.target.value as 'XLSX' | 'PDF')}
                  options={[
                    ['XLSX', 'Excel'],
                    ['PDF', 'PDF'],
                  ]}
                />
              </Field>
              <Field
                label="Send to"
                required
                hint="Email addresses, separated by commas. Only people with access to this report should receive it."
                error={weekly && !emails.trim() ? 'Add at least one address' : undefined}
              >
                <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="name@ngicd.example" />
              </Field>
            </>
          )}
        </div>
      ) : (
        <div className="stack-lg">
          <p className="small muted" style={{ margin: 0 }}>
            {report.description}
          </p>
          <div className="form-grid">
            {has('dateRange') && (
              <>
                <Field label="From" required error={rangeBad ? 'Start must be before the end' : undefined}>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="To" required>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </>
            )}
            {has('site') && (
              <Field label="Site" required>
                <Select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  options={SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`])}
                />
              </Field>
            )}
            {has('party') && (
              <Field label="Customer" hint="Leave empty for all customers">
                <Select
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  options={[
                    ['', 'All customers'],
                    ...customers.map((p) => [String(p.partyId), p.partyName] as [string, string]),
                  ]}
                />
              </Field>
            )}
          </div>
          <div className="row">
            <Button
              variant="primary"
              icon={<Play />}
              disabled={rangeBad}
              perm={report.permissionCode}
              onClick={() => setResult(reportsApi.runPreview(report, party ? Number(party) : undefined))}
            >
              {result ? 'Run again' : 'Run preview'}
            </Button>
          </div>
          {result && (
            <Panel
              flush
              title="Preview"
              sub={`${result.total.toLocaleString()} rows · showing the first ${Math.min(
                result.rows.length,
                12
              )} · ${paramText}`}
            >
              <DataTable
                dense
                rows={result.rows}
                rowKey={(r) => JSON.stringify(r)}
                empty={
                  <Empty title="No rows for these parameters">
                    Widen the date range or choose all customers.
                  </Empty>
                }
                cols={result.cols.map((c) => ({ key: c.key, header: c.label, num: c.num }))}
              />
            </Panel>
          )}
          {result && (
            <Banner tone="info">
              Exports include all {result.total.toLocaleString()} rows. Your name, the parameters and the time are written
              to the audit trail.
            </Banner>
          )}
          {!result && (
            <p className="xs faint" style={{ margin: 0 }}>
              Preview shows the first rows on screen. Nothing is logged until you export.
            </p>
          )}
        </div>
      )}
    </Drawer>
  );
}
