import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Plus, Wand2 } from 'lucide-react';
import { Button, Empty, Panel, Select, useToast } from '@/ds/components';
import { useSession, SITES } from '@/app/session';
import { SRC, blockedSlots as seedBlocked, sites, type YardNode } from '@/mock/admin';
import { AuditNote, SetupPage, useEditable, useDynamicSites } from '../shared/AdminKit';
import { yardApi } from './api';
import { TreeNode } from './components/TreeNode';
import { NodeDetail } from './components/NodeDetail';
import { GenerateDrawer } from './components/GenerateDrawer';
import { SlotDrawer } from './components/SlotDrawer';
import { TagDrawer } from './components/TagDrawer';
import { AddBlockDrawer } from './components/AddBlockDrawer';

export { yardApi } from './api';

export function YardDesignerView() {
  const { site: sessionSite } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { options: dynamicSiteOptions } = useDynamicSites();
  const [siteId, setSiteId] = useState(sessionSite.siteId);
  const [nodes, setNodes] = useEditable<YardNode>(`yard-${siteId}`, [], () => yardApi.getYardLocations(siteId));
  const [blocked, setBlocked] = useState<Record<string, string>>(seedBlocked);
  const [selId, setSelId] = useState<number | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [gen, setGen] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);

  const siteOptions = dynamicSiteOptions.length > 0 ? dynamicSiteOptions : SITES.map((s) => [String(s.siteId), `${s.siteCode} · ${s.siteName}`] as [string, string]);

  const siteNodes = nodes.filter((n) => n.siteId === siteId);
  const isSlotNode = (n: YardNode) => {
    const k = String(n.kind || (n as any).locationKind || '').toUpperCase();
    return Boolean(n.isSlot || k === 'SLOT' || n.levelNo === 3 || /-[0-9]{2}-[0-9]{2}/.test(n.locationCode || ''));
  };
  const structuralNodes = siteNodes.filter((n) => !isSlotNode(n));
  const roots = structuralNodes.filter((n) => {
    if (!n.parentId) return true;
    return !structuralNodes.some((p) => p.yardLocationId === n.parentId);
  });
  const kids = (id: number) => structuralNodes.filter((n) => n.parentId === id);
  const sel = structuralNodes.find((n) => n.yardLocationId === selId) ?? roots[0];
  const siteName = sites.find((s) => s.siteId === siteId)?.siteName;

  const selRawKind = String(sel?.kind || (sel as any)?.locationKind || (sel?.levelNo === 1 ? 'AREA' : sel?.levelNo === 2 ? 'BLOCK' : 'SLOT') || '').trim().toUpperCase();
  const isArea = selRawKind === 'AREA' || sel?.levelNo === 1 || (sel?.locationCode && sel.locationCode.startsWith('AREA'));

  useEffect(() => {
    setSelId(null);
  }, [siteId]);

  // Auto-select block and slot from URL parameters (e.g. ?block=B or ?block=B&slot=B-01-02)
  useEffect(() => {
    const qBlock = searchParams.get('block')?.toUpperCase();
    const qSlot = searchParams.get('slot')?.toUpperCase();
    if (qBlock && siteNodes.length > 0) {
      const match = siteNodes.find((n) =>
        (n.locationCode || '').toUpperCase() === qBlock ||
        (n.locationCode || '').toUpperCase().replace('BLOCK-', '') === qBlock
      );
      if (match) {
        setSelId(match.yardLocationId!);
        if (match.parentId) {
          setOpen((o) => ({ ...o, [match.parentId!]: true }));
        }
      }
    }
    if (qSlot) {
      setSlot(qSlot);
    }
  }, [searchParams, siteNodes]);

  const patch = (id: number, p: Partial<YardNode>) => {
    yardApi.updateYardLocation(id, p).catch(() => { });
    setNodes((all) => all.map((n) => (n.yardLocationId === id ? { ...n, ...p } : n)));
  };

  const handleDeleteLocation = async (id: number) => {
    try {
      await yardApi.deleteYardLocation(id);
      setNodes((all) => all.filter((n) => n.yardLocationId !== id && n.parentId !== id));
      if (selId === id) {
        setSelId(roots[0]?.yardLocationId || null);
      }
      toast('Location deleted');
    } catch {
      toast('Failed to delete location');
    }
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
            options={siteOptions}
          />
          <Button
            size="sm"
            icon={<MapPin />}
            onClick={() => {
              const blk = sel && !isArea ? sel.locationCode.replace('BLOCK-', '') : '';
              navigate('/yard' + (blk ? `?block=${encodeURIComponent(blk)}` : ''));
            }}
          >
            View on Yard map
          </Button>
          <Button
            variant="primary"
            icon={isArea ? <Plus /> : <Wand2 />}
            perm="admin.yard.design"
            onClick={() => {
              if (isArea) setAddBlockOpen(true);
              else setGen(true);
            }}
          >
            {isArea ? 'Add block' : 'Generate rows and bays'}
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
                const newArea: any = {
                  siteId,
                  kind: 'AREA',
                  levelNo: 1,
                  name: `Yard Area ${siteNodes.length + 1}`,
                  locationCode: `AREA-${siteNodes.length + 1}`,
                  locationName: `Yard Area ${siteNodes.length + 1}`,
                  locationType: 'AREA',
                  capacityTeu: 400
                };
                yardApi.createYardLocation(newArea).then((loc) => {
                  if (loc?.yardLocationId) {
                    setNodes((all) => [...all, loc]);
                    setSelId(loc.yardLocationId);
                  }
                }).catch(() => { });
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
              onAddBlock={() => setAddBlockOpen(true)}
              onDelete={handleDeleteLocation}
            />
          ) : (
            <Panel>
              <Empty title="No yard defined for this site">Add an area, then add blocks and generate their rows and bays.</Empty>
            </Panel>
          )}
          <AuditNote>Every change to a location (code, limits, tags, block state, map position) is logged in the audit trail.</AuditNote>
        </div>
      </div>

      {sel && !isArea && (
        <GenerateDrawer
          key={sel.yardLocationId}
          open={gen}
          onClose={() => setGen(false)}
          parent={sel}
          onCreate={(rows, bays, tiers, a20, a40, a45, w, tags) => {
            yardApi.generateSlots(sel.yardLocationId!, {
              rows,
              bays,
              tiers,
              allows20: a20,
              allows40: a40,
              allows45: a45,
              maxWeightKg: w,
              tags,
            }).catch(() => { });
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
          yardApi.blockSlot(c, r).catch(() => { });
          setBlocked((b) => ({ ...b, [c]: r }));
          toast(`Slot ${c} blocked`);
        }}
        onUnblock={(c) => {
          yardApi.unblockSlot(c).catch(() => { });
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

      {sel && isArea && (
        <AddBlockDrawer
          open={addBlockOpen}
          onClose={() => setAddBlockOpen(false)}
          area={sel}
          onAdd={async (data) => {
            try {
              const createdBlock = await yardApi.createYardLocation({
                siteId,
                parentId: sel.yardLocationId,
                levelNo: 2,
                kind: 'BLOCK',
                locationCode: data.code,
                fullCode: `BLOCK-${data.code}`,
                name: data.name,
                rows: data.rows,
                bays: data.bays,
                maxTier: data.tiers,
                allows20: data.allows20,
                allows40: data.allows40,
                allows45: data.allows45,
                maxWeightKg: data.maxWeightKg,
                tags: [data.tag],
              });

              const blockId = createdBlock?.yardLocationId || createdBlock?.locationId || (Math.floor(Math.random() * 800000) + 1000);
              await yardApi.generateSlots(blockId, {
                rows: data.rows,
                bays: data.bays,
                tiers: data.tiers,
                allows20: data.allows20,
                allows40: data.allows40,
                allows45: data.allows45,
                maxWeightKg: data.maxWeightKg,
                tags: [data.tag],
              });

              setNodes((all) => [
                ...all,
                {
                  ...createdBlock,
                  yardLocationId: blockId,
                  siteId,
                  parentId: sel.yardLocationId,
                  levelNo: 2,
                  locationCode: data.code,
                  fullCode: `BLOCK-${data.code}`,
                  name: data.name,
                  kind: 'BLOCK',
                  rows: data.rows,
                  bays: data.bays,
                  maxTier: data.tiers,
                  allows20: data.allows20,
                  allows40: data.allows40,
                  allows45: data.allows45,
                  maxWeightKg: data.maxWeightKg,
                  tags: [data.tag],
                  childCount: data.rows,
                  isActive: true,
                },
              ]);
              setSelId(blockId);
              setOpen((o) => ({ ...o, [sel.yardLocationId!]: true }));
              toast(`Block ${data.code} and ${data.rows * data.bays * data.tiers} slots created`);
            } catch {
              toast('Failed to create block');
            }
          }}
        />
      )}
    </SetupPage>
  );
}

export { YardDesignerView as YardDesigner };
export default YardDesignerView;
