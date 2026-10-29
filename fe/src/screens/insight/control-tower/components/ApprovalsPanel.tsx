import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Panel, Pill, ago } from '@/ds/components';

export function ApprovalsPanel({
  approvalsWaiting,
}: {
  approvalsWaiting: any[];
}) {
  return (
    <Panel
      flush
      title="Approvals waiting"
      actions={
        <Link to="/approvals" className="small">
          Open approvals
        </Link>
      }
    >
      <ul className="list-plain">
        {approvalsWaiting.map((a) => (
          <li key={a.approvalRequestId} style={{ padding: 0 }}>
            <Link to="/approvals" className="row" style={{ padding: '10px 16px', color: 'inherit', textDecoration: 'none' }}>
              <span className="spacer" style={{ minWidth: 0 }}>
                <span className="small strong" style={{ display: 'block' }}>
                  {a.summary}
                </span>
                <span className="xs muted">
                  {a.requestedBy} · {ago(a.requestedAt)}
                  {(a.levelsRequired ?? 1) > 1 ? ` · level ${(a.currentLevel ?? 0) + 1} of ${a.levelsRequired}` : ''}
                </span>
              </span>
              {!a.canDecide && <Pill tone="info">Not yours</Pill>}
              <ChevronRight size={16} color="var(--ink-3)" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
