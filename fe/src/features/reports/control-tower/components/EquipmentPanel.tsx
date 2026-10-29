import { Link } from 'react-router-dom';
import { Panel, Pill } from '@/ds/components';

const EQ_TONE = { WORKING: ['Working', 'go'], IDLE: ['Idle', 'idle'], DOWN: ['Down', 'stop'] } as const;

export function EquipmentPanel({
  equipment,
}: {
  equipment: any[];
}) {
  const workingCount = equipment.filter((e) => e.status === 'WORKING').length;
  const downCount = equipment.filter((e) => e.status === 'DOWN').length;
  const totalMoves = equipment.reduce((a, e) => a + e.movesToday, 0);

  return (
    <Panel
      flush
      title="Equipment"
      sub={`${workingCount} working · ${downCount} down · ${totalMoves} moves today`}
      actions={
        <Link to="/moves" className="small">
          Open move orders
        </Link>
      }
    >
      <ul className="list-plain">
        {equipment.map((e) => {
          const [label, tone] = EQ_TONE[e.status as keyof typeof EQ_TONE] ?? ['Idle', 'idle'];
          return (
            <li key={e.equipmentId} className="row" style={{ padding: '9px 16px', gap: 12 }}>
              <span className="unitno unitno-sm" style={{ minWidth: 60, textAlign: 'center' }}>
                {e.equipmentCode}
              </span>
              <span className="spacer" style={{ minWidth: 0 }}>
                <span className="small strong" style={{ display: 'block' }}>
                  {e.name}
                  {e.operatorName ? (
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {' '}
                      · {e.operatorName}
                    </span>
                  ) : null}
                </span>
                <span className="xs muted">{e.note}</span>
              </span>
              <Pill tone={tone as any}>{label}</Pill>
              <span className="small num" style={{ width: 64 }}>
                {e.movesToday} moves
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
