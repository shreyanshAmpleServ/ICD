import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Pill } from '@/ds/components';
import { Sparkline } from '@/ds/charts';
import { type Tile } from '@/mock/insight';

export function fmt(t: Tile, v: number) {
  if (t.format === 'money') return v.toLocaleString('en-US');
  return t.unit === 'days' ? v.toFixed(1) : String(Math.round(v));
}

export function KpiTileCard({ t }: { t: Tile }) {
  const v = Number(t.value),
    c = Number(t.comparison);
  const diff = v - c;
  const better = diff === 0 ? null : (diff < 0) === (t.goodWhen === 'down');
  const onTarget = t.target === undefined ? null : t.goodWhen === 'down' ? v <= t.target : v >= t.target;
  const Arrow = diff >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Link to={t.drillDownUrl ?? '#'} className="tile" aria-label={`${t.label}: ${fmt(t, v)} ${t.unit ?? ''}`}>
      <div className="row">
        <span className="small muted spacer">{t.label}</span>
        {onTarget !== null && (
          <Pill tone={onTarget ? 'go' : 'wait'}>
            {onTarget ? 'On target' : `Target ${t.target}${t.unit === '%' ? '%' : ''}`}
          </Pill>
        )}
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <span className="t-val spacer">
          {t.format === 'money' && <small style={{ marginLeft: 0, marginRight: 4 }}>USD</small>}
          {fmt(t, v)}
          {t.format !== 'money' && <small>{t.unit}</small>}
        </span>
        <Sparkline values={(t.trend ?? []).map((p) => Number(p.value))} width={96} height={30} />
      </div>
      <div className="xs muted row" style={{ gap: 4 }}>
        <Arrow size={14} aria-hidden />
        <span>
          {diff === 0 ? 'Same as' : `${better ? 'Better' : 'Worse'} than`} {t.comparisonLabel} ({fmt(t, c)}
          {t.format === 'money' ? '' : t.unit === '%' ? '%' : ` ${t.unit}`})
        </span>
      </div>
    </Link>
  );
}
