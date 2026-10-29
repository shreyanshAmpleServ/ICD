import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleDashed, Clock3 } from 'lucide-react';
import { Banner, Money, Pill } from '@/ds/components';
import { useSession } from '@/app/session';
import { APPROVERS, LIMITS, dShort, type DocKind, type FiscalStatus, type GlStatus } from '@/mock/money';
import './money.css';

/* Local pieces for the money screens. Candidates for the shared kit:
   DualAmount, ApprovalPath, AgeingBar, Totals, RateChart, PrintSheet. */

/** "3 days", "1 move", "42 kWh". */
export const qtyU = (q: string | number, uom?: string | null) => {
  const n = Number(q);
  const u = uom ?? '';
  return `${n.toLocaleString('en-US')} ${n === 1 || u === 'kWh' || u === 'each' || u.endsWith('-day') ? u : u + 's'}`;
};

/** Whole-number figure for KPI tiles, where cents only add width. */
export const whole = (n: number) => Math.round(n).toLocaleString('en-US');

export const fmtAmt = (n: number, cur = 'USD') =>
  `${cur} ${n.toLocaleString('en-US', { minimumFractionDigits: cur === 'TZS' ? 0 : 2, maximumFractionDigits: cur === 'TZS' ? 0 : 2 })}`;

/** Amount in its own currency with the other currency underneath at a stated rate. */
export function DualAmount({ amount, currency, rate, strong }: { amount: number; currency: string; rate: number; strong?: boolean }) {
  const other = currency === 'USD' ? amount * rate : amount / rate;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <Money amount={amount} currency={currency} strong={strong} />
      <span className="xs faint">≈ {fmtAmt(other, currency === 'USD' ? 'TZS' : 'USD')}</span>
    </span>
  );
}

export function DocKindPill({ kind }: { kind: DocKind }) {
  const m: Record<DocKind, [string, 'info' | 'idle' | 'customs' | 'wait']> = {
    PROFORMA: ['Proforma', 'idle'], TAX_INVOICE: ['Tax invoice', 'info'], CREDIT_NOTE: ['Credit note', 'customs'], DEBIT_NOTE: ['Debit note', 'wait'],
  };
  const [l, t] = m[kind];
  return <Pill tone={t}>{l}</Pill>;
}

export function FiscalPill({ status, long }: { status?: FiscalStatus | null; long?: boolean }) {
  if (!status) return <span className="xs faint">Not fiscalised</span>;
  if (status === 'ISSUED') return <Pill tone="go">{long ? 'Fiscal receipt issued' : 'Receipt issued'}</Pill>;
  if (status === 'PENDING') return <Pill tone="wait">Sending to TRA</Pill>;
  return <Pill tone="stop">{long ? 'Fiscal receipt failed' : 'Failed'}</Pill>;
}
export function GlPill({ status }: { status?: GlStatus | null }) {
  if (!status) return <span className="xs faint">Not posted</span>;
  if (status === 'POSTED') return <Pill tone="go">In NG ledger</Pill>;
  if (status === 'PENDING') return <Pill tone="wait">Queued</Pill>;
  return <Pill tone="stop">Failed</Pill>;
}

/** How much this user can waive or credit without asking, from their grant. */
export function useOwnLimit(perm: string) {
  const { grant } = useSession();
  return LIMITS.ownLimitUsd[grant(perm) ?? 'VIEW'] ?? 0;
}

/** Shows what happens when you press the button: applies now, or which approvals it needs. */
export function ApprovalPath({ amountUsd, ownLimit, twoLevelFrom, what }: { amountUsd: number; ownLimit: number; twoLevelFrom: number; what: string }) {
  if (amountUsd <= 0) return null;
  const two = amountUsd >= twoLevelFrom;
  if (!two && amountUsd <= ownLimit) {
    return <Banner tone="go" title="Within your limit">This {what} applies as soon as you confirm (your limit is {fmtAmt(ownLimit)}).</Banner>;
  }
  const steps = two ? [APPROVERS.l1, APPROVERS.l2] : [APPROVERS.l1];
  return (
    <Banner tone="wait" title={two ? `Needs two approvals: ${fmtAmt(twoLevelFrom)} or more` : `Above your limit of ${fmtAmt(ownLimit)}: needs approval`}>
      <span className="stack" style={{ gap: 4, marginTop: 4 }}>
        <span>Nothing changes until it is approved. You will see it in Approvals.</span>
        <span className="row-wrap" style={{ gap: 6 }}>
          <span className="row" style={{ gap: 4 }}><CheckCircle2 size={14} /> You request</span>
          {steps.map((s, i) => <span key={s} className="row" style={{ gap: 4 }}>→ <Clock3 size={14} /> Level {i + 1}: {s}</span>)}
        </span>
      </span>
    </Banner>
  );
}

export function ApprovalSteps({ levels }: { levels: { level: number; who: string; at?: string; decision?: string }[] }) {
  if (!levels.length) return <span className="xs faint">No approval needed (under the limit)</span>;
  return (
    <span className="stack" style={{ gap: 2 }}>
      {levels.map((l) => (
        <span key={l.level} className="row xs" style={{ gap: 4, color: l.decision === 'APPROVED' ? 'var(--go)' : l.decision === 'REJECTED' ? 'var(--stop)' : 'var(--ink-2)' }}>
          {l.decision === 'APPROVED' ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />}
          Level {l.level}: {l.who.split(' · ')[0]}{l.decision ? ` · ${l.decision.toLowerCase()}` : ' · waiting'}
        </span>
      ))}
    </span>
  );
}

export function Totals({ rows }: { rows: [ReactNode, ReactNode, boolean?][] }) {
  return (
    <dl className="mx-totals">
      {rows.map(([k, v, grand], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt className={grand ? 'grand' : undefined}>{k}</dt>
          <dd className={grand ? 'grand' : undefined}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const AGE_LABELS = ['Current', '1–30 days', '31–60 days', '61–90 days', 'Over 90 days'];
export function AgeingBar({ ageing }: { ageing: { current: number; d1_30: number; d31_60: number; d61_90: number; over90: number } }) {
  const vals = [ageing.current, ageing.d1_30, ageing.d31_60, ageing.d61_90, ageing.over90];
  const total = vals.reduce((a, b) => a + b, 0);
  const colours = ['var(--go)', 'var(--idle)', 'var(--wait)', 'var(--dg)', 'var(--stop)'];
  return (
    <div>
      <div className="mx-age" role="img" aria-label={AGE_LABELS.map((l, i) => `${l}: USD ${vals[i].toFixed(2)}`).join(', ')}>
        {total > 0 && vals.map((v, i) => v > 0 && <span key={i} className={`a${i}`} style={{ width: `${(v / total) * 100}%` }} title={`${AGE_LABELS[i]}: ${fmtAmt(v)}`} />)}
      </div>
      <div className="mx-age-legend">
        {vals.map((v, i) => (
          <div key={i}>
            <div className="xs muted"><i style={{ background: colours[i] }} />{AGE_LABELS[i]}</div>
            <div className="strong num" style={{ color: i >= 3 && v > 0 ? 'var(--stop)' : undefined }}><Money amount={v} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Line chart with a zoomed y-axis: exchange rates move a few shillings on a base of ~2,650,
    so the shared LineChart (zero-based axis) would draw a flat line. */
export function RateChart({ dates, values, label, height = 200 }: { dates: string[]; values: number[]; label: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  const [hi, setHi] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height, padL = 44, padB = 22, padT = 10, padR = 8;
  if (values.length < 2) return <div ref={ref} style={{ height }} aria-busy />;
  const lo = Math.floor((Math.min(...values) - 2) / 5) * 5, top = Math.ceil((Math.max(...values) + 2) / 5) * 5;
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, values.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - lo) / (top - lo));
  const ticks = [lo, (lo + top) / 2, top];
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const every = Math.ceil(values.length / 6);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="chart mx-rate-chart" role="img" aria-label={label}
        onMouseLeave={() => setHi(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHi(Math.max(0, Math.min(values.length - 1, Math.round(((px - padL) / (W - padL - padR)) * (values.length - 1)))));
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end">{t.toLocaleString('en-US')}</text>
          </g>
        ))}
        {dates.map((d, i) => i % every === 0 && <text key={d} x={x(i)} y={H - 6} textAnchor="middle">{dShort(d)}</text>)}
        <path d={path} fill="none" stroke="var(--cat1)" strokeWidth={2} />
        {hi !== null && (
          <g>
            <line x1={x(hi)} x2={x(hi)} y1={padT} y2={H - padB} stroke="var(--steel)" />
            <circle cx={x(hi)} cy={y(values[hi])} r={4} fill="var(--cat1)" stroke="var(--paper)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hi !== null && (
        <div className="chart-tip" style={{ left: `${(x(hi) / W) * 100}%`, top: `${(y(values[hi]) / H) * 100}%` }}>
          {dShort(dates[hi])}: <b>TZS {values[hi].toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>
        </div>
      )}
    </div>
  );
}

/** A4 sheet framed for preview; window.print() prints only the sheet. */
export function PrintSheet({ children, small }: { children: ReactNode; small?: boolean }) {
  return <div className="mx-sheet-wrap"><div className={small ? 'mx-sheet mx-sheet-sm' : 'mx-sheet'}>{children}</div></div>;
}
