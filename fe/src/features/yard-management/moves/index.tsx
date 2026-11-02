import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Banner, Button, Empty, Kpi, Page, PageHeader, Segmented, Tabs, useToast,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { OPERATORS, type Move } from '@/mock/ops';
import { movesApi } from './api';
import { MoveCard, eqCode } from './components/MoveCard';
import { AssignDrawer, MACHINES } from './components/AssignDrawer';
import { CompleteDrawer } from './components/CompleteDrawer';
import { CreateMoveDrawer } from './components/CreateMoveDrawer';

export { movesApi } from './api';

type TabId = 'open' | 'mine' | 'done';

export function MovesView() {
  const { site, offline } = useSession();
  const toast = useToast();
  const { data = [], refetch } = useQ(['move-orders'], () => movesApi.getMoveOrders());
  const [patch, setPatch] = useState<Record<number, Partial<Move>>>({});
  const [tab, setTab] = useState<TabId>('open');
  const [machine, setMachine] = useState('1');
  const [assign, setAssign] = useState<Move | null>(null);
  const [complete, setComplete] = useState<Move | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const vehicleSite = site.facilities.includes('ICDV');

  const all = useMemo(
    () =>
      data
        .filter((m) => !m.siteId || m.siteId === site.siteId)
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

    const start = async (m: Move) => {
      try {
        if (m.moveOrderId) {
          await movesApi.startMove(m.moveOrderId);
        }
      } catch (err: any) {
        console.warn('Could not persist start move on backend:', err);
      }
      set(m, { status: 'IN_PROGRESS', startedAt: new Date().toISOString() });
      toast(
        offline
          ? `Move started for ${m.unitNo}; queued on this handheld`
          : `Move started for ${m.unitNo}`
      );
      refetch();
    };

    return (
      <Page wide>
        <PageHeader
          title="Move orders"
          ms="M1"
          sub={`${site.siteName} · trucks waiting at the gate come first`}
          actions={
            < div className="row" style={{ gap: 12 }}>
          {!vehicleSite && (
            <div className="row" style={{ gap: 8 }}>
              <span className="small muted">My machine</span>
              <Segmented
                label="My machine"
                value={machine}
                onChange={setMachine}
                options={MACHINES.map((e) => ({ id: String(e.equipmentId), label: e.equipmentCode }))}
              />
            </div>
          )}
          <Button
            variant="primary"
            icon={<Plus />}
            onClick={() => setCreateOpen(true)}
            perm="yard.move.execute"
          >
            Create move
          </Button>
        </div>
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
              { id: 'open', label: 'All open', count: open.length },
              { id: 'mine', label: 'Assigned to me', count: mine.length },
              { id: 'done', label: 'Completed today', count: done.length },
            ]}
          />

          {rows.length === 0 ? (
            <Empty
              title={tab === 'open' ? 'Queue is clear' : tab === 'mine' ? 'No moves assigned to this machine' : 'No moves completed yet today'}
            >
              {tab === 'open'
                ? 'All move orders have been completed. New orders appear as gate visits arrive.'
                : tab === 'mine'
                  ? 'Pick a move from All Open to assign it to this machine, or switch machine above.'
                  : 'Completed moves will appear here with the actual stack tier where each container was placed.'}
            </Empty>
          ) : (
          <div className="stack">
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
        onDone={async (m, eq, op) => {
          try {
            if (m.moveOrderId) {
            await movesApi.assignMove(m.moveOrderId, { assignedEquipmentId: eq, assignedOperatorSub: op });
            }
          } catch (err: any) {
            console.warn('Could not persist assign move:', err);
          }
          set(m, {status: 'ASSIGNED', assignedEquipmentId: eq, assignedOperatorSub: op });
          toast(`Move assigned to ${eq ? eqCode(eq) + ' · ' : ''}${OPERATORS[op]}`);
          refetch();
        }}
      />
          <CompleteDrawer
            m={complete}
            onClose={() => setComplete(null)}
              onDone = { async(m, toCode, rank, reason) => {
          try {
            if (m.moveOrderId) {
            await movesApi.completeMove(m.moveOrderId, { toCode, rank, reason });
            }
          } catch (err: any) {
            console.warn('Could not persist complete move:', err);
          }
          set(m, {
            status: 'DONE',
          toCode,
          suggestionRank: rank,
          overrideReason: reason,
          completedAt: new Date().toISOString(),
          });
          toast(
          offline
          ? `Move completed at ${toCode}; queued on this handheld`
          : `Move completed: ${m.unitNo} at ${toCode}`
          );
          refetch();
        }}
      />
          <CreateMoveDrawer
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onSuccess={() => refetch()}
          />
      </Page>
    );
  }

  export { MovesView as Moves };
  export default MovesView;
