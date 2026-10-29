import { useRef } from 'react';
import { Maximize2 } from 'lucide-react';
import { Button, Empty, Kpi, Meter, Page, PageHeader } from '@/ds/components';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { LiveIndicator } from '../components/bits';
import { controlTowerApi } from './api';
import { GateQueuePanel } from './components/GateQueuePanel';
import { PlanVsActualPanel } from './components/PlanVsActualPanel';
import { ExceptionsPanel } from './components/ExceptionsPanel';
import { ApprovalsPanel } from './components/ApprovalsPanel';
import { YardOccupancyPanel } from './components/YardOccupancyPanel';
import { EquipmentPanel } from './components/EquipmentPanel';

export { controlTowerApi } from './api';

export function ControlTowerView() {
  const { site } = useSession();
  const wall = useRef<HTMLDivElement>(null);
  const { data: d } = useQ(['control-tower', site.siteId], () => controlTowerApi.getControlTower(site.siteId));
  if (!d)
    return (
      <Page wide>
        <Empty title="Loading control tower" />
      </Page>
    );

  const ex = d.exceptions;
  const openEx = ex.critical + ex.high + ex.medium + ex.low;
  const pct = (a: number, b?: number | null) => (b ? Math.round((a / b) * 100) : 0);
  const occTotal = d.yardOccupancy.reduce((a: number, o: any) => a + o.occupiedSlots, 0);
  const occUsable = d.yardOccupancy.reduce((a: number, o: any) => a + o.usableSlots, 0);

  return (
    <div ref={wall} className="wall">
      <Page wide>
        <PageHeader
          title="Control tower"
          ms="M4"
          sub={`${site.siteName} · day shift 06:00–18:00`}
          actions={
            <>
              <LiveIndicator at={d.generatedAt} />
              <Button icon={<Maximize2 />} onClick={() => wall.current?.requestFullscreen?.()}>
                Full screen
              </Button>
            </>
          }
        />

        <div className="stack-lg">
          <div className="kpi-strip">
            <Kpi label="Gate in today" value={d.todayIn} delta={`Plan ${d.planIn} · ${pct(d.todayIn, d.planIn)}%`}>
              <Meter pct={pct(d.todayIn, d.planIn)} label="Gate in against plan" />
            </Kpi>
            <Kpi label="Gate out today" value={d.todayOut} delta={`Plan ${d.planOut} · ${pct(d.todayOut, d.planOut)}%`}>
              <Meter pct={pct(d.todayOut, d.planOut)} label="Gate out against plan" />
            </Kpi>
            <Kpi
              label="Yard occupancy"
              value={occUsable ? Math.round((occTotal / occUsable) * 100) : '—'}
              unit="%"
              delta={`${occTotal} of ${occUsable} slots`}
            />
            <Kpi label="Moves pending" value={d.pendingMoves} delta="2 for trucks at the gate" />
            <Kpi label="Approvals waiting" value={d.approvalsWaiting.length} delta="Oldest 26 h" />
            <Kpi
              label="Exceptions open"
              value={openEx}
              delta={<span style={{ color: ex.overdue ? 'var(--stop)' : undefined }}>{ex.overdue} overdue</span>}
            />
          </div>

          <div className="ct-grid">
            <div className="ct-7 stack-lg">
              <GateQueuePanel gateQueue={d.gateQueue} blockedTrucks={d.blockedTrucks} />
              <PlanVsActualPanel
                todayIn={d.todayIn}
                planIn={d.planIn}
                todayOut={d.todayOut}
                planOut={d.planOut}
                hours={d.hours}
                hourlyIn={d.hourlyIn}
                hourlyOut={d.hourlyOut}
                generatedAt={d.generatedAt}
              />
            </div>

            <div className="ct-5 stack-lg">
              <ExceptionsPanel exceptions={d.exceptions} openExceptions={d.openExceptions} />
              <ApprovalsPanel approvalsWaiting={d.approvalsWaiting} />
            </div>

            <div className="ct-6">
              <YardOccupancyPanel yardOccupancy={d.yardOccupancy} />
            </div>

            <div className="ct-6">
              <EquipmentPanel equipment={d.equipment} />
            </div>
          </div>
        </div>
      </Page>
    </div>
  );
}

export { ControlTowerView as ControlTower };
export default ControlTowerView;
