import { useNavigate } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import { Button, Panel } from '@/ds/components';
import type { Block, Stay } from '@/mock/core';

export type Overlay = 'occupancy' | 'dwell' | 'holds' | 'customs' | 'reefer';

  export function cellColor(units: Stay[], ov: Overlay): { fill: string; border: string; textColor: string; label: string } {
    if (!units.length) return { fill: '#ffffff', border: '#cbd5e1', textColor: '#94a3b8', label: 'Empty' };
    if (ov === 'holds') {
      return units.some((u) => (u.activeHoldCount ?? 0) > 0)
      ?{ fill: '#ef4444', border: '#dc2626', textColor: '#ffffff', label: 'Held unit in stack' }
      : { fill: '#dbeafe', border: '#93c5fd', textColor: '#1e40af', label: 'No holds' };
    }
    if (ov === 'customs') {
      if (units.some((u) => u.customsStatus === 'QUERY' || u.customsStatus === 'UNDER_EXAM')) {
        return { fill: '#f59e0b', border: '#d97706', textColor: '#ffffff', label: 'Exam or query' };
      }
      if (units.every((u) => u.customsStatus === 'CLEARED' || u.customsStatus === 'NOT_REQUIRED')) {
        return { fill: '#10b981', border: '#059669', textColor: '#ffffff', label: 'All cleared' };
      }
      return { fill: '#dbeafe', border: '#93c5fd', textColor: '#1e40af', label: 'Lodged or not lodged' };
    }
    if (ov === 'reefer') {
      if (units.some((u) => u.imoClass)) return { fill: '#ea580c', border: '#c2410c', textColor: '#ffffff', label: 'Dangerous goods' };
      if (units.some((u) => u.reeferSetTempC)) return { fill: '#0284c7', border: '#0369a1', textColor: '#ffffff', label: 'Reefer' };
      return { fill: '#e2e8f0', border: '#cbd5e1', textColor: '#475569', label: 'General' };
    }
    if (ov === 'dwell') {
      const d = Math.max(0, ...units.map((u) => u.unitSummary?.dwellDays ?? (u as any).dwellDays ?? 0));
      return d > 21
          ? { fill: '#ef4444', border: '#dc2626', textColor: '#ffffff', label: '> 21 days' }
          : d > 7
      ?{ fill: '#f59e0b', border: '#d97706', textColor: '#ffffff', label: '8–21 days' }
      : { fill: '#10b981', border: '#059669', textColor: '#ffffff', label: '≤ 7 days' };
    }
    const h = units.length;
    if (h === 1) return { fill: '#dbeafe', border: '#93c5fd', textColor: '#1e40af', label: '1 high' };
    if (h === 2) return { fill: '#93c5fd', border: '#60a5fa', textColor: '#1e3a8a', label: '2 high' };
    if (h === 3) return { fill: '#3b82f6', border: '#2563eb', textColor: '#ffffff', label: '3 high' };
    return { fill: '#1d4ed8', border: '#1e40af', textColor: '#ffffff', label: `${h} high` };
  }

    export function legendFor(ov: Overlay): [string, string, string?][] {
      switch (ov) {
        case 'holds':
          return [
            ['#ef4444', 'Held unit in stack', '#dc2626'],
            ['#dbeafe', 'No holds', '#93c5fd'],
            ['#ffffff', 'Empty', '#cbd5e1'],
          ];
        case 'customs':
          return [
            ['#10b981', 'All cleared', '#059669'],
            ['#f59e0b', 'Exam or query', '#d97706'],
            ['#dbeafe', 'Lodged / not lodged', '#93c5fd'],
            ['#ffffff', 'Empty', '#cbd5e1'],
          ];
        case 'reefer':
          return [
            ['#0284c7', 'Reefer', '#0369a1'],
            ['#ea580c', 'Dangerous goods', '#c2410c'],
            ['#e2e8f0', 'General', '#cbd5e1'],
            ['#ffffff', 'Empty', '#cbd5e1'],
          ];
        case 'dwell':
          return [
            ['#10b981', '≤ 7 days', '#059669'],
            ['#f59e0b', '8–21 days', '#d97706'],
            ['#ef4444', '> 21 days', '#dc2626'],
            ['#ffffff', 'Empty', '#cbd5e1'],
          ];
        default:
          return [
            ['#dbeafe', '1 high', '#93c5fd'],
            ['#93c5fd', '2 high', '#60a5fa'],
            ['#3b82f6', '3 high', '#2563eb'],
            ['#1d4ed8', '4 or more', '#1e40af'],
            ['#ffffff', 'Empty', '#cbd5e1'],
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
      const navigate = useNavigate();

      return (
        <Panel
          title={`Block ${block.code} · bay view`}
          sub={`${block.rows} rows × ${block.bays} bays × ${block.tiers} high. Each square is one ground slot; the colour follows the overlay.`}
          actions={
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <Button
                size="sm"
                icon={<Wand2 />}
                perm="admin.yard.design"
                onClick={() => navigate(`/admin/yard-designer?block=${encodeURIComponent(block.code)}`)}
              >
                Open in Designer
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
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
                      return (
                        <td key={c} style={{ padding: 0 }}>
                          <button
                            onClick={() => onSelectCell({ b: block, row: r + 1, bay: c + 1 })}
                            title={`${block.code}-${String(r + 1).padStart(2, '0')}-${String(c + 1).padStart(2, '0')}: ${col.label
                              }`}
                            style={{
                              width: 40,
                              height: 32,
                              border: `1px solid ${col.border}`,
                              borderRadius: 4,
                              background: col.fill,
                              color: col.textColor,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: st.length > 0 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                              transition: 'all 0.15s ease',
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
                <div className="legend" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {legendFor(ov).map(([fill, label, border]) => (
                    <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                      <i style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: fill, border: `1px solid ${border || '#cbd5e1'}` }} />
                      {label}
                    </span>
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 'auto' }}>Number = units stacked in the slot</span>
                </div>
              </Panel>
            );
}
