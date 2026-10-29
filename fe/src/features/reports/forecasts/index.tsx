import { useState } from 'react';
import { Banner, Page, PageHeader, Tabs } from '@/ds/components';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { occupancyFor, suggestionLog } from '@/mock/insight';
import { type ViewMode } from '../components/bits';
import { forecastsApi } from './api';
import { OccupancyForecastTab } from './components/OccupancyForecastTab';
import { DwellPredictionsTab } from './components/DwellPredictionsTab';
import { SlotSuggestionsTab } from './components/SlotSuggestionsTab';
import { ModelVersionsTab } from './components/ModelVersionsTab';

export { forecastsApi } from './api';

type Tab = 'occupancy' | 'dwell' | 'allocation' | 'models';

export function ForecastsView() {
  const { site } = useSession();
  const [tab, setTab] = useState<Tab>('occupancy');
  const blocks = occupancyFor(site.siteId);
  const [block, setBlock] = useState<string>('ALL');
  const [view, setView] = useState<ViewMode>('chart');
  const [overridesOnly, setOverridesOnly] = useState<'all' | 'over'>('all');
  const blk = blocks.some((b) => b.fullCode === block) ? block : 'ALL';
  const { data: fc = [] } = useQ(['forecast-occ', site.siteId, blk], () =>
    forecastsApi.getOccupancyForecast(site.siteId, blk)
  );
  const { data: dwell = [] } = useQ(['forecast-dwell', site.siteId], () =>
    forecastsApi.getDwellPredictions(site.siteId)
  );
  const log = suggestionLog.filter((s) => overridesOnly === 'all' || s.chosenRank !== 1);
  const rank1 = Math.round((suggestionLog.filter((s) => s.chosenRank === 1).length / suggestionLog.length) * 100);
  const peak = fc.reduce((m, f) => (Number(f.predictedPct) > Number(m?.predictedPct ?? -1) ? f : m), fc[0]);
  const perBlock = blocks.map((b) => {
    const f = fc; // site or block forecast
    const p = f.reduce((m, x) => (Number(x.predictedPct) > Number(m?.predictedPct ?? -1) ? x : m), f[0]);
    return { ...b, peak: Number(p?.predictedPct ?? 0), upper: Number(p?.upperPct ?? 0), on: p?.forecastDate ?? '' };
  });

  return (
    <Page>
      <PageHeader title="Forecasts" ms="M6" sub={`${site.siteName} · next 14 days`} />
      <div className="stack-lg">
        <Banner tone="info" title="Advice only">
          Forecasts and predictions help plan the yard and staff. They are never used for billing, free time or release
          decisions.
        </Banner>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'occupancy', label: 'Yard occupancy' },
            { id: 'dwell', label: 'Dwell predictions', count: dwell.length },
            { id: 'allocation', label: 'Slot suggestions', count: suggestionLog.length },
            { id: 'models', label: 'Model versions' },
          ]}
        />

        {tab === 'occupancy' && (
          <OccupancyForecastTab
            blocks={blocks}
            blk={blk}
            setBlock={setBlock}
            view={view}
            setView={setView}
            fc={fc}
            peak={peak}
            perBlock={perBlock}
          />
        )}

        {tab === 'dwell' && <DwellPredictionsTab dwell={dwell} />}

        {tab === 'allocation' && (
          <SlotSuggestionsTab
            rank1={rank1}
            suggestionLog={suggestionLog}
            log={log}
            overridesOnly={overridesOnly}
            setOverridesOnly={setOverridesOnly}
          />
        )}

        {tab === 'models' && <ModelVersionsTab />}
      </div>
    </Page>
  );
}

export { ForecastsView as Forecasts };
export default ForecastsView;
