import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Maximize2, OctagonX, Timer } from 'lucide-react';
import {
  Button, Empty, Kpi, Meter, Page, PageHeader, Panel, Pill, StatusPill, ago,
} from '@/ds/components';
import { BarChart } from '@/ds/charts';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { CHECKPOINTS, VISIT_TYPES } from '@/mock/gate';
import { controlTower } from '@/mock/insight';
import { LiveIndicator, Stat } from './bits';

/* Control tower: the ops manager's live wall. GET /dashboards/control-tower,
   then pushed over the socket room site:{id}:control-tower. Built to be read
   from across a room: few colours, big numbers, every block links to the
   queue that fixes it. */
const EQ_TONE = { WORKING: ['Working', 'go'], IDLE: ['Idle', 'idle'], DOWN: ['Down', 'stop'] } as const;

export function ControlTower() {
  const { site } = useSession();
  const wall = useRef<HTMLDivElement>(null);
  const { data: d } = useQ(['control-tower', site.siteId], () => delay(controlTower(site.siteId)));
  if (!d) return <Page wide><Empty title="Loading control tower" /></Page>;

  const ex = d.exceptions;
  const openEx = ex.critical + ex.high + ex.medium + ex.low;
  const longest = Math.max(0, ...d.gateQueue.map((g) => g.waitingMinutes));
  const pct = (a: number, b?: number | null) => (b ? Math.round((a / b) * 100) : 0);
  const occTotal = d.yardOccupancy.reduce((a, o) => a + o.occupiedSlots, 0);
  const occUsable = d.yardOccupancy.reduce((a, o) => a + o.usableSlots, 0);

  return (
    <div ref={wall} className="wall">
      <Page wide>
        <PageHeader title="Control tower" ms="M4" sub={`${site.siteName} · day shift 06:00–18:00`}
          actions={<>
            <LiveIndicator at={d.generatedAt} />
            <Button icon={<Maximize2 />} onClick={() => wall.current?.requestFullscreen?.()}>Full screen</Button>
          </>} />

        <div className="stack-lg">
          <div className="kpi-strip">
            <Kpi label="Gate in today" value={d.todayIn} delta={`Plan ${d.planIn} · ${pct(d.todayIn, d.planIn)}%`}><Meter pct={pct(d.todayIn, d.planIn)} label="Gate in against plan" /></Kpi>
            <Kpi label="Gate out today" value={d.todayOut} delta={`Plan ${d.planOut} · ${pct(d.todayOut, d.planOut)}%`}><Meter pct={pct(d.todayOut, d.planOut)} label="Gate out against plan" /></Kpi>
            <Kpi label="Yard occupancy" value={occUsable ? Math.round((occTotal / occUsable) * 100) : '—'} unit="%" delta={`${occTotal} of ${occUsable} slots`} />
            <Kpi label="Moves pending" value={d.pendingMoves} delta="2 for trucks at the gate" />
            <Kpi label="Approvals waiting" value={d.approvalsWaiting.length} delta="Oldest 26 h" />
            <Kpi label="Exceptions open" value={openEx} delta={<span style={{ color: ex.overdue ? 'var(--stop)' : undefined }}>{ex.overdue} overdue</span>} />
          </div>

          <div className="ct-grid">
            <div className="ct-7 stack-lg">
              <Panel flush title="Gate queue now" sub={`${d.gateQueue.length} trucks on site · longest wait ${longest} min`} actions={<Link to="/gate" className="small">Open gate queue</Link>}>
                <div className="ct-cols">
                  {CHECKPOINTS.map((c) => {
                    const rows = d.gateQueue.filter((g) => g.checkpointCode === c.code && g.status !== 'REJECTED');
                    const max = Math.max(0, ...rows.map((g) => g.waitingMinutes));
                    return <Stat key={c.code} label={c.name} value={rows.length} note={rows.length ? <span className="row" style={{ gap: 4 }}><Timer size={12} />longest {max} min</span> : 'No trucks'} tone={max > 60 ? 'wait' : undefined} />;
                  })}
                </div>
                <div className="panel-head" style={{ borderTop: '1px solid var(--steel)' }}>
                  <h3 className="row spacer"><OctagonX size={16} color="var(--stop)" />Blocked trucks</h3>
                  <span className="pill pill-stop">{d.blockedTrucks.length}</span>
                </div>
                {d.blockedTrucks.length === 0 ? <p className="small muted" style={{ padding: 16, margin: 0 }}>No truck is held or turned back.</p> : (
                  <ul className="list-plain">
                    {d.blockedTrucks.map((b) => (
                      <li key={b.truckVisitId} style={{ padding: 0 }}>
                        <Link to={`/gate/visits/${b.truckVisitId}`} className="row" style={{ padding: '10px 16px', color: 'inherit', textDecoration: 'none', gap: 12, flexWrap: 'wrap' }}>
                          <span className="unitno unitno-sm">{b.plateNo}</span>
                          <span className="spacer" style={{ minWidth: 200 }}>
                            <strong style={{ color: 'var(--stop)', display: 'block' }}>{b.blockedReason}</strong>
                            <span className="xs muted">{VISIT_TYPES[b.visitTypeCode]} · {b.transporter} · at {CHECKPOINTS.find((c) => c.code === b.checkpointCode)?.short}</span>
                          </span>
                          <StatusPill value={b.status} />
                          <span className="small num" style={{ minWidth: 56 }}>{b.waitingMinutes ? `${b.waitingMinutes} min` : '—'}</span>
                          <ChevronRight size={16} color="var(--ink-3)" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Today in and out against plan" sub="Plan is appointments plus nominated pick-ups">
                <div className="stack">
                  {[['In', d.todayIn, d.planIn], ['Out', d.todayOut, d.planOut]].map(([l, v, p]) => (
                    <div key={l as string} className="row" style={{ gap: 12 }}>
                      <span className="small strong" style={{ width: 32 }}>{l}</span>
                      <span className="spacer"><Meter pct={pct(v as number, p as number)} label={`Gate ${l} against plan`} /></span>
                      <span className="small num" style={{ width: 110 }}>{v} of {p} planned</span>
                    </div>
                  ))}
                  <BarChart label="Gate in and out per hour today" labels={d.hours.map((h) => `${h}:00`)} height={150}
                    series={[{ name: 'In', values: d.hourlyIn }, { name: 'Out', values: d.hourlyOut }]} />
                  <p className="xs muted" style={{ margin: 0 }}>{(() => {
                    const left = (d.planIn ?? 0) + (d.planOut ?? 0) - d.todayIn - d.todayOut;
                    const pace = (d.todayIn + d.todayOut) / 4.5;
                    const mins = Math.round((left / pace) * 60);
                    const t = new Date(Date.parse(d.generatedAt) + mins * 60000);
                    return left <= 0 ? 'Plan for today is already met.' : `${left} moves to go. At this morning's pace (${Math.round(pace)} an hour) the plan is met around ${t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' })}.`;
                  })()}</p>
                </div>
              </Panel>
            </div>

            <div className="ct-5 stack-lg">
              <Panel flush title="Exceptions by severity" actions={<Link to="/exceptions" className="small">Open exceptions</Link>}>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => (
                  <div key={s} className="sev">
                    <span><StatusPill value={s} /></span>
                    <span className="unitno unitno-md">{ex[s.toLowerCase() as 'critical']}</span>
                  </div>
                ))}
                <div className="sev" style={{ background: ex.overdue ? 'var(--stop-soft)' : undefined }}>
                  <span className="strong">Overdue</span>
                  <span className="unitno unitno-md" style={{ color: ex.overdue ? 'var(--stop)' : undefined }}>{ex.overdue}</span>
                </div>
                <ul className="list-plain" style={{ borderTop: '1px solid var(--steel)' }}>
                  {d.openExceptions.filter((e) => e.isOverdue || e.severity === 'CRITICAL').map((e) => (
                    <li key={e.exceptionCaseId} style={{ padding: '10px 16px' }}>
                      <div className={`side-bar ${e.isOverdue ? 'side-stop' : 'side-wait'}`}>
                        <div className="small strong">{e.title}</div>
                        <div className="xs muted">{e.caseNo} · {e.assignedTo ?? e.assignedRoleCode?.toLowerCase().replace(/_/g, ' ')} · raised {ago(e.raisedAt)}{e.isOverdue ? ' · overdue' : ''}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel flush title="Approvals waiting" actions={<Link to="/approvals" className="small">Open approvals</Link>}>
                <ul className="list-plain">
                  {d.approvalsWaiting.map((a) => (
                    <li key={a.approvalRequestId} style={{ padding: 0 }}>
                      <Link to="/approvals" className="row" style={{ padding: '10px 16px', color: 'inherit', textDecoration: 'none' }}>
                        <span className="spacer" style={{ minWidth: 0 }}>
                          <span className="small strong" style={{ display: 'block' }}>{a.summary}</span>
                          <span className="xs muted">{a.requestedBy} · {ago(a.requestedAt)}{(a.levelsRequired ?? 1) > 1 ? ` · level ${(a.currentLevel ?? 0) + 1} of ${a.levelsRequired}` : ''}</span>
                        </span>
                        {!a.canDecide && <Pill tone="info">Not yours</Pill>}
                        <ChevronRight size={16} color="var(--ink-3)" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <div className="ct-6">
              <Panel flush title="Yard occupancy by block" sub="Over 75% slows allocation; over 90% means reshuffles" actions={<Link to="/yard" className="small">Open yard map</Link>}>
                {d.yardOccupancy.length === 0 ? <Empty title="No yard blocks at this site">Set up blocks in the yard designer to see occupancy here.</Empty> : d.yardOccupancy.map((o) => {
                  const p = Number(o.occupancyPct);
                  return (
                    <div key={o.yardLocationId} className="ct-occ">
                      <span className="unitno unitno-sm" style={{ textAlign: 'center' }}>{o.fullCode}</span>
                      <span>
                        <Meter pct={p} label={`Block ${o.fullCode} occupancy`} />
                        <span className="xs faint">{o.kind.toLowerCase()}</span>
                      </span>
                      <span className="small num"><strong>{p}%</strong> <span className="faint">{o.occupiedSlots}/{o.usableSlots}</span></span>
                    </div>
                  );
                })}
              </Panel>
            </div>

            <div className="ct-6">
              <Panel flush title="Equipment" sub={`${d.equipment.filter((e) => e.status === 'WORKING').length} working · ${d.equipment.filter((e) => e.status === 'DOWN').length} down · ${d.equipment.reduce((a, e) => a + e.movesToday, 0)} moves today`} actions={<Link to="/moves" className="small">Open move orders</Link>}>
                <ul className="list-plain">
                  {d.equipment.map((e) => {
                    const [label, tone] = EQ_TONE[e.status];
                    return (
                      <li key={e.equipmentId} className="row" style={{ padding: '9px 16px', gap: 12 }}>
                        <span className="unitno unitno-sm" style={{ minWidth: 60, textAlign: 'center' }}>{e.equipmentCode}</span>
                        <span className="spacer" style={{ minWidth: 0 }}>
                          <span className="small strong" style={{ display: 'block' }}>{e.name}{e.operatorName ? <span className="muted" style={{ fontWeight: 400 }}> · {e.operatorName}</span> : null}</span>
                          <span className="xs muted">{e.note}</span>
                        </span>
                        <Pill tone={tone}>{label}</Pill>
                        <span className="small num" style={{ width: 64 }}>{e.movesToday} moves</span>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </div>
          </div>
        </div>
      </Page>
    </div>
  );
}
