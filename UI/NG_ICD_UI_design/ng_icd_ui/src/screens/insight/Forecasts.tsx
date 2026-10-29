import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Sparkles } from 'lucide-react';
import {
  Banner, Chips, DataTable, Empty, Kpi, Meter, Page, PageHeader, Panel, Pill, Tabs, UnitNo, fmtD, fmtDT,
} from '@/ds/components';
import { LineChart } from '@/ds/charts';
import { FLOW } from '@/ds/status';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { MODEL_VERSIONS, dwellPredictions, occupancyFor, occupancyForecast, suggestionLog } from '@/mock/insight';
import { ViewToggle, shortDate, type ViewMode } from './bits';

/* Forecasts (Phase 2, M6): occupancy forecast with a range band, dwell
   predictions and the slot-suggestion log. GET /forecasts/occupancy,
   /forecasts/dwell, /yard/suggestion-log, /models. Predictions are advice for
   planners only; billing and release never read them. */
type Tab = 'occupancy' | 'dwell' | 'allocation' | 'models';

export function Forecasts() {
  const { site } = useSession();
  const [tab, setTab] = useState<Tab>('occupancy');
  const blocks = occupancyFor(site.siteId);
  const [block, setBlock] = useState<string>('ALL');
  const [view, setView] = useState<ViewMode>('chart');
  const [overridesOnly, setOverridesOnly] = useState<'all' | 'over'>('all');
  const blk = blocks.some((b) => b.fullCode === block) ? block : 'ALL';
  const { data: fc = [] } = useQ(['forecast-occ', site.siteId, blk], () => delay(occupancyForecast(site.siteId, blk)));
  const { data: dwell = [] } = useQ(['forecast-dwell', site.siteId], () => delay(dwellPredictions(site.siteId)));
  const log = suggestionLog.filter((s) => overridesOnly === 'all' || s.chosenRank !== 1);
  const rank1 = Math.round((suggestionLog.filter((s) => s.chosenRank === 1).length / suggestionLog.length) * 100);
  const peak = fc.reduce((m, f) => (Number(f.predictedPct) > Number(m?.predictedPct ?? -1) ? f : m), fc[0]);
  const perBlock = blocks.map((b) => {
    const f = occupancyForecast(site.siteId, b.fullCode);
    const p = f.reduce((m, x) => (Number(x.predictedPct) > Number(m.predictedPct) ? x : m), f[0]);
    return { ...b, peak: Number(p.predictedPct), upper: Number(p.upperPct), on: p.forecastDate };
  });

  return (
    <Page>
      <PageHeader title="Forecasts" ms="M6" sub={`${site.siteName} · next 14 days`} />
      <div className="stack-lg">
        <Banner tone="info" title="Advice only">Forecasts and predictions help plan the yard and staff. They are never used for billing, free time or release decisions.</Banner>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'occupancy', label: 'Yard occupancy' }, { id: 'dwell', label: 'Dwell predictions', count: dwell.length },
          { id: 'allocation', label: 'Slot suggestions', count: suggestionLog.length }, { id: 'models', label: 'Model versions' },
        ]} />

        {tab === 'occupancy' && (blocks.length === 0 ? <Panel><Empty title="No yard blocks at this site">Occupancy forecasts need blocks set up in the yard designer.</Empty></Panel> : (
          <>
            <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
              <Chips<string> value={blk} onChange={setBlock} options={[{ id: 'ALL', label: 'Whole site' }, ...blocks.map((b) => ({ id: b.fullCode, label: `Block ${b.fullCode}` }))]} />
              <ViewToggle value={view} onChange={setView} />
            </div>
            <div className="grid-main-side">
              <Panel title={blk === 'ALL' ? 'Site occupancy forecast' : `Block ${blk} occupancy forecast`} sub="Line is the most likely value; the band is where 80% of outcomes should fall">
                {fc.length === 0 ? <Empty title="Loading forecast" /> : view === 'chart' ? (
                  <LineChart label="Occupancy forecast for the next 14 days with range band" unit="%" height={240}
                    labels={fc.map((f) => shortDate(f.forecastDate))}
                    series={[{ name: 'Predicted occupancy', values: fc.map((f) => Number(f.predictedPct)) }]}
                    band={{ lower: fc.map((f) => Number(f.lowerPct)), upper: fc.map((f) => Number(f.upperPct)) }} />
                ) : (
                  <DataTable dense rows={fc} rowKey={(f) => f.forecastDate} cols={[
                    { key: 'd', header: 'Date', render: (f) => fmtD(f.forecastDate) },
                    { key: 'p', header: 'Predicted', num: true, render: (f) => `${f.predictedPct}%` },
                    { key: 'l', header: 'Low', num: true, render: (f) => `${f.lowerPct}%` },
                    { key: 'u', header: 'High', num: true, render: (f) => `${f.upperPct}%` },
                  ]} />
                )}
                <p className="xs muted" style={{ margin: '8px 0 0' }}>Includes Cape Albatross 318N (ETA tomorrow) and release orders already issued. Model occ-2026.09.2, run today 04:30.</p>
              </Panel>
              <div className="stack-lg">
                <div className="kpi-strip" style={{ gridTemplateColumns: '1fr' }}>
                  <Kpi label="Peak in the next 14 days" value={peak ? peak.predictedPct : '—'} unit="%" delta={peak ? `${fmtD(peak.forecastDate)} · could reach ${peak.upperPct}%` : undefined} />
                </div>
                <Panel flush title="Blocks to watch" sub="Highest predicted occupancy per block">
                  {perBlock.sort((a, b) => b.peak - a.peak).map((b) => (
                    <div key={b.yardLocationId} className="ct-occ" style={{ gridTemplateColumns: '40px minmax(0,1fr) 84px' }}>
                      <span className="unitno unitno-sm" style={{ textAlign: 'center' }}>{b.fullCode}</span>
                      <span><Meter pct={b.peak} label={`Block ${b.fullCode} peak forecast`} /><span className="xs faint">peak {shortDate(b.on)}</span></span>
                      <span className="small num"><strong>{b.peak}%</strong> <span className="faint">≤{b.upper}%</span></span>
                    </div>
                  ))}
                </Panel>
              </div>
            </div>
          </>
        ))}

        {tab === 'dwell' && (
          <Panel flush title="Predicted exit dates" sub="p50: half of similar units have left by then. p90: nine in ten have. Sorted by longest stay expected.">
            <DataTable rows={dwell} rowKey={(d) => d.unitStayId} empty={<Empty title="No full units in the yard">Predictions appear for full units once they are gated in.</Empty>} cols={[
              { key: 'u', header: 'Unit', render: (d) => <UnitNo no={d.stay.cargoUnit.unitNo} category={d.stay.cargoUnit.category} to={`/units/${d.unitStayId}`} /> },
              { key: 'f', header: 'Flow', render: (d) => <span className="small">{FLOW[d.stay.flow]}</span> },
              { key: 'c', header: 'Customs', render: (d) => <span className="small">{(d.stay.customsStatus ?? '').toLowerCase().replace('_', ' ')}</span> },
              { key: 'so', header: 'Days so far', num: true, render: (d) => d.daysSoFar },
              { key: 'p50', header: 'Likely exit (p50)', render: (d) => <span className="small"><strong>{fmtD(d.predictedExitDate)}</strong> <span className="faint">· {d.p50Days} d</span></span> },
              { key: 'p90', header: 'Latest likely (p90)', render: (d) => <span className="small">{fmtD(d.p90Date)} <span className="faint">· {d.p90Days} d</span></span> },
              { key: 'free', header: 'Free until', render: (d) => <span className="small">{fmtD(d.stay.freeUntil)}</span> },
              { key: 'n', header: '', render: (d) => d.passesFree ? <Pill tone="wait">Likely past free time</Pill> : null },
            ]} />
            <p className="xs muted row" style={{ padding: '10px 16px', margin: 0, gap: 6 }}><Info size={13} />Advice only: never used for billing or release. Customer service can use “likely past free time” to remind customers early.</p>
          </Panel>
        )}

        {tab === 'allocation' && (
          <>
            <div className="kpi-strip">
              <Kpi label="Chose suggestion rank 1" value={rank1} unit="%" delta="Last 40 placements" />
              <Kpi label="Overrides" value={suggestionLog.filter((s) => s.chosenRank !== 1).length} delta="With a reason each" />
              <Kpi label="Picked a slot not suggested" value={suggestionLog.filter((s) => s.chosenRank === null).length} delta="Reviewed weekly by the yard planner" />
            </div>
            <Panel flush title="Slot suggestion log" sub="What the system suggested and what the yard chose"
              actions={<Chips<'all' | 'over'> value={overridesOnly} onChange={setOverridesOnly} options={[{ id: 'all', label: 'All' }, { id: 'over', label: 'Overrides only' }]} />}>
              <DataTable rows={log} rowKey={(s) => s.yardSuggestionLogId} cols={[
                { key: 'at', header: 'When', render: (s) => <span className="small nowrap">{fmtDT(s.suggestedAt)}</span> },
                { key: 'u', header: 'Unit', render: (s) => <UnitNo no={s.unitNo} to={`/units/${s.unitStayId}`} /> },
                { key: 'e', header: 'Engine', render: (s) => <span className="small">{s.engine === 'ML' ? 'Learned' : 'Rules'}</span> },
                { key: 't', header: 'Suggested first', render: (s) => <span className="cond strong">{s.top}</span> },
                { key: 'c', header: 'Chosen', render: (s) => <span className="cond strong">{s.chosen}</span> },
                { key: 'r', header: 'Rank chosen', num: true, render: (s) => s.chosenRank ?? 'Not suggested' },
                { key: 'why', header: 'Override reason', render: (s) => <span className="small">{s.overrideReason ?? <span className="faint">—</span>}</span> },
                { key: 'by', header: 'By', render: (s) => <span className="small">{s.by}</span> },
              ]} />
            </Panel>
          </>
        )}

        {tab === 'models' && (
          <Panel flush title="Model versions" sub="Each prediction stores the version that made it" actions={<Link to="/admin/models" className="small">Manage models</Link>}>
            <DataTable rows={MODEL_VERSIONS} rowKey={(m) => m.mlModelVersionId} cols={[
              { key: 'n', header: 'Model', render: (m) => <span className="row"><Sparkles size={14} aria-hidden /><strong>{m.name}</strong></span> },
              { key: 'v', header: 'Version', render: (m) => <span className="cond">{m.versionLabel}</span> },
              { key: 't', header: 'Trained', render: (m) => <span className="small">{fmtD(m.trainedAt)}</span> },
              { key: 'q', header: 'How good it is', render: (m) => <span className="small">{m.metricText}</span> },
              { key: 's', header: 'Status', render: (m) => <Pill tone={m.isActive ? 'go' : 'idle'}>{m.isActive ? 'In use' : 'Retired'}</Pill> },
            ]} />
          </Panel>
        )}
      </div>
    </Page>
  );
}

