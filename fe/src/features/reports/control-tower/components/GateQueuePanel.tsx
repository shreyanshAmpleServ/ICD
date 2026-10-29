import { Link } from 'react-router-dom';
import { ChevronRight, OctagonX, Timer } from 'lucide-react';
import { Panel, StatusPill } from '@/ds/components';
import { CHECKPOINTS, VISIT_TYPES } from '@/mock/gate';
import { Stat } from '../../components/bits';

export function GateQueuePanel({
  gateQueue,
  blockedTrucks,
}: {
  gateQueue: any[];
  blockedTrucks: any[];
}) {
  const longest = Math.max(0, ...gateQueue.map((g) => g.waitingMinutes));

  return (
    <Panel
      flush
      title="Gate queue now"
      sub={`${gateQueue.length} trucks on site · longest wait ${longest} min`}
      actions={
        <Link to="/gate" className="small">
          Open gate queue
        </Link>
      }
    >
      <div className="ct-cols">
        {CHECKPOINTS.map((c) => {
          const rows = gateQueue.filter((g) => g.checkpointCode === c.code && g.status !== 'REJECTED');
          const max = Math.max(0, ...rows.map((g) => g.waitingMinutes));
          return (
            <Stat
              key={c.code}
              label={c.name}
              value={rows.length}
              note={
                rows.length ? (
                  <span className="row" style={{ gap: 4 }}>
                    <Timer size={12} />longest {max} min
                  </span>
                ) : (
                  'No trucks'
                )
              }
              tone={max > 60 ? 'wait' : undefined}
            />
          );
        })}
      </div>
      <div className="panel-head" style={{ borderTop: '1px solid var(--steel)' }}>
        <h3 className="row spacer">
          <OctagonX size={16} color="var(--stop)" />
          Blocked trucks
        </h3>
        <span className="pill pill-stop">{blockedTrucks.length}</span>
      </div>
      {blockedTrucks.length === 0 ? (
        <p className="small muted" style={{ padding: 16, margin: 0 }}>
          No truck is held or turned back.
        </p>
      ) : (
        <ul className="list-plain">
          {blockedTrucks.map((b) => (
            <li key={b.truckVisitId} style={{ padding: 0 }}>
              <Link
                to={`/gate/visits/${b.truckVisitId}`}
                className="row"
                style={{ padding: '10px 16px', color: 'inherit', textDecoration: 'none', gap: 12, flexWrap: 'wrap' }}
              >
                <span className="unitno unitno-sm">{b.plateNo}</span>
                <span className="spacer" style={{ minWidth: 200 }}>
                  <strong style={{ color: 'var(--stop)', display: 'block' }}>{b.blockedReason}</strong>
                  <span className="xs muted">
                    {VISIT_TYPES[b.visitTypeCode]} · {b.transporter} · at{' '}
                    {CHECKPOINTS.find((c) => c.code === b.checkpointCode)?.short}
                  </span>
                </span>
                <StatusPill value={b.status} />
                <span className="small num" style={{ minWidth: 56 }}>
                  {b.waitingMinutes ? `${b.waitingMinutes} min` : '—'}
                </span>
                <ChevronRight size={16} color="var(--ink-3)" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
