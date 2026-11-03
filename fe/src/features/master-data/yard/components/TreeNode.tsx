import { Box, ChevronDown, ChevronRight, KeyRound, LayoutGrid, Warehouse } from 'lucide-react';
import { Pill } from '@/ds/components';
import type { YardNode } from '@/mock/admin';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const KIND_ICON = { AREA: LayoutGrid, BLOCK: Box, AISLE: Warehouse, KEY_CABINET: KeyRound } as Record<string, typeof Box>;

interface TreeNodeProps {
  n: YardNode;
  kids: (id: number) => YardNode[];
  sel?: number;
  onSel: (id: number) => void;
  open: Record<number, boolean>;
  setOpen: (f: (o: Record<number, boolean>) => Record<number, boolean>) => void;
}

export function TreeNode({ n, kids, sel, onSel, open, setOpen }: TreeNodeProps) {
  const ch = kids(n.yardLocationId!);
  const isOpen = open[n.yardLocationId!] ?? n.levelNo === 1;
  const rawCode = String(n.locationCode || n.name || '').trim();
  const cleanCode = rawCode.replace(/^BLOCK-?/i, '');
  const rawKind = String(n.kind || (n as any).locationKind || (n.levelNo === 1 ? 'AREA' : n.levelNo === 2 ? 'BLOCK' : 'SLOT') || '').trim().toUpperCase();
  const isArea = rawKind === 'AREA' || n.levelNo === 1 || /^AREA/i.test(cleanCode) || /^AREA/i.test(rawCode);
  const isBlock = !isArea && (rawKind === 'BLOCK' || n.levelNo === 2 || !n.levelNo);
  const Icon = KIND_ICON[rawKind] ?? (isArea ? LayoutGrid : isBlock ? Box : Warehouse);
  const rows = (isBlock || rawKind === 'AISLE') ? (n.rows ?? 0) : 0;
  const expandable = ch.length > 0 || rows > 0;

  // Format clean label without redundant duplication (e.g. avoid "AREA-1 AREA-1" or "Block A Block A")
  const displayCode = isArea
    ? `Area ${cleanCode.replace(/^AREA-?/i, '') || cleanCode}`
    : isBlock
      ? (cleanCode.toLowerCase().startsWith('block ') ? cleanCode : `Block ${cleanCode}`)
      : cleanCode;

  let label = (n.name || '').trim();
  const normLabel = label.toLowerCase().replace(/[\s-_]/g, '');
  const normCode = cleanCode.toLowerCase().replace(/[\s-_]/g, '');
  if (!label || normLabel === normCode || normLabel === `block${normCode}` || normLabel === `area${normCode}` || normLabel === 'area' || normLabel === 'block') {
    label = '';
  } else if (label.startsWith(`Block ${cleanCode} · `)) {
    label = label.replace(`Block ${cleanCode} · `, '');
  } else if (label.startsWith(`Area ${cleanCode} · `)) {
    label = label.replace(`Area ${cleanCode} · `, '');
  }

  return (
    <li role="treeitem" aria-expanded={expandable ? isOpen : undefined} aria-selected={sel === n.yardLocationId}>
      <button
        className="node"
        aria-current={sel === n.yardLocationId}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px' }}
        onClick={() => {
          onSel(n.yardLocationId!);
          if (expandable) setOpen((o) => ({ ...o, [n.yardLocationId!]: !isOpen }));
        }}
      >
        {expandable ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
        <Icon size={16} style={{ color: isArea ? 'var(--brand)' : 'inherit' }} />
        <span className="code" style={{ fontWeight: 600 }}>{displayCode}</span>
        {label && (
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} className="muted">
            {label}
          </span>
        )}
        {isArea && ch.length > 0 ? (
          <span className="badge" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--paper-2)', color: 'var(--ink-2)', marginLeft: 'auto' }}>
            {ch.length} {ch.length === 1 ? 'block' : 'blocks'}
          </span>
        ) : null}
        {isBlock && n.rows && n.bays ? (
          <span className="badge" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--paper-2)', color: 'var(--ink-2)', marginLeft: 'auto', fontFamily: 'monospace' }}>
            {n.rows}×{n.bays}
          </span>
        ) : null}
        {n.draft && <Pill tone="info">Draft</Pill>}
      </button>
      {isOpen && (ch.length > 0 || rows > 0) && (
        <ul role="group">
          {ch.map((c) => (
            <TreeNode key={c.yardLocationId} n={c} kids={kids} sel={sel} onSel={onSel} open={open} setOpen={setOpen} />
          ))}
          {rows > 0 && Array.from({ length: rows }, (_, r) => (
            <li key={r} role="treeitem">
              <div className="node small muted" style={{ display: 'flex', gap: 8, padding: '4px 8px 4px 34px', fontSize: 12, alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--ink)', fontSize: 11, background: 'var(--paper-2)', padding: '1px 6px', borderRadius: 4 }}>
                  {n.kind === 'AISLE' ? `R${r + 1}` : `Row ${pad(r + 1)}`}
                </span>
                <span className="muted xs" style={{ flex: 1 }}>
                  {n.kind === 'AISLE' ? `${n.bays} bins · ${n.maxTier} lvls` : `${n.bays} bays · ${n.maxTier} tiers`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
