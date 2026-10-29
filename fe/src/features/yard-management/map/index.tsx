import { useMemo, useState } from 'react';
import { Chips, Kpi, Meter, Page, PageHeader } from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { blocks, staysAt, type Block, type Stay } from '@/mock/core';
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

export function YardMapView() {
  const { site } = useSession();
  const [ov, setOv] = useState<Overlay>('occupancy');
  const [blockId, setBlockId] = useState<number | null>(null);
  const [cell, setCell] = useState<{ b: Block; row: number; bay: number } | null>(null);
  const siteBlocks = blocks.filter((b) => b.siteId === site.siteId);
  const { data: allStaysList = [] } = useQ(['units', site.siteId], () => delay(staysAt(site.siteId)));
  const units = (allStaysList as Stay[]).filter((s) => s.physicalStatus === 'IN_YARD' && s.currentLocation);

  const byBlock = useMemo(() => {
    const m = new Map<string, Stay[]>();
    for (const u of units) {
      const code = u.currentLocation!.fullCode.split('-')[0];
      m.set(code, [...(m.get(code) ?? []), u]);
    }
    return m;
  }, [units]);

  const stackAt = (b: Block, row: number, bay: number) =>
    (byBlock.get(b.code) ?? []).filter((u) => {
      const p = u.currentLocation!.fullCode.split('-');
      return Number(p[1]) === row && Number(p[2]) === bay;
    });

  const cap = (b: Block) => b.rows * b.bays * b.tiers;
  const block = siteBlocks.find((b) => b.id === blockId) ?? null;
  const totalCap = siteBlocks.reduce((a, b) => a + cap(b), 0);

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
          <Kpi label="Over 21 days" value={units.filter((u) => (u.unitSummary.dwellDays ?? 0) > 21).length} />
          <Kpi label="Moves waiting" value={7} delta="2 for trucks at the gate" />
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
