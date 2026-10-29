import { useMemo, useState } from 'react';
import { PlugZap, Thermometer, Unplug } from 'lucide-react';
import {
  Banner, Button, DL, DataTable, Drawer, Empty, Field, Input, Kpi, Page, PageHeader, Panel, Pill, Segmented, Select, UnitNo, ago, fmtT, useToast,
} from '@/ds/components';
import { LineChart } from '@/ds/charts';
import type { S } from '@/api/types';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { REEFER_BAND, reefers, type Reefer } from '@/mock/ops';

/* Reefer monitor (M5): GET /reefer-sessions, readings from the IoT gateway
   every 2 h plus manual rounds. Outside set point ±2 °C or power off is an
   alarm. Plug-in and unplug create billable events (kWh and hours). */
const NOW_ISO = new Date('2026-10-07T10:30:00+03:00').toISOString();
const ALARM: Record<string, string> = { HIGH_TEMP: 'High temperature', POWER_OFF: 'No power', NO_READING: 'No reading 8 h' };
const GENSET_PLUGS = ['G2-01', 'G2-02', 'G2-03', 'G2-04'];
const last = (r: Reefer) => r.readings[r.readings.length - 1];
const hoursSince = (iso: string) => Math.round((Date.parse(NOW_ISO) - Date.parse(iso)) / 3600_000);

export function Reefers() {
  const { site } = useSession();
  const toast = useToast();
  const { data = [] } = useQ(['reefer-sessions'], () => delay(reefers));
  const [patch, setPatch] = useState<Record<number, Partial<Reefer>>>({});
  const [selId, setSelId] = useState<number | null>(null);
  const [plugFor, setPlugFor] = useState<Reefer | null>(null);
  const [unplugFor, setUnplugFor] = useState<Reefer | null>(null);
  const all = useMemo(() => data.map((r) => ({ ...r, ...patch[r.reeferSessionId!] }) as Reefer), [data, patch]);
  const set = (r: Reefer, p: Partial<Reefer>) => setPatch((x) => ({ ...x, [r.reeferSessionId!]: { ...x[r.reeferSessionId!], ...p } }));

  if (site.siteId !== 1) return <Page><PageHeader title="Reefers" ms="M5" /><Empty title="No reefer plugs at this site">Reefer block R and the gensets are at DAR1. Switch site from the top bar.</Empty></Page>;

  const plugged = all.filter((r) => r.plugNo && !r.unpluggedAt);
  const off = all.filter((r) => !r.plugNo || r.unpluggedAt);
  const alarms = plugged.filter((r) => r.alarm);
  const usedPlugs = new Set(plugged.map((r) => r.plugNo));
  const rows = [...alarms, ...off, ...plugged.filter((r) => !r.alarm)];
  const sel = all.find((r) => r.reeferSessionId === selId) ?? alarms[0] ?? plugged[0];

  return (
    <Page wide>
      <PageHeader title="Reefers" ms="M5" sub={`${site.siteName} · block R, 32 plugs · gensets G2 · set point band ±${REEFER_BAND} °C`} />
      <div className="stack-lg">
        {alarms.length > 0 && (
          <Banner tone="stop" title={`${alarms.length} reefer alarm${alarms.length > 1 ? 's' : ''}`}>
            {alarms.map((r) => `${r.unitNo} at ${r.plugNo}: ${ALARM[r.alarm!]}${r.alarm === 'HIGH_TEMP' ? ` (${last(r).supplyTempC} °C, set ${r.setTempC} °C)` : ''}`).join(' · ')}. Send a technician and record a reading after the check.
          </Banner>
        )}
        {off.length > 0 && <Banner tone="wait" title={`${off.length} reefers off power`}>Block R is full. Plug them on genset G2 or move a departing unit out first.</Banner>}
        <div className="kpi-strip">
          <Kpi label="Plugged in" value={plugged.length} unit="of 36 plugs" />
          <Kpi label="Alarms" value={alarms.length} />
          <Kpi label="Off power" value={off.length} />
          <Kpi label="Power used, all sessions" value={Math.round(plugged.reduce((a, r) => a + Number(r.kwhUsed ?? 0), 0)).toLocaleString()} unit="kWh" />
          <Kpi label="Next manual round" value="12:00" delta="Every 4 h, plus IoT every 2 h" />
        </div>

        <div className="grid-main-side ops-gms">
          <style>{'.ops-gms > * { min-width: 0; }'}</style>
          <Panel flush title="Units">
            <DataTable rows={rows} rowKey={(r) => r.reeferSessionId!} onRow={(r) => setSelId(r.reeferSessionId!)} selected={sel?.reeferSessionId} cols={[
              { key: 'u', header: 'Unit', render: (r) => <><UnitNo no={r.unitNo} /><div className="xs faint">{r.unitType}</div></> },
              { key: 'plug', header: 'Plug', render: (r) => r.plugNo && !r.unpluggedAt ? <strong>{r.plugNo}</strong> : <Pill tone="wait">Off power</Pill> },
              { key: 'set', header: 'Set', num: true, render: (r) => `${Number(r.setTempC).toFixed(1)} °C` },
              { key: 'last', header: 'Last reading', num: true, render: (r) => {
                const l = last(r); if (!l || r.unpluggedAt) return '—';
                const dev = Math.abs(Number(l.supplyTempC) - Number(r.setTempC)) > REEFER_BAND;
                return <span style={{ color: dev ? 'var(--stop)' : undefined, fontWeight: dev ? 700 : 600 }}>{Number(l.supplyTempC).toFixed(1)} °C<div className="xs faint" style={{ fontWeight: 400 }}>{ago(l.readAt)}</div></span>;
              } },
              { key: 'al', header: 'State', render: (r) => r.alarm && !r.unpluggedAt ? <Pill tone="stop">{ALARM[r.alarm]}</Pill> : r.plugNo && !r.unpluggedAt ? <Pill tone="go">OK</Pill> : <span className="xs faint">Not plugged</span> },
              { key: 'h', header: 'Hours', num: true, render: (r) => (r.plugNo && !r.unpluggedAt ? hoursSince(r.pluggedAt) : '—') },
              { key: 'kwh', header: 'kWh', num: true, render: (r) => r.kwhUsed ?? '—' },
              { key: 'act', header: '', render: (r) => (!r.plugNo || r.unpluggedAt) ? <Button size="sm" icon={<PlugZap />} perm="reefer.manage" onClick={(e) => { e.stopPropagation(); setPlugFor(r); }}>Plug in</Button> : null },
            ]} />
          </Panel>
          {sel && <Detail r={sel} onReading={(rd) => { set(sel, { readings: [...sel.readings, rd], alarm: rd.isOutOfRange ? 'HIGH_TEMP' : rd.powerOn === false ? 'POWER_OFF' : undefined }); toast(`Reading saved for ${sel.unitNo}`); }} onUnplug={() => setUnplugFor(sel)} />}
        </div>
      </div>

      <Drawer open={!!plugFor} onClose={() => setPlugFor(null)} title={plugFor ? `Plug in ${plugFor.unitNo}` : ''}>
        {plugFor && <PlugIn r={plugFor} used={usedPlugs} onDone={(plug, temp) => { set(plugFor, { plugNo: plug, unpluggedAt: undefined, pluggedAt: NOW_ISO, kwhUsed: '0.0', setTempC: temp, readings: [], alarm: undefined }); toast(`${plugFor.unitNo} plugged in at ${plug}`); setPlugFor(null); }} />}
      </Drawer>
      <Drawer open={!!unplugFor} onClose={() => setUnplugFor(null)} title={unplugFor ? `Unplug ${unplugFor.unitNo}` : ''}>
        {unplugFor && <UnplugForm r={unplugFor} onDone={(kwh) => { set(unplugFor, { unpluggedAt: NOW_ISO, kwhUsed: kwh }); toast(`${unplugFor.unitNo} unplugged from ${unplugFor.plugNo}`); setUnplugFor(null); }} />}
      </Drawer>
    </Page>
  );
}

function Detail({ r, onReading, onUnplug }: { r: Reefer; onReading: (x: S<'ReeferReading'>) => void; onUnplug: () => void }) {
  const [supply, setSupply] = useState('');
  const [ret, setRet] = useState('');
  const [power, setPower] = useState<'ON' | 'OFF'>('ON');
  const set = Number(r.setTempC);
  const live = !!r.plugNo && !r.unpluggedAt;
  const t = Number(supply.replace(',', '.'));
  const valid = supply !== '' && !Number.isNaN(t) && t > -40 && t < 40;
  const out = valid && Math.abs(t - set) > REEFER_BAND;
  return (
    <div className="stack-lg">
      <Panel title={<div className="row-wrap"><UnitNo no={r.unitNo} size="md" to={`/units/${r.unitStayId}`} /></div>} sub={r.cargo}
        actions={live && <Button size="sm" icon={<Unplug />} perm="reefer.manage" onClick={onUnplug}>Unplug</Button>}>
        <div className="stack">
          {r.readings.length > 1 ? (
            <LineChart label={`Supply air temperature for ${r.unitNo}, last 24 hours, set point ${set} °C`} height={180} unit=" °C"
              labels={r.readings.map((x) => fmtT(x.readAt))} series={[{ name: 'Supply air', values: r.readings.map((x) => Number(x.supplyTempC)) }]}
              band={{ lower: r.readings.map(() => Math.max(0, set - REEFER_BAND)), upper: r.readings.map(() => set + REEFER_BAND) }} />
          ) : <p className="small muted">{live ? 'No readings yet. The first IoT reading comes within 2 hours.' : 'Not plugged in. Plug it in to start the temperature log.'}</p>}
          <p className="xs faint">Shaded band: set point {set} °C ± {REEFER_BAND} °C. Above it the unit alarms.</p>
          <DL items={[['Plug', live ? r.plugNo : 'None'], ['Set point', `${set.toFixed(1)} °C`], ['Plugged in', live ? `${hoursSince(r.pluggedAt)} h ago` : '—'], ['Power used', r.kwhUsed ? `${r.kwhUsed} kWh` : '—'], ['Meter at start', r.meterStartKwh ?? '—']]} />
        </div>
      </Panel>
      {live && (
        <Panel title="Record a reading" sub="Manual round, from the unit display">
          <div className="stack">
            <div className="form-grid">
              <Field label="Supply air (°C)" required error={out ? `Outside ${set - REEFER_BAND} to ${set + REEFER_BAND} °C: an alarm opens` : undefined}><Input xl value={supply} inputMode="decimal" onChange={(e) => setSupply(e.target.value)} placeholder={String(set)} /></Field>
              <Field label="Return air (°C)"><Input xl value={ret} inputMode="decimal" onChange={(e) => setRet(e.target.value)} /></Field>
            </div>
            <Field label="Power"><div><Segmented xl value={power} onChange={setPower} options={[{ id: 'ON', label: 'Running' }, { id: 'OFF', label: 'No power' }]} /></div></Field>
            <div className="row"><Button size="xl" variant="primary" icon={<Thermometer />} perm="reefer.manage" disabled={!valid} onClick={() => {
              onReading({ reeferReadingId: Date.parse(NOW_ISO) % 100000 + r.readings.length, readAt: NOW_ISO, supplyTempC: t.toFixed(1), returnTempC: ret || undefined, setTempC: r.setTempC, powerOn: power === 'ON', source: 'MANUAL', isOutOfRange: out });
              setSupply(''); setRet('');
            }}>Save reading</Button></div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function PlugIn({ r, used, onDone }: { r: Reefer; used: Set<string | undefined>; onDone: (plug: string, temp: string) => void }) {
  const free = GENSET_PLUGS.filter((p) => !used.has(p));
  const [plug, setPlug] = useState(free[0] ?? '');
  const [temp, setTemp] = useState(r.setTempC);
  const [checked, setChecked] = useState(false);
  return (
    <div className="stack">
      {free.length === 0 ? <Banner tone="stop">No plug free. Unplug a departing unit first.</Banner> : (
        <>
          <Banner tone="wait">Block R is full. Free plugs are on portable genset G2 next to block B. Check its fuel at each round.</Banner>
          <Field label="Plug" required><Select value={plug} onChange={(e) => setPlug(e.target.value)} options={free} /></Field>
          <Field label="Set point (°C)" hint="From the booking. Change only if the line tells you in writing." required><Input xl value={temp} onChange={(e) => setTemp(e.target.value)} /></Field>
          <Field label="Before you plug in"><button type="button" className="btn btn-xl" aria-pressed={checked} onClick={() => setChecked(!checked)} style={{ justifyContent: 'flex-start', borderColor: checked ? 'var(--go)' : undefined }}>{checked ? '✓ ' : ''}Cable and socket checked, unit display on</button></Field>
          <Button size="xl" variant="primary" icon={<PlugZap />} perm="reefer.manage" disabled={!checked || !plug} onClick={() => onDone(plug, temp)}>Plug in at {plug}</Button>
        </>
      )}
    </div>
  );
}

function UnplugForm({ r, onDone }: { r: Reefer; onDone: (kwh: string) => void }) {
  const [why, setWhy] = useState('Leaving on a truck');
  const [meter, setMeter] = useState('');
  const start = Number(r.meterStartKwh ?? 0);
  const m = Number(meter);
  const err = meter && m < start ? `Must be at least the start reading ${start}` : undefined;
  return (
    <div className="stack">
      <DL items={[['Plug', r.plugNo], ['Plugged in', `${hoursSince(r.pluggedAt)} h`], ['Meter at start', r.meterStartKwh ?? '—']]} />
      <Field label="Why" required><Select value={why} onChange={(e) => setWhy(e.target.value)} options={['Leaving on a truck', 'Going to the exam bay', 'Moving to another plug', 'Technician repair']} /></Field>
      <Field label="Meter now (kWh)" required error={err}><Input xl value={meter} inputMode="decimal" onChange={(e) => setMeter(e.target.value)} placeholder={String(start + Math.round(Number(r.kwhUsed ?? 0)))} /></Field>
      {why !== 'Leaving on a truck' && <Banner tone="wait">The unit is off power from now. Plug it in again within 2 hours or the cargo may warm up.</Banner>}
      <Button size="xl" variant="primary" icon={<Unplug />} perm="reefer.manage" disabled={!meter || !!err} onClick={() => onDone((m - start).toFixed(1))}>Unplug now</Button>
    </div>
  );
}
