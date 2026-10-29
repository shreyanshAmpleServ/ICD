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
  const Icon = KIND_ICON[n.kind] ?? Box;
  const rows = n.kind === 'BLOCK' || n.kind === 'AISLE' ? n.rows ?? 0 : 0;
  const expandable = ch.length > 0 || rows > 0;

  return (
    <li role="treeitem" aria-expanded={expandable ? isOpen : undefined} aria-selected={sel === n.yardLocationId}>
      <button
        className="node"
        aria-current={sel === n.yardLocationId}
        onClick={() => {
          onSel(n.yardLocationId!);
          if (expandable) setOpen((o) => ({ ...o, [n.yardLocationId!]: !isOpen }));
        }}
      >
        {expandable ? (isOpen ? <ChevronDown /> : <ChevronRight />) : <span style={{ width: 16 }} />}
        <Icon />
        <span className="code">{n.locationCode}</span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="muted">
          {n.name.replace(/^.*· /, '')}
        </span>
        {n.draft && <Pill tone="info">Draft</Pill>}
      </button>
      {isOpen && (ch.length > 0 || rows > 0) && (
        <ul role="group">
          {ch.map((c) => (
            <TreeNode key={c.yardLocationId} n={c} kids={kids} sel={sel} onSel={onSel} open={open} setOpen={setOpen} />
          ))}
          {rows > 0 && Array.from({ length: rows }, (_, r) => (
            <li key={r} role="treeitem">
              <span className="node small muted" style={{ display: 'flex', gap: 6, padding: '4px 8px', fontSize: 12 }}>
                <span className="code">{n.kind === 'AISLE' ? `R${r + 1}` : pad(r + 1)}</span>
                {n.kind === 'AISLE' ? `Rack · ${n.bays} bins × ${n.maxTier} levels` : `Row · ${n.bays} bays × ${n.maxTier} tiers`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
