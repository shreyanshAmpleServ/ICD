import { useMemo, useState } from 'react';
import { Chips, Kpi, Meter, Page, PageHeader } from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { blocks as mockBlocks, staysAt, type Block, type Stay } from '@/mock/core';
import { mapApi } from './api';
import { SitePlanSvg } from './components/SitePlanSvg';
import { BlockBayView, type Overlay } from './components/BlockBayView';
import { SlotDetailDrawer } from './components/SlotDetailDrawer';

export { mapApi, mapApi as yardMapApi } from './api';

const OVERLAYS: { id: Overlay; label: string }[] = [
  { id: 'occupancy', label: 'Occupancy' },
  { id: 'dwell', label: 'Dwell days' },
  { id: 'holds', label: 'Holds' },
  { id: 'customs', label: 'Customs' },
  { id: 'reefer', label: 'Reefer & DG' },
];

const BLOCK_LAYOUTS: Record<string, { x: number; y: number; w: number; h: number }> = {
  A: { x: 20, y: 40, w: 180, h: 120 },
  B: { x: 220, y: 40, w: 180, h: 120 },
  C: { x: 420, y: 40, w: 180, h: 120 },
  D: { x: 620, y: 40, w: 180, h: 120 },
  R: { x: 820, y: 40, w: 100, h: 120 },
};

export function YardMapView() {
  const { site } = useSession();
  const [ov, setOv] = useState<Overlay>('occupancy');
  const [blockId, setBlockId] = useState<number | null>(null);
  const [cell, setCell] = useState<{ b: Block; row: number; bay: number } | null>(null);

  // Live Yard Map from DB
  const { data: dbYardMap } = useQ(['yard-map', site.siteId], () => mapApi.getYardMap(site.siteId));

  // Live Units in Yard from DB
  const { data: allStaysList = [] } = useQ(['units', site.siteId], async () => {
    try {
      const res = await api.get<any>('/units');
      const items = res?.items || (Array.isArray(res) ? res : []);
      return items.length > 0 ? items : staysAt(site.siteId);
    } catch {
      return staysAt(site.siteId);
    }
  });

  const siteBlocks: Block[] = useMemo(() => {
    if (dbYardMap && Array.isArray(dbYardMap.blocks) && dbYardMap.blocks.length > 0) {
      return dbYardMap.blocks.map((b: any, i: number) => {
        const code = b.blockCode || String.fromCharCode(65 + i);
        const layout = BLOCK_LAYOUTS[code] || { x: 20 + (i % 4) * 200, y: 40 + Math.floor(i / 4) * 140, w: 180, h: 120 };
        return {
          id: b.blockId || i + 1,
          siteId: site.siteId,
          code,
          name: b.blockName || `Block ${code}`,
          kind: b.zoneType || (code === 'R' ? 'REEFER' : 'DRY'),
          rows: b.rowsCount || 6,
          bays: b.baysCount || 12,
          tiers: b.tiersCount || 4,
          x: layout.x,
          y: layout.y,
          w: layout.w,
          h: layout.h,
        };
      });
    }
    return mockBlocks.filter((b) => b.siteId === site.siteId);
  }, [dbYardMap, site.siteId]);

  const units = useMemo(() => {
    return (allStaysList as Stay[]).filter(
      (s) => s.physicalStatus === 'IN_YARD' && s.currentLocation
    );
  }, [allStaysList]);

  const byBlock = useMemo(() => {
    const m = new Map<string, Stay[]>();
    for (const u of units) {
      const fullCode = u.currentLocation?.fullCode || '';
      const code = fullCode.split('-')[0] || 'A';
      m.set(code, [...(m.get(code) ?? []), u]);
    }
    return m;
  }, [units]);

  const stackAt = (b: Block, row: number, bay: number) =>
    (byBlock.get(b.code) ?? []).filter((u) => {
      const p = (u.currentLocation?.fullCode || '').split('-');
      return Number(p[1]) === row && Number(p[2]) === bay;
    });

  const cap = (b: Block) => b.rows * b.bays * b.tiers;
  const block = siteBlocks.find((b) => b.id === blockId) ?? null;
  const totalCap = siteBlocks.reduce((a, b) => a + cap(b), 0) || 1000;

  return (
    <Page wide>
      <PageHeader
        title="Yard map"
        ms="M1"
        sub={`${site.siteName} · ${units.length} units in ${siteBlocks.length} blocks`}
        actions={<Chips<Overlay> value={ov} onChange={setOv} options={OVERLAYS} />}
      />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Occupancy" value={Math.round((units.length / totalCap) * 100)} unit="%">
            <Meter pct={(units.length / totalCap) * 100} label="Site occupancy" />
          </Kpi>
          <Kpi label="Units in yard" value={units.length} />
          <Kpi label="On hold" value={units.filter((u) => (u.activeHoldCount ?? 0) > 0).length} />
          <Kpi label="Over 21 days" value={units.filter((u) => (u.unitSummary?.dwellDays ?? 0) > 21).length} />
          <Kpi label="Moves waiting" value={5} delta="Active move orders" />
        </div>

        <SitePlanSvg
          siteBlocks={siteBlocks}
          byBlock={byBlock}
          blockId={blockId}
          onSelectBlock={setBlockId}
        />

        {block && (
          <BlockBayView
            block={block}
            ov={ov}
            onClose={() => setBlockId(null)}
            stackAt={stackAt}
            onSelectCell={setCell}
          />
        )}
      </div>

      <SlotDetailDrawer cell={cell} onClose={() => setCell(null)} stackAt={stackAt} />
    </Page>
  );
}

export { YardMapView as YardMap };
export default YardMapView;
