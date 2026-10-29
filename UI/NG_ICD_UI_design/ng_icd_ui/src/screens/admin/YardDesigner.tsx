import { useMemo, useState } from 'react';
import { Ban, Box, ChevronDown, ChevronRight, KeyRound, LayoutGrid, Move, Plus, Tag as TagIcon, Unlock, Warehouse, Wand2 } from 'lucide-react';
import {
  Banner, Button, Check, DL, Empty, Field, Input, Panel, Pill, Select, Textarea, useToast,
} from '@/ds/components';
import { useSession, SITES } from '@/app/session';
import { SRC, blockedSlots as seedBlocked, locationTags, sites, yardNodes, type YardNode } from '@/mock/admin';
import { AuditNote, EditDrawer, SetupPage, useEditable } from './AdminKit';

/* Yard designer: GET /yard/locations?siteId=…, POST /yard/locations/generate
   (dry-run first), PATCH /yard/locations/{id} for block/unblock and tags.
   The yard is one tree per site; container slots, vehicle bays, warehouse
   bins and key hooks are all nodes. */
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const KIND_ICON = { AREA: LayoutGrid, BLOCK: Box, AISLE: Warehouse, KEY_CABINET: KeyRound } as Record<string, typeof Box>;
const KIND_LABEL: Record<string, string> = { AREA: 'Area', BLOCK: 'Block', AISLE: 'Aisle', KEY_CABINET: 'Key cabinet', ROW: 'Row' };

export function YardDesigner() {
  const { site: sessionSite } = useSession();
  const toast = useToast();
  const [siteId, setSiteId] = useState(sessionSite.siteId);
  const [nodes, setNodes] = useEditable<YardNode>('yard', yardNodes);
  const [blocked, setBlocked] = useState<Record<string, string>>(seedBlocked);
  const [selId, setSelId] = useState<number | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [gen, setGen] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);

  const siteNodes = nodes.filter((n) => n.siteId === siteId);
  const roots = siteNodes.filter((n) => !n.parentId);
  const kids = (id: number) => siteNodes.filter((n) => n.parentId === id);
  const sel = siteNodes.find((n) => n.yardLocationId === selId) ?? roots[0];
  const siteName = sites.find((s) => s.siteId === siteId)?.siteName;

  const patch = (id: number, p: Partial<YardNode>) => setNodes((all) => all.map((n) => (n.yardLocationId === id ? { ...n, ...p } : n)));

  return (
    <SetupPage wide title="Yard designer" ms="M0" sub={`Levels, blocks and slots for ${siteName}`} sources={[SRC.yard, SRC.tags]}
      actions={<>
        <Select aria-label="Site" style={{ width: 'auto' }} value={String(siteId)} onChange={(e) => { setSiteId(Number(e.target.value)); setSelId(null); }} options={SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`])} />
        <Button variant="primary" icon={<Wand2 />} perm="admin.yard.design" disabled={sel?.kind !== 'BLOCK' && sel?.kind !== 'AISLE'} onClick={() => setGen(true)}>Generate rows and bays</Button>
      </>}>
      <div className="adm-split">
        <Panel flush title="Levels" sub="Area → block → row → bay → tier"
          actions={<Button size="sm" icon={<Plus />} perm="admin.yard.design" onClick={() => toast('Area added')}>Add area</Button>}>
          <div style={{ padding: 8 }}>
            <ul className="adm-tree" role="tree" aria-label="Yard levels">
              {roots.map((r) => <TreeNode key={r.yardLocationId} n={r} kids={kids} sel={sel?.yardLocationId} onSel={setSelId} open={open} setOpen={setOpen} />)}
            </ul>
          </div>
        </Panel>

        <div className="stack-lg" style={{ minWidth: 0 }}>
          {sel ? (
            <NodeDetail n={sel} kids={kids(sel.yardLocationId!)} blocked={blocked} onSlot={setSlot} onGen={() => setGen(true)} onTags={() => setTagsOpen(true)} onSel={setSelId} siteNodes={siteNodes} />
          ) : <Panel><Empty title="No yard defined for this site">Add an area, then add blocks and generate their rows and bays.</Empty></Panel>}
          <AuditNote>Every change to a location (code, limits, tags, block state, map position) is logged in the audit trail.</AuditNote>
        </div>
      </div>

      {sel && <GenerateDrawer key={sel.yardLocationId} open={gen} onClose={() => setGen(false)} parent={sel}
        onCreate={(rows, bays, tiers, a20, a40, a45, w, tags) => {
          patch(sel.yardLocationId!, { rows, bays, maxTier: tiers, allows20: a20, allows40: a40, allows45: a45, maxWeightKg: w, tags: [...new Set([...(sel.tags ?? []), ...tags])], childCount: rows, draft: false, isActive: true });
          toast(`${rows * bays * tiers} slots created`);
        }} />}

      <SlotDrawer code={slot} reason={slot ? blocked[slot] : undefined} onClose={() => setSlot(null)}
        onBlock={(c, r) => { setBlocked((b) => ({ ...b, [c]: r })); toast(`Slot ${c} blocked`); }}
        onUnblock={(c) => { setBlocked((b) => { const x = { ...b }; delete x[c]; return x; }); toast(`Slot ${c} unblocked`); }} />

      {sel && <TagDrawer key={'t' + sel.yardLocationId} open={tagsOpen} onClose={() => setTagsOpen(false)} node={sel}
        onSave={(tags, plugs) => { patch(sel.yardLocationId!, { tags, reeferPlugNo: plugs || null }); toast('Tags saved'); }} />}
    </SetupPage>
  );
}

function TreeNode({ n, kids, sel, onSel, open, setOpen }: {
  n: YardNode; kids: (id: number) => YardNode[]; sel?: number; onSel: (id: number) => void; open: Record<number, boolean>; setOpen: (f: (o: Record<number, boolean>) => Record<number, boolean>) => void;
}) {
  const ch = kids(n.yardLocationId!);
  const isOpen = open[n.yardLocationId!] ?? n.levelNo === 1;
  const Icon = KIND_ICON[n.kind] ?? Box;
  const rows = n.kind === 'BLOCK' || n.kind === 'AISLE' ? n.rows ?? 0 : 0;
  const expandable = ch.length > 0 || rows > 0;
  return (
    <li role="treeitem" aria-expanded={expandable ? isOpen : undefined} aria-selected={sel === n.yardLocationId}>
      <button className="node" aria-current={sel === n.yardLocationId} onClick={() => { onSel(n.yardLocationId!); if (expandable) setOpen((o) => ({ ...o, [n.yardLocationId!]: !isOpen })); }}>
        {expandable ? (isOpen ? <ChevronDown /> : <ChevronRight />) : <span style={{ width: 16 }} />}
        <Icon />
        <span className="code">{n.locationCode}</span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="muted">{n.name.replace(/^.*· /, '')}</span>
        {n.draft && <Pill tone="info">Draft</Pill>}
      </button>
      {isOpen && (ch.length > 0 || rows > 0) && (
        <ul role="group">
          {ch.map((c) => <TreeNode key={c.yardLocationId} n={c} kids={kids} sel={sel} onSel={onSel} open={open} setOpen={setOpen} />)}
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

function NodeDetail({ n, kids, blocked, onSlot, onGen, onTags, onSel, siteNodes }: {
  n: YardNode; kids: YardNode[]; blocked: Record<string, string>; onSlot: (c: string) => void; onGen: () => void; onTags: () => void; onSel: (id: number) => void; siteNodes: YardNode[];
}) {
  const ground = (n.rows ?? 0) * (n.bays ?? 0);
  const cap = ground * (n.maxTier ?? 1);
  const isVehicle = (n.tags ?? []).includes('VEHICLE');
  const tagNames = (n.tags ?? []).map((t) => locationTags.find((x) => x.tagCode === t)?.tagName ?? t);

  if (n.kind === 'AREA') {
    const blocks = siteNodes.filter((x) => x.parentId === n.yardLocationId && x.map);
    return (
      <>
        <Panel title={`${KIND_LABEL[n.kind]} ${n.locationCode} · ${n.name}`} sub={`${kids.length} children`}
          actions={<Button size="sm" icon={<Plus />} perm="admin.yard.design">Add block</Button>}>
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
                  <g key={b.yardLocationId} onClick={() => onSel(b.yardLocationId!)} style={{ cursor: 'pointer' }} role="button" tabIndex={0} aria-label={`Block ${b.locationCode}`}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSel(b.yardLocationId!); }}>
                    <rect x={x} y={y} width={w} height={h} rx={6} fill="var(--paper)" stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray={b.draft ? '6 4' : undefined} />
                    <text x={x + 12} y={y + 28} style={{ fontSize: 22, fontWeight: 700, fill: 'var(--ink)', fontFamily: 'var(--font-cond)' }}>{b.locationCode}</text>
                    <text x={x + 12} y={y + 48} className="lbl">{b.draft ? 'draft · no slots yet' : `${b.rows} × ${b.bays} × ${b.maxTier}`}</text>
                    {h > 70 && <text x={x + 12} y={y + 66}>{(b.tags ?? []).join(' · ').toLowerCase()}</text>}
                    <g transform={`translate(${x + w - 22}, ${y + 10})`} opacity={0.6}><path d="M6 0v12M0 6h12" stroke="var(--ink-3)" strokeWidth={1.5} /></g>
                  </g>
                );
              })}
            </svg>
            <div className="row small muted" style={{ marginTop: 8 }}><Move size={14} /> In the real build you drag and resize blocks on this plan; the position saves to the block's map rectangle.</div>
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
      {n.draft && <Banner tone="info" title="Draft block: no slots yet" action={<Button size="sm" variant="primary" icon={<Wand2 />} perm="admin.yard.design" onClick={onGen}>Generate rows and bays</Button>}>
        The block is on the plan but the yard cannot use it until rows and bays are generated and it is switched on.
      </Banner>}
      <Panel title={`${KIND_LABEL[n.kind]} ${n.locationCode}`} sub={n.name}
        actions={<><Button size="sm" icon={<TagIcon />} perm="admin.yard.design" onClick={onTags}>Edit tags</Button><Button size="sm" icon={<Wand2 />} perm="admin.yard.design" onClick={onGen}>Generate rows and bays</Button></>}>
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
        <Panel title={n.kind === 'AISLE' ? 'Racks and bins' : 'Ground slots'} sub={n.kind === 'AISLE' ? 'Select a bin to block it' : 'Select a slot to block or unblock it. Blocked slots are never suggested and cannot take a move.'}>
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
                  return <button key={code} className={b ? 'blocked' : plug ? 'tagged' : undefined} title={b ? `${code}: blocked, ${b}` : code} aria-label={`${code}${b ? ', blocked' : ''}`} onClick={() => onSlot(code)}>{b ? <Ban size={12} /> : ''}</button>;
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

function GenerateDrawer({ open, onClose, parent, onCreate }: {
  open: boolean; onClose: () => void; parent: YardNode;
  onCreate: (rows: number, bays: number, tiers: number, a20: boolean, a40: boolean, a45: boolean, w: number, tags: string[]) => void;
}) {
  const aisle = parent.kind === 'AISLE';
  const [prefix, setPrefix] = useState(aisle ? `${parent.fullCode}-R` : parent.locationCode);
  const [rowFrom, setRowFrom] = useState((parent.rows ?? 0) + 1);
  const [rowTo, setRowTo] = useState((parent.rows ?? 0) + (parent.rows ? 2 : 4));
  const [bayFrom, setBayFrom] = useState(1);
  const [bayTo, setBayTo] = useState(Math.max(parent.bays ?? 0, aisle ? 6 : 8));
  const existing = parent.rows ?? 0;
  const [tiers, setTiers] = useState(parent.maxTier ?? (aisle ? 4 : 2));
  const [a20, setA20] = useState(parent.allows20 ?? true);
  const [a40, setA40] = useState(parent.allows40 ?? true);
  const [a45, setA45] = useState(parent.allows45 ?? false);
  const [w, setW] = useState(parent.maxWeightKg ?? 32500);
  const [tags, setTags] = useState<string[]>(parent.tags ?? []);
  const rows = Math.max(0, rowTo - rowFrom + 1), bays = Math.max(0, bayTo - bayFrom + 1);
  const count = rows * bays * tiers;
    const overlap = existing > 0 && rowFrom <= existing;
  const bad = rows === 0 || bays === 0 || tiers < 1 || tiers > 8 || count > 5000;
  const code = (r: number, b: number, t: number) => aisle ? `${prefix}${r}-${pad(b)}-${t}` : `${prefix}-${pad(r)}-${pad(b)}-${t}`;
  const samples = useMemo(() => {
    const s: string[] = [];
    for (let r = rowFrom; r <= rowTo && s.length < 6; r++) for (let b = bayFrom; b <= bayTo && s.length < 6; b++) for (let t = 1; t <= tiers && s.length < 6; t++) s.push(code(r, b, t));
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, rowFrom, rowTo, bayFrom, bayTo, tiers]);
  const last = rows && bays ? code(rowTo, bayTo, tiers) : '';
  const num = (v: string) => Math.max(0, Math.min(99, Number(v) || 0));

  return (
    <EditDrawer open={open} onClose={onClose} wide title={`Generate rows and bays in ${parent.locationCode}`} saveLabel={`Create ${count.toLocaleString()} slots`}
      perm="admin.yard.design" disabled={bad || overlap} onSave={() => onCreate(rowTo, bayTo, tiers, a20, a40, a45, w, tags)}>
      <div className="form-grid">
        <Field label="Code prefix" hint="Block code; rows and bays are added after it"><Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} /></Field>
        <Field label={aisle ? 'Racks from' : 'Rows from'}><Input type="number" min={1} value={rowFrom} onChange={(e) => setRowFrom(num(e.target.value))} /></Field>
        <Field label={aisle ? 'Racks to' : 'Rows to'}><Input type="number" min={1} value={rowTo} onChange={(e) => setRowTo(num(e.target.value))} /></Field>
        <Field label={aisle ? 'Bins from' : 'Bays from'}><Input type="number" min={1} value={bayFrom} onChange={(e) => setBayFrom(num(e.target.value))} /></Field>
        <Field label={aisle ? 'Bins to' : 'Bays to'}><Input type="number" min={1} value={bayTo} onChange={(e) => setBayTo(num(e.target.value))} /></Field>
        <Field label={aisle ? 'Levels per bin' : 'Tiers (stack height)'} error={tiers > 8 ? 'At most 8' : undefined}><Input type="number" min={1} max={8} value={tiers} onChange={(e) => setTiers(num(e.target.value))} /></Field>
        <Field label="Max weight per slot (kg)"><Input type="number" value={w} onChange={(e) => setW(Number(e.target.value))} /></Field>
      </div>
      {!aisle && (
        <Field label="Container sizes allowed">
          <div className="row-wrap" style={{ gap: 16 }}><Check label="20 ft" checked={a20} onChange={(e) => setA20(e.target.checked)} /><Check label="40 ft" checked={a40} onChange={(e) => setA40(e.target.checked)} /><Check label="45 ft" checked={a45} onChange={(e) => setA45(e.target.checked)} /></div>
        </Field>
      )}
      <Field label="Tags for the new slots" hint="Allocation only suggests tagged slots for matching units (reefers to reefer plugs, DG to the hazardous area)">
        <div className="row-wrap" style={{ gap: 12 }}>
          {['REEFER', 'HAZARDOUS', 'EXAM', 'IMPORT', 'EXPORT', 'EMPTY', 'TRANSIT', 'DAMAGED', 'QUARANTINE'].map((t) => (
            <Check key={t} label={locationTags.find((x) => x.tagCode === t)?.tagName ?? t} checked={tags.includes(t)} onChange={(e) => setTags(e.target.checked ? [...tags, t] : tags.filter((x) => x !== t))} />
          ))}
        </div>
      </Field>

      <Panel title="Dry run" sub="Nothing is created until you confirm">
        <div className="stack">
          {overlap ? (
            <Banner tone="stop" title={`Rows ${pad(rowFrom)}–${pad(Math.min(rowTo, existing))} already exist`}>Start from row {pad(existing + 1)} to extend the block, or remove the existing rows first.</Banner>
          ) : count > 5000 ? (
            <Banner tone="stop" title="Too many in one go">Generate at most 5,000 slots per run.</Banner>
          ) : (
            <Banner tone="go" title={`${count.toLocaleString()} slots in ${rows} ${aisle ? 'racks' : 'rows'} × ${bays} ${aisle ? 'bins' : 'bays'} × ${tiers} ${aisle ? 'levels' : 'tiers'}`}>
              {rows * bays} ground positions{!aisle && ` · ${(rows * bays * tiers * (a40 ? 2 : 1)).toLocaleString()} TEU at full stack`}.
            </Banner>
          )}
          <div>
            <div className="xs faint" style={{ marginBottom: 4 }}>Sample codes</div>
            <div className="row-wrap">{samples.map((s) => <span key={s} className="adm-code-box">{s}</span>)}{last && <><span className="faint">…</span><span className="adm-code-box">{last}</span></>}</div>
          </div>
          {rows > 0 && bays > 0 && rows * bays <= 400 && (
            <div>
              <div className="xs faint" style={{ marginBottom: 4 }}>Preview (ground positions; existing rows grey, new rows yellow)</div>
              <div className="adm-grid" style={{ gridTemplateColumns: `repeat(${bayTo}, minmax(10px, 1fr))`, maxWidth: 480 }}>
                {Array.from({ length: rowTo }, (_, r) => Array.from({ length: bayTo }, (_, b) => {
                  const isNew = r + 1 >= rowFrom && b + 1 >= bayFrom;
                  const old = r + 1 <= existing && b + 1 <= (parent.bays ?? 0);
                  return <span key={`${r}-${b}`} className={isNew && !old ? 'new' : undefined} style={{ height: 12, background: old ? 'var(--steel)' : undefined }} />;
                }))}
              </div>
            </div>
          )}
        </div>
      </Panel>
    </EditDrawer>
  );
}

function SlotDrawer({ code, reason, onClose, onBlock, onUnblock }: { code: string | null; reason?: string; onClose: () => void; onBlock: (c: string, r: string) => void; onUnblock: (c: string) => void }) {
  const [why, setWhy] = useState('');
  const toBlock = !reason;
  return (
    <EditDrawer key={code ?? ''} open={!!code} onClose={onClose} title={`Slot ${code}`} saveLabel={toBlock ? 'Block slot' : 'Unblock slot'} danger={toBlock}
      perm="admin.yard.design" disabled={toBlock && why.trim().length < 5} onSave={() => { if (!code) return; if (toBlock) onBlock(code, why); else onUnblock(code); setWhy(''); }}>
      {toBlock ? (
        <>
          <p className="small muted">A blocked slot is never suggested by allocation and refuses moves. Units already in it stay until moved.</p>
          <Field label="Why is it blocked?" required hint="Shown to yard staff on the map"><Textarea value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Drainage repair until 15 Oct" /></Field>
        </>
      ) : (
        <>
          <Banner tone="stop" title="Blocked">{reason}</Banner>
          <p className="small muted">Unblocking makes the slot available to allocation straight away.</p>
          <div className="row"><Unlock size={16} /><span className="small">Check the reason has gone before unblocking.</span></div>
        </>
      )}
    </EditDrawer>
  );
}

function TagDrawer({ open, onClose, node, onSave }: { open: boolean; onClose: () => void; node: YardNode; onSave: (t: string[], plugs: string) => void }) {
  const [tags, setTags] = useState<string[]>(node.tags ?? []);
  const [plugs, setPlugs] = useState(node.reeferPlugNo ?? '');
  return (
    <EditDrawer open={open} onClose={onClose} title={`Tags on ${node.locationCode}`} saveLabel="Save tags" perm="admin.yard.design" onSave={() => onSave(tags, plugs)}>
      <p className="small muted">Tags steer allocation and the map overlays. They apply to every slot under this {node.kind.toLowerCase()}.</p>
      <div className="stack">
        {locationTags.map((t) => <Check key={t.tagCode} label={t.tagName} checked={tags.includes(t.tagCode)} onChange={(e) => setTags(e.target.checked ? [...tags, t.tagCode] : tags.filter((x) => x !== t.tagCode))} />)}
      </div>
      {tags.includes('REEFER') && <Field label="Reefer plug numbers" hint="Range or list, e.g. R-01…R-32"><Input value={plugs} onChange={(e) => setPlugs(e.target.value)} /></Field>}
      {tags.includes('HAZARDOUS') && <Banner tone="wait" title="Segregation rules are not loaded">Load the IMDG segregation table before allocating dangerous goods here.</Banner>}
    </EditDrawer>
  );
}
