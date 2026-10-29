import { Info } from 'lucide-react';
import { DataTable, Empty, Panel, Pill, UnitNo, fmtD } from '@/ds/components';
import { FLOW } from '@/ds/status';

export function DwellPredictionsTab({
  dwell,
}: {
  dwell: any[];
}) {
  return (
    <Panel
      flush
      title="Predicted exit dates"
      sub="p50: half of similar units have left by then. p90: nine in ten have. Sorted by longest stay expected."
    >
      <DataTable
        rows={dwell}
        rowKey={(d) => d.unitStayId}
        empty={
          <Empty title="No full units in the yard">
            Predictions appear for full units once they are gated in.
          </Empty>
        }
        cols={[
          {
            key: 'u',
            header: 'Unit',
            render: (d) => (
              <UnitNo
                no={d.stay.cargoUnit.unitNo}
                category={d.stay.cargoUnit.category}
                to={`/units/${d.unitStayId}`}
              />
            ),
          },
          { key: 'f', header: 'Flow', render: (d) => <span className="small">{FLOW[d.stay.flow]}</span> },
          {
            key: 'c',
            header: 'Customs',
            render: (d) => <span className="small">{(d.stay.customsStatus ?? '').toLowerCase().replace('_', ' ')}</span>,
          },
          { key: 'so', header: 'Days so far', num: true, render: (d) => d.daysSoFar },
          {
            key: 'p50',
            header: 'Likely exit (p50)',
            render: (d) => (
              <span className="small">
                <strong>{fmtD(d.predictedExitDate)}</strong> <span className="faint">· {d.p50Days} d</span>
              </span>
            ),
          },
          {
            key: 'p90',
            header: 'Latest likely (p90)',
            render: (d) => (
              <span className="small">
                {fmtD(d.p90Date)} <span className="faint">· {d.p90Days} d</span>
              </span>
            ),
          },
          { key: 'free', header: 'Free until', render: (d) => <span className="small">{fmtD(d.stay.freeUntil)}</span> },
          {
            key: 'n',
            header: '',
            render: (d) => (d.passesFree ? <Pill tone="wait">Likely past free time</Pill> : null),
          },
        ]}
      />
      <p className="xs muted row" style={{ padding: '10px 16px', margin: 0, gap: 6 }}>
        <Info size={13} />
        Advice only: never used for billing or release. Customer service can use “likely past free time” to remind customers early.
      </p>
    </Panel>
  );
}
