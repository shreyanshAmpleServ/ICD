import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Banner, Button, Drawer, Field, Input, Pill, Select } from '@/ds/components';
import { CHARGE_NAMES, m2, num, type Rule } from '@/mock/money';

export const filtersOf = (r: Rule) =>
  [
    r.unitCategory && r.unitCategory.toLowerCase(),
    r.lengthFt && `${r.lengthFt}'`,
    r.fullEmpty && (r.fullEmpty === 'F' ? 'full' : 'empty'),
    r.isReefer && 'reefer',
    r.isHazardous && 'hazardous',
    r.vehicleClass && r.vehicleClass.toLowerCase().replace('_', ' '),
  ].filter(Boolean) as string[];

export interface SlabDrawerProps {
  rule: Rule | null;
  editable: boolean;
  onClose: () => void;
  onSave: (r: Rule) => void;
}

export function SlabDrawer({ rule, editable, onClose, onSave }: SlabDrawerProps) {
  return (
    <Drawer
      open={!!rule}
      onClose={onClose}
      title={rule ? `${CHARGE_NAMES[rule.chargeCode]}: ${filtersOf(rule).join(', ') || 'all units'}` : ''}
    >
      {rule && <SlabForm key={rule.tariffRuleId} rule={rule} editable={editable} onClose={onClose} onSave={onSave} />}
    </Drawer>
  );
}

function SlabForm({
  rule,
  editable,
  onClose,
  onSave,
}: {
  rule: Rule;
  editable: boolean;
  onClose: () => void;
  onSave: (r: Rule) => void;
}) {
  const [rows, setRows] = useState(
    rule.slabs.map((s) => ({ from: String(s.fromQty), to: s.toQty ?? '', rate: s.rate }))
  );
  const [free, setFree] = useState(String(rule.freeDays ?? 0));
  const [sun, setSun] = useState(!rule.freeExclSundays);
  const [hol, setHol] = useState(!rule.freeExclHolidays);
  const errs: string[] = [];

  rows.forEach((r, i) => {
    if (i === 0 && Number(r.from) !== 1) errs.push('The first slab must start at day 1.');
    if (i > 0 && Number(r.from) !== Number(rows[i - 1].to) + 1)
      errs.push(`Slab ${i + 1} must start the day after slab ${i} ends.`);
    if (r.to !== '' && Number(r.to) < Number(r.from)) errs.push(`Slab ${i + 1} ends before it starts.`);
    if (i < rows.length - 1 && r.to === '') errs.push(`Only the last slab can be open-ended.`);
  });
  if (rows[0] && Number(rows[0].rate) === 0 && Number(rows[0].to) !== Number(free))
    errs.push(`The free slab (rate 0) must end at day ${free}, the free days.`);

  const unit = rule.basis === 'PER_TEU_DAY' ? 'per TEU per day' : 'per day';

  return (
    <div className="stack">
      <div className="form-grid">
        <Field label="Free days">
          <Input type="number" min={0} disabled={!editable} value={free} onChange={(e) => setFree(e.target.value)} />
        </Field>
        <Field label="Clock starts at">
          <Select
            disabled={!editable}
            defaultValue={rule.clockStart ?? 'DISCHARGE'}
            options={[
              ['DISCHARGE', 'Vessel discharge'],
              ['GATE_IN', 'Gate-in'],
            ]}
          />
        </Field>
      </div>
      <div className="row-wrap">
        <label className="check">
          <input type="checkbox" disabled={!editable} checked={sun} onChange={(e) => setSun(e.target.checked)} />
          Sundays count as free days
        </label>
        <label className="check">
          <input type="checkbox" disabled={!editable} checked={hol} onChange={(e) => setHol(e.target.checked)} />
          Public holidays count as free days
        </label>
      </div>
      <div className="table-wrap">
        <table className="dt">
          <thead>
            <tr>
              <th>From day</th>
              <th>To day</th>
              <th className="num">USD {unit}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <Input
                    aria-label={`Slab ${i + 1} from`}
                    type="number"
                    disabled={!editable}
                    value={r.from}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))}
                    style={{ maxWidth: 90 }}
                  />
                </td>
                <td>
                  <Input
                    aria-label={`Slab ${i + 1} to`}
                    type="number"
                    disabled={!editable}
                    value={r.to}
                    placeholder="and after"
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))}
                    style={{ maxWidth: 110 }}
                  />
                </td>
                <td className="num">
                  <Input
                    aria-label={`Slab ${i + 1} rate`}
                    type="number"
                    step="0.01"
                    disabled={!editable}
                    value={r.rate}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))}
                    style={{ maxWidth: 110, textAlign: 'right' }}
                  />
                </td>
                <td>
                  {num(r.rate) === 0 ? (
                    <Pill tone="go">Free</Pill>
                  ) : (
                    editable &&
                    i > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 />}
                        aria-label="Remove slab"
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      />
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <Button
          size="sm"
          icon={<Plus />}
          onClick={() => {
            const last = rows[rows.length - 1];
            const from = last && last.to !== '' ? Number(last.to) + 1 : 1;
            setRows([...rows, { from: String(from), to: '', rate: '0.00' }]);
          }}
        >
          Add slab
        </Button>
      )}
      {errs.length > 0 && <Banner tone="stop" title="Fix the slabs">{[...new Set(errs)].join(' ')}</Banner>}
      <p className="xs muted">
        Day numbers count calendar days from the clock start.{' '}
        {sun && hol
          ? 'Sundays and holidays inside the free window count as free days.'
          : 'Skipped Sundays or holidays push the end of the free window out.'}
      </p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          {editable ? 'Cancel' : 'Close'}
        </Button>
        {editable && (
          <Button
            variant="primary"
            perm="billing.tariff.change"
            disabled={errs.length > 0}
            onClick={() => {
              onSave({
                ...rule,
                freeDays: Number(free),
                freeExclSundays: !sun,
                freeExclHolidays: !hol,
                slabs: rows.map((r) => ({
                  fromQty: r.from,
                  toQty: r.to === '' ? null : r.to,
                  rate: m2(Number(r.rate)),
                })),
              });
              onClose();
            }}
          >
            Save slabs
          </Button>
        )}
      </div>
    </div>
  );
}
