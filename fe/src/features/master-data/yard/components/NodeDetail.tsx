import { Ban, Move, Tag as TagIcon, Wand2 } from 'lucide-react';
import { Banner, Button, DL, Panel } from '@/ds/components';
import { locationTags, type YardNode } from '@/mock/admin';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const KIND_LABEL: Record<string, string> = { AREA: 'Area', BLOCK: 'Block', AISLE: 'Aisle', KEY_CABINET: 'Key cabinet', ROW: 'Row' };

interface NodeDetailProps {
  n: YardNode;
  kids: YardNode[];
  blocked: Record<string, string>;
  onSlot: (c: string) => void;
  onGen: () => void;
  onTags: () => void;
  onSel: (id: number) => void;
  siteNodes: YardNode[];
}

export function NodeDetail({ n, kids, blocked, onSlot, onGen, onTags, onSel, siteNodes }: NodeDetailProps) {
  const ground = (n.rows ?? 0) * (n.bays ?? 0);
  const cap = ground * (n.maxTier ?? 1);
  const isVehicle = (n.tags ?? []).includes('VEHICLE');
  const tagNames = (n.tags ?? []).map((t) => locationTags.find((x) => x.tagCode === t)?.tagName ?? t);

  if (n.kind === 'AREA') {
    const blocks = siteNodes.filter((x) => x.parentId === n.yardLocationId && x.map);
    return (
      <>
        <Panel
          title={`${KIND_LABEL[n.kind]} ${n.locationCode} · ${n.name}`}
          sub={`${kids.length} children`}
          actions={<Button size="sm" icon={<Wand2 />} perm="admin.yard.design" onClick={onGen}>Add block</Button>}
        >
          <DL cols items={[
            ['Ground slots', kids.reduce((a, k) => a + (k.rows ?? 0) * (k.bays ?? 0), 0)],
            ['Total slots', kids.reduce((a, k) => a + (k.rows ?? 0) * (k.bays ?? 0) * (k.maxTier ?? 1), 0)],
            ['Blocked slots', Object.keys(blocked).filter((c) => kids.some((k) => c.startsWith(k.locationCode + '-'))).length],
            ['Draft blocks', kids.filter((k) => k.draft).length],
          ]} />
        </Panel>
        {blocks.length > 0 && (
          <Panel title="Site plan" sub="Select a block to edit it">
            <svg viewBox="0 0 940 380" className="chart" role="img" aria-label="Site plan with blocks">
              <rect x={0} y={0} width={940} height={380} fill="var(--concrete)" rx={8} />
              {blocks.map((b) => {
                const m = b.map!; const x = Number(m.x), y = Number(m.y), w = Number(m.w), h = Number(m.h);
                return (
                  <g
                    key={b.yardLocationId}
                    onClick={() => onSel(b.yardLocationId!)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Block ${b.locationCode}`}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSel(b.yardLocationId!); }}
                  >
                    <rect x={x} y={y} width={w} height={h} rx={6} fill="var(--paper)" stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray={b.draft ? '6 4' : undefined} />
                    <text x={x + 12} y={y + 28} style={{ fontSize: 22, fontWeight: 700, fill: 'var(--ink)', fontFamily: 'var(--font-cond)' }}>{b.locationCode}</text>
                    <text x={x + 12} y={y + 48} className="lbl">{b.draft ? 'draft · no slots yet' : `${b.rows} × ${b.bays} × ${b.maxTier}`}</text>
                    {h > 70 && <text x={x + 12} y={y + 66}>{(b.tags ?? []).join(' · ').toLowerCase()}</text>}
                    <g transform={`translate(${x + w - 22}, ${y + 10})`} opacity={0.6}><path d="M6 0v12M0 6h12" stroke="var(--ink-3)" strokeWidth={1.5} /></g>
                  </g>
                );
              })}
            </svg>
            <div className="row small muted" style={{ marginTop: 8 }}>
              <Move size={14} /> In the real build you drag and resize blocks on this plan; the position saves to the block's map rectangle.
            </div>
          </Panel>
        )}
      </>
    );
  }

  if (n.kind === 'KEY_CABINET') {
    return (
      <Panel title={`Key cabinet ${n.locationCode}`} sub={n.name}>
        <div className="stack">
          <DL cols items={[['Hooks', `${n.childCount} (H-001 … H-${pad(n.childCount ?? 0, 3)})`], ['Location', 'Gatehouse, locked room'], ['Tags', 'Key cabinet']]} />
          <div className="adm-grid" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }} aria-label="Hooks">
            {Array.from({ length: n.childCount ?? 0 }, (_, i) => <span key={i} title={`H-${pad(i + 1, 3)}`}>{i % 20 === 0 ? pad(i + 1, 3) : ''}</span>)}
          </div>
          <p className="small muted" style={{ margin: 0 }}>Each hook is a slot. Key custody records which vehicle's key hangs where; the release check "Keys handed over" reads it.</p>
        </div>
      </Panel>
    );
  }

  return (
    <>
      {n.draft && (
        <Banner tone="info" title="Draft block: no slots yet" action={<Button size="sm" variant="primary" icon={<Wand2 />} perm="admin.yard.design" onClick={onGen}>Generate rows and bays</Button>}>
          The block is on the plan but the yard cannot use it until rows and bays are generated and it is switched on.
        </Banner>
      )}
      <Panel
        title={`${KIND_LABEL[n.kind]} ${n.locationCode}`}
        sub={n.name}
        actions={
          <>
            <Button size="sm" icon={<TagIcon />} perm="admin.yard.design" onClick={onTags}>Edit tags</Button>
            <Button size="sm" icon={<Wand2 />} perm="admin.yard.design" onClick={onGen}>Generate rows and bays</Button>
          </>
        }
      >
        <div className="stack">
          <DL cols items={[
            [n.kind === 'AISLE' ? 'Racks × bins × levels' : 'Rows × bays × tiers', ground ? `${n.rows} × ${n.bays} × ${n.maxTier}` : '—'],
            [n.kind === 'AISLE' ? 'Bin positions' : 'Slots (all tiers)', cap || '—'],
            ['Takes', isVehicle ? `${n.baySize?.toLowerCase()} bays` : n.kind === 'AISLE' ? 'Pallets and packages' : [n.allows20 && "20'", n.allows40 && "40'", n.allows45 && "45'"].filter(Boolean).join(', ')],
            ['Max weight per slot', n.maxWeightKg ? `${n.maxWeightKg.toLocaleString()} kg` : '—'],
            ['Reefer plugs', n.reeferPlugNo ?? '—'],
            ['Tags', tagNames.length ? <span className="row-wrap" key="t">{tagNames.map((t) => <span key={t} className="tag">{t}</span>)}</span> : '—'],
          ]} />
        </div>
      </Panel>
      {ground > 0 && (
        <Panel
          title={n.kind === 'AISLE' ? 'Racks and bins' : 'Ground slots'}
          sub={n.kind === 'AISLE' ? 'Select a bin to block it' : 'Select a slot to block or unblock it. Blocked slots are never suggested and cannot take a move.'}
        >
          <div style={{ overflowX: 'auto' }}>
            <div className="adm-grid" style={{ gridTemplateColumns: `28px repeat(${n.bays}, minmax(34px, 1fr))`, minWidth: 28 + (n.bays ?? 0) * 37 }}>
              <span style={{ border: 0 }} />
              {Array.from({ length: n.bays ?? 0 }, (_, c) => <span key={c} style={{ border: 0, background: 'none' }}>{pad(c + 1)}</span>)}
              {Array.from({ length: n.rows ?? 0 }, (_, r) => [
                <span key={'h' + r} style={{ border: 0, background: 'none' }}>{n.kind === 'AISLE' ? `R${r + 1}` : pad(r + 1)}</span>,
                ...Array.from({ length: n.bays ?? 0 }, (_, c) => {
                  const code = n.kind === 'AISLE' ? `${n.fullCode}-R${r + 1}-${pad(c + 1)}` : `${n.locationCode}-${pad(r + 1)}-${pad(c + 1)}`;
                  const b = blocked[code];
                  const plug = (n.tags ?? []).includes('REEFER');
                  return (
                    <button
                      key={code}
                      className={b ? 'blocked' : plug ? 'tagged' : undefined}
                      title={b ? `${code}: blocked, ${b}` : code}
                      aria-label={`${code}${b ? ', blocked' : ''}`}
                      onClick={() => onSlot(code)}
                    >
                      {b ? <Ban size={12} /> : ''}
                    </button>
                  );
                }),
              ])}
            </div>
          </div>
          <div className="legend" style={{ marginTop: 12 }}>
            <span><i style={{ background: 'var(--paper)', border: '1px solid var(--steel)' }} />Open</span>
            <span><i style={{ background: 'var(--stop)' }} />Blocked</span>
            {(n.tags ?? []).includes('REEFER') && <span><i style={{ background: 'var(--customs)' }} />Has a reefer plug</span>}
          </div>
        </Panel>
      )}
    </>
  );
}
