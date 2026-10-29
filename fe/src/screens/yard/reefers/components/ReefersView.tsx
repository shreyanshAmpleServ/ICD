import { useMemo, useState } from 'react';
import { PlugZap } from 'lucide-react';
import {
  Banner, Button, DataTable, Drawer, Empty, Kpi, Page, PageHeader, Panel, Pill, UnitNo, ago, useToast,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { REEFER_BAND, type Reefer } from '@/mock/ops';
import { reefersApi } from '../api';
import { ReeferDetailPanel, hoursSince } from './ReeferDetailPanel';
import { PlugInDrawer } from './PlugInDrawer';
import { UnplugDrawer } from './UnplugDrawer';

const NOW_ISO = new Date('2026-10-07T10:30:00+03:00').toISOString();
const ALARM: Record<string, string> = {
  HIGH_TEMP: 'High temperature',
  POWER_OFF: 'No power',
  NO_READING: 'No reading 8 h',
};

const last = (r: Reefer) => r.readings[r.readings.length - 1];

export function ReefersView() {
  const { site } = useSession();
  const toast = useToast();
  const { data = [] } = useQ(['reefer-sessions'], () => reefersApi.getReeferSessions());
  const [patch, setPatch] = useState<Record<number, Partial<Reefer>>>({});
  const [selId, setSelId] = useState<number | null>(null);
  const [plugFor, setPlugFor] = useState<Reefer | null>(null);
  const [unplugFor, setUnplugFor] = useState<Reefer | null>(null);

  const all = useMemo(() => data.map((r) => ({ ...r, ...patch[r.reeferSessionId!] }) as Reefer), [data, patch]);
  const set = (r: Reefer, p: Partial<Reefer>) =>
    setPatch((x) => ({ ...x, [r.reeferSessionId!]: { ...x[r.reeferSessionId!], ...p } }));

  if (site.siteId !== 1) {
    return (
      <Page>
        <PageHeader title="Reefers" ms="M5" />
        <Empty title="No reefer plugs at this site">
          Reefer block R and the gensets are at DAR1. Switch site from the top bar.
        </Empty>
      </Page>
    );
  }

  const plugged = all.filter((r) => r.plugNo && !r.unpluggedAt);
  const off = all.filter((r) => !r.plugNo || r.unpluggedAt);
  const alarms = plugged.filter((r) => r.alarm);
  const usedPlugs = new Set(plugged.map((r) => r.plugNo));
  const rows = [...alarms, ...off, ...plugged.filter((r) => !r.alarm)];
  const sel = all.find((r) => r.reeferSessionId === selId) ?? alarms[0] ?? plugged[0];

  return (
    <Page wide>
      <PageHeader
        title="Reefers"
        ms="M5"
        sub={`${site.siteName} · block R, 32 plugs · gensets G2 · set point band ±${REEFER_BAND} °C`}
      />
      <div className="stack-lg">
        {alarms.length > 0 && (
          <Banner tone="stop" title={`${alarms.length} reefer alarm${alarms.length > 1 ? 's' : ''}`}>
            {alarms
              .map(
                (r) =>
                  `${r.unitNo} at ${r.plugNo}: ${ALARM[r.alarm!]}${
                    r.alarm === 'HIGH_TEMP' ? ` (${last(r).supplyTempC} °C, set ${r.setTempC} °C)` : ''
                  }`
              )
              .join(' · ')}
            . Send a technician and record a reading after the check.
          </Banner>
        )}
        {off.length > 0 && (
          <Banner tone="wait" title={`${off.length} reefers off power`}>
            Block R is full. Plug them on genset G2 or move a departing unit out first.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi label="Plugged in" value={plugged.length} unit="of 36 plugs" />
          <Kpi label="Alarms" value={alarms.length} />
          <Kpi label="Off power" value={off.length} />
          <Kpi
            label="Power used, all sessions"
            value={Math.round(plugged.reduce((a, r) => a + Number(r.kwhUsed ?? 0), 0)).toLocaleString()}
            unit="kWh"
          />
          <Kpi label="Next manual round" value="12:00" delta="Every 4 h, plus IoT every 2 h" />
        </div>

        <div className="grid-main-side ops-gms">
          <style>{'.ops-gms > * { min-width: 0; }'}</style>
          <Panel flush title="Units">
            <DataTable
              rows={rows}
              rowKey={(r) => r.reeferSessionId!}
              onRow={(r) => setSelId(r.reeferSessionId!)}
              selected={sel?.reeferSessionId}
              cols={[
                {
                  key: 'u',
                  header: 'Unit',
                  render: (r) => (
                    <>
                      <UnitNo no={r.unitNo} />
                      <div className="xs faint">{r.unitType}</div>
                    </>
                  ),
                },
                {
                  key: 'plug',
                  header: 'Plug',
                  render: (r) =>
                    r.plugNo && !r.unpluggedAt ? <strong>{r.plugNo}</strong> : <Pill tone="wait">Off power</Pill>,
                },
                { key: 'set', header: 'Set', num: true, render: (r) => `${Number(r.setTempC).toFixed(1)} °C` },
                {
                  key: 'last',
                  header: 'Last reading',
                  num: true,
                  render: (r) => {
                    const l = last(r);
                    if (!l || r.unpluggedAt) return '—';
                    const dev = Math.abs(Number(l.supplyTempC) - Number(r.setTempC)) > REEFER_BAND;
                    return (
                      <span style={{ color: dev ? 'var(--stop)' : undefined, fontWeight: dev ? 700 : 600 }}>
                        {Number(l.supplyTempC).toFixed(1)} °C
                        <div className="xs faint" style={{ fontWeight: 400 }}>
                          {ago(l.readAt)}
                        </div>
                      </span>
                    );
                  },
                },
                {
                  key: 'al',
                  header: 'State',
                  render: (r) =>
                    r.alarm && !r.unpluggedAt ? (
                      <Pill tone="stop">{ALARM[r.alarm]}</Pill>
                    ) : r.plugNo && !r.unpluggedAt ? (
                      <Pill tone="go">OK</Pill>
                    ) : (
                      <span className="xs faint">Not plugged</span>
                    ),
                },
                {
                  key: 'h',
                  header: 'Hours',
                  num: true,
                  render: (r) => (r.plugNo && !r.unpluggedAt ? hoursSince(r.pluggedAt) : '—'),
                },
                { key: 'kwh', header: 'kWh', num: true, render: (r) => r.kwhUsed ?? '—' },
                {
                  key: 'act',
                  header: '',
                  render: (r) =>
                    !r.plugNo || r.unpluggedAt ? (
                      <Button
                        size="sm"
                        icon={<PlugZap />}
                        perm="reefer.manage"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlugFor(r);
                        }}
                      >
                        Plug in
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Panel>
          {sel && (
            <ReeferDetailPanel
              r={sel}
              onReading={(rd) => {
                set(sel, {
                  readings: [...sel.readings, rd],
                  alarm: rd.isOutOfRange ? 'HIGH_TEMP' : rd.powerOn === false ? 'POWER_OFF' : undefined,
                });
                toast(`Reading saved for ${sel.unitNo}`);
              }}
              onUnplug={() => setUnplugFor(sel)}
            />
          )}
        </div>
      </div>

      <Drawer
        open={!!plugFor}
        onClose={() => setPlugFor(null)}
        title={plugFor ? `Plug in ${plugFor.unitNo}` : ''}
      >
        {plugFor && (
          <PlugInDrawer
            r={plugFor}
            used={usedPlugs}
            onDone={(plug, temp) => {
              set(plugFor, {
                plugNo: plug,
                unpluggedAt: undefined,
                pluggedAt: NOW_ISO,
                kwhUsed: '0.0',
                setTempC: temp,
                readings: [],
                alarm: undefined,
              });
              toast(`${plugFor.unitNo} plugged in at ${plug}`);
              setPlugFor(null);
            }}
          />
        )}
      </Drawer>
      <Drawer
        open={!!unplugFor}
        onClose={() => setUnplugFor(null)}
        title={unplugFor ? `Unplug ${unplugFor.unitNo}` : ''}
      >
        {unplugFor && (
          <UnplugDrawer
            r={unplugFor}
            onDone={(kwh) => {
              set(unplugFor, { unpluggedAt: NOW_ISO, kwhUsed: kwh });
              toast(`${unplugFor.unitNo} unplugged from ${unplugFor.plugNo}`);
              setUnplugFor(null);
            }}
          />
        )}
      </Drawer>
    </Page>
  );
}
