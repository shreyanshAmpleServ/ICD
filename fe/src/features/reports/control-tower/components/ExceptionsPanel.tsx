import { Link } from 'react-router-dom';
import { Panel, StatusPill, ago } from '@/ds/components';

export function ExceptionsPanel({
  exceptions,
  openExceptions,
}: {
  exceptions: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    overdue: number;
  };
  openExceptions: any[];
}) {
  return (
    <Panel
      flush
      title="Exceptions by severity"
      actions={
        <Link to="/exceptions" className="small">
          Open exceptions
        </Link>
      }
    >
      {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => (
        <div key={s} className="sev">
          <span>
            <StatusPill value={s} />
          </span>
          <span className="unitno unitno-md">{exceptions[s.toLowerCase() as 'critical']}</span>
        </div>
      ))}
      <div className="sev" style={{ background: exceptions.overdue ? 'var(--stop-soft)' : undefined }}>
        <span className="strong">Overdue</span>
        <span className="unitno unitno-md" style={{ color: exceptions.overdue ? 'var(--stop)' : undefined }}>
          {exceptions.overdue}
        </span>
      </div>
      <ul className="list-plain" style={{ borderTop: '1px solid var(--steel)' }}>
        {openExceptions
          .filter((e) => e.isOverdue || e.severity === 'CRITICAL')
          .map((e) => (
            <li key={e.exceptionCaseId} style={{ padding: '10px 16px' }}>
              <div className={`side-bar ${e.isOverdue ? 'side-stop' : 'side-wait'}`}>
                <div className="small strong">{e.title}</div>
                <div className="xs muted">
                  {e.caseNo} · {e.assignedTo ?? e.assignedRoleCode?.toLowerCase().replace(/_/g, ' ')} · raised{' '}
                  {ago(e.raisedAt)}
                  {e.isOverdue ? ' · overdue' : ''}
                </div>
              </div>
            </li>
          ))}
      </ul>
    </Panel>
  );
}
