import { useMemo, useState } from 'react';
import {
  Banner, Empty, Kpi, Page, PageHeader, Segmented, Tabs, useToast,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { OPERATORS, type Move } from '@/mock/ops';
import { movesApi } from '../api';
import { MoveCard, eqCode } from './MoveCard';
import { AssignDrawer, MACHINES } from './AssignDrawer';
import { CompleteDrawer } from './CompleteDrawer';

type TabId = 'open' | 'mine' | 'done';

export function MovesView() {
  const { site, offline } = useSession();
  const toast = useToast();
  const { data = [] } = useQ(['move-orders'], () => movesApi.getMoveOrders());
  const [patch, setPatch] = useState<Record<number, Partial<Move>>>({});
  const [tab, setTab] = useState<TabId>('open');
  const [machine, setMachine] = useState('1');
  const [assign, setAssign] = useState<Move | null>(null);
  const [complete, setComplete] = useState<Move | null>(null);
  const vehicleSite = site.facilities.includes('ICDV');

  const all = useMemo(
    () =>
      data
        .filter((m) => m.siteId === site.siteId)
        .map((m) => ({ ...m, ...patch[m.moveOrderId!] }) as Move),
    [data, patch, site.siteId]
  );
  const open = all
    .filter((m) => m.status !== 'DONE' && m.status !== 'CANCELLED')
    .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9) || (a.requestedAt ?? '').localeCompare(b.requestedAt ?? ''));
  const mine = open.filter((m) =>
    vehicleSite ? m.assignedOperatorSub === 'neema.k' : String(m.assignedEquipmentId) === machine
  );
  const done = all
    .filter((m) => m.status === 'DONE' || m.status === 'CANCELLED')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const rows = tab === 'open' ? open : tab === 'mine' ? mine : done;

  const set = (m: Move, p: Partial<Move>) =>
    setPatch((x) => ({ ...x, [m.moveOrderId!]: { ...x[m.moveOrderId!], ...p } }));

  const start = (m: Move) => {
    set(m, { status: 'IN_PROGRESS', startedAt: new Date('2026-10-07T10:30:00+03:00').toISOString() });
    toast(
      offline
        ? `Move started for ${m.unitNo}; queued on this handheld`
        : `Move started for ${m.unitNo}`
    );
  };

  return (
    <Page wide>
      <PageHeader
        title="Move orders"
        ms="M1"
        sub={`${site.siteName} · trucks waiting at the gate come first`}
        actions={
          !vehicleSite && (
            <div className="row" style={{ gap: 8 }}>
              <span className="small muted">My machine</span>
              <Segmented
                label="My machine"
                value={machine}
                onChange={setMachine}
                options={MACHINES.map((e) => ({ id: String(e.equipmentId), label: e.equipmentCode }))}
              />
            </div>
          )
        }
      />

      <div className="stack-lg">
        {offline && (
          <Banner tone="wait" title="Offline on this handheld">
            Start and complete still work. Moves are queued with the time you did them and sent when the signal
            returns. Slot suggestions use the yard as it was at 10:12.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi label="Waiting" value={open.filter((m) => m.status === 'OPEN').length} delta="Not assigned yet" />
          <Kpi label="Assigned" value={open.filter((m) => m.status === 'ASSIGNED').length} />
          <Kpi label="Moving now" value={open.filter((m) => m.status === 'IN_PROGRESS').length} />
          <Kpi
            label="For trucks at the gate"
            value={open.filter((m) => m.moveKind === 'PICK_FOR_VISIT').length}
            delta="Priority 1"
          />
          <Kpi label="Done today" value={done.length} delta="Average 14 min" />
        </div>

        <Tabs<TabId>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'open', label: 'Open', count: open.length },
            {
              id: 'mine',
              label: vehicleSite ? 'Mine' : `Mine (${eqCode(Number(machine))})`,
              count: mine.length,
            },
            { id: 'done', label: 'Done', count: done.length },
          ]}
        />

        {rows.length === 0 ? (
          <Empty
            title={
              tab === 'mine'
                ? 'Nothing assigned to you'
                : tab === 'done'
                ? 'No moves done yet today'
                : 'No open move orders'
            }
          >
            {tab === 'mine'
              ? 'Pick an order from the Open tab, or ask the yard planner to assign one.'
              : 'New orders appear here when a truck arrives or the planner creates one.'}
          </Empty>
        ) : (
          <div className="grid-2" style={{ alignItems: 'start' }}>
            {rows.map((m) => (
              <MoveCard
                key={m.moveOrderId}
                m={m}
                onAssign={() => setAssign(m)}
                onStart={() => start(m)}
                onComplete={() => setComplete(m)}
              />
            ))}
          </div>
        )}
      </div>

      <AssignDrawer
        m={assign}
        vehicleSite={vehicleSite}
        onClose={() => setAssign(null)}
        onDone={(m, eq, op) => {
          set(m, { status: 'ASSIGNED', assignedEquipmentId: eq, assignedOperatorSub: op });
          toast(`Move assigned to ${eq ? eqCode(eq) + ' · ' : ''}${OPERATORS[op]}`);
        }}
      />
      <CompleteDrawer
        m={complete}
        onClose={() => setComplete(null)}
        onDone={(m, toCode, rank, reason) => {
          set(m, {
            status: 'DONE',
            toCode,
            suggestionRank: rank,
            overrideReason: reason,
            completedAt: new Date('2026-10-07T10:30:00+03:00').toISOString(),
          });
          toast(
            offline
              ? `Move completed at ${toCode}; queued on this handheld`
              : `Move completed: ${m.unitNo} at ${toCode}`
          );
        }}
      />
    </Page>
  );
}
