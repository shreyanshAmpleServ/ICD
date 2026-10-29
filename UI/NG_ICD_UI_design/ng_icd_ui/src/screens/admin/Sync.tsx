import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Play, RotateCcw } from 'lucide-react';
import {
  Banner, Button, Chips, DataTable, Kpi, Ms, Panel, Pill, StatusPill, Tabs, ago, fmtDT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { parties } from '@/mock/core';
import { SRC, integrationMessages, outbox as seedOutbox, syncStates as seedSync } from '@/mock/admin';
import { AuditNote, SetupPage, label, useEditable } from './AdminKit';

/* NG sync and messages: /sync/status, POST /sync/{entity}/run,
   /outbox?status=…, POST /outbox/{id}/retry, /integration-messages (M5).
   Each destination has its own delivery row, so a slow ERP never holds up
   NG events or notifications. */
type Tab = 'sync' | 'outbox' | 'edi';
type Sync = (typeof seedSync)[number];
type Ob = (typeof seedOutbox)[number];
const DEST: Record<string, string> = { NG_EVENTS: 'NG events', NG_BILLING: 'NG Billing', NOTIFY: 'Notifications', ERP: 'ERP' };
const ENTITY: Record<string, string> = { party: 'Parties (customers, agents, lines)', truck: 'Trucks', driver: 'Drivers', vessel: 'Vessels' };

export function SyncScreen() {
  const { phase } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('sync');
  const [sync, setSync] = useEditable<Sync>('sync', seedSync);
  const [ob, setOb] = useEditable<Ob>('outbox', seedOutbox);
  const [running, setRunning] = useState<string | null>(null);
  const [f, setF] = useState<'all' | 'problem' | 'PENDING' | 'SENT'>('problem');
  const t = phase === 2 ? tab : tab === 'edi' ? 'sync' : tab;
  const problems = ob.filter((o) => o.status === 'FAILED' || o.status === 'DEAD');

  const run = (e: string) => {
    setRunning(e);
    setTimeout(() => {
      setSync((all) => all.map((s) => (s.entityName === e ? { ...s, lastRunAt: '2026-10-08T07:30:00Z', lastStatus: 'OK', lastError: undefined, rowsLastRun: e === 'vessel' ? 2 : s.rowsLastRun } : s)));
      setRunning(null); toast(`${label(e)} sync finished`);
    }, 900);
  };

  return (
    <SetupPage wide title="NG sync & messages" ms="M0" sub="Master data coming in from NG, events going out to NG, and (Phase 2) messages with lines, banks and customs"
      sources={[SRC.sync, { table: 'outbox_event, outbox_delivery' }, { table: 'integration_message (M5)' }]}>
      <div className="kpi-strip">
        <Kpi label="Masters in step" value={`${sync.filter((s) => s.lastStatus === 'OK').length} of ${sync.length}`} delta={sync.some((s) => s.lastStatus === 'FAILED') ? 'Vessel sync failing' : 'All good'} />
        <Kpi label="Provisional records" value={sync.reduce((a, s) => a + s.provisional, 0)} delta="Created at the gate; match to NG" />
        <Kpi label="Events waiting" value={ob.filter((o) => o.status === 'PENDING').length} delta="Sent within a minute normally" />
        <Kpi label="Events failed" value={problems.length} delta={problems.length ? 'Needs a look' : 'None'} />
      </div>
      <Tabs<Tab> value={t} onChange={setTab} tabs={[
        { id: 'sync', label: 'Master sync from NG', count: sync.length }, { id: 'outbox', label: 'Events to NG and ERP', count: problems.length || undefined },
        { id: 'edi', label: <span className="row" style={{ gap: 6 }}>Messages and EDI <Ms m="M5" /></span>, count: integrationMessages.length, hidden: phase !== 2 },
      ]} />

      {t === 'sync' && (
        <>
          {sync.filter((s) => s.lastStatus === 'FAILED').map((s) => (
            <Banner key={s.entityName} tone="stop" title={`${label(s.entityName)} sync failed ${ago(s.lastRunAt)}`} action={<Button size="sm" icon={<Play />} perm="integration.monitor" onClick={() => run(s.entityName)}>Run now</Button>}>{s.lastError}</Banner>
          ))}
          <Panel flush title="Master data from NG" sub="Runs every 15 minutes and on demand; only rows changed since the last run are fetched">
            <DataTable rows={sync} rowKey={(s) => s.entityName} cols={[
              { key: 'e', header: 'What', render: (s) => <strong>{ENTITY[s.entityName]}</strong> },
              { key: 'r', header: 'Last run', render: (s) => <span className="small nowrap" title={fmtDT(s.lastRunAt)}>{running === s.entityName ? 'Running…' : ago(s.lastRunAt)}</span> },
              { key: 's', header: 'Result', render: (s) => <StatusPill value={running === s.entityName ? 'IN_PROGRESS' : s.lastStatus} /> },
              { key: 'n', header: 'Rows last run', num: true, render: (s) => s.rowsLastRun ?? '—' },
              { key: 't', header: 'In NG ICD', num: true, render: (s) => s.total.toLocaleString() },
              { key: 'p', header: 'Provisional', num: true, render: (s) => s.provisional ? <Pill tone="wait">{s.provisional}</Pill> : <span className="faint">0</span> },
              { key: 'hw', header: 'Up to NG change', render: (s) => <span className="small muted">{fmtDT(s.lastUpdatedate)}</span> },
              { key: 'err', header: 'Note', render: (s) => s.lastStatus === 'PARTIAL' ? <span className="small" style={{ color: 'var(--wait)' }}>{s.lastError}</span> : null },
              { key: 'a', header: '', render: (s) => <Button size="sm" icon={<Play />} perm="integration.monitor" disabled={!!running} onClick={() => run(s.entityName)}>Run now</Button> },
            ]} />
          </Panel>
          <AuditNote>Each run is logged with the rows it changed. Rows from NG cannot be edited here.</AuditNote>
        </>
      )}

      {t === 'outbox' && (
        <Panel flush title="Outbox" sub="Every business event is written with the change that caused it, then delivered to each destination separately">
          <div className="toolbar">
            <Chips value={f} onChange={setF} options={[{ id: 'problem', label: 'Failed', count: problems.length }, { id: 'PENDING', label: 'Waiting', count: ob.filter((o) => o.status === 'PENDING').length }, { id: 'SENT', label: 'Sent' }, { id: 'all', label: 'All' }]} />
          </div>
          <DataTable rows={ob.filter((o) => f === 'all' || (f === 'problem' ? o.status === 'FAILED' || o.status === 'DEAD' : o.status === f))} rowKey={(o) => `${o.id}-${o.destination}`}
            empty={<p className="small muted" style={{ padding: 16 }}>Nothing here. Pick another filter.</p>} cols={[
              { key: 'e', header: 'Event', render: (o) => <><span className="adm-code">{o.eventType}</span><div className="xs faint">#{o.id} · {o.aggregate}</div></> },
              { key: 'd', header: 'To', render: (o) => DEST[o.destination] },
              { key: 'w', header: 'Happened', render: (o) => <span className="small">{ago(o.occurredAt)}</span> },
              { key: 's', header: 'Status', render: (o) => o.status === 'DEAD' ? <Pill tone="stop">Gave up</Pill> : <StatusPill value={o.status} /> },
              { key: 'n', header: 'Tries', num: true, render: (o) => o.attempts },
              { key: 'r', header: 'Detail', render: (o) => o.lastError ? <span className="small" style={{ color: o.status === 'PENDING' ? 'var(--ink-2)' : 'var(--stop)' }}>{o.lastError}</span> : <span className="small muted">{o.responseRef ?? ''}</span> },
              { key: 'a', header: '', render: (o) => (o.status === 'FAILED' || o.status === 'DEAD') ? <Button size="sm" icon={<RotateCcw />} perm="integration.monitor" onClick={() => { setOb((all) => all.map((x) => (x === o ? { ...x, status: 'PENDING', attempts: x.attempts + 1, lastError: undefined } : x))); toast('Retry queued'); }}>Retry</Button> : null },
            ]} />
        </Panel>
      )}

      {t === 'edi' && (
        <Panel flush title="Integration messages" sub="CODECO / COPARN with lines, bank statements, mobile money notices. Duplicates are rejected.">
          <DataTable rows={integrationMessages} rowKey={(m) => m.integrationMessageId} cols={[
            { key: 'd', header: '', render: (m) => m.direction === 'IN' ? <ArrowDownLeft size={16} aria-label="Incoming" /> : <ArrowUpRight size={16} aria-label="Outgoing" /> },
            { key: 'p', header: 'Partner', render: (m) => <><strong className="small">{m.partnerPartyId ? parties.find((p) => p.partyId === m.partnerPartyId)?.partyName : label(m.partnerSystem)}</strong><div className="xs faint">{label(m.partnerSystem)}</div></> },
            { key: 't', header: 'Message', render: (m) => <span className="small">{label(m.messageType)} · {m.format}</span> },
            { key: 'c', header: 'Reference', render: (m) => <span className="adm-code">{m.correlationRef}</span> },
            { key: 'w', header: 'When', render: (m) => <span className="small">{ago(m.createdAt)}</span> },
            { key: 's', header: 'Status', render: (m) => <StatusPill value={m.status} /> },
            { key: 'e', header: 'Detail', render: (m) => m.lastError ? <span className="small" style={{ color: 'var(--stop)' }}>{m.lastError}</span> : null },
            { key: 'a', header: '', render: (m) => m.status === 'FAILED' ? <Button size="sm" icon={<RotateCcw />} perm="integration.monitor" onClick={() => toast('Message resent')}>Resend</Button> : null },
          ]} />
        </Panel>
      )}
    </SetupPage>
  );
}
