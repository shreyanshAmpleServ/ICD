import { Button, Panel } from '@/ds/components';
import type { Block, Stay } from '@/mock/core';

export type Overlay = 'occupancy' | 'dwell' | 'holds' | 'customs' | 'reefer';

export function cellColor(units: Stay[], ov: Overlay): { fill: string; label: string } {
  if (!units.length) return { fill: 'var(--paper)', label: 'Empty' };
  if (ov === 'holds') {
    return units.some((u) => (u.activeHoldCount ?? 0) > 0)
      ? { fill: 'var(--stop)', label: 'Held unit in stack' }
      : { fill: 'var(--steel)', label: 'No holds' };
  }
  if (ov === 'customs') {
    if (units.some((u) => u.customsStatus === 'QUERY' || u.customsStatus === 'UNDER_EXAM')) {
      return { fill: 'var(--customs)', label: 'Exam or query' };
    }
    if (units.every((u) => u.customsStatus === 'CLEARED' || u.customsStatus === 'NOT_REQUIRED')) {
      return { fill: 'var(--go)', label: 'All cleared' };
    }
    return { fill: 'var(--customs-soft)', label: 'Lodged or not lodged' };
  }
  if (ov === 'reefer') {
    if (units.some((u) => u.imoClass)) return { fill: 'var(--dg)', label: 'Dangerous goods' };
    if (units.some((u) => u.reeferSetTempC)) return { fill: 'var(--reefer)', label: 'Reefer' };
    return { fill: 'var(--steel)', label: 'General' };
  }
  if (ov === 'dwell') {
    const d = Math.max(...units.map((u) => u.unitSummary.dwellDays ?? 0));
    return d > 21
      ? { fill: 'var(--stop)', label: '> 21 days' }
      : d > 7
      ? { fill: 'var(--wait)', label: '8–21 days' }
      : { fill: 'var(--go)', label: '≤ 7 days' };
  }
  const shade = ['var(--steel-2)', 'var(--steel)', 'var(--ink-3)', 'var(--ink-2)', 'var(--ink)'][
    Math.min(4, units.length)
  ];
  return { fill: shade, label: `${units.length} high` };
}

export function legendFor(ov: Overlay): [string, string][] {
  switch (ov) {
    case 'holds':
      return [
        ['var(--stop)', 'Held unit in stack'],
        ['var(--steel)', 'No holds'],
        ['var(--paper)', 'Empty'],
      ];
    case 'customs':
      return [
        ['var(--go)', 'All cleared'],
        ['var(--customs)', 'Exam or query'],
        ['var(--customs-soft)', 'Lodged / not lodged'],
        ['var(--paper)', 'Empty'],
      ];
    case 'reefer':
      return [
        ['var(--reefer)', 'Reefer'],
        ['var(--dg)', 'Dangerous goods'],
        ['var(--steel)', 'General'],
        ['var(--paper)', 'Empty'],
      ];
    case 'dwell':
      return [
        ['var(--go)', '≤ 7 days'],
        ['var(--wait)', '8–21 days'],
        ['var(--stop)', '> 21 days'],
        ['var(--paper)', 'Empty'],
      ];
    default:
      return [
        ['var(--steel)', '1 high'],
        ['var(--ink-3)', '2 high'],
        ['var(--ink-2)', '3 high'],
        ['var(--ink)', '4 or more'],
        ['var(--paper)', 'Empty'],
      ];
  }
}

export interface BlockBayViewProps {
  block: Block;
  ov: Overlay;
  onClose: () => void;
  stackAt: (b: Block, row: number, bay: number) => Stay[];
  onSelectCell: (cell: { b: Block; row: number; bay: number }) => void;
}

export function BlockBayView({ block, ov, onClose, stackAt, onSelectCell }: BlockBayViewProps) {
  return (
    <Panel
      title={`Block ${block.code} · bay view`}
      sub={`${block.rows} rows × ${block.bays} bays × ${block.tiers} high. Each square is one ground slot; the colour follows the overlay.`}
      actions={
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 3 }} aria-label={`Block ${block.code} slots`}>
          <thead>
            <tr>
              <th />
              {Array.from({ length: block.bays }, (_, i) => (
                <th key={i} className="xs faint" style={{ fontWeight: 500 }}>
                  {String(i + 1).padStart(2, '0')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: block.rows }, (_, r) => (
              <tr key={r}>
                <th className="xs faint" style={{ fontWeight: 500, paddingRight: 6 }}>
                  {String(r + 1).padStart(2, '0')}
                </th>
                {Array.from({ length: block.bays }, (_, c) => {
                  const st = stackAt(block, r + 1, c + 1);
                  const col = cellColor(st, ov);
                  const dark = [
                    'var(--ink)',
                    'var(--ink-2)',
                    'var(--stop)',
                    'var(--customs)',
                    'var(--go)',
                    'var(--dg)',
                    'var(--reefer)',
                    'var(--wait)',
                  ].includes(col.fill);
                  return (
                    <td key={c} style={{ padding: 0 }}>
                      <button
                        onClick={() => onSelectCell({ b: block, row: r + 1, bay: c + 1 })}
                        title={`${block.code}-${String(r + 1).padStart(2, '0')}-${String(c + 1).padStart(2, '0')}: ${
                          col.label
                        }`}
                        style={{
                          width: 38,
                          height: 30,
                          border: '1px solid var(--steel)',
                          borderRadius: 3,
                          background: col.fill,
                          color: dark ? '#fff' : 'var(--ink-2)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {st.length || ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend" style={{ marginTop: 12 }}>
        {legendFor(ov).map(([fill, label]) => (
          <span key={label}>
            <i style={{ background: fill, border: '1px solid var(--steel)' }} />
            {label}
          </span>
        ))}
        <span className="faint">Number = units stacked in the slot</span>
      </div>
    </Panel>
  );
}
