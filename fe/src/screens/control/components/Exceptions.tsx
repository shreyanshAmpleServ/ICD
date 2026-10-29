import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Siren } from 'lucide-react';
import type { S } from '@/api/types';
import { Chips, DataTable, Empty, Kpi, Page, PageHeader, Panel, Pill, SearchInput, Select, StatusPill, ago } from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { EXCEPTION_NAME, ROLE_NAME, allExceptions, entityLink, hoursUntil } from '@/mock/cargo';
import { Countdown } from '@/screens/cargo/shared';

/* GET /exceptions. Overdue and critical cases float to the top: they are
   the ones that escalate on their own. */
type Quick = 'open' | 'overdue' | 'mine' | 'resolved' | 'all';
const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
export const isOpen = (e: S<'ExceptionCase'>) => !['RESOLVED', 'CLOSED'].includes(e.status ?? '');

export function Exceptions() {
  const nav = useNavigate();
  const { data = [] } = useQ(['exceptions'], () => delay(allExceptions));
  const [quick, setQuick] = useState<Quick>('open');
  const [sev, setSev] = useState('ALL');
  const [role, setRole] = useState('ALL');
  const [q, setQ] = useState('');
  const rows = data
    .filter((e) => {
      if (sev !== 'ALL' && e.severity !== sev) return false;
      if (role !== 'ALL' && e.assignedRoleCode !== role) return false;
      if (q && !`${e.caseNo} ${e.title}`.toUpperCase().includes(q.toUpperCase())) return false;
      if (quick === 'open') return isOpen(e);
      if (quick === 'overdue') return isOpen(e) && e.isOverdue;
      if (quick === 'mine') return isOpen(e) && (e.assignedRoleCode === 'OPS_MANAGER' || e.assignedRoleCode === 'DOC_CLEARANCE');
      if (quick === 'resolved') return !isOpen(e);
      return true;
    })
    .sort((a, b) => Number(!!b.isOverdue) - Number(!!a.isOverdue) || SEV_ORDER[a.severity ?? 'LOW'] - SEV_ORDER[b.severity ?? 'LOW']);
  const open = data.filter(isOpen);

  return (
    <Page>
      <PageHeader title="Exceptions" ms="M2" sub="Things that went off the normal path: seal mismatches, blocked gate-outs, sync conflicts, failed fiscal receipts" />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Open" value={open.length} />
          <Kpi label="Overdue" value={open.filter((e) => e.isOverdue).length} delta="Past their SLA" />
          <Kpi label="Critical or high" value={open.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length} />
          <Kpi label="Escalated" value={open.filter((e) => (e.escalationLevel ?? 0) > 0).length} />
        </div>
        <Panel flush>
          <div className="toolbar">
            <div style={{ width: 240, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Case number or title" aria-label="Filter exceptions" /></div>
            <Select aria-label="Severity" value={sev} onChange={(e) => setSev(e.target.value)} options={[['ALL', 'All severities'], ['CRITICAL', 'Critical'], ['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']]} />
            <Select aria-label="Assigned role" value={role} onChange={(e) => setRole(e.target.value)} options={[['ALL', 'All teams'], ...Object.entries(ROLE_NAME)]} />
            <Chips<Quick> value={quick} onChange={setQuick} options={[
              { id: 'open', label: 'Open', count: open.length }, { id: 'overdue', label: 'Overdue', count: open.filter((e) => e.isOverdue).length },
              { id: 'mine', label: 'My team' }, { id: 'resolved', label: 'Resolved or closed' }, { id: 'all', label: 'All' },
            ]} />
          </div>
          <DataTable rows={rows} rowKey={(e) => e.exceptionCaseId!} onRow={(e) => nav(`/exceptions/${e.exceptionCaseId}`)}
            empty={<Empty title="No exceptions match">Good news, or change the filters.</Empty>}
            cols={[
              { key: 'sev', header: 'Severity', render: (e) => <StatusPill value={e.severity} /> },
              { key: 't', header: 'Exception', render: (e) => <div style={{ minWidth: 220 }}><strong className="small">{e.title}</strong><div className="xs faint">{e.caseNo} · {EXCEPTION_NAME[e.exceptionCode] ?? e.exceptionCode}</div></div> },
              { key: 'on', header: 'On', render: (e) => <span className="small">{entityLink(e.entityName, e.entityId, e.unitStayId)[0]}</span> },
              { key: 'a', header: 'Assigned', render: (e) => <span className="small">{e.assignedTo ?? <span className="faint">Unassigned</span>}<div className="xs faint">{ROLE_NAME[e.assignedRoleCode ?? ''] ?? e.assignedRoleCode}</div></span> },
              { key: 'r', header: 'Raised', render: (e) => <span className="small">{ago(e.raisedAt)}<div className="xs faint">{e.raisedBy}</div></span> },
              { key: 'd', header: 'Due', render: (e) => isOpen(e) && e.dueAt ? <span className="stack" style={{ gap: 2 }}>{e.isOverdue && <Pill tone="stop" icon={<Siren />}>Overdue</Pill>}<Countdown hours={hoursUntil(e.dueAt)} label={e.isOverdue ? 'due' : 'in'} /></span> : <span className="xs faint">—</span> },
              { key: 'esc', header: 'Escalation', render: (e) => (e.escalationLevel ? <Pill tone="wait">Level {e.escalationLevel}</Pill> : <span className="xs faint">None</span>) },
              { key: 's', header: 'Status', render: (e) => <StatusPill value={e.status} /> },
            ]} />
        </Panel>
      </div>
    </Page>
  );
}
