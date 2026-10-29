import { Panel } from '@/ds/components';
import { LineChart } from '@/ds/charts';

export function KpiChartsGrid({
  period,
  labels,
  gateIn,
  gateOut,
  dwellImport,
  dwellTransit,
  occDar1,
  occDar2,
}: {
  period: string;
  labels: string[];
  gateIn: number[];
  gateOut: number[];
  dwellImport: number[];
  dwellTransit: number[];
  occDar1: number[];
  occDar2: number[];
}) {
  return (
    <div className="grid-3">
      <Panel title="Gate moves per day" sub="Trucks through the outer gate, both sites">
        <LineChart
          label={`Gate in and out per day, last ${period} days`}
          labels={labels}
          height={210}
          series={[
            { name: 'In', values: gateIn },
            { name: 'Out', values: gateOut },
          ]}
        />
      </Panel>
      <Panel title="Average dwell" sub="Days from discharge to gate out, units that left that day">
        <LineChart
          label={`Average dwell days, last ${period} days`}
          labels={labels}
          height={210}
          unit=" days"
          series={[
            { name: 'Import', values: dwellImport },
            { name: 'Transit', values: dwellTransit },
          ]}
        />
      </Panel>
      <Panel title="Yard occupancy" sub="Share of usable slots filled at 18:00">
        <LineChart
          label={`Yard occupancy per site, last ${period} days`}
          labels={labels}
          height={210}
          unit="%"
          series={[
            { name: 'DAR1 main yard', values: occDar1 },
            { name: 'DAR2 vehicle yard', values: occDar2 },
          ]}
        />
      </Panel>
    </div>
  );
}
