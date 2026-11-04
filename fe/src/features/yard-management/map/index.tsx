import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import { Button, Chips, Kpi, Meter, Page, PageHeader } from '@/ds/components';
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

const INVALID_BLOCK_CODES = new Set(['MAIN', 'KC1', 'AREA', 'WH1', 'VEH', 'GATE']);

export function YardMapView() {
  const { site } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    const rawBlocks = (dbYardMap && Array.isArray(dbYardMap.blocks) && dbYardMap.blocks.length > 0)
      ? dbYardMap.blocks
      : mockBlocks.filter((b) => b.siteId === site.siteId);

    const validBlocks = rawBlocks.filter((b: any) => {
      const code = (b.blockCode || b.code || '').toUpperCase();
      const kind = (b.kind || b.zoneType || '').toUpperCase();
      if (INVALID_BLOCK_CODES.has(code)) return false;
      if (code.startsWith('AREA') || code.startsWith('KC') || code.startsWith('WH') || code.startsWith('GATE') || code.startsWith('MAIN') || code.startsWith('VEH')) return false;
      if (kind === 'AREA' || kind === 'KEY_CABINET' || kind === 'AISLE') return false;
      if (b.siteId && b.siteId !== site.siteId) return false;
      return true;
    });

    const totalBlocks = validBlocks.length;
    const isVehicleSite = site.siteId === 2;

    if (isVehicleSite && totalBlocks <= 2 && totalBlocks > 0) {
      return validBlocks.map((b: any, i: number) => {
        const code = (b.blockCode || b.code || `V${i + 1}`).toUpperCase();
        return {
          id: b.blockId || b.id || i + 1,
          siteId: site.siteId,
          code,
          name: b.blockName || b.name || `Zone ${code}`,
          kind: 'VEHICLE',
          rows: b.rowsCount || b.rows || (i === 0 ? 4 : 3),
          bays: b.baysCount || b.bays || (i === 0 ? 6 : 5),
          tiers: 1,
          x: 40 + i * 440,
          y: 40,
          w: 420,
          h: 150,
        };
      });
    }

    let cols = 3;
    if (totalBlocks <= 3) cols = Math.max(1, totalBlocks);
    else if (totalBlocks === 4) cols = 2;
    else if (totalBlocks <= 6) cols = 3;
    else if (totalBlocks <= 8) cols = 4;
    else cols = 5;

    const gapX = 20;
    const gapY = 20;
    const totalGapsW = (cols - 1) * gapX;
    const maxContentW = 880;
    const cardW = Math.floor((maxContentW - totalGapsW) / cols);
    const cardH = 124;
    const totalGridW = cols * cardW + totalGapsW;
    const startX = Math.round((940 - totalGridW) / 2);
    const startY = 30;

    return validBlocks.map((b: any, i: number) => {
      let code = (b.blockCode || b.code || String.fromCharCode(65 + i)).toUpperCase();
      if (code === 'REEFER') code = 'R';
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      return {
        id: b.blockId || b.id || i + 1,
        siteId: site.siteId,
        code,
        name: b.blockName || b.name || `Block ${code}`,
        kind: b.zoneType || b.kind || (code === 'R' ? 'REEFER' : code === 'EXAM' ? 'EXAM' : 'DRY'),
        rows: b.rowsCount || b.rows || (code === 'R' ? 4 : code === 'EXAM' ? 2 : 6),
        bays: b.baysCount || b.bays || (code === 'R' ? 8 : code === 'EXAM' ? 6 : 12),
        tiers: b.tiersCount || b.tiers || (code === 'R' ? 3 : code === 'EXAM' ? 2 : 4),
        x,
        y,
        w: cardW,
        h: cardH,
      };
    });
  }, [dbYardMap, site.siteId]);

  const units = useMemo(() => {
    return (allStaysList as Stay[]).filter(
      (s) => (s.physicalStatus === 'IN_YARD' || s.physicalStatus === 'AT_ACTIVITY') && s.currentLocation
    );
  }, [allStaysList]);

  const byBlock = useMemo(() => {
    const m = new Map<string, Stay[]>();
    for (const u of units) {
      const fullCode = u.currentLocation?.fullCode || '';
      let code = (fullCode.split('-')[0] || 'A').toUpperCase();
      if (code === 'REEFER') code = 'R';
      if (code === 'X') code = 'EXAM';
      m.set(code, [...(m.get(code) ?? []), u]);
    }
    return m;
  }, [units]);

  const stackAt = (b: Block, row: number, bay: number) => {
    const blockCode = b.code.toUpperCase();
    const list = byBlock.get(blockCode) ?? [];
    return list.filter((u) => {
      const p = (u.currentLocation?.fullCode || '').split('-');
      if (p.length >= 3) {
        return Number(p[1]) === row && Number(p[2]) === bay;
      }
      if (p.length === 2) {
        return (row === 1 && Number(p[1]) === bay) || (bay === 1 && Number(p[1]) === row);
      }
      return false;
    });
  };

  // Auto-select block and slot from URL parameters (e.g. ?block=B or ?block=B&slot=B-01-02)
  useEffect(() => {
    const qBlock = searchParams.get('block')?.toUpperCase();
    const qSlot = searchParams.get('slot')?.toUpperCase();
    if (qBlock && siteBlocks.length > 0) {
      const match = siteBlocks.find((b) => b.code.toUpperCase() === qBlock);
      if (match) {
        setBlockId(match.id);
        if (qSlot) {
          const parts = qSlot.split('-');
          if (parts.length >= 3) {
            setCell({ b: match, row: Number(parts[1]), bay: Number(parts[2]) });
          }
        }
      }
    }
  }, [searchParams, siteBlocks]);

  const cap = (b: Block) => b.rows * b.bays * b.tiers;
  const block = siteBlocks.find((b) => b.id === blockId) ?? null;
  const totalCap = siteBlocks.reduce((a, b) => a + cap(b), 0) || 1000;

  return (
    <Page wide>
      <PageHeader
        title="Yard map"
        ms="M1"
        sub={`${site.siteName} · ${units.length} units in ${siteBlocks.length} blocks`}
        actions={
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <Chips<Overlay> value={ov} onChange={setOv} options={OVERLAYS} />
            <Button
              size="sm"
              icon={<Wand2 />}
              perm="admin.yard.design"
              onClick={() => navigate('/admin/yard-designer' + (block ? `?block=${block.code}` : ''))}
            >
              Yard designer
            </Button>
          </div>
        }
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
