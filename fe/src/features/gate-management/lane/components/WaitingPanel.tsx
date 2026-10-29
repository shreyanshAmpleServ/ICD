import { OctagonX } from 'lucide-react';
import { Panel, cx } from '@/ds/components';
import { CHECKPOINTS, VISIT_TYPES } from '@/features/gate-management/types';

export function WaitingPanel({
  cp,
  waiting,
  visitId,
  onPick,
}: {
  cp: string;
  waiting: any[];
  visitId: number | null;
  onPick: (id: number) => void;
}) {
  return (
    <Panel title={`Waiting at ${CHECKPOINTS.find((c) => c.code === cp)?.short || cp}`} flush>
      <div className="stack" style={{ padding: 8 }}>
        {waiting.length === 0 && (
          <div className="small faint" style={{ padding: 8 }}>
            No trucks waiting. Scan a pass or type a plate to start.
          </div>
        )}
        {waiting.map((w) => (
          <button
            key={w.truckVisitId}
            onClick={() => onPick(w.truckVisitId!)}
            className={cx('btn', 'btn-xl')}
            style={{
              justifyContent: 'flex-start',
              textAlign: 'left',
              borderColor: w.truckVisitId === visitId ? 'var(--ink)' : undefined,
              borderWidth: w.truckVisitId === visitId ? 2 : 1,
            }}
          >
            <span style={{ flex: 1 }}>
              <span className="unitno unitno-sm" style={{ display: 'block' }}>
                {w.plateNo}
              </span>
              <span className="xs muted" style={{ fontWeight: 500 }}>
                {VISIT_TYPES[w.visitTypeCode] || w.visitTypeCode} · {w.waitingMin ?? 0} min
              </span>
            </span>
            {w.status === 'HELD' && <OctagonX color="var(--stop)" />}
          </button>
        ))}
      </div>
    </Panel>
  );
}
