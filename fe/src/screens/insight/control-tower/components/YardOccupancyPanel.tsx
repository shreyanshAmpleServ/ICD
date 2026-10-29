import { Link } from 'react-router-dom';
import { Empty, Meter, Panel } from '@/ds/components';

export function YardOccupancyPanel({
  yardOccupancy,
}: {
  yardOccupancy: any[];
}) {
  return (
    <Panel
      flush
      title="Yard occupancy by block"
      sub="Over 75% slows allocation; over 90% means reshuffles"
      actions={
        <Link to="/yard" className="small">
          Open yard map
        </Link>
      }
    >
      {yardOccupancy.length === 0 ? (
        <Empty title="No yard blocks at this site">Set up blocks in the yard designer to see occupancy here.</Empty>
      ) : (
        yardOccupancy.map((o) => {
          const p = Number(o.occupancyPct);
          return (
            <div key={o.yardLocationId} className="ct-occ">
              <span className="unitno unitno-sm" style={{ textAlign: 'center' }}>
                {o.fullCode}
              </span>
              <span>
                <Meter pct={p} label={`Block ${o.fullCode} occupancy`} />
                <span className="xs faint">{o.kind.toLowerCase()}</span>
              </span>
              <span className="small num">
                <strong>{p}%</strong>{' '}
                <span className="faint">
                  {o.occupiedSlots}/{o.usableSlots}
                </span>
              </span>
            </div>
          );
        })
      )}
    </Panel>
  );
}
