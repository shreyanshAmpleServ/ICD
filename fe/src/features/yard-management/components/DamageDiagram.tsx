import type { ReactNode } from 'react';
import type { S } from '@/api/types';

/* Damage diagram for the inspection form. Tap an area to add a finding.
   Container: an unfolded box (roof above, floor and the far side below).
   Vehicle: a top view, nose to the right. Each zone stores its label in
   finding.locationDetail and its contract area in finding.area. */
export interface Zone { id: string; label: string; area: S<'InspectionFinding'>['area']; shapes: ReactNode; lx: number; ly: number; rot?: boolean }
type Sev = 'MINOR' | 'MAJOR' | 'CRITICAL';

const corrugation = (x: number, y: number, w: number, h: number, step = 18) =>
  Array.from({ length: Math.floor(w / step) - 1 }, (_, i) => <line key={i} x1={x + (i + 1) * step} x2={x + (i + 1) * step} y1={y + 6} y2={y + h - 6} className="dz-line" />);

export const CONTAINER_ZONES: Zone[] = [
  { id: 'ROOF', label: 'Roof', area: 'ROOF', lx: 360, ly: 40, shapes: <><rect x={150} y={12} width={420} height={46} rx={3} />{corrugation(150, 12, 420, 46, 30)}</> },
  { id: 'FRONT', label: 'Front end', area: 'WALLS', lx: 100, ly: 130, shapes: <rect x={62} y={68} width={80} height={114} rx={3} /> },
  { id: 'LEFT', label: 'Left side', area: 'WALLS', lx: 360, ly: 130, shapes: <><rect x={150} y={68} width={420} height={114} rx={3} />{corrugation(150, 68, 420, 114)}</> },
  { id: 'REAR', label: 'Rear frame', area: 'CORNERS', lx: 620, ly: 63, shapes: <><rect x={578} y={68} width={80} height={14} rx={2} /><rect x={578} y={168} width={80} height={14} rx={2} /></> },
  { id: 'DOORS', label: 'Doors', area: 'DOORS', lx: 618, ly: 130, shapes: <><rect x={578} y={84} width={39} height={82} /><rect x={619} y={84} width={39} height={82} />{[588, 606, 629, 647].map((x) => <line key={x} x1={x} x2={x} y1={88} y2={162} className="dz-line" />)}</> },
  { id: 'FLOOR', label: 'Floor', area: 'FLOOR', lx: 360, ly: 216, shapes: <><rect x={150} y={190} width={420} height={46} rx={3} />{Array.from({ length: 6 }, (_, i) => <line key={i} x1={150 + (i + 1) * 60} x2={150 + (i + 1) * 60} y1={192} y2={234} className="dz-line" />)}</> },
  { id: 'RIGHT', label: 'Right side', area: 'WALLS', lx: 360, ly: 290, shapes: <><rect x={150} y={244} width={420} height={80} rx={3} />{corrugation(150, 244, 420, 80)}</> },
];

export const VEHICLE_ZONES: Zone[] = [
  { id: 'LSIDE', label: 'Left side', area: 'EXTERIOR', lx: 360, ly: 46, shapes: <rect x={130} y={28} width={460} height={30} rx={8} /> },
  { id: 'RSIDE', label: 'Right side', area: 'EXTERIOR', lx: 360, ly: 290, shapes: <rect x={130} y={272} width={460} height={30} rx={8} /> },
  { id: 'RBUMP', label: 'Rear bumper', area: 'EXTERIOR', lx: 100, rot: true, ly: 165, shapes: <path d="M120,88 L120,242 L100,242 Q80,240 80,220 L80,110 Q80,90 100,88 Z" /> },
  { id: 'BOOT', label: 'Boot', area: 'EXTERIOR', lx: 175, ly: 165, shapes: <rect x={122} y={66} width={104} height={198} rx={6} /> },
  { id: 'RGLASS', label: 'Rear glass', area: 'EXTERIOR', lx: 250, rot: true, ly: 165, shapes: <path d="M228,76 L272,86 L272,244 L228,254 Z" /> },
  { id: 'ROOF', label: 'Roof', area: 'ROOF', lx: 350, ly: 165, shapes: <rect x={274} y={86} width={150} height={158} rx={4} /> },
  { id: 'WSCREEN', label: 'Windscreen', area: 'EXTERIOR', lx: 448, rot: true, ly: 165, shapes: <path d="M426,86 L472,72 L472,258 L426,244 Z" /> },
  { id: 'BONNET', label: 'Bonnet', area: 'EXTERIOR', lx: 535, ly: 165, shapes: <path d="M474,66 L580,66 Q598,70 598,90 L598,240 Q598,260 580,264 L474,264 Z" /> },
  { id: 'FBUMP', label: 'Front bumper', area: 'EXTERIOR', lx: 620, rot: true, ly: 165, shapes: <path d="M600,88 L620,88 Q640,90 640,110 L640,220 Q640,240 620,242 L600,242 Z" /> },
  { id: 'WHEELS', label: 'Wheels and tyres', area: 'UNDERCARRIAGE', lx: 646, ly: 12, shapes: <>{[[150, 4], [520, 4], [150, 306], [520, 306]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={60} height={20} rx={6} />)}</> },
];

export function DamageDiagram({ category, findings, onPick, readOnly }: {
  category: 'CONTAINER' | 'VEHICLE'; findings: S<'InspectionFinding'>[]; onPick: (z: Zone) => void; readOnly?: boolean;
}) {
  const zones = category === 'VEHICLE' ? VEHICLE_ZONES : CONTAINER_ZONES;
  const worst = (z: Zone): Sev | null => {
    const f = findings.filter((x) => x.locationDetail === z.label);
    if (!f.length) return null;
    return f.some((x) => x.severity === 'CRITICAL') ? 'CRITICAL' : f.some((x) => x.severity === 'MAJOR') ? 'MAJOR' : 'MINOR';
  };
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 720 330" className="chart dmg" role="group" aria-label={category === 'VEHICLE' ? 'Vehicle seen from above, front to the right' : 'Container unfolded: roof on top, left side, floor, then right side'}>
        {category === 'VEHICLE' && <text x={705} y={170} textAnchor="end" className="dz-hint">front →</text>}
        {zones.map((z) => {
          const w = worst(z);
          const n = findings.filter((x) => x.locationDetail === z.label).length;
          const cls = w === 'MINOR' ? 'dz dz-minor' : w ? 'dz dz-major' : 'dz';
          return (
            <g key={z.id} className={cls} role={readOnly ? undefined : 'button'} tabIndex={readOnly ? undefined : 0} aria-label={`${z.label}${n ? `, ${n} finding${n > 1 ? 's' : ''}` : ''}`}
              onClick={readOnly ? undefined : () => onPick(z)} onKeyDown={readOnly ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(z); } }}
              style={{ cursor: readOnly ? 'default' : 'pointer' }}>
              {z.shapes}
              <text x={z.lx} y={z.ly + 4} textAnchor="middle" className="dz-label" transform={z.rot ? `rotate(-90 ${z.lx} ${z.ly})` : undefined}>{z.label}</text>
              {n > 0 && z.rot && (
                <g><circle cx={z.lx} cy={z.ly - z.label.length * 4 - 18} r={10} className="dz-badge" /><text x={z.lx} y={z.ly - z.label.length * 4 - 14} textAnchor="middle" className="dz-badge-t">{n}</text></g>
              )}
              {n > 0 && !z.rot && (
                <g>
                  <circle cx={Math.min(708, z.lx + z.label.length * 4 + 16)} cy={z.ly} r={10} className="dz-badge" />
                  <text x={Math.min(708, z.lx + z.label.length * 4 + 16)} y={z.ly + 4} textAnchor="middle" className="dz-badge-t">{n}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="legend" style={{ marginTop: 8 }}>
        <span><i style={{ background: 'var(--paper)', border: '1px solid var(--ink-3)' }} />No damage</span>
        <span><i style={{ background: 'var(--wait-soft)', border: '1px solid var(--wait)' }} />Minor</span>
        <span><i style={{ background: 'var(--stop-soft)', border: '1px solid var(--stop)' }} />Major or critical</span>
        {!readOnly && <span className="faint">Tap an area to add a finding</span>}
      </div>
      <style>{`
        .dmg .dz rect, .dmg .dz path { fill: var(--paper); stroke: var(--ink-3); stroke-width: 1.5; transition: stroke-width .1s; }
        .dmg .dz-minor rect, .dmg .dz-minor path { fill: var(--wait-soft); stroke: var(--wait); }
        .dmg .dz-major rect, .dmg .dz-major path { fill: var(--stop-soft); stroke: var(--stop); }
        .dmg .dz[role=button]:hover rect, .dmg .dz[role=button]:hover path { stroke-width: 3; }
        .dmg .dz:focus-visible { outline: none; }
        .dmg .dz:focus-visible rect, .dmg .dz:focus-visible path { stroke: var(--hivis); stroke-width: 4; }
        .dmg .dz-line { stroke: var(--steel); stroke-width: 1; pointer-events: none; }
        .dmg .dz-label { font-size: 14px; font-weight: 600; fill: var(--ink); pointer-events: none; }
        .dmg .dz-hint { font-size: 12px; fill: var(--ink-3); }
        .dmg .dz-badge { fill: var(--ink); }
        .dmg .dz-badge-t { fill: var(--paper); font-size: 12px; font-weight: 700; pointer-events: none; }
      `}</style>
    </figure>
  );
}
