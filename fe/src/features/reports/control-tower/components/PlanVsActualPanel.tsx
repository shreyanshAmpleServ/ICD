import { Meter, Panel } from '@/ds/components';
import { BarChart } from '@/ds/charts';

export function PlanVsActualPanel({
  todayIn,
  planIn,
  todayOut,
  planOut,
  hours,
  hourlyIn,
  hourlyOut,
  generatedAt,
}: {
  todayIn: number;
  planIn: number;
  todayOut: number;
  planOut: number;
  hours: number[];
  hourlyIn: number[];
  hourlyOut: number[];
  generatedAt: string;
}) {
  const pct = (a: number, b?: number | null) => (b ? Math.round((a / b) * 100) : 0);

  return (
    <Panel title="Today in and out against plan" sub="Plan is appointments plus nominated pick-ups">
      <div className="stack">
        {[
          ['In', todayIn, planIn],
          ['Out', todayOut, planOut],
        ].map(([l, v, p]) => (
          <div key={l as string} className="row" style={{ gap: 12 }}>
            <span className="small strong" style={{ width: 32 }}>
              {l}
            </span>
            <span className="spacer">
              <Meter pct={pct(v as number, p as number)} label={`Gate ${l} against plan`} />
            </span>
            <span className="small num" style={{ width: 110 }}>
              {v} of {p} planned
            </span>
          </div>
        ))}
        <BarChart
          label="Gate in and out per hour today"
          labels={hours.map((h) => `${h}:00`)}
          height={150}
          series={[
            { name: 'In', values: hourlyIn },
            { name: 'Out', values: hourlyOut },
          ]}
        />
        <p className="xs muted" style={{ margin: 0 }}>
          {(() => {
            const left = (planIn ?? 0) + (planOut ?? 0) - todayIn - todayOut;
            const pace = (todayIn + todayOut) / 4.5;
            const mins = Math.round((left / pace) * 60);
            const t = new Date(Date.parse(generatedAt) + mins * 60000);
            return left <= 0
              ? 'Plan for today is already met.'
              : `${left} moves to go. At this morning's pace (${Math.round(pace)} an hour) the plan is met around ${t.toLocaleTimeString(
                  'en-GB',
                  { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' }
                )}.`;
          })()}
        </p>
      </div>
    </Panel>
  );
}
