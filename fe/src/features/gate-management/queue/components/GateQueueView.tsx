import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ScanLine } from 'lucide-react';
import { Banner, Button, Chips, Kpi, Page, PageHeader } from '@/ds/components';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { gateQueueApi } from '../api';
import type { DynamicTruckVisit } from '@/features/gate-management/types';
import { HeldPanel } from './HeldPanel';
import { QueueBoard } from './QueueBoard';
import { QueueList } from './QueueList';
import { RegisterTruckDrawer } from './RegisterTruckDrawer';

type View = 'board' | 'list';

export function GateQueueView() {
  const nav = useNavigate();
  const { offline } = useSession();
  const [view, setView] = useState<View>('board');
  const [showRegister, setShowRegister] = useState(false);

  const { data: rawVisits = [], refetch } = useQ<any[]>(['gate-queue-visits'], () => gateQueueApi.visits());
  const data: DynamicTruckVisit[] = Array.isArray(rawVisits) ? rawVisits : [];
  const live = data.filter((v) => !['EXITED', 'CANCELLED', 'EXPIRED'].includes(v.status!));
  const held = live.filter((v) => v.status === 'HELD' || v.status === 'REJECTED');
  const col = (code: string): DynamicTruckVisit[] =>
    live.filter((v) => v.nextCheckpointCode === code && v.status !== 'REJECTED' && v.status !== 'ANNOUNCED');

  return (
    <Page wide>
      <PageHeader
        title="Gate queue"
        ms="M1"
        sub="Trucks on site now, by the checkpoint they are waiting for"
        actions={
          <>
            <Chips<View>
              value={view}
              onChange={setView}
              options={[
                { id: 'board', label: 'Board' },
                { id: 'list', label: 'List' },
              ]}
            />
            <Button icon={<Plus />} variant="primary" onClick={() => setShowRegister(true)}>
              Register truck
            </Button>
            <Button
              variant="primary"
              icon={<ScanLine />}
              onClick={() => nav('/gate/lane')}
              perm="gate.visit.checkin"
            >
              Open gate lane
            </Button>
          </>
        }
      />

      <div className="stack-lg">
        {offline && (
          <Banner tone="wait" title="Working offline">
            Gate events are queued on this device and sync when the connection returns. Holds placed meanwhile are
            checked on sync; conflicts open an exception.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi label="On site" value={live.filter((v: any) => v.status !== 'ANNOUNCED').length} unit="trucks" />
          <Kpi label="Held at a checkpoint" value={held.length} delta="Needs action" />
          <Kpi
            label="Longest wait"
            value={live.length ? Math.max(...live.map((v: any) => v.waitingMin || 0)) : 0}
            unit="min"
            delta="Live wait timer"
          />
          <Kpi label="Announced for today" value={data.length} delta={`${live.length} on site`} />
          <Kpi label="Turnaround today" value={38} unit="min" delta="Target 45 min" />
        </div>

        {held.length > 0 && (
          <HeldPanel held={held} onSelectVisit={(v) => nav(`/gate/visits/${v.truckVisitId}`)} />
        )}

        {view === 'board' ? (
          <QueueBoard getColItems={col} />
        ) : (
          <QueueList data={data} onSelectVisit={(v) => nav(`/gate/visits/${v.truckVisitId}`)} />
        )}
      </div>

      <RegisterTruckDrawer
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={() => refetch()}
      />
    </Page>
  );
}
