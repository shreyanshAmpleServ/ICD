import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Download } from 'lucide-react';
import { Button, DataTable, Page, PageHeader, Panel, Pill, Segmented, useToast } from '@/ds/components';
import { LineChart, Sparkline } from '@/ds/charts';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { kpiDates, kpiSeries, kpiTiles, type Tile } from '@/mock/insight';
import { ViewToggle, shortDate, type ViewMode } from './bits';

/* KPIs & trends for management. GET /dashboards/executive and
   /kpis/{code}/series. Each tile says what it is compared with and whether
   that is better or worse in words, so colour is never the only signal. */
type Period = '7' | '30' | '90';

function fmt(t: Tile, v: number) {
  if (t.format === 'money') return v.toLocaleString('en-US');
  return t.unit === 'days' ? v.toFixed(1) : String(Math.round(v));
}

function KpiTile({ t }: { t: Tile }) {
  const v = Number(t.value), c = Number(t.comparison);
  const diff = v - c;
  const better = diff === 0 ? null : (diff < 0) === (t.goodWhen === 'down');
  const onTarget = t.target === undefined ? null : t.goodWhen === 'down' ? v <= t.target : v >= t.target;
  const Arrow = diff >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Link to={t.drillDownUrl ?? '#'} className="tile" aria-label={`${t.label}: ${fmt(t, v)} ${t.unit ?? ''}`}>
      <div className="row"><span className="small muted spacer">{t.label}</span>{onTarget !== null && <Pill tone={onTarget ? 'go' : 'wait'}>{onTarget ? 'On target' : `Target ${t.target}${t.unit === '%' ? '%' : ''}`}</Pill>}</div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <span className="t-val spacer">{t.format === 'money' && <small style={{ marginLeft: 0, marginRight: 4 }}>USD</small>}{fmt(t, v)}{t.format !== 'money' && <small>{t.unit}</small>}</span>
        <Sparkline values={(t.trend ?? []).map((p) => Number(p.value))} width={96} height={30} />
      </div>
      <div className="xs muted row" style={{ gap: 4 }}>
        <Arrow size={14} aria-hidden />
        <span>{diff === 0 ? 'Same as' : `${better ? 'Better' : 'Worse'} than`} {t.comparisonLabel} ({fmt(t, c)}{t.format === 'money' ? '' : t.unit === '%' ? '%' : ` ${t.unit}`})</span>
      </div>
    </Link>
  );
}

export function Kpis() {
  const { site, can } = useSession();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('30');
  const [view, setView] = useState<ViewMode>('chart');
  const { data: tiles = [] } = useQ(['kpis', site.siteId], () => delay(kpiTiles));
  const n = Number(period);
  const sl = <T,>(a: T[]) => a.slice(-n);
  const labels = sl(kpiDates).map(shortDate);
  const rows = sl(kpiDates).map((d, i) => ({
    d, gin: sl(kpiSeries.gateIn)[i], gout: sl(kpiSeries.gateOut)[i], di: sl(kpiSeries.dwellImport)[i], dt: sl(kpiSeries.dwellTransit)[i],
    o1: sl(kpiSeries.occDar1)[i], o2: sl(kpiSeries.occDar2)[i],
  })).reverse();

  return (
    <Page wide>
      <PageHeader title="KPIs & trends" ms="M4" sub="All sites · figures close at midnight; today is included up to 10:30"
        actions={<>
          <Segmented<Period> label="Period" value={period} onChange={setPeriod} options={[{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }]} />
          <Button icon={<Download />} perm="reports.operational" onClick={() => toast('Export started · logged in the audit trail')}>Export</Button>
        </>} />

      <div className="stack-lg">
        <div className="tiles">{tiles.filter((t) => can('reports.financial') || !['REVENUE_MTD', 'COLLECTION_DAYS'].includes(t.kpiCode)).map((t) => <KpiTile key={t.kpiCode} t={t} />)}</div>

        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2>Trends, last {period} days</h2>
          <ViewToggle value={view} onChange={setView} />
        </div>

        {view === 'chart' ? (
          <div className="grid-3">
            <Panel title="Gate moves per day" sub="Trucks through the outer gate, both sites">
              <LineChart label={`Gate in and out per day, last ${period} days`} labels={labels} height={210}
                series={[{ name: 'In', values: sl(kpiSeries.gateIn) }, { name: 'Out', values: sl(kpiSeries.gateOut) }]} />
            </Panel>
            <Panel title="Average dwell" sub="Days from discharge to gate out, units that left that day">
              <LineChart label={`Average dwell days, last ${period} days`} labels={labels} height={210} unit=" days"
                series={[{ name: 'Import', values: sl(kpiSeries.dwellImport) }, { name: 'Transit', values: sl(kpiSeries.dwellTransit) }]} />
            </Panel>
            <Panel title="Yard occupancy" sub="Share of usable slots filled at 18:00">
              <LineChart label={`Yard occupancy per site, last ${period} days`} labels={labels} height={210} unit="%"
                series={[{ name: 'DAR1 main yard', values: sl(kpiSeries.occDar1) }, { name: 'DAR2 vehicle yard', values: sl(kpiSeries.occDar2) }]} />
            </Panel>
          </div>
        ) : (
          <Panel flush title={`Daily figures, last ${period} days`} sub="Newest first">
            <DataTable dense rows={rows} rowKey={(r) => r.d} cols={[
              { key: 'd', header: 'Date', render: (r) => shortDate(r.d) },
              { key: 'gin', header: 'Gate in', num: true }, { key: 'gout', header: 'Gate out', num: true },
              { key: 'di', header: 'Dwell import (days)', num: true, render: (r) => r.di.toFixed(1) },
              { key: 'dt', header: 'Dwell transit (days)', num: true, render: (r) => r.dt.toFixed(1) },
              { key: 'o1', header: 'Occupancy DAR1', num: true, render: (r) => `${r.o1}%` },
              { key: 'o2', header: 'Occupancy DAR2', num: true, render: (r) => `${r.o2}%` },
            ]} />
          </Panel>
        )}
        <p className="xs faint" style={{ margin: 0 }}>Revenue and collection days come from posted invoices and allocated payments only; proformas are not counted.</p>
      </div>
    </Page>
  );
}
