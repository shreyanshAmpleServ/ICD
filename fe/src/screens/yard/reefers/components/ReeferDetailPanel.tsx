import { useState } from 'react';
import { Thermometer, Unplug } from 'lucide-react';
import { Button, DL, Field, Input, Panel, Segmented, UnitNo, fmtT } from '@/ds/components';
import { LineChart } from '@/ds/charts';
import type { S } from '@/api/types';
import { REEFER_BAND, type Reefer } from '@/mock/ops';

const NOW_ISO = new Date('2026-10-07T10:30:00+03:00').toISOString();
export const hoursSince = (iso: string) => Math.round((Date.parse(NOW_ISO) - Date.parse(iso)) / 3600_000);

export interface ReeferDetailPanelProps {
  r: Reefer;
  onReading: (x: S<'ReeferReading'>) => void;
  onUnplug: () => void;
}

export function ReeferDetailPanel({ r, onReading, onUnplug }: ReeferDetailPanelProps) {
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
      <Panel
        title={
          <div className="row-wrap">
            <UnitNo no={r.unitNo} size="md" to={`/units/${r.unitStayId}`} />
          </div>
        }
        sub={r.cargo}
        actions={
          live && (
            <Button size="sm" icon={<Unplug />} perm="reefer.manage" onClick={onUnplug}>
              Unplug
            </Button>
          )
        }
      >
        <div className="stack">
          {r.readings.length > 1 ? (
            <LineChart
              label={`Supply air temperature for ${r.unitNo}, last 24 hours, set point ${set} °C`}
              height={180}
              unit=" °C"
              labels={r.readings.map((x) => fmtT(x.readAt))}
              series={[{ name: 'Supply air', values: r.readings.map((x) => Number(x.supplyTempC)) }]}
              band={{
                lower: r.readings.map(() => Math.max(0, set - REEFER_BAND)),
                upper: r.readings.map(() => set + REEFER_BAND),
              }}
            />
          ) : (
            <p className="small muted">
              {live
                ? 'No readings yet. The first IoT reading comes within 2 hours.'
                : 'Not plugged in. Plug it in to start the temperature log.'}
            </p>
          )}
          <p className="xs faint">
            Shaded band: set point {set} °C ± {REEFER_BAND} °C. Above it the unit alarms.
          </p>
          <DL
            items={[
              ['Plug', live ? r.plugNo : 'None'],
              ['Set point', `${set.toFixed(1)} °C`],
              ['Plugged in', live ? `${hoursSince(r.pluggedAt)} h ago` : '—'],
              ['Power used', r.kwhUsed ? `${r.kwhUsed} kWh` : '—'],
              ['Meter at start', r.meterStartKwh ?? '—'],
            ]}
          />
        </div>
      </Panel>
      {live && (
        <Panel title="Record a reading" sub="Manual round, from the unit display">
          <div className="stack">
            <div className="form-grid">
              <Field
                label="Supply air (°C)"
                required
                error={out ? `Outside ${set - REEFER_BAND} to ${set + REEFER_BAND} °C: an alarm opens` : undefined}
              >
                <Input
                  xl
                  value={supply}
                  inputMode="decimal"
                  onChange={(e) => setSupply(e.target.value)}
                  placeholder={String(set)}
                />
              </Field>
              <Field label="Return air (°C)">
                <Input xl value={ret} inputMode="decimal" onChange={(e) => setRet(e.target.value)} />
              </Field>
            </div>
            <Field label="Power">
              <div>
                <Segmented
                  xl
                  value={power}
                  onChange={setPower}
                  options={[
                    { id: 'ON', label: 'Running' },
                    { id: 'OFF', label: 'No power' },
                  ]}
                />
              </div>
            </Field>
            <div className="row">
              <Button
                size="xl"
                variant="primary"
                icon={<Thermometer />}
                perm="reefer.manage"
                disabled={!valid}
                onClick={() => {
                  onReading({
                    reeferReadingId: (Date.parse(NOW_ISO) % 100000) + r.readings.length,
                    readAt: NOW_ISO,
                    supplyTempC: t.toFixed(1),
                    returnTempC: ret || undefined,
                    setTempC: r.setTempC,
                    powerOn: power === 'ON',
                    source: 'MANUAL',
                    isOutOfRange: out,
                  });
                  setSupply('');
                  setRet('');
                }}
              >
                Save reading
              </Button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
