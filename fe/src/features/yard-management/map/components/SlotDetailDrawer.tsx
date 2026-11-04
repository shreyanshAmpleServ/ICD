import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Ban, CheckCircle, Flame, ShieldAlert, Snowflake, Wand2 } from 'lucide-react';
import { Button, DL, Drawer, HoldPill, Pill, StatusPill, UnitNo, useToast } from '@/ds/components';
import { FLOW } from '@/ds/status';
import { api } from '@/api/client';
import type { Block, Stay } from '@/mock/core';

export interface SlotDetailDrawerProps {
  cell: { b: Block; row: number; bay: number } | null;
  onClose: () => void;
  stackAt: (b: Block, row: number, bay: number) => Stay[];
}

export function SlotDetailDrawer({ cell, onClose, stackAt }: SlotDetailDrawerProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [isBlocking, setIsBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const slotCode = cell
    ? `${cell.b.code}-${String(cell.row).padStart(2, '0')}-${String(cell.bay).padStart(2, '0')}`
    : '';

  const handleToggleBlock = async () => {
    if (!slotCode) return;
    setIsBlocking(true);
    try {
      if (isBlocked) {
        await api.post('/yard/slots/unblock', { slotCode });
        setIsBlocked(false);
        toast(`Slot ${slotCode} unblocked`);
      } else {
        await api.post('/yard/slots/block', { slotCode, reason: 'Manual block from Yard Map' });
        setIsBlocked(true);
        toast(`Slot ${slotCode} blocked`);
      }
    } catch {
      toast(`Failed to update slot ${slotCode}`);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleMoveHere = () => {
    if (slotCode) {
      navigate(`/moves?target=${encodeURIComponent(slotCode)}`);
    }
  };

  return (
    <Drawer
      open={!!cell}
      onClose={onClose}
      title={cell ? `Slot ${slotCode}` : ''}
      footer={
        <div className="row-wrap" style={{ gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          <Button
            size="sm"
            icon={<Wand2 />}
            perm="admin.yard.design"
            onClick={() => {
              if (cell) {
                navigate(`/admin/yard-designer?block=${encodeURIComponent(cell.b.code)}&slot=${encodeURIComponent(slotCode)}`);
              }
            }}
          >
            Configure in Designer
          </Button>
          <Button
            size="sm"
            icon={isBlocked ? <CheckCircle /> : <Ban />}
            perm="admin.yard.design"
            disabled={isBlocking}
            onClick={handleToggleBlock}
          >
            {isBlocked ? 'Unblock slot' : 'Block slot'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<ArrowRightLeft />}
            perm="yard.allocate"
            onClick={handleMoveHere}
          >
            Move a unit here
          </Button>
        </div>
      }
    >
      {cell &&
        (() => {
          const st = stackAt(cell.b, cell.row, cell.bay).sort((a, b) => {
            const tierA = Number(a.currentLocation?.fullCode?.split('-')[3] ?? 1);
            const tierB = Number(b.currentLocation?.fullCode?.split('-')[3] ?? 1);
            return tierB - tierA;
          });
          if (!st.length) return <p className="muted">Empty slot. Takes 20 ft and 40 ft, up to {cell.b.tiers} high.</p>;
          return (
            <div className="stack">
              {st.length > 1 && (
                <p className="small muted">
                  Top of the stack first. To reach the bottom unit, {st.length - 1} unit
                  {st.length > 2 ? 's' : ''} must be moved first.
                </p>
              )}
              {st.map((u) => {
                const tier = u.currentLocation?.fullCode?.split('-')[3];
                const unitNumber = u.cargoUnit?.unitNo || (u as any).unitNo || 'UNKNOWN';
                const unitType = u.cargoUnit?.unitTypeCode || (u as any).unitTypeCode || '20GP';
                const dwell = u.unitSummary?.dwellDays ?? (u as any).dwellDays ?? 0;
                const line = u.unitSummary?.lineCode ?? (u as any).lineCode ?? '—';
                return (
                  <div key={u.unitStayId} className="panel" style={{ padding: 12 }}>
                    <div className="row">
                      {tier && <span className="tag">Tier {tier}</span>}
                      <UnitNo no={unitNumber} to={`/units/${u.unitStayId}`} />
                      <span className="spacer" />
                      <HoldPill count={u.activeHoldCount ?? 0} />
                    </div>
                    <div className="row-wrap" style={{ marginTop: 8 }}>
                      <Pill tone="info">{unitType}</Pill>
                      <span className="small">{FLOW[u.flow] || u.flow}</span>
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
                          ['In yard', `${dwell} days`],
                          ['Line', line],
                        ]}
                      />
                    </div>
                    <div className="row-wrap" style={{ marginTop: 8, gap: 12 }}>
                      <Link to={`/units/${u.unitStayId}`} className="small">
                        Open unit card
                      </Link>
                      <Link to={`/moves?fromLocation=${encodeURIComponent(slotCode)}&unitNo=${encodeURIComponent(unitNumber)}`} className="small">
                        Plan move
                      </Link>
                      {u.reeferSetTempC && (
                        <Link to={`/reefers?unitNo=${encodeURIComponent(unitNumber)}`} className="small">
                          Reefer monitor
                        </Link>
                      )}
                      {(u.customsStatus === 'QUERY' || u.customsStatus === 'UNDER_EXAM') && (
                        <Link to="/customs" className="small">
                          Customs exam
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
    </Drawer>
  );
}
