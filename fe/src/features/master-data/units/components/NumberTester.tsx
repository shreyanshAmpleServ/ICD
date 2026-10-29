import { useState } from 'react';
import { CheckCircle2, OctagonX } from 'lucide-react';
import { Input, Panel, Segmented, UnitNo } from '@/ds/components';
import { iso6346 } from '@/mock/gen';
import { plateFormats } from '@/mock/admin';

type Mode = 'CONTAINER' | 'VEHICLE' | 'PLATE';
interface Result { ok: boolean; title: string; detail: string; normalized?: string }

export function checkContainer(raw: string): Result {
  const n = raw.replace(/[\s-]/g, '').toUpperCase();
  if (!n) return { ok: false, title: '', detail: '' };
  if (n.length !== 11) return { ok: false, title: `${n.length} characters, needs 11`, detail: '4 letters (owner code ending in U, J or Z) then 7 digits.', normalized: n };
  if (!/^[A-Z]{3}[UJZ]/.test(n)) return { ok: false, title: 'Owner code is wrong', detail: `"${n.slice(0, 4)}" must be three letters followed by U (freight), J (detachable equipment) or Z (trailer).`, normalized: n };
  if (!/^[A-Z]{4}\d{7}$/.test(n)) return { ok: false, title: 'Serial must be digits', detail: `"${n.slice(4)}" must be 7 digits.`, normalized: n };
  const cd = iso6346(n.slice(0, 10));
  if (cd !== n[10]) return { ok: false, title: `Check digit should be ${cd}, not ${n[10]}`, detail: 'Usually one digit was misread. Compare with the number painted on the door.', normalized: n };
  return { ok: true, title: 'Valid container number', detail: `Check digit ${cd} matches (ISO 6346).`, normalized: n };
}

export function checkVin(raw: string): Result {
  const n = raw.replace(/\s/g, '').toUpperCase();
  if (!n) return { ok: false, title: '', detail: '' };
  if (/^[A-Z0-9]{2,8}-[0-9]{4,8}$/.test(n)) return { ok: true, title: 'Valid Japanese frame number', detail: 'Accepted by rule JP_FRAME (model code, dash, serial).', normalized: n };
  const bad = [...new Set(n.split('').filter((c) => !/[A-HJ-NPR-Z0-9]/.test(c)))];
  if (bad.length) return { ok: false, title: `Not allowed: ${bad.join(', ')}`, detail: bad.some((c) => 'IOQ'.includes(c)) ? 'VINs never use I, O or Q: they are read as 1 and 0. Check the plate on the dashboard.' : 'Only letters and digits.', normalized: n };
  if (n.length !== 17) return { ok: false, title: `${n.length} characters, needs 17`, detail: n.length < 17 ? 'Missing characters. If it has a dash it may be a Japanese frame number.' : 'Too many characters.', normalized: n };
  return { ok: true, title: 'Valid VIN', detail: `World manufacturer code ${n.slice(0, 3)}; serial ${n.slice(9)}. Check digit not enforced (only North American VINs use it).`, normalized: n };
}

export function checkPlate(raw: string): Result {
  const n = raw.toUpperCase().trim();
  if (!n) return { ok: false, title: '', detail: '' };
  const hit = plateFormats.find((f) => new RegExp(f.pattern).test(n));
  return hit ? { ok: true, title: `Valid ${hit.country} plate`, detail: `Stored as ${n.replace(/\s/g, '')}.`, normalized: n } : { ok: false, title: 'No plate format matches', detail: 'Check the country, or record it as a foreign plate with a supervisor.', normalized: n };
}

export function NumberTester() {
  const [mode, setMode] = useState<Mode>('CONTAINER');
  const [v, setV] = useState('MSKU 402117 8');
  const r = mode === 'CONTAINER' ? checkContainer(v) : mode === 'VEHICLE' ? checkVin(v) : checkPlate(v);
  const examples: Record<Mode, string[]> = {
    CONTAINER: ['MSKU 402117 8', 'MSKU 402117 3', 'CSQU3054383', 'MSKU 40217'],
    VEHICLE: ['JTMHV05J604123456', 'JTMHV05J6O4123456', 'NZE141-1234567'],
    PLATE: ['T 412 DKL', 'BAK 4471', 'T 41 DKL']
  };

  return (
    <Panel title="Test a number" sub="Runs the same checks as the gate, the yard handheld and the manifest import">
      <div className="stack">
        <Segmented<Mode>
          label="What to test"
          value={mode}
          onChange={(m) => { setMode(m); setV(examples[m][0]); }}
          options={[{ id: 'CONTAINER', label: 'Container' }, { id: 'VEHICLE', label: 'VIN or frame' }, { id: 'PLATE', label: 'Truck plate' }]}
        />
        <div className="adm-test">
          <Input value={v} onChange={(e) => setV(e.target.value)} aria-label="Number to test" placeholder={examples[mode][0]} spellCheck={false} autoCapitalize="characters" />
        </div>
        <div className="row-wrap xs">
          <span className="faint">Try:</span>
          {examples[mode].map((x) => (
            <button key={x} className="chip" style={{ height: 24 }} onClick={() => setV(x)}>{x}</button>
          ))}
        </div>
        {r.title && (
          <div className={`banner ${r.ok ? 'banner-go' : 'banner-stop'}`} role="status" aria-live="polite">
            {r.ok ? <CheckCircle2 /> : <OctagonX />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="strong">{r.title}</div>
              <div className="small">{r.detail}</div>
              {r.ok && r.normalized && mode !== 'PLATE' && (
                <div style={{ marginTop: 6 }}>
                  <UnitNo no={r.normalized} category={mode} size="md" />
                </div>
              )}
              {mode === 'VEHICLE' && r.normalized && (
                <div className="xs muted" style={{ marginTop: 4 }}>{r.normalized.length} of 17 characters</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
