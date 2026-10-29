import { Link } from 'react-router-dom';
import { ArrowRightLeft, Ban, Flame, ShieldAlert, Snowflake } from 'lucide-react';
import { Button, DL, Drawer, HoldPill, Pill, StatusPill, UnitNo } from '@/ds/components';
import { FLOW } from '@/ds/status';
import type { Block, Stay } from '@/mock/core';

export interface SlotDetailDrawerProps {
  cell: { b: Block; row: number; bay: number } | null;
  onClose: () => void;
  stackAt: (b: Block, row: number, bay: number) => Stay[];
}

export function SlotDetailDrawer({ cell, onClose, stackAt }: SlotDetailDrawerProps) {
  return (
    <Drawer
      open={!!cell}
      onClose={onClose}
      title={
        cell
          ? `Slot ${cell.b.code}-${String(cell.row).padStart(2, '0')}-${String(cell.bay).padStart(2, '0')}`
          : ''
      }
      footer={
        <>
          <Button icon={<Ban />} perm="admin.yard.design">
            Block slot
          </Button>
          <Button variant="primary" icon={<ArrowRightLeft />} perm="yard.allocate">
            Move a unit here
          </Button>
        </>
      }
    >
      {cell &&
        (() => {
          const st = stackAt(cell.b, cell.row, cell.bay).sort(
            (a, b) =>
              Number(b.currentLocation!.fullCode.split('-')[3]) - Number(a.currentLocation!.fullCode.split('-')[3])
          );
          if (!st.length) return <p className="muted">Empty slot. Takes 20 ft and 40 ft, up to {cell.b.tiers} high.</p>;
          return (
            <div className="stack">
              {st.length > 1 && (
                <p className="small muted">
                  Top of the stack first. To reach the bottom unit, {st.length - 1} unit
                  {st.length > 2 ? 's' : ''} must be moved first.
                </p>
              )}
              {st.map((u) => (
                <div key={u.unitStayId} className="panel" style={{ padding: 12 }}>
                  <div className="row">
                    {u.currentLocation!.fullCode.split('-')[3] && (
                      <span className="tag">Tier {u.currentLocation!.fullCode.split('-')[3]}</span>
                    )}
                    <UnitNo no={u.cargoUnit.unitNo} to={`/units/${u.unitStayId}`} />
                    <span className="spacer" />
                    <HoldPill count={u.activeHoldCount ?? 0} />
                  </div>
                  <div className="row-wrap" style={{ marginTop: 8 }}>
                    <Pill tone="info">{u.cargoUnit.unitTypeCode}</Pill>
                    <span className="small">{FLOW[u.flow]}</span>
                    <StatusPill value={u.customsStatus} track="customs" />
                    <StatusPill value={u.releaseStatus} track="release" />
                    {u.reeferSetTempC && (
                      <Pill tone="customs" icon={<Snowflake />}>
                        {u.reeferSetTempC} °C
                      </Pill>
                    )}
                    {u.imoClass && (
                      <Pill tone="wait" icon={<Flame />}>
                        IMO {u.imoClass}
                      </Pill>
                    )}
                    {(u.activeHoldCount ?? 0) > 0 && <ShieldAlert size={14} color="var(--stop)" />}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <DL
                      items={[
                        ['In yard', `${u.unitSummary.dwellDays} days`],
                        ['Line', u.unitSummary.lineCode],
                      ]}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Link to={`/units/${u.unitStayId}`} className="small">
                      Open unit card
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
    </Drawer>
  );
}
