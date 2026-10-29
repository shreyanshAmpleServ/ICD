import { Link } from 'react-router-dom';
import { Timer, WifiOff } from 'lucide-react';
import { StatusPill, UnitNo, cx } from '@/ds/components';
import { CHECKPOINTS, VISIT_TYPES, type DynamicTruckVisit } from '@/screens/gate/types';

export function QueueBoard({
  getColItems,
}: {
  getColItems: (code: string) => DynamicTruckVisit[];
}) {
  return (
    <div className="grid-4" style={{ alignItems: 'start' }}>
      {CHECKPOINTS.map((c) => {
        const items = getColItems(c.code);
        return (
          <section key={c.code} className="panel">
            <div className="panel-head">
              <h2 className="spacer">{c.name}</h2>
              <span className="pill pill-info">{items.length}</span>
            </div>
            <div className="stack" style={{ padding: 12 }}>
              {items.length === 0 && (
                <div className="small faint" style={{ padding: 8 }}>
                  No trucks waiting.
                </div>
              )}
              {items.map((v) => (
                <Link
                  key={v.truckVisitId}
                  to={`/gate/visits/${v.truckVisitId}`}
                  className={cx('panel')}
                  style={{
                    padding: 12,
                    textDecoration: 'none',
                    color: 'inherit',
                    borderLeft: `4px solid ${
                      v.status === 'HELD'
                        ? 'var(--stop)'
                        : (v.waitingMin ?? 0) > 60
                        ? 'var(--wait)'
                        : 'var(--steel)'
                    }`,
                  }}
                >
                  <div className="row">
                    <span className="unitno unitno-sm spacer">{v.plateNo}</span>
                    {v.isOfflineEntry && <WifiOff size={14} aria-label="Entered offline" />}
                    <span className="small row" style={{ gap: 4 }}>
                      <Timer size={13} />
                      {v.waitingMin ?? 0} min
                    </span>
                  </div>
                  <div className="small muted">
                    {VISIT_TYPES[v.visitTypeCode] || v.visitTypeCode} · {v.transporter}
                  </div>
                  <div className="row-wrap" style={{ marginTop: 6 }}>
                    {(v.units ?? []).slice(0, 3).map((u) => (
                      <UnitNo
                        key={u.unitStayId}
                        no={u.unitNo!}
                        category={(u.unitNo || '').length === 17 ? 'VEHICLE' : 'CONTAINER'}
                      />
                    ))}
                    {(v.units ?? []).length === 0 && <span className="xs faint">No units yet</span>}
                  </div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <StatusPill value={v.status} />
                    {v.blockedReason && (
                      <span className="xs" style={{ color: 'var(--stop)' }}>
                        {v.blockedReason}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
