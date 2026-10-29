import { useState } from 'react';
import { Ban, Monitor, Plus, Smartphone, Tablet } from 'lucide-react';
import { Banner, Button, DataTable, Kpi, Ms, Panel, Pill, Tabs, ago, fmtDT, useToast, NOW } from '@/ds/components';
import { useSession, SITES } from '@/app/session';
import { devices as seedDevices, integrations as seedInt } from '@/mock/admin';
import { AuditNote, SetupPage, label, useEditable } from '../../shared/AdminKit';
import { devicesApi } from '../api';
import { RevokeModal } from './RevokeModal';
import { RegisterDeviceModal } from './RegisterDeviceModal';
import { IntegrationDrawer } from './IntegrationDrawer';

type Tab = 'devices' | 'integrations';
type Dev = (typeof seedDevices)[number];
type Int = (typeof seedInt)[number];
const KIND_ICON = { TABLET: Tablet, PHONE: Smartphone, GATE_PC: Monitor, KIOSK: Monitor };
const KIND: Record<string, string> = { TABLET: 'Gate tablet', PHONE: 'Handheld', GATE_PC: 'Gate agent PC', KIOSK: 'Kiosk' };
const stale = (d: Dev) => !d.revokedAt && d.lastSeenAt && NOW.getTime() - Date.parse(d.lastSeenAt) > 24 * 3600_000;

export function DevicesView() {
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
    <SetupPage
      wide
      title="Devices & integrations"
      ms="M0"
      sub="Tablets, handhelds and gate PCs allowed to work offline, and (Phase 2) cameras, scales and barriers on each lane"
      sources={[{ table: 'm_device' }, { table: 'm_device_integration (M5)' }]}
      actions={
        <Button variant="primary" icon={<Plus />} perm="admin.device.manage" onClick={() => setReg(true)}>
          Register device
        </Button>
      }
    >
      <div className="kpi-strip">
        <Kpi label="Registered devices" value={live.length} delta={`${devs.length - live.length} revoked`} />
        <Kpi
          label="Events waiting to sync"
          value={live.reduce((a, d) => a + d.queue, 0)}
          delta={`on ${live.filter((d) => d.queue > 0).length} devices`}
        />
        <Kpi label="Not seen for a day" value={live.filter(stale).length} delta="Check battery or Wi-Fi" />
        {phase === 2 && (
          <Kpi
            label="Lane devices down"
            value={ints.filter((i) => i.health === 'DOWN').length}
            delta={`${ints.filter((i) => i.health === 'WARN').length} with low match rate`}
          />
        )}
      </div>
      <Tabs<Tab>
        value={t}
        onChange={setTab}
        tabs={[
          { id: 'devices', label: 'Registered devices', count: live.length },
          {
            id: 'integrations',
            label: (
              <span className="row" style={{ gap: 6 }}>
                Lane integrations <Ms m="M5" />
              </span>
            ),
            count: ints.length,
            hidden: phase !== 2,
          },
        ]}
      />

      {t === 'devices' && (
        <>
          {live.some((d) => d.queue > 0 && stale(d)) && (
            <Banner tone="wait" title="A device has unsynced work and has not been seen for a day">
              HH-DAR1-02 holds 3 yard moves. Find the handheld and connect it before revoking, or the moves are lost.
            </Banner>
          )}
          <Panel flush>
            <DataTable
              rows={devs}
              rowKey={(d) => d.deviceId!}
              cols={[
                {
                  key: 'n',
                  header: 'Device',
                  render: (d) => {
                    const I = KIND_ICON[d.deviceKind];
                    return (
                      <span className="row">
                        <I size={16} />
                        <span>
                          <strong className="small">{d.deviceName}</strong>
                          <div className="xs faint">{d.deviceCode}</div>
                        </span>
                      </span>
                    );
                  },
                },
                { key: 'k', header: 'Kind', render: (d) => <span className="small">{KIND[d.deviceKind]}</span> },
                { key: 's', header: 'Site', render: (d) => SITES.find((s) => s.siteId === d.siteId)?.siteCode },
                { key: 'a', header: 'Where / who', render: (d) => <span className="small muted">{d.assignedTo}</span> },
                { key: 'v', header: 'App', render: (d) => <span className="small">{d.appVersion}</span> },
                {
                  key: 'l',
                  header: 'Last seen',
                  render: (d) =>
                    d.revokedAt ? (
                      '—'
                    ) : stale(d) ? (
                      <Pill tone="wait">{ago(d.lastSeenAt)}</Pill>
                    ) : (
                      <span className="small" title={fmtDT(d.lastSeenAt)}>
                        {ago(d.lastSeenAt)}
                      </span>
                    ),
                },
                {
                  key: 'q',
                  header: 'Offline queue',
                  num: true,
                  render: (d) => (d.queue ? <Pill tone="wait">{d.queue} waiting</Pill> : <span className="faint">0</span>),
                },
                {
                  key: 'st',
                  header: 'Status',
                  render: (d) =>
                    d.revokedAt ? (
                      <span title={d.revokedReason ?? ''}>
                        <Pill tone="stop">Revoked</Pill>
                      </span>
                    ) : (
                      <Pill tone="go">Allowed</Pill>
                    ),
                },
                {
                  key: 'x',
                  header: '',
                  render: (d) =>
                    d.revokedAt ? (
                      <span className="xs faint">{d.revokedReason}</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Ban />}
                        perm="admin.device.manage"
                        onClick={() => setRevoke(d)}
                      >
                        Revoke
                      </Button>
                    ),
                },
              ]}
            />
          </Panel>
          <AuditNote />
        </>
      )}

      {t === 'integrations' && (
        <>
          <Panel
            flush
            title="Lane integrations"
            sub="Each device talks to the gate agent PC on site; the agent forwards reads to NG ICD"
          >
            <DataTable
              rows={ints}
              rowKey={(i) => i.deviceIntegrationId!}
              onRow={setCfg}
              cols={[
                {
                  key: 'k',
                  header: 'Device',
                  render: (i) => (
                    <>
                      <strong className="small">
                        {i.integrationKind === 'CONTAINER_OCR'
                          ? 'Container OCR'
                          : i.integrationKind === 'REEFER_IOT'
                          ? 'Reefer IoT'
                          : i.integrationKind === 'ANPR'
                          ? 'ANPR (plate camera)'
                          : label(i.integrationKind)}
                      </strong>
                      <div className="xs faint">
                        {i.vendor} {i.model}
                      </div>
                    </>
                  ),
                },
                { key: 'l', header: 'Lane', render: (i) => <span className="small">{i.lane}</span> },
                {
                  key: 'm',
                  header: 'Lane mode',
                  render: (i) => <span className="small strong">{label(i.laneMode ?? 'ASSISTED')}</span>,
                },
                {
                  key: 'h',
                  header: 'Health',
                  render: (i) => (
                    <Pill tone={i.health === 'OK' ? 'go' : i.health === 'WARN' ? 'wait' : 'stop'}>
                      {i.health === 'OK' ? 'Working' : i.health === 'WARN' ? 'Low match rate' : 'Down'}
                    </Pill>
                  ),
                },
                { key: 'r', header: 'Reads today', num: true, render: (i) => i.readsToday.toLocaleString() },
                { key: 'mp', header: 'Matched', num: true, render: (i) => (i.readsToday ? `${i.matchPct}%` : '—') },
                { key: 'ls', header: 'Last read', render: (i) => <span className="small">{ago(i.lastRead)}</span> },
              ]}
            />
          </Panel>
          <p className="small muted" style={{ margin: 0 }}>
            Start every lane on assisted. Move to automatic only when the match rate stays above 95% for two weeks.
          </p>
          <AuditNote />
        </>
      )}

      {revoke && (
        <RevokeModal
          revoke={revoke}
          onClose={() => setRevoke(null)}
          onSave={(why) => {
            if (revoke.deviceId) devicesApi.revokeDevice(revoke.deviceId, why).catch(() => {});
            setDevs((all) =>
              all.map((d) =>
                d.deviceId === revoke.deviceId ? { ...d, revokedAt: '2026-10-08T07:30:00Z', revokedReason: why } : d
              )
            );
            toast('Device revoked');
          }}
        />
      )}

      <RegisterDeviceModal
        open={reg}
        onClose={() => setReg(false)}
        onSave={() => {
          devicesApi
            .registerDevice({
              deviceCode: `DEV-${Date.now() % 1000}`,
              deviceKind: 'TABLET',
              deviceName: 'New Device',
              siteId: 1,
            })
            .catch(() => {});
          toast('Pairing code created: 4KX-77Q (valid 15 min)');
        }}
      />

      {cfg && (
        <IntegrationDrawer
          cfg={cfg}
          onClose={() => setCfg(null)}
          onChange={setCfg}
          onSave={() => {
            setInts((all) => all.map((i) => (i.deviceIntegrationId === cfg.deviceIntegrationId ? cfg : i)));
            toast('Integration saved');
          }}
          onTestRead={() => toast('Test read received')}
        />
      )}
    </SetupPage>
  );
}
