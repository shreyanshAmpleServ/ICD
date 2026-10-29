import { DL, Panel, Pill } from '@/ds/components';
import { WB_LIVE_KG, type Ticket } from '../types';
import { type DynamicTruckVisit } from '@/features/gate-management/types';

export function ScaleStatusCards({
  v,
  rows,
}: {
  v: DynamicTruckVisit | any;
  rows: Ticket[];
}) {
  return (
    <div className="stack-lg">
      <Panel title="Scale WB-01">
        <div className="stack" style={{ alignItems: 'flex-start' }}>
          <div className="unitno unitno-lg" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {WB_LIVE_KG.toLocaleString('en-US')} kg
          </div>
          <div className="row-wrap">
            <Pill tone="go">Online</Pill>
            <Pill tone="go">Stable</Pill>
            <span className="xs muted">Zeroed 06:02 · calibrated 18 Aug 2026</span>
          </div>
          <DL
            items={[
              ['On the platform', v?.plateNo || 'No truck on scale'],
              ['Camera', 'Plate read matches'],
              ['Indicator', 'Serial, 2 readings per second'],
            ]}
          />
        </div>
      </Panel>
      <Panel title="Today">
        <DL
          items={[
            ['Tickets', rows.length],
            [
              'Out of tolerance',
              rows.filter((r) => r.status === 'OVERRIDE_PENDING' || r.status === 'OVERRIDDEN').length,
            ],
            ['Average gross', rows.length ? `${Math.round(rows.reduce((s, r) => s + (Number(r.grossKg) || 0), 0) / rows.length).toLocaleString('en-US')} kg` : '—'],
          ]}
        />
      </Panel>
    </div>
  );
}
