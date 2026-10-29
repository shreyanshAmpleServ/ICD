import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button, Page, PageHeader, Segmented, useToast } from '@/ds/components';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { kpiDates, kpiSeries, type Tile } from '@/mock/insight';
import { ViewToggle, shortDate, type ViewMode } from '../components/bits';
import { kpisApi } from './api';
import { KpiTileCard } from './components/KpiTileCard';
import { KpiChartsGrid } from './components/KpiChartsGrid';
import { KpiDataTable } from './components/KpiDataTable';

export { kpisApi } from './api';

type Period = '7' | '30' | '90';

export function KpisView() {
  const { site, can } = useSession();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('30');
  const [view, setView] = useState<ViewMode>('chart');
  const { data: tiles = [] } = useQ(['kpis', site.siteId], () => kpisApi.getKpis(site.siteId));
  const n = Number(period);
  const sl = <T,>(a: T[]) => a.slice(-n);
  const labels = sl(kpiDates).map(shortDate);
  const rows = sl(kpiDates)
    .map((d, i) => ({
      d,
      gin: sl(kpiSeries.gateIn)[i],
      gout: sl(kpiSeries.gateOut)[i],
      di: sl(kpiSeries.dwellImport)[i],
      dt: sl(kpiSeries.dwellTransit)[i],
      o1: sl(kpiSeries.occDar1)[i],
      o2: sl(kpiSeries.occDar2)[i],
    }))
    .reverse();

  return (
    <Page wide>
      <PageHeader
        title="KPIs & trends"
        ms="M4"
        sub="All sites · figures close at midnight; today is included up to 10:30"
        actions={
          <>
            <Segmented<Period>
              label="Period"
              value={period}
              onChange={setPeriod}
              options={[
                { id: '7', label: '7 days' },
                { id: '30', label: '30 days' },
                { id: '90', label: '90 days' },
              ]}
            />
            <Button
              icon={<Download />}
              perm="reports.operational"
              onClick={() => toast('Export started · logged in the audit trail')}
            >
              Export
            </Button>
          </>
        }
      />

      <div className="stack-lg">
        <div className="tiles">
          {tiles
            .filter((t: Tile) => can('reports.financial') || !['REVENUE_MTD', 'COLLECTION_DAYS'].includes(t.kpiCode))
            .map((t: Tile) => (
              <KpiTileCard key={t.kpiCode} t={t} />
            ))}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2>Trends, last {period} days</h2>
          <ViewToggle value={view} onChange={setView} />
        </div>

        {view === 'chart' ? (
          <KpiChartsGrid
            period={period}
            labels={labels}
            gateIn={sl(kpiSeries.gateIn)}
            gateOut={sl(kpiSeries.gateOut)}
            dwellImport={sl(kpiSeries.dwellImport)}
            dwellTransit={sl(kpiSeries.dwellTransit)}
            occDar1={sl(kpiSeries.occDar1)}
            occDar2={sl(kpiSeries.occDar2)}
          />
        ) : (
          <KpiDataTable period={period} rows={rows} />
        )}
        <p className="xs faint" style={{ margin: 0 }}>
          Revenue and collection days come from posted invoices and allocated payments only; proformas are not counted.
        </p>
      </div>
    </Page>
  );
}

export { KpisView as Kpis };
export default KpisView;
