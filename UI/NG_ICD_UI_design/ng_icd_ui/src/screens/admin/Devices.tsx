import { useState } from 'react';
import { Ban, Plus, Smartphone, Tablet, Monitor, Settings2 } from 'lucide-react';
import {
  Banner, Button, DataTable, Field, Input, Kpi, Ms, Panel, Pill, Segmented, Select, Tabs, ago, fmtDT, useToast, NOW,
} from '@/ds/components';
import { useSession, SITES } from '@/app/session';
import { devices as seedDevices, integrations as seedInt } from '@/mock/admin';
import { AuditNote, EditDrawer, SetupPage, label, useEditable } from './AdminKit';

/* Devices: /devices (register, revoke), and in Phase 2
   /device-integrations per lane. A device signs its offline queue with its
   own key, so revoking it rejects anything it still tries to sync. */
type Tab = 'devices' | 'integrations';
type Dev = (typeof seedDevices)[number];
type Int = (typeof seedInt)[number];
const KIND_ICON = { TABLET: Tablet, PHONE: Smartphone, GATE_PC: Monitor, KIOSK: Monitor };
const KIND: Record<string, string> = { TABLET: 'Gate tablet', PHONE: 'Handheld', GATE_PC: 'Gate agent PC', KIOSK: 'Kiosk' };
const MODE: Record<string, string> = { MANUAL: 'Manual: officer types, reads are shown as hints', ASSISTED: 'Assisted: reads fill the form, officer confirms', AUTOMATIC: 'Automatic: reads pass the checkpoint unless a check fails' };
const stale = (d: Dev) => !d.revokedAt && d.lastSeenAt && NOW.getTime() - Date.parse(d.lastSeenAt) > 24 * 3600_000;

export function Devices() {
  const { phase } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('devices');
  const [devs, setDevs] = useEditable<Dev>('devices', seedDevices);
  const [ints, setInts] = useEditable<Int>('integrations', seedInt);
  const [revoke, setRevoke] = useState<Dev | null>(null);
  const [reg, setReg] = useState(false);
  const [cfg, setCfg] = useState<Int | null>(null);
  const live = devs.filter((d) => !d.revokedAt);
  const t = phase === 2 ? tab : 'devices';

  return (
    <SetupPage wide title="Devices & integrations" ms="M0" sub="Tablets, handhelds and gate PCs allowed to work offline, and (Phase 2) cameras, scales and barriers on each lane"
      sources={[{ table: 'm_device' }, { table: 'm_device_integration (M5)' }]}
      actions={<Button variant="primary" icon={<Plus />} perm="admin.device.manage" onClick={() => setReg(true)}>Register device</Button>}>
      <div className="kpi-strip">
        <Kpi label="Registered devices" value={live.length} delta={`${devs.length - live.length} revoked`} />
        <Kpi label="Events waiting to sync" value={live.reduce((a, d) => a + d.queue, 0)} delta={`on ${live.filter((d) => d.queue > 0).length} devices`} />
        <Kpi label="Not seen for a day" value={live.filter(stale).length} delta="Check battery or Wi-Fi" />
        {phase === 2 && <Kpi label="Lane devices down" value={ints.filter((i) => i.health === 'DOWN').length} delta={`${ints.filter((i) => i.health === 'WARN').length} with low match rate`} />}
      </div>
      <Tabs<Tab> value={t} onChange={setTab} tabs={[
        { id: 'devices', label: 'Registered devices', count: live.length },
        { id: 'integrations', label: <span className="row" style={{ gap: 6 }}>Lane integrations <Ms m="M5" /></span>, count: ints.length, hidden: phase !== 2 },
      ]} />

      {t === 'devices' && (
        <>
          {live.some((d) => d.queue > 0 && stale(d)) && (
            <Banner tone="wait" title="A device has unsynced work and has not been seen for a day">HH-DAR1-02 holds 3 yard moves. Find the handheld and connect it before revoking, or the moves are lost.</Banner>
          )}
          <Panel flush>
            <DataTable rows={devs} rowKey={(d) => d.deviceId!} cols={[
              { key: 'n', header: 'Device', render: (d) => { const I = KIND_ICON[d.deviceKind]; return <span className="row"><I size={16} /><span><strong className="small">{d.deviceName}</strong><div className="xs faint">{d.deviceCode}</div></span></span>; } },
              { key: 'k', header: 'Kind', render: (d) => <span className="small">{KIND[d.deviceKind]}</span> },
              { key: 's', header: 'Site', render: (d) => SITES.find((s) => s.siteId === d.siteId)?.siteCode },
              { key: 'a', header: 'Where / who', render: (d) => <span className="small muted">{d.assignedTo}</span> },
              { key: 'v', header: 'App', render: (d) => <span className="small">{d.appVersion}</span> },
              { key: 'l', header: 'Last seen', render: (d) => d.revokedAt ? '—' : stale(d) ? <Pill tone="wait">{ago(d.lastSeenAt)}</Pill> : <span className="small" title={fmtDT(d.lastSeenAt)}>{ago(d.lastSeenAt)}</span> },
              { key: 'q', header: 'Offline queue', num: true, render: (d) => d.queue ? <Pill tone="wait">{d.queue} waiting</Pill> : <span className="faint">0</span> },
              { key: 'st', header: 'Status', render: (d) => d.revokedAt ? <span title={d.revokedReason ?? ''}><Pill tone="stop">Revoked</Pill></span> : <Pill tone="go">Allowed</Pill> },
              { key: 'x', header: '', render: (d) => d.revokedAt ? <span className="xs faint">{d.revokedReason}</span> : <Button size="sm" variant="ghost" icon={<Ban />} perm="admin.device.manage" onClick={() => setRevoke(d)}>Revoke</Button> },
            ]} />
          </Panel>
          <AuditNote />
        </>
      )}

      {t === 'integrations' && (
        <>
          <Panel flush title="Lane integrations" sub="Each device talks to the gate agent PC on site; the agent forwards reads to NG ICD">
            <DataTable rows={ints} rowKey={(i) => i.deviceIntegrationId!} onRow={setCfg} cols={[
              { key: 'k', header: 'Device', render: (i) => <><strong className="small">{i.integrationKind === 'CONTAINER_OCR' ? 'Container OCR' : i.integrationKind === 'REEFER_IOT' ? 'Reefer IoT' : i.integrationKind === 'ANPR' ? 'ANPR (plate camera)' : label(i.integrationKind)}</strong><div className="xs faint">{i.vendor} {i.model}</div></> },
              { key: 'l', header: 'Lane', render: (i) => <span className="small">{i.lane}</span> },
              { key: 'm', header: 'Lane mode', render: (i) => <span className="small strong">{label(i.laneMode ?? 'ASSISTED')}</span> },
              { key: 'h', header: 'Health', render: (i) => <Pill tone={i.health === 'OK' ? 'go' : i.health === 'WARN' ? 'wait' : 'stop'}>{i.health === 'OK' ? 'Working' : i.health === 'WARN' ? 'Low match rate' : 'Down'}</Pill> },
              { key: 'r', header: 'Reads today', num: true, render: (i) => i.readsToday.toLocaleString() },
              { key: 'mp', header: 'Matched', num: true, render: (i) => i.readsToday ? `${i.matchPct}%` : '—' },
              { key: 'ls', header: 'Last read', render: (i) => <span className="small">{ago(i.lastRead)}</span> },
            ]} />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>Start every lane on assisted. Move to automatic only when the match rate stays above 95% for two weeks.</p>
          <AuditNote />
        </>
      )}

      {revoke && (
        <EditDrawer open onClose={() => setRevoke(null)} title={`Revoke ${revoke.deviceCode}`} saveLabel="Revoke device" danger perm="admin.device.manage"
          reason="e.g. Reported lost; police report number"
          onSave={(why) => { setDevs((all) => all.map((d) => (d.deviceId === revoke.deviceId ? { ...d, revokedAt: '2026-10-08T07:30:00Z', revokedReason: why } : d))); toast('Device revoked'); }}>
          {revoke.queue > 0
            ? <Banner tone="stop" title={`${revoke.queue} events still on this device`}>Revoking rejects them when the device next connects. They will have to be entered again by hand.</Banner>
            : <Banner tone="info">Nothing is waiting on this device.</Banner>}
          <p className="small muted">The device is signed out at once and can no longer sync. To use it again it must be registered afresh.</p>
        </EditDrawer>
      )}
      <EditDrawer open={reg} onClose={() => setReg(false)} title="Register a device" saveLabel="Create pairing code" perm="admin.device.manage" onSave={() => toast('Pairing code created: 4KX-77Q (valid 15 min)')}>
        <div className="form-grid">
          <Field label="Name" required><Input placeholder="e.g. Gate tablet, In 3" /></Field>
          <Field label="Kind"><Select options={Object.entries(KIND)} /></Field>
          <Field label="Site"><Select options={SITES.map((s) => [String(s.siteId), s.siteCode])} /></Field>
          <Field label="Where / who"><Input placeholder="e.g. Outer gate In 3" /></Field>
        </div>
        <p className="small muted">Open NG ICD on the device and enter the pairing code. The device creates its own key; the private key never leaves it.</p>
      </EditDrawer>
      {cfg && (
        <EditDrawer open onClose={() => setCfg(null)} title={`${cfg.vendor} ${cfg.model} · ${cfg.lane}`} saveLabel="Save integration" perm="device.configure"
          onSave={() => { setInts((all) => all.map((i) => (i.deviceIntegrationId === cfg.deviceIntegrationId ? cfg : i))); toast('Integration saved'); }}>
          <Field label="Lane mode" hint={MODE[cfg.laneMode ?? 'ASSISTED']}>
            <Segmented value={cfg.laneMode ?? 'ASSISTED'} onChange={(m) => setCfg({ ...cfg, laneMode: m })} options={[{ id: 'MANUAL', label: 'Manual' }, { id: 'ASSISTED', label: 'Assisted' }, { id: 'AUTOMATIC', label: 'Automatic' }]} />
          </Field>
          {cfg.laneMode === 'AUTOMATIC' && cfg.matchPct < 95 && <Banner tone="stop" title={`Match rate is ${cfg.matchPct}%`}>Automatic mode would let wrong reads through. Keep it assisted.</Banner>}
          <Field label="Connection" hint="Stored in the secret vault; not shown here"><Input value="••••••••" disabled readOnly /></Field>
          <Button icon={<Settings2 />} perm="device.configure" onClick={() => toast('Test read received')}>Send a test read</Button>
        </EditDrawer>
      )}
    </SetupPage>
  );
}
