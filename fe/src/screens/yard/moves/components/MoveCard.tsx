import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Play, Truck, UserPlus } from 'lucide-react';
import { Button, Pill, StatusPill, UnitNo, ago, fmtT } from '@/ds/components';
import { equipment } from '@/mock/core';
import { MOVE_KIND, OPERATORS, type Move } from '@/mock/ops';

export const eqCode = (id?: number | null) => equipment.find((e) => e.equipmentId === id)?.equipmentCode;

export interface MoveCardProps {
  m: Move;
  onAssign: () => void;
  onStart: () => void;
  onComplete: () => void;
}

export function MoveCard({ m, onAssign, onStart, onComplete }: MoveCardProps) {
  const truck = m.moveKind === 'PICK_FOR_VISIT';
  const edge =
    m.status === 'DONE'
      ? 'var(--steel)'
      : m.priority === 1
      ? 'var(--stop)'
      : m.priority === 2
      ? 'var(--wait)'
      : 'var(--steel)';
  const to = m.toCode ?? m.toLabel ?? '—';

  return (
    <section className="panel" style={{ padding: 16, borderLeft: `5px solid ${edge}` }}>
      <div className="row-wrap" style={{ gap: 8 }}>
        <Pill tone={truck ? 'stop' : m.moveKind === 'TO_ACTIVITY' ? 'customs' : 'info'} icon={truck ? <Truck /> : undefined}>
          {MOVE_KIND[m.moveKind]}
        </Pill>
        <span className="xs muted">P{m.priority}</span>
        <span className="spacer" />
        <StatusPill value={m.status} />
      </div>
      <div className="row-wrap" style={{ marginTop: 10, gap: 10 }}>
        <UnitNo no={m.unitNo!} category={m.category} size="md" to={`/units/${m.unitStayId}`} />
        <span className="small muted">
          {m.unitType}
          {m.lineCode ? ` · ${m.lineCode}` : ''}
        </span>
      </div>
      <div
        className="row-wrap"
        style={{
          marginTop: 12,
          gap: 12,
          fontFamily: 'var(--font-cond)',
          fontWeight: 700,
          fontSize: 28,
          lineHeight: 1.1,
        }}
        aria-label={`From ${m.fromCode || 'YARD'} to ${to}`}
      >
        <span style={{ fontSize: (m.fromCode ?? '').length > 12 ? 20 : 28 }}>{m.fromCode || 'YARD'}</span>
        <ArrowRight size={26} aria-hidden style={{ color: 'var(--ink-3)' }} />
        <span style={{ fontSize: to.length > 12 ? 20 : 28 }}>
          {m.status === 'DONE' ? to : m.toCode ?? (truck ? `Truck ${m.plateNo}` : to)}
        </span>
      </div>
      <div className="small muted" style={{ marginTop: 6 }}>
        {m.toLabel && <div>{m.toLabel}</div>}
        {!m.toLabel && m.toCode && m.status !== 'DONE' && <div>Suggested slot, rank 1 · confirm when placing</div>}
        {m.note && <div style={{ color: 'var(--ink-2)' }}>{m.note}</div>}
        {m.overrideReason && <div>Placed outside rank 1: {m.overrideReason}</div>}
      </div>
      <div className="row-wrap xs muted" style={{ marginTop: 8, gap: 12 }}>
        <span className="row" style={{ gap: 4 }}>
          <Clock size={12} />
          {m.status === 'DONE' ? `Done ${fmtT(m.completedAt)}` : `Asked ${ago(m.requestedAt)}`}
        </span>
        {(m.assignedEquipmentId || m.assignedOperatorSub) && (
          <span>
            {eqCode(m.assignedEquipmentId) ?? 'Self-driven'} · {OPERATORS[m.assignedOperatorSub ?? ''] ?? '—'}
          </span>
        )}
        {m.truckVisitId && <Link to={`/gate/visits/${m.truckVisitId}`}>Truck {m.plateNo}</Link>}
      </div>
      {m.status !== 'DONE' && m.status !== 'CANCELLED' && (
        <div className="row-wrap" style={{ marginTop: 14 }}>
          {m.status === 'OPEN' && (
            <Button size="xl" icon={<UserPlus />} perm="yard.allocate" onClick={onAssign}>
              Assign
            </Button>
          )}
          {m.status === 'ASSIGNED' && (
            <Button size="xl" variant="primary" icon={<Play />} perm="yard.move.execute" onClick={onStart}>
              Start move
            </Button>
          )}
          {m.status === 'IN_PROGRESS' && (
            <Button size="xl" variant="primary" icon={<CheckCircle2 />} perm="yard.move.execute" onClick={onComplete}>
              {truck ? 'Loaded on truck' : 'Complete move'}
            </Button>
          )}
          {m.status === 'OPEN' && (
            <Button size="xl" variant="ghost" icon={<Play />} perm="yard.move.execute" onClick={onStart}>
              Take and start
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
