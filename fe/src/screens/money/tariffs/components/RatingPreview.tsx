import { useMemo, useState } from 'react';
import { Banner, Field, Input, Money, Panel, Select, UnitNo } from '@/ds/components';
import type { S } from '@/api/types';
import { allStays } from '@/mock/core';
import { TAX, TODAY, addDays, dLong, dShort, fx, m2, rateStay, sumLines, type Tariff } from '@/mock/money';
import { Totals, qtyU } from '../../components/shared';

export interface RatingPreviewProps {
  t: Tariff;
  siteId: number;
}

export function RatingPreview({ t, siteId }: RatingPreviewProps) {
  const cands = useMemo(
    () =>
      allStays
        .filter(
          (s) =>
            s.siteId === siteId &&
            s.physicalStatus === 'IN_YARD' &&
            t.rules.some(
              (r) =>
                (!r.unitCategory || r.unitCategory === s.cargoUnit.category) &&
                (!r.fullEmpty || r.fullEmpty === s.fullEmpty) &&
                (!r.vehicleClass || r.vehicleClass === s.cargoUnit.unitTypeCode) &&
                r.slabs.length > 0
            )
        )
        .slice(0, 40),
    [t, siteId]
  );

  const [sid, setSid] = useState<number>(cands[0]?.unitStayId ?? 0);
  const [date, setDate] = useState(addDays(TODAY, 10));
  const s = cands.find((x) => x.unitStayId === sid) ?? cands[0];

  if (!s) {
    return (
      <Panel title="Rating preview">
        <p className="small muted">No unit in this yard matches this tariff's rules. Switch site to preview it.</p>
      </Panel>
    );
  }

  const lines = rateStay(s, date, { tariffOverride: t });
  const tot = sumLines(lines);
  const preview: S<'RatingPreview'> = {
    currency: 'USD',
    lines,
    subtotal: m2(tot.subtotal),
    taxTotal: m2(tot.tax),
    total: m2(tot.total),
    freeUntil: s.freeUntil,
    warnings: (s.activeHoldCount ?? 0) > 0 ? ['Unit is on hold: paying does not release it'] : [],
  };
  const rate = fx(TODAY);

  return (
    <Panel title="Rating preview" sub="What this version would charge one unit up to a date. Nothing is saved.">
      <div className="stack">
        <Field label="Unit">
          <Select
            value={String(s.unitStayId)}
            onChange={(e) => setSid(Number(e.target.value))}
            options={cands.map((c) => [String(c.unitStayId), `${c.cargoUnit.unitNo} · ${c.cargoUnit.unitTypeCode}`])}
          />
        </Field>
        <Field label="Charge up to">
          <Input type="date" value={date} min={TODAY} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="row-wrap">
          <UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} />
          <span className="xs muted">to {dLong(date)}</span>
        </div>
        {preview.warnings?.map((w) => (
          <Banner key={w} tone="wait">
            {w}
          </Banner>
        ))}
        {lines.length === 0 && <p className="small muted">No rule in this tariff applies to this unit.</p>}
        <ul className="list-plain">
          {lines.map((l) => (
            <li key={l.key} style={{ padding: '8px 0', borderBottom: '1px solid var(--steel-2)' }}>
              <div className="row">
                <span className="strong small spacer">{l.description}</span>
                <Money amount={l.amount} />
              </div>
              <div className="xs muted">
                {qtyU(l.quantity, l.uom)} × USD {l.unitRate}
                {l.serviceFrom && l.serviceFrom !== l.serviceTo ? ` · ${dShort(l.serviceFrom)}–${dShort(l.serviceTo!)}` : ''} ·{' '}
                {TAX[l.taxCode]?.name}
              </div>
              <ul className="mx-how">
                {l.how.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <Totals
          rows={[
            ['Subtotal', <Money key="s" amount={tot.subtotal} currency="USD" />],
            ['VAT', <Money key="v" amount={tot.tax} currency="USD" />],
            ['Total', <Money key="t" amount={preview.total} currency="USD" strong />, true],
            ['In TZS', <Money key="z" amount={tot.total * rate} currency="TZS" />],
          ]}
        />
        <span className="xs muted">
          TZS at today's rate {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} per USD; a posted invoice
          freezes the rate of its posting day.
        </span>
      </div>
    </Panel>
  );
}
