import { Chips, DataTable, Empty, Kpi, Meter, Panel, fmtD } from '@/ds/components';
import { LineChart } from '@/ds/charts';
import { ViewToggle, shortDate, type ViewMode } from '../../components/bits';

export function OccupancyForecastTab({
  blocks,
  blk,
  setBlock,
  view,
  setView,
  fc,
  peak,
  perBlock,
}: {
  blocks: any[];
  blk: string;
  setBlock: (b: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  fc: any[];
  peak: any;
  perBlock: any[];
}) {
  if (blocks.length === 0) {
    return (
      <Panel>
        <Empty title="No yard blocks at this site">Occupancy forecasts need blocks set up in the yard designer.</Empty>
      </Panel>
    );
  }

  return (
    <>
      <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
        <Chips<string>
          value={blk}
          onChange={setBlock}
          options={[
            { id: 'ALL', label: 'Whole site' },
            ...blocks.map((b) => ({ id: b.fullCode, label: `Block ${b.fullCode}` })),
          ]}
        />
        <ViewToggle value={view} onChange={setView} />
      </div>
      <div className="grid-main-side">
        <Panel
          title={blk === 'ALL' ? 'Site occupancy forecast' : `Block ${blk} occupancy forecast`}
          sub="Line is the most likely value; the band is where 80% of outcomes should fall"
        >
          {fc.length === 0 ? (
            <Empty title="Loading forecast" />
          ) : view === 'chart' ? (
            <LineChart
              label="Occupancy forecast for the next 14 days with range band"
              unit="%"
              height={240}
              labels={fc.map((f) => shortDate(f.forecastDate))}
              series={[{ name: 'Predicted occupancy', values: fc.map((f) => Number(f.predictedPct)) }]}
              band={{ lower: fc.map((f) => Number(f.lowerPct)), upper: fc.map((f) => Number(f.upperPct)) }}
            />
          ) : (
            <DataTable
              dense
              rows={fc}
              rowKey={(f) => f.forecastDate}
              cols={[
                { key: 'd', header: 'Date', render: (f) => fmtD(f.forecastDate) },
                { key: 'p', header: 'Predicted', num: true, render: (f) => `${f.predictedPct}%` },
                { key: 'l', header: 'Low', num: true, render: (f) => `${f.lowerPct}%` },
                { key: 'u', header: 'High', num: true, render: (f) => `${f.upperPct}%` },
              ]}
            />
          )}
          <p className="xs muted" style={{ margin: '8px 0 0' }}>
            Includes Cape Albatross 318N (ETA tomorrow) and release orders already issued. Model occ-2026.09.2, run today 04:30.
          </p>
        </Panel>
        <div className="stack-lg">
          <div className="kpi-strip" style={{ gridTemplateColumns: '1fr' }}>
            <Kpi
              label="Peak in the next 14 days"
              value={peak ? peak.predictedPct : '—'}
              unit="%"
              delta={peak ? `${fmtD(peak.forecastDate)} · could reach ${peak.upperPct}%` : undefined}
            />
          </div>
          <Panel flush title="Blocks to watch" sub="Highest predicted occupancy per block">
            {perBlock
              .sort((a, b) => b.peak - a.peak)
              .map((b) => (
                <div
                  key={b.yardLocationId}
                  className="ct-occ"
                  style={{ gridTemplateColumns: '40px minmax(0,1fr) 84px' }}
                >
                  <span className="unitno unitno-sm" style={{ textAlign: 'center' }}>
                    {b.fullCode}
                  </span>
                  <span>
                    <Meter pct={b.peak} label={`Block ${b.fullCode} peak forecast`} />
                    <span className="xs faint">peak {shortDate(b.on)}</span>
                  </span>
                  <span className="small num">
                    <strong>{b.peak}%</strong> <span className="faint">≤{b.upper}%</span>
                  </span>
                </div>
              ))}
          </Panel>
        </div>
      </div>
    </>
  );
}
