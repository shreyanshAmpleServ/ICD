import { Panel } from '@/ds/components';
import type { Block, Stay } from '@/mock/core';

export interface SitePlanSvgProps {
  siteBlocks: Block[];
  byBlock: Map<string, Stay[]>;
  blockId: number | null;
  onSelectBlock: (id: number) => void;
}

export function SitePlanSvg({ siteBlocks, byBlock, blockId, onSelectBlock }: SitePlanSvgProps) {
  const cap = (b: Block) => b.rows * b.bays * b.tiers;

  return (
    <Panel title="Site plan" sub="Select a block to see its bays">
      <svg viewBox="0 0 940 400" className="chart" role="img" aria-label="Yard plan with blocks">
        <rect x={0} y={0} width={940} height={400} fill="var(--concrete)" rx={8} />
        <text x={20} y={388} style={{ fontSize: 12 }}>
          Gate ↓ main road
        </text>
        {siteBlocks.map((b) => {
          const n = (byBlock.get(b.code) ?? []).length;
          const pct = n / cap(b);
          const held = (byBlock.get(b.code) ?? []).filter((u) => (u.activeHoldCount ?? 0) > 0).length;
          return (
            <g
              key={b.id}
              onClick={() => onSelectBlock(b.id)}
              style={{ cursor: 'pointer' }}
              tabIndex={0}
              role="button"
              aria-label={`Block ${b.code}, ${Math.round(pct * 100)}% full`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelectBlock(b.id);
              }}
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={6}
                fill="var(--paper)"
                stroke={blockId === b.id ? 'var(--ink)' : 'var(--steel)'}
                strokeWidth={blockId === b.id ? 3 : 1.5}
              />
              <rect
                x={b.x}
                y={b.y + b.h - 8}
                width={b.w * Math.min(1, pct)}
                height={8}
                fill={pct > 0.9 ? 'var(--stop)' : pct > 0.75 ? 'var(--wait)' : 'var(--ink-2)'}
                rx={2}
              />
              <text
                x={b.x + 14}
                y={b.y + 30}
                style={{ fontSize: 22, fontWeight: 700, fill: 'var(--ink)', fontFamily: 'var(--font-cond)' }}
              >
                {b.code}
              </text>
              <text x={b.x + 14} y={b.y + 50} className="lbl">
                {b.kind.toLowerCase()} · {n}/{cap(b)}
              </text>
              {held > 0 && (
                <text x={b.x + 14} y={b.y + 68} style={{ fill: 'var(--stop)', fontWeight: 600 }}>
                  {held} on hold
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
