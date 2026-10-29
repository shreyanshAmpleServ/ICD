import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OctagonX, Plus, ScanLine, Timer, WifiOff } from 'lucide-react';
import {
  Banner, Button, Chips, DataTable, Kpi, Page, PageHeader, Panel, StatusPill, UnitNo, fmtT, cx,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { CHECKPOINTS, VISIT_TYPES, visits } from '@/mock/gate';

/* Gate queue: every truck on site, by the checkpoint it is waiting for.
   Live over the socket room site:{id}:gate-queue. Held trucks sit on top. */
type View = 'board' | 'list';

export function GateQueue() {
  const nav = useNavigate();
  const { offline } = useSession();
  const [view, setView] = useState<View>('board');
  const { data = [] } = useQ(['visits'], () => delay(visits));
  const live = data.filter((v) => !['EXITED', 'CANCELLED', 'EXPIRED'].includes(v.status!));
  const held = live.filter((v) => v.status === 'HELD' || v.status === 'REJECTED');
  const col = (code: string) => live.filter((v) => v.nextCheckpointCode === code && v.status !== 'REJECTED' && v.status !== 'ANNOUNCED');

  return (
    <Page wide>
      <PageHeader title="Gate queue" ms="M1" sub="Trucks on site now, by the checkpoint they are waiting for"
        actions={<>
          <Chips<View> value={view} onChange={setView} options={[{ id: 'board', label: 'Board' }, { id: 'list', label: 'List' }]} />
          <Button icon={<Plus />} perm="gate.visit.checkin">Register truck</Button>
          <Button variant="primary" icon={<ScanLine />} onClick={() => nav('/gate/lane')} perm="gate.visit.checkin">Open gate lane</Button>
        </>} />

      <div className="stack-lg">
        {offline && <Banner tone="wait" title="Working offline">Gate events are queued on this device and sync when the connection returns. Holds placed meanwhile are checked on sync; conflicts open an exception.</Banner>}
        <div className="kpi-strip">
          <Kpi label="On site" value={live.filter((v) => v.status !== 'ANNOUNCED').length} unit="trucks" />
          <Kpi label="Held at a checkpoint" value={held.length} delta="Needs action" />
          <Kpi label="Longest wait" value={Math.max(...live.map((v) => v.waitingMin))} unit="min" delta="T 118 DPE at inner out" />
          <Kpi label="Announced for today" value={14} delta="6 arrived" />
          <Kpi label="Turnaround today" value={47} unit="min" delta="Target 45 min" />
        </div>

        {held.length > 0 && (
          <Panel title={<h2 className="row"><OctagonX size={18} color="var(--stop)" />Held or turned back</h2>} flush>
            <DataTable rows={held} rowKey={(v) => v.truckVisitId!} onRow={(v) => nav(`/gate/visits/${v.truckVisitId}`)} cols={[
              { key: 'plate', header: 'Truck', render: (v) => <span className="unitno unitno-sm">{v.plateNo}</span> },
              { key: 'type', header: 'Visit', render: (v) => VISIT_TYPES[v.visitTypeCode] },
              { key: 'at', header: 'Stopped at', render: (v) => CHECKPOINTS.find((c) => c.code === v.nextCheckpointCode)?.name },
              { key: 'why', header: 'Why', render: (v) => <strong style={{ color: 'var(--stop)' }}>{v.blockedReason}</strong> },
              { key: 'status', header: 'Status', render: (v) => <StatusPill value={v.status} /> },
              { key: 'wait', header: 'Waiting', num: true, render: (v) => `${v.waitingMin} min` },
            ]} />
          </Panel>
        )}

        {view === 'board' ? (
          <div className="grid-4" style={{ alignItems: 'start' }}>
            {CHECKPOINTS.map((c) => {
              const items = col(c.code);
              return (
                <section key={c.code} className="panel">
                  <div className="panel-head"><h2 className="spacer">{c.name}</h2><span className="pill pill-info">{items.length}</span></div>
                  <div className="stack" style={{ padding: 12 }}>
                    {items.length === 0 && <div className="small faint" style={{ padding: 8 }}>No trucks waiting.</div>}
                    {items.map((v) => (
                      <Link key={v.truckVisitId} to={`/gate/visits/${v.truckVisitId}`} className={cx('panel')} style={{ padding: 12, textDecoration: 'none', color: 'inherit', borderLeft: `4px solid ${v.status === 'HELD' ? 'var(--stop)' : v.waitingMin > 60 ? 'var(--wait)' : 'var(--steel)'}` }}>
                        <div className="row"><span className="unitno unitno-sm spacer">{v.plateNo}</span>{v.isOfflineEntry && <WifiOff size={14} aria-label="Entered offline" />}<span className="small row" style={{ gap: 4 }}><Timer size={13} />{v.waitingMin} min</span></div>
                        <div className="small muted">{VISIT_TYPES[v.visitTypeCode]} · {v.transporter}</div>
                        <div className="row-wrap" style={{ marginTop: 6 }}>
                          {(v.units ?? []).slice(0, 3).map((u) => <UnitNo key={u.unitStayId} no={u.unitNo!} category={u.unitNo!.length === 17 ? 'VEHICLE' : 'CONTAINER'} />)}
                          {(v.units ?? []).length === 0 && <span className="xs faint">No units yet</span>}
                        </div>
                        <div className="row" style={{ marginTop: 6 }}><StatusPill value={v.status} />{v.blockedReason && <span className="xs" style={{ color: 'var(--stop)' }}>{v.blockedReason}</span>}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <Panel flush>
            <DataTable rows={data} rowKey={(v) => v.truckVisitId!} onRow={(v) => nav(`/gate/visits/${v.truckVisitId}`)} cols={[
              { key: 'no', header: 'Visit', render: (v) => <span className="small strong">{v.visitNo}</span> },
              { key: 'plate', header: 'Truck', render: (v) => <span className="unitno unitno-sm">{v.plateNo}</span> },
              { key: 'driver', header: 'Driver', render: (v) => <span className="small">{v.driverName}<div className="xs faint">{v.transporter}</div></span> },
              { key: 'type', header: 'Visit type', render: (v) => VISIT_TYPES[v.visitTypeCode] },
              { key: 'units', header: 'Units', num: true, render: (v) => v.units?.length ?? 0 },
              { key: 'next', header: 'Next checkpoint', render: (v) => CHECKPOINTS.find((c) => c.code === v.nextCheckpointCode)?.short ?? '—' },
              { key: 'arr', header: 'Arrived', render: (v) => fmtT(v.arrivedAt) },
              { key: 'status', header: 'Status', render: (v) => <StatusPill value={v.status} /> },
            ]} />
          </Panel>
        )}
      </div>
    </Page>
  );
}
