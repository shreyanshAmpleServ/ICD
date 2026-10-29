import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Measure the figure so the SVG draws at 1:1 and text stays 11px. */
function useWidth(fallback = 640) {
  const ref = useRef<HTMLElement>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* Small SVG charts. One y-axis always; thin marks; recessive grid; hover
   tooltip on every mark; legend whenever there are two or more series.
   Series colours come from --cat1..3 in a fixed order. */

export interface Series { name: string; values: number[] }
const COLORS = ['var(--cat1)', 'var(--cat2)', 'var(--cat3)'];

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="legend" style={{ marginBottom: 8 }}>
      {series.map((s, i) => <span key={s.name}><i style={{ background: COLORS[i] }} />{s.name}</span>)}
    </div>
  );
}

export function BarChart({ labels, series, height = 200, unit = '', label }: {
  labels: string[]; series: Series[]; height?: number; unit?: string; label: string;
}) {
  const [hover, setHover] = useState<{ x: number; y: number; text: ReactNode } | null>(null);
  const [ref, W] = useWidth();
  const H = height, padL = 36, padB = 22, padT = 8;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values)));
  const groupW = (W - padL) / labels.length;
  const gap = 2;
  const barW = Math.max(4, Math.min(22, (groupW * 0.7) / series.length - gap));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, max / 2, max];
  return (
    <figure ref={ref} style={{ margin: 0, position: 'relative' }}>
      <Legend series={series} />
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end">{Math.round(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          const gx = padL + i * groupW + (groupW - series.length * (barW + gap)) / 2;
          return (
            <g key={l}>
              {series.map((s, si) => {
                const v = s.values[i];
                const x = gx + si * (barW + gap);
                const top = y(v);
                const h = Math.max(0, H - padB - top);
                const r = Math.min(4, barW / 2, h);
                const path = `M${x},${H - padB} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${H - padB} Z`;
                return (
                  <g key={s.name}>
                    <path d={path} fill={COLORS[si]} />
                    <rect
                      x={x - 2} y={padT} width={barW + 4} height={H - padT - padB} fill="transparent"
                      onMouseEnter={() => setHover({ x: ((x + barW / 2) / W) * 100, y: (top / H) * 100, text: <>{l} · {s.name}: <b>{v}{unit}</b></> })}
                    />
                  </g>
                );
              })}
              {(groupW >= 26 || i % 2 === 0) && <text x={padL + i * groupW + groupW / 2} y={H - 6} textAnchor="middle">{l}</text>}
            </g>
          );
        })}
      </svg>
      {hover && <div className="chart-tip" style={{ left: `${hover.x}%`, top: `${hover.y + 12}%` }}>{hover.text}</div>}
    </figure>
  );
}

export function LineChart({ labels, series, height = 200, unit = '', label, band }: {
  labels: string[]; series: Series[]; height?: number; unit?: string; label: string;
  /** Optional range band (forecast lower/upper) drawn behind series 0. */
  band?: { lower: number[]; upper: number[] };
}) {
  const [hi, setHi] = useState<number | null>(null);
  const [ref, W] = useWidth();
  const H = height, padL = 36, padB = 22, padT = 10, padR = 8;
  const all = series.flatMap((s) => s.values).concat(band ? band.upper : []);
  const max = niceMax(Math.max(...all));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, labels.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const step = Math.ceil(labels.length / Math.max(3, Math.floor(W / 80)));
  return (
    <figure ref={ref} style={{ margin: 0, position: 'relative' }}>
      <Legend series={series} />
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={label}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - padL) / (W - padL - padR)) * (labels.length - 1));
          setHi(Math.max(0, Math.min(labels.length - 1, i)));
        }}
        onMouseLeave={() => setHi(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end">{Math.round(t)}{unit === '%' ? '%' : ''}</text>
          </g>
        ))}
        {band && (
          <path
            d={`M${band.upper.map((v, i) => `${x(i)},${y(v)}`).join(' L')} L${band.lower.map((v, i) => `${x(i)},${y(v)}`).reverse().join(' L')} Z`}
            fill={COLORS[0]} opacity={0.14}
          />
        )}
        {series.map((s, si) => (
          <path key={s.name} d={'M' + s.values.map((v, i) => `${x(i)},${y(v)}`).join(' L')} fill="none" stroke={COLORS[si]} strokeWidth={2} strokeLinejoin="round" />
        ))}
        {labels.map((l, i) => (i % step === 0 ? <text key={l + i} x={x(i)} y={H - 6} textAnchor="middle">{l}</text> : null))}
        {hi !== null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={padT} y2={H - padB} stroke="var(--ink-3)" strokeDasharray="3 3" />
            {series.map((s, si) => <circle key={s.name} cx={x(hi)} cy={y(s.values[hi])} r={4.5} fill={COLORS[si]} stroke="var(--paper)" strokeWidth={2} />)}
          </g>
        )}
      </svg>
      {hi !== null && (
        <div className="chart-tip" style={{ left: `${(x(hi) / W) * 100}%`, top: '18%' }}>
          <div>{labels[hi]}</div>
          {series.map((s) => <div key={s.name}>{s.name}: <b>{s.values[hi]}{unit}</b></div>)}
          {band && <div>Range {band.lower[hi]}–{band.upper[hi]}{unit}</div>}
        </div>
      )}
    </figure>
  );
}

export function Sparkline({ values, width = 120, height = 32 }: { values: number[]; width?: number; height?: number }) {
  const max = Math.max(...values), min = Math.min(...values);
  const x = (i: number) => (i * width) / (values.length - 1);
  const y = (v: number) => 3 + (height - 6) * (1 - (v - min) / Math.max(1, max - min));
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={'M' + values.map((v, i) => `${x(i)},${y(v)}`).join(' L')} fill="none" stroke="var(--cat1)" strokeWidth={2} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3} fill="var(--cat1)" />
    </svg>
  );
}
