import { useMemo, useState } from 'react';
import { Paperclip, Search, X } from 'lucide-react';
import { Button, Check, MiniTracks, SearchInput, UnitNo, cx } from '@/ds/components';
import type { Stay } from '@/mock/core';

/* Small pieces the cargo and control screens share. They are local because
   the design system does not have them yet (see the build report). */

/** A QR-like square pattern drawn from a token. Not a real QR code: the
    prototype only needs something that reads as "scan this at the gate". */
export function QrCode({ token, size = 148 }: { token: string; size?: number }) {
  const n = 21;
  let h = 2166136261;
  for (const ch of token) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const cells: [number, number][] = [];
  const finder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    return inBox(0, 0) || inBox(0, n - 7) || inBox(n - 7, 0);
  };
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (finder(r, c)) continue;
    h = Math.imul(h ^ (r * 31 + c), 2654435761) >>> 0;
    if ((h >>> 13) & 1) cells.push([r, c]);
  }
  const F = ({ x, y }: { x: number; y: number }) => (
    <g>
      <rect x={x} y={y} width={7} height={7} fill="currentColor" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="var(--paper)" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={size} height={size} role="img" aria-label={`Release QR ${token}`} style={{ color: 'var(--ink)', background: 'var(--paper)', borderRadius: 4, display: 'block' }} shapeRendering="crispEdges">
      <F x={0} y={0} /><F x={n - 7} y={0} /><F x={0} y={n - 7} />
      {cells.map(([r, c]) => <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="currentColor" />)}
    </svg>
  );
}

/** Pretend file attachment: shows the chosen file name once "attached". */
export function Evidence({ label = 'Attach file or photo', value, onChange, required, fileName = 'Scan 07-10-2026 10-31.pdf' }: { label?: string; value: string | null; onChange: (v: string | null) => void; required?: boolean; fileName?: string }) {
  if (value) {
    return (
      <span className="row" style={{ gap: 6 }}>
        <span className="tag"><Paperclip size={12} style={{ marginRight: 4 }} />{value}</span>
        <Button size="sm" variant="ghost" aria-label="Remove file" icon={<X />} onClick={() => onChange(null)} />
      </span>
    );
  }
  return (
    <span className="row">
      <Button size="sm" icon={<Paperclip />} onClick={() => onChange(fileName)}>{label}</Button>
      {required && <span className="xs faint">Needed for this type</span>}
    </span>
  );
}

/** Choose several units from a list, with a filter box. */
export function UnitPicker({ stays, value, onChange, max = 200, height = 280 }: { stays: Stay[]; value: number[]; onChange: (v: number[]) => void; max?: number; height?: number }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const n = q.replace(/\s/g, '').toUpperCase();
    return stays.filter((s) => !n || s.cargoUnit.unitNo.includes(n) || (s.unitSummary.consignmentRef ?? '').includes(n)).slice(0, max);
  }, [q, stays, max]);
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const allOn = rows.length > 0 && rows.every((r) => value.includes(r.unitStayId!));
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <div className="spacer"><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by unit or BL" aria-label="Filter units" /></div>
        <Button size="sm" variant="ghost" onClick={() => onChange(allOn ? value.filter((v) => !rows.some((r) => r.unitStayId === v)) : [...new Set([...value, ...rows.map((r) => r.unitStayId!)])])}>
          {allOn ? 'Clear shown' : 'Select shown'}
        </Button>
      </div>
      <div style={{ maxHeight: height, overflow: 'auto', border: '1px solid var(--steel)', borderRadius: 'var(--r-md)' }}>
        {rows.length === 0 && <div className="small faint" style={{ padding: 12 }}>No units match. Clear the filter.</div>}
        {rows.map((s) => (
          <label key={s.unitStayId} className={cx('row')} style={{ padding: '8px 12px', borderBottom: '1px solid var(--steel-2)', cursor: 'pointer', gap: 10, background: value.includes(s.unitStayId!) ? 'var(--hivis-soft)' : undefined }}>
            <Check label="" checked={value.includes(s.unitStayId!)} onChange={() => toggle(s.unitStayId!)} aria-label={`Select ${s.cargoUnit.unitNo}`} />
            <UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} />
            <span className="spacer xs faint" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.cargoUnit.unitTypeCode} · {s.currentLocation?.fullCode ?? 'not in yard'}</span>
            <MiniTracks s={s} />
          </label>
        ))}
      </div>
      <div className="xs muted">{value.length} selected</div>
    </div>
  );
}

/** Hours-left text with the signal colour: red when gone, amber when close. */
export function Countdown({ hours, label }: { hours: number; label?: string }) {
  const a = Math.abs(hours);
  const txt = a < 1 ? `${Math.round(a * 60)} min` : a < 48 ? `${Math.floor(a)} h ${Math.round((a % 1) * 60)} min` : `${Math.round(a / 24)} days`;
  const color = hours < 0 ? 'var(--stop)' : hours < 4 ? 'var(--wait)' : 'var(--ink-2)';
  return <span className="small strong" style={{ color }}>{hours < 0 ? `${label ? label + ' ' : ''}${txt} ago` : `${label ?? 'in'} ${txt}`}</span>;
}

/** Progress bar for "how much has arrived": the DS Meter turns red near 100 %,
    which reads wrong when full means done. */
export function Progress({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="meter" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? 'var(--go)' : 'var(--ink-2)' }} />
    </div>
  );
}
