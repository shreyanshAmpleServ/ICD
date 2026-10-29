import { FileSpreadsheet, FileText, Lock, Play, Search } from 'lucide-react';
import { Button, Chips, Empty, Panel, SearchInput } from '@/ds/components';
import { REPORT_GROUPS, type Report, type ReportGroup } from '@/mock/insight';

export function ReportCatalogueTab({
  q,
  setQ,
  group,
  setGroup,
  allowed,
  list,
  groups,
  hidden,
  hasFinancialPerm,
  onRun,
}: {
  q: string;
  setQ: (v: string) => void;
  group: ReportGroup | 'all';
  setGroup: (g: ReportGroup | 'all') => void;
  allowed: Report[];
  list: Report[];
  groups: (readonly [ReportGroup, string])[];
  hidden: number;
  hasFinancialPerm: boolean;
  onRun: (r: Report) => void;
}) {
  return (
    <>
      <div className="row-wrap">
        <div style={{ width: 280, maxWidth: '100%' }}>
          <SearchInput
            icon={<Search />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a report"
            aria-label="Find a report"
          />
        </div>
        <Chips<ReportGroup | 'all'>
          value={group}
          onChange={setGroup}
          options={[
            { id: 'all', label: 'All' },
            ...REPORT_GROUPS.filter(([g]) => allowed.some((r) => r.group === g)).map(([id, label]) => ({
              id,
              label,
              count: allowed.filter((r) => r.group === id).length,
            })),
          ]}
        />
      </div>
      {hidden > 0 && (
        <p className="small muted row" style={{ margin: 0, gap: 6 }}>
          <Lock size={14} />
          {hidden} more report{hidden === 1 ? '' : 's'} need{hidden === 1 ? 's' : ''}{' '}
          {hasFinancialPerm ? 'reports.operational' : 'reports.financial'}. Ask your administrator if your work needs{' '}
          {hidden === 1 ? 'it' : 'them'}.
        </p>
      )}
      {groups.length === 0 && (
        <Panel>
          <Empty title="No reports match">Clear the search or choose another group.</Empty>
        </Panel>
      )}
      {groups.map(([g, label]) => (
        <Panel key={g} flush title={label}>
          {list
            .filter((r) => r.group === g)
            .map((r) => (
              <div key={r.reportCode} className="rep-row">
                {r.formats.includes('PDF') ? (
                  <FileText size={18} color="var(--ink-3)" aria-hidden />
                ) : (
                  <FileSpreadsheet size={18} aria-hidden />
                )}
                <div className="spacer" style={{ minWidth: 220 }}>
                  <div className="strong">{r.reportName}</div>
                  <div className="small muted">{r.description}</div>
                </div>
                <span className="xs faint nowrap">
                  {r.parameters.map((p) => p.name.toLowerCase()).join(' · ')}
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Play />}
                  perm={r.permissionCode}
                  onClick={() => onRun(r)}
                >
                  Run
                </Button>
              </div>
            ))}
        </Panel>
      ))}
    </>
  );
}
