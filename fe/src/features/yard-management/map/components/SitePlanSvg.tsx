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
  const maxY = siteBlocks.length > 0 ? Math.max(...siteBlocks.map((b) => b.y + b.h)) : 180;
  const svgHeight = Math.max(220, maxY + 38);

  return (
    <Panel title="Site plan" sub="Select a block to see its bays">
      <svg viewBox={`0 0 940 ${svgHeight}`} className="chart" role="img" aria-label="Yard plan with blocks">
        <rect x={0} y={0} width={940} height={svgHeight} fill="var(--concrete)" rx={8} />
        <text x={30} y={svgHeight - 14} style={{ fontSize: 12, fill: 'var(--ink-3)', fontWeight: 500 }}>
          Gate ↓ main road · Terminal entry & weighbridge
        </text>
        {siteBlocks.map((b) => {
          const n = (byBlock.get(b.code) ?? []).length;
          const totalCapacity = cap(b) || 1;
          const pct = n / totalCapacity;
          const held = (byBlock.get(b.code) ?? []).filter((u) => (u.activeHoldCount ?? 0) > 0).length;
          const isSel = blockId === b.id;

          const rawKind = (b.kind || 'DRY').toUpperCase();
          const badgeLabel = rawKind === 'REEFER'
            ? 'REEFER'
            : rawKind === 'EXAM' || b.code === 'EXAM'
              ? 'CUSTOMS'
              : rawKind === 'VEHICLE' || b.code.startsWith('V')
                ? 'VEHICLE'
                : 'DRY';

          const badgeTheme = {
            REEFER: { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' },
            CUSTOMS: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
            VEHICLE: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
            DRY: { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' },
          }[badgeLabel] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' };

          const badgeW = Math.max(48, badgeLabel.length * 7 + 16);
          const badgeH = 20;
          const badgeX = b.x + b.w - badgeW - 14;
          const badgeY = b.y + 14;

          const trackX = b.x + 16;
          const trackY = b.y + b.h - 16;
          const trackW = Math.max(10, b.w - 32);
          const fillW = Math.max(6, trackW * Math.min(1, pct));
          const fillColor = pct > 0.85
            ? '#ef4444'
            : pct > 0.65
              ? '#f59e0b'
              : rawKind === 'REEFER'
                ? '#0284c7'
                : '#2563eb';

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
              {isSel && (
                <rect
                  x={b.x - 2}
                  y={b.y - 2}
                  width={b.w + 4}
                  height={b.h + 4}
                  rx={12}
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth={3}
                  opacity={0.8}
                />
              )}
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={10}
                fill="#ffffff"
                stroke={isSel ? '#2563eb' : '#e2e8f0'}
                strokeWidth={isSel ? 2 : 1.25}
              />

              {/* Zone / Kind Badge */}
              <rect
                x={badgeX}
                y={badgeY}
                width={badgeW}
                height={badgeH}
                rx={4}
                fill={badgeTheme.bg}
                stroke={badgeTheme.border}
                strokeWidth={1}
              />
              <text
                x={badgeX + badgeW / 2}
                y={badgeY + 14}
                textAnchor="middle"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fill: badgeTheme.text,
                  letterSpacing: '0.04em',
                }}
              >
                {badgeLabel}
              </text>

              {/* Block Title */}
              <text
                x={b.x + 16}
                y={b.y + 32}
                style={{ fontSize: 20, fontWeight: 700, fill: '#0f172a', fontFamily: 'var(--font-cond)' }}
              >
                Block {b.code}
              </text>

                {/* Slot Occupancy Count */}
                <text x={b.x + 16} y={b.y + 54} style={{ fontSize: 13, fontWeight: 500, fill: '#64748b' }}>
                  <tspan fontWeight={700} fill="#0f172a">{n}</tspan>/{totalCapacity} slots{' '}
                  <tspan fill="#64748b">({Math.round(pct * 100)}%)</tspan>
                </text>

                {/* Status or Configuration */}
                {held > 0 ? (
                  <g>
                    <circle cx={b.x + 20} cy={b.y + 72} r={3.5} fill="#ef4444" />
                    <text x={b.x + 28} y={b.y + 76} style={{ fill: '#dc2626', fontWeight: 600, fontSize: 12 }}>
                      {held} on hold
                    </text>
                  </g>
                ) : (
                  <text x={b.x + 16} y={b.y + 76} style={{ fill: '#94a3b8', fontSize: 12 }}>
                    {b.rows} rows × {b.bays} bays · {b.tiers} tiers
                  </text>
              )}

        {/* Progress track */}
        <rect
          x={trackX}
          y={trackY}
          width={trackW}
          height={6}
          rx={3}
          fill="#e2e8f0"
        />

        {/* Filled progress indicator (only when pct > 0.005) */}
        {pct > 0.005 && (
          <rect
            x={trackX}
            y={trackY}
            width={fillW}
            height={6}
            rx={3}
            fill={fillColor}
          />
        )}
      </g>
      );
        })}
    </svg>
            </Panel >
          );
}
