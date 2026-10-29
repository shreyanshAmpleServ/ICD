import { useState } from 'react';
import { Plus, Wand2 } from 'lucide-react';
import { Button, Empty, Panel, Select, useToast } from '@/ds/components';
import { useSession, SITES } from '@/app/session';
import { SRC, blockedSlots as seedBlocked, sites, yardNodes, type YardNode } from '@/mock/admin';
import { AuditNote, SetupPage, useEditable } from '../../shared/AdminKit';
import { yardApi } from '../api';
import { TreeNode } from './TreeNode';
import { NodeDetail } from './NodeDetail';
import { GenerateDrawer } from './GenerateDrawer';
import { SlotDrawer } from './SlotDrawer';
import { TagDrawer } from './TagDrawer';

export function YardDesignerView() {
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

  const patch = (id: number, p: Partial<YardNode>) => {
    yardApi.updateYardLocation(id, p).catch(() => {});
    setNodes((all) => all.map((n) => (n.yardLocationId === id ? { ...n, ...p } : n)));
  };

  return (
    <SetupPage
      wide
      title="Yard designer"
      ms="M0"
      sub={`Levels, blocks and slots for ${siteName}`}
      sources={[SRC.yard, SRC.tags]}
      actions={
        <>
          <Select
            aria-label="Site"
            style={{ width: 'auto' }}
            value={String(siteId)}
            onChange={(e) => {
              setSiteId(Number(e.target.value));
              setSelId(null);
            }}
            options={SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`])}
          />
          <Button
            variant="primary"
            icon={<Wand2 />}
            perm="admin.yard.design"
            disabled={sel?.kind !== 'BLOCK' && sel?.kind !== 'AISLE'}
            onClick={() => setGen(true)}
          >
            Generate rows and bays
          </Button>
        </>
      }
    >
      <div className="adm-split">
        <Panel
          flush
          title="Levels"
          sub="Area → block → row → bay → tier"
          actions={
            <Button
              size="sm"
              icon={<Plus />}
              perm="admin.yard.design"
              onClick={() => {
                const newArea: any = { siteId, locationCode: `AREA-${siteNodes.length + 1}`, locationName: `Yard Area ${siteNodes.length + 1}`, locationType: 'AREA', capacityTeu: 400 };
                yardApi.createYardLocation(newArea).then((loc) => {
                  if (loc?.yardLocationId) setNodes((all) => [...all, loc]);
                }).catch(() => {});
                toast('Area added');
              }}
            >
              Add area
            </Button>
          }
        >
          <div style={{ padding: 8 }}>
            <ul className="adm-tree" role="tree" aria-label="Yard levels">
              {roots.map((r) => (
                <TreeNode key={r.yardLocationId} n={r} kids={kids} sel={sel?.yardLocationId} onSel={setSelId} open={open} setOpen={setOpen} />
              ))}
            </ul>
          </div>
        </Panel>

        <div className="stack-lg" style={{ minWidth: 0 }}>
          {sel ? (
            <NodeDetail
              n={sel}
              kids={kids(sel.yardLocationId!)}
              blocked={blocked}
              onSlot={setSlot}
              onGen={() => setGen(true)}
              onTags={() => setTagsOpen(true)}
              onSel={setSelId}
              siteNodes={siteNodes}
            />
          ) : (
            <Panel>
              <Empty title="No yard defined for this site">Add an area, then add blocks and generate their rows and bays.</Empty>
            </Panel>
          )}
          <AuditNote>Every change to a location (code, limits, tags, block state, map position) is logged in the audit trail.</AuditNote>
        </div>
      </div>

      {sel && (
        <GenerateDrawer
          key={sel.yardLocationId}
          open={gen}
          onClose={() => setGen(false)}
          parent={sel}
          onCreate={(rows, bays, tiers, a20, a40, a45, w, tags) => {
            patch(sel.yardLocationId!, {
              rows,
              bays,
              maxTier: tiers,
              allows20: a20,
              allows40: a40,
              allows45: a45,
              maxWeightKg: w,
              tags: [...new Set([...(sel.tags ?? []), ...tags])],
              childCount: rows,
              draft: false,
              isActive: true,
            });
            toast(`${rows * bays * tiers} slots created`);
          }}
        />
      )}

      <SlotDrawer
        code={slot}
        reason={slot ? blocked[slot] : undefined}
        onClose={() => setSlot(null)}
        onBlock={(c, r) => {
          setBlocked((b) => ({ ...b, [c]: r }));
          toast(`Slot ${c} blocked`);
        }}
        onUnblock={(c) => {
          setBlocked((b) => {
            const x = { ...b };
            delete x[c];
            return x;
          });
          toast(`Slot ${c} unblocked`);
        }}
      />

      {sel && (
        <TagDrawer
          key={'t' + sel.yardLocationId}
          open={tagsOpen}
          onClose={() => setTagsOpen(false)}
          node={sel}
          onSave={(tags, plugs) => {
            patch(sel.yardLocationId!, { tags, reeferPlugNo: plugs || null });
            toast('Tags saved');
          }}
        />
      )}
    </SetupPage>
  );
}
