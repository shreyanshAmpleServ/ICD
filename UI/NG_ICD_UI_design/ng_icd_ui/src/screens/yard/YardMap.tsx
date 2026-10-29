import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Ban, Flame, ShieldAlert, Snowflake } from 'lucide-react';
import {
  Button, Chips, DL, Drawer, Kpi, Meter, Page, PageHeader, Panel, Pill, StatusPill, UnitNo, HoldPill,
} from '@/ds/components';
import { FLOW } from '@/ds/status';
import { useSession } from '@/app/session';
import { blocks, staysAt, type Block, type Stay } from '@/mock/core';

/* Yard map: GET /yard/map?overlay=… for blocks and slot occupancy, then
   GET /yard/blocks/{id}/slots for the bay view. Canvas (Konva) in the real
   build for large yards; SVG is enough for the design. */
type Overlay = 'occupancy' | 'dwell' | 'holds' | 'customs' | 'reefer';

const OVERLAYS: { id: Overlay; label: string }[] = [
  { id: 'occupancy', label: 'Occupancy' }, { id: 'dwell', label: 'Dwell days' }, { id: 'holds', label: 'Holds' },
  { id: 'customs', label: 'Customs' }, { id: 'reefer', label: 'Reefer & DG' },
];

/** Colour for one stack of units under the chosen overlay. */
function cellColor(units: Stay[], ov: Overlay): { fill: string; label: string } {
  if (!units.length) return { fill: 'var(--paper)', label: 'Empty' };
  if (ov === 'holds') return units.some((u) => (u.activeHoldCount ?? 0) > 0) ? { fill: 'var(--stop)', label: 'Held unit in stack' } : { fill: 'var(--steel)', label: 'No holds' };
  if (ov === 'customs') {
    if (units.some((u) => u.customsStatus === 'QUERY' || u.customsStatus === 'UNDER_EXAM')) return { fill: 'var(--customs)', label: 'Exam or query' };
    if (units.every((u) => u.customsStatus === 'CLEARED' || u.customsStatus === 'NOT_REQUIRED')) return { fill: 'var(--go)', label: 'All cleared' };
    return { fill: 'var(--customs-soft)', label: 'Lodged or not lodged' };
  }
  if (ov === 'reefer') {
    if (units.some((u) => u.imoClass)) return { fill: 'var(--dg)', label: 'Dangerous goods' };
    if (units.some((u) => u.reeferSetTempC)) return { fill: 'var(--reefer)', label: 'Reefer' };
    return { fill: 'var(--steel)', label: 'General' };
  }
  if (ov === 'dwell') {
    const d = Math.max(...units.map((u) => u.unitSummary.dwellDays ?? 0));
    return d > 21 ? { fill: 'var(--stop)', label: '> 21 days' } : d > 7 ? { fill: 'var(--wait)', label: '8–21 days' } : { fill: 'var(--go)', label: '≤ 7 days' };
  }
  const shade = ['var(--steel-2)', 'var(--steel)', 'var(--ink-3)', 'var(--ink-2)', 'var(--ink)'][Math.min(4, units.length)];
  return { fill: shade, label: `${units.length} high` };
}

export function YardMap() {
  const { site } = useSession();
  const [ov, setOv] = useState<Overlay>('occupancy');
  const [blockId, setBlockId] = useState<number | null>(null);
  const [cell, setCell] = useState<{ b: Block; row: number; bay: number } | null>(null);
  const siteBlocks = blocks.filter((b) => b.siteId === site.siteId);
  const units = staysAt(site.siteId).filter((s) => s.physicalStatus === 'IN_YARD' && s.currentLocation);

  const byBlock = useMemo(() => {
    const m = new Map<string, Stay[]>();
    for (const u of units) {
      const code = u.currentLocation!.fullCode.split('-')[0];
      m.set(code, [...(m.get(code) ?? []), u]);
    }
    return m;
  }, [units]);
  const stackAt = (b: Block, row: number, bay: number) => (byBlock.get(b.code) ?? []).filter((u) => {
    const p = u.currentLocation!.fullCode.split('-');
    return Number(p[1]) === row && Number(p[2]) === bay;
  });
  const cap = (b: Block) => b.rows * b.bays * b.tiers;
  const block = siteBlocks.find((b) => b.id === blockId) ?? null;
  const totalCap = siteBlocks.reduce((a, b) => a + cap(b), 0);

  return (
    <Page wide>
      <PageHeader title="Yard map" ms="M1" sub={`${site.siteName} · ${units.length} units in ${siteBlocks.length} blocks`}
        actions={<Chips<Overlay> value={ov} onChange={setOv} options={OVERLAYS} />} />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Occupancy" value={Math.round((units.length / totalCap) * 100)} unit="%"><Meter pct={(units.length / totalCap) * 100} label="Site occupancy" /></Kpi>
          <Kpi label="Units in yard" value={units.length} />
          <Kpi label="On hold" value={units.filter((u) => (u.activeHoldCount ?? 0) > 0).length} />
          <Kpi label="Over 21 days" value={units.filter((u) => (u.unitSummary.dwellDays ?? 0) > 21).length} />
          <Kpi label="Moves waiting" value={7} delta="2 for trucks at the gate" />
        </div>

        <Panel title="Site plan" sub="Select a block to see its bays">
          <svg viewBox="0 0 940 400" className="chart" role="img" aria-label="Yard plan with blocks">
            <rect x={0} y={0} width={940} height={400} fill="var(--concrete)" rx={8} />
            <text x={20} y={388} style={{ fontSize: 12 }}>Gate ↓ main road</text>
            {siteBlocks.map((b) => {
              const n = (byBlock.get(b.code) ?? []).length;
              const pct = n / cap(b);
              const held = (byBlock.get(b.code) ?? []).filter((u) => (u.activeHoldCount ?? 0) > 0).length;
              return (
                <g key={b.id} onClick={() => setBlockId(b.id)} style={{ cursor: 'pointer' }} tabIndex={0} role="button" aria-label={`Block ${b.code}, ${Math.round(pct * 100)}% full`}
                  onKeyDown={(e) => { if (e.key === 'Enter') setBlockId(b.id); }}>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="var(--paper)" stroke={blockId === b.id ? 'var(--ink)' : 'var(--steel)'} strokeWidth={blockId === b.id ? 3 : 1.5} />
                  <rect x={b.x} y={b.y + b.h - 8} width={b.w * Math.min(1, pct)} height={8} fill={pct > .9 ? 'var(--stop)' : pct > .75 ? 'var(--wait)' : 'var(--ink-2)'} rx={2} />
                  <text x={b.x + 14} y={b.y + 30} style={{ fontSize: 22, fontWeight: 700, fill: 'var(--ink)', fontFamily: 'var(--font-cond)' }}>{b.code}</text>
                  <text x={b.x + 14} y={b.y + 50} className="lbl">{b.kind.toLowerCase()} · {n}/{cap(b)}</text>
                  {held > 0 && <text x={b.x + 14} y={b.y + 68} style={{ fill: 'var(--stop)', fontWeight: 600 }}>{held} on hold</text>}
                </g>
              );
            })}
          </svg>
        </Panel>

        {block && (
          <Panel title={`Block ${block.code} · bay view`} sub={`${block.rows} rows × ${block.bays} bays × ${block.tiers} high. Each square is one ground slot; the colour follows the overlay.`}
            actions={<Button size="sm" variant="ghost" onClick={() => setBlockId(null)}>Close</Button>}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 3 }} aria-label={`Block ${block.code} slots`}>
                <thead><tr><th />{Array.from({ length: block.bays }, (_, i) => <th key={i} className="xs faint" style={{ fontWeight: 500 }}>{String(i + 1).padStart(2, '0')}</th>)}</tr></thead>
                <tbody>
                  {Array.from({ length: block.rows }, (_, r) => (
                    <tr key={r}>
                      <th className="xs faint" style={{ fontWeight: 500, paddingRight: 6 }}>{String(r + 1).padStart(2, '0')}</th>
                      {Array.from({ length: block.bays }, (_, c) => {
                        const st = stackAt(block, r + 1, c + 1);
                        const col = cellColor(st, ov);
                        const dark = ['var(--ink)', 'var(--ink-2)', 'var(--stop)', 'var(--customs)', 'var(--go)', 'var(--dg)', 'var(--reefer)', 'var(--wait)'].includes(col.fill);
                        return (
                          <td key={c} style={{ padding: 0 }}>
                            <button onClick={() => setCell({ b: block, row: r + 1, bay: c + 1 })} title={`${block.code}-${String(r + 1).padStart(2, '0')}-${String(c + 1).padStart(2, '0')}: ${col.label}`}
                              style={{ width: 38, height: 30, border: '1px solid var(--steel)', borderRadius: 3, background: col.fill, color: dark ? '#fff' : 'var(--ink-2)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
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
              {legendFor(ov).map(([fill, label]) => <span key={label}><i style={{ background: fill, border: '1px solid var(--steel)' }} />{label}</span>)}
              <span className="faint">Number = units stacked in the slot</span>
            </div>
          </Panel>
        )}
      </div>

      <Drawer open={!!cell} onClose={() => setCell(null)} title={cell ? `Slot ${cell.b.code}-${String(cell.row).padStart(2, '0')}-${String(cell.bay).padStart(2, '0')}` : ''}
        footer={<><Button icon={<Ban />} perm="admin.yard.design">Block slot</Button><Button variant="primary" icon={<ArrowRightLeft />} perm="yard.allocate">Move a unit here</Button></>}>
        {cell && (() => {
          const st = stackAt(cell.b, cell.row, cell.bay).sort((a, b) => Number(b.currentLocation!.fullCode.split('-')[3]) - Number(a.currentLocation!.fullCode.split('-')[3]));
          if (!st.length) return <p className="muted">Empty slot. Takes 20 ft and 40 ft, up to {cell.b.tiers} high.</p>;
          return (
            <div className="stack">
              {st.length > 1 && <p className="small muted">Top of the stack first. To reach the bottom unit, {st.length - 1} unit{st.length > 2 ? 's' : ''} must be moved first.</p>}
              {st.map((u) => (
                <div key={u.unitStayId} className="panel" style={{ padding: 12 }}>
                  <div className="row">{u.currentLocation!.fullCode.split('-')[3] && <span className="tag">Tier {u.currentLocation!.fullCode.split('-')[3]}</span>}<UnitNo no={u.cargoUnit.unitNo} to={`/units/${u.unitStayId}`} /><span className="spacer" /><HoldPill count={u.activeHoldCount ?? 0} /></div>
                  <div className="row-wrap" style={{ marginTop: 8 }}>
                    <Pill tone="info">{u.cargoUnit.unitTypeCode}</Pill><span className="small">{FLOW[u.flow]}</span>
                    <StatusPill value={u.customsStatus} track="customs" /><StatusPill value={u.releaseStatus} track="release" />
                    {u.reeferSetTempC && <Pill tone="customs" icon={<Snowflake />}>{u.reeferSetTempC} °C</Pill>}
                    {u.imoClass && <Pill tone="wait" icon={<Flame />}>IMO {u.imoClass}</Pill>}
                    {(u.activeHoldCount ?? 0) > 0 && <ShieldAlert size={14} color="var(--stop)" />}
                  </div>
                  <div style={{ marginTop: 8 }}><DL items={[['In yard', `${u.unitSummary.dwellDays} days`], ['Line', u.unitSummary.lineCode]]} /></div>
                  <div style={{ marginTop: 8 }}><Link to={`/units/${u.unitStayId}`} className="small">Open unit card</Link></div>
                </div>
              ))}
            </div>
          );
        })()}
      </Drawer>
    </Page>
  );
}

function legendFor(ov: Overlay): [string, string][] {
  switch (ov) {
    case 'holds': return [['var(--stop)', 'Held unit in stack'], ['var(--steel)', 'No holds'], ['var(--paper)', 'Empty']];
    case 'customs': return [['var(--go)', 'All cleared'], ['var(--customs)', 'Exam or query'], ['var(--customs-soft)', 'Lodged / not lodged'], ['var(--paper)', 'Empty']];
    case 'reefer': return [['var(--reefer)', 'Reefer'], ['var(--dg)', 'Dangerous goods'], ['var(--steel)', 'General'], ['var(--paper)', 'Empty']];
    case 'dwell': return [['var(--go)', '≤ 7 days'], ['var(--wait)', '8–21 days'], ['var(--stop)', '> 21 days'], ['var(--paper)', 'Empty']];
    default: return [['var(--steel)', '1 high'], ['var(--ink-3)', '2 high'], ['var(--ink-2)', '3 high'], ['var(--ink)', '4 or more'], ['var(--paper)', 'Empty']];
  }
}
