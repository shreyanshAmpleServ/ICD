import { Kpi, Panel } from '@/ds/components';
import { BarChart } from '@/ds/charts';

const hours = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17'];

export interface HomeGateActivityPanelProps {
  gateInCount?: number;
  gateOutCount?: number;
}

export function HomeGateActivityPanel({ gateInCount = 38, gateOutCount = 29 }: HomeGateActivityPanelProps) {
  return (
    <div className="stack-lg">
      <div className="kpi-strip" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Kpi label="Gate in today" value={gateInCount} delta="Plan 52" />
        <Kpi label="Gate out today" value={gateOutCount} delta="Plan 40" />
      </div>
      <Panel title="Gate moves by hour" sub="Today, both directions">
        <BarChart
          label="Gate in and out per hour today"
          labels={hours}
          series={[
            { name: 'In', values: [2, 5, 7, 6, 9, 4, 3, 2, 0, 0, 0, 0] },
            { name: 'Out', values: [0, 2, 4, 6, 8, 5, 4, 0, 0, 0, 0, 0] },
          ]}
          height={180}
        />
      </Panel>
    </div>
  );
}
