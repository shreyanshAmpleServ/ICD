import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calculator, FilePlus2 } from 'lucide-react';
import {
  Banner, Button, Check, Empty, Field, HoldPill, Input, Meter, Money, Page, PageHeader, Panel, Pill, Segmented, Select, StatusPill, Stepper,
  UnitNo, fmtD, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { consignment, parties, party, allStays } from '@/mock/core';
import {
  CHARGE_NAMES, HOLIDAYS, eatDate, TODAY, addDays, consignmentsFor, dLong, dShort, daysBetween, disbursements, fx, isSunday, m2, num,
  openBalanceUsd, rateStays, releaseValidTo, sumLines, type Line,
} from '@/mock/money';
import { Totals, fmtAmt, qtyU } from '../../components/shared';

const STEPS = ['Bill to', 'Units', 'Rate to date', 'Lines', 'Review'];

export function InvoiceNewView() {
  const { site } = useSession();
  const nav = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [bill, setBill] = useState<number | null>(null);
  const [cons, setCons] = useState<number | null>(null);
  const [units, setUnits] = useState<Set<number>>(new Set());
  const [through, setThrough] = useState(addDays(TODAY, 2));
  const [kind, setKind] = useState<'PROFORMA' | 'TAX_INVOICE'>('PROFORMA');
  const [cur, setCur] = useState<'USD' | 'TZS'>('USD');
  const [disb, setDisb] = useState<Set<number>>(new Set());
  const [openHow, setOpenHow] = useState<string | null>(null);

  const p = party(bill);
  const customers = parties.filter((x) => consignmentsFor(x.partyId!, site.siteId).length > 0);
  const conss = bill ? consignmentsFor(bill, site.siteId) : [];
  const stays = allStays.filter(
    (s) =>
      s.consignmentId === cons &&
      s.siteId === site.siteId &&
      s.physicalStatus !== 'EXPECTED' &&
      s.physicalStatus !== 'DEPARTED'
  );
  const chosen = stays.filter((s) => units.has(s.unitStayId!));
  const lines: Line[] = useMemo(() => rateStays(chosen, through), [chosen, through]);
  const disbs = disbursements.filter((d) => d.consignmentId === cons && d.status === 'RECORDED');
  const disbLines: Line[] = disbs
    .filter((d) => disb.has(d.disbursementId))
    .flatMap((d) => {
      const r = d.currency === 'USD' ? 1 : 1 / fx(TODAY);
      const cost = num(d.amountPaid) * r,
        fee = num(d.handlingFee) * r;
      const base = {
        billToPartyId: d.billToPartyId,
        consignmentId: d.consignmentId,
        serviceFrom: d.paidAt,
        serviceTo: d.paidAt,
        quantity: '1',
        uom: 'each',
        how: [`${d.disbNo} paid to ${d.payeeName}, receipt ${d.payeeReceiptNo}`],
      };
      const out: Line[] = [
        {
          ...base,
          key: `d${d.disbursementId}`,
          chargeCode: d.chargeCode,
          chargeName: CHARGE_NAMES[d.chargeCode],
          description: `${d.description} (paid on your behalf)`,
          unitRate: m2(cost),
          amount: m2(cost),
          taxCode: 'OOS',
          taxPct: 0,
          taxAmount: '0.00',
          kind: 'DISBURSEMENT',
        },
      ];
      if (fee > 0)
        out.push({
          ...base,
          key: `f${d.disbursementId}`,
          chargeCode: 'DISB_HANDLING_FEE',
          chargeName: CHARGE_NAMES.DISB_HANDLING_FEE,
          description: `Handling fee on ${d.disbNo}`,
          unitRate: m2(fee),
          amount: m2(fee),
          taxCode: 'VAT18',
          taxPct: 18,
          taxAmount: m2(fee * 0.18),
          kind: 'DISBURSEMENT',
        });
      return out;
    });
  const all = [...lines.filter((l) => num(l.amount) > 0), ...disbLines];
  const free = lines.filter((l) => num(l.amount) === 0);
  const tot = sumLines(all);
  const rate = fx(TODAY);
  const k = cur === 'TZS' ? rate : 1;
  const open = bill ? openBalanceUsd(bill) : 0;
  const limit = num(p?.creditLimit);
  const overLimit = p?.creditStatus === 'CREDIT' && open + tot.total > limit;
  const invoiceBlocked = !p
    ? 'Pick a bill-to first.'
    : p.creditStatus === 'BLOCKED'
    ? `${p.partyName} is blocked for credit: cargo cannot go on credit. Issue a proforma and take payment.`
    : p.creditStatus !== 'CREDIT'
    ? `${p.partyName} pays cash: issue a proforma, take payment, then convert it.`
    : overLimit
    ? `This would take ${p.partyName} over the credit limit of ${fmtAmt(limit)}.`
    : null;
  const zero = all.some((l) => l.taxCode === 'VAT0');
  const holds = chosen.filter(
    (s) =>
      (s.activeHoldCount ?? 0) > 0 || (s.customsStatus !== 'CLEARED' && s.customsStatus !== 'NOT_REQUIRED')
  );

  const canNext = [!!bill, chosen.length > 0, through >= TODAY, all.length > 0, true][step];
  const effKind = invoiceBlocked ? 'PROFORMA' : kind;

  return (
    <Page>
      <PageHeader
        crumbs={[['Invoices', '/invoices'], ['New']]}
        title="New invoice or proforma"
        ms="M3"
        sub="Rate a consignment's units up to the date the customer pays for. Release is valid to that date."
      />
      <div className="stack-lg">
        <Stepper
          steps={STEPS.map((l, i) => ({
            label: l,
            state: i < step ? 'done' : i === step ? 'current' : 'todo',
            note:
              i === 0 && p
                ? p.partyName
                : i === 1 && chosen.length
                ? `${chosen.length} units`
                : i === 2 && step > 2
                ? `To ${dShort(through)}`
                : undefined,
          }))}
        />

        {step === 0 && (
          <Panel title="Who pays?" sub="Customers with cargo at this site">
            <div className="mx-pick">
              {customers.map((c) => {
                const ob = openBalanceUsd(c.partyId!);
                return (
                  <button
                    key={c.partyId}
                    aria-pressed={bill === c.partyId}
                    onClick={() => {
                      setBill(c.partyId!);
                      setCons(null);
                      setUnits(new Set());
                      setDisb(new Set());
                    }}
                  >
                    <span className="strong">{c.partyName}</span>
                    <span className="row-wrap" style={{ gap: 6 }}>
                      {c.creditStatus === 'CREDIT' && <Pill tone="go">Credit</Pill>}
                      {c.creditStatus === 'BLOCKED' && <Pill tone="stop">Blocked for credit</Pill>}
                      {c.creditStatus === 'CASH' && <Pill>Cash</Pill>}
                      <span className="xs muted">
                        {consignmentsFor(c.partyId!, site.siteId).length} consignment
                        {consignmentsFor(c.partyId!, site.siteId).length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="xs muted">
                      Open balance {fmtAmt(ob)}
                      {c.creditLimit ? ` of ${fmtAmt(num(c.creditLimit))} limit` : ''}
                    </span>
                    {c.creditLimit && <Meter pct={(ob / num(c.creditLimit)) * 100} label="Credit used" />}
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        {step === 1 && (
          <Panel title="Which units?" sub={`Consignments billed to ${p?.partyName}`}>
            <div className="stack">
              <Field label="Consignment">
                <Select
                  value={cons ?? ''}
                  onChange={(e) => {
                    setCons(Number(e.target.value) || null);
                    setUnits(new Set());
                    setDisb(new Set());
                  }}
                  options={[
                    ['', 'Pick a B/L or booking'],
                    ...conss.map((c) => [String(c.consignmentId), `${c.refNo} · ${c.cargoDescription ?? ''}`] as [string, string]),
                  ]}
                />
              </Field>
              {cons &&
                (stays.length ? (
                  <>
                    <div className="row-wrap">
                      <Button size="sm" onClick={() => setUnits(new Set(stays.map((s) => s.unitStayId!)))}>
                        Select all {stays.length}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setUnits(new Set())}>
                        Clear
                      </Button>
                      <span className="xs muted">{chosen.length} selected</span>
                    </div>
                    <div className="table-wrap" style={{ maxHeight: 420 }}>
                      <table className="dt">
                        <thead>
                          <tr>
                            <th className="mx-check" />
                            <th>Unit</th>
                            <th>Type</th>
                            <th>Customs</th>
                            <th>Charges</th>
                            <th>Free until</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {stays.map((s) => (
                            <tr
                              key={s.unitStayId}
                              className="clickable"
                              onClick={() =>
                                setUnits((u) => {
                                  const n = new Set(u);
                                  if (n.has(s.unitStayId!)) n.delete(s.unitStayId!);
                                  else n.add(s.unitStayId!);
                                  return n;
                                })
                              }
                            >
                              <td className="mx-check">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${s.cargoUnit.unitNo}`}
                                  checked={units.has(s.unitStayId!)}
                                  readOnly
                                />
                              </td>
                              <td>
                                <UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} />
                              </td>
                              <td className="small">{s.cargoUnit.unitTypeCode}</td>
                              <td>
                                <StatusPill value={s.customsStatus} track="customs" />
                              </td>
                              <td>
                                <StatusPill value={s.billingStatus} track="billing" />
                              </td>
                              <td className="small">{fmtD(s.freeUntil)}</td>
                              <td>
                                <HoldPill count={s.activeHoldCount ?? 0} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <Empty title="No units in the yard for this consignment">
                    Units that are still expected or have left can't be rated here.
                  </Empty>
                ))}
            </div>
          </Panel>
        )}

        {step === 2 && (
          <div className="grid-main-side">
            <Panel className="mx-min0" title="Pay through which date?" sub="Storage is charged up to and including this day">
              <div className="stack">
                <div className="row-wrap">
                  <Input
                    type="date"
                    min={TODAY}
                    value={through}
                    onChange={(e) => setThrough(e.target.value)}
                    style={{ maxWidth: 200 }}
                    aria-label="Pay-through date"
                  />
                  {[0, 2, 5, 7, 14].map((d) => (
                    <Button
                      key={d}
                      size="sm"
                      variant={through === addDays(TODAY, d) ? 'primary' : 'secondary'}
                      onClick={() => setThrough(addDays(TODAY, d))}
                    >
                      {d === 0 ? 'Today' : `+${d} days`}
                    </Button>
                  ))}
                </div>
                {through < TODAY && <Banner tone="stop">The date can't be in the past.</Banner>}
                <div className="panel" style={{ padding: 16, background: 'var(--go-soft)', borderColor: 'var(--go)' }}>
                  <div className="xs muted">This payment makes the release valid to</div>
                  <div className="unitno unitno-lg" style={{ color: 'var(--go)' }}>
                    {releaseValidTo(through)}
                  </div>
                  <div className="small muted">After that, each extra day is storage to pay before gate-out (revalidation).</div>
                </div>
                {HOLIDAYS[through] || isSunday(through) ? (
                  <p className="xs muted">
                    {dLong(through)} is a {HOLIDAYS[through] ?? 'Sunday'}: storage still counts it.
                  </p>
                ) : null}
                {holds.length > 0 && (
                  <Banner tone="wait" title={`${holds.length} unit${holds.length === 1 ? '' : 's'} not cleared or on hold`}>
                    Paying does not release them. Customs clearance and lifted holds are needed as well.
                  </Banner>
                )}
              </div>
            </Panel>
            <Panel title="Storage clock" flush>
              <ul className="list-plain">
                {chosen.slice(0, 8).map((s) => {
                  const start = s.storageStartAt ? eatDate(s.storageStartAt) : TODAY;
                  const d = daysBetween(start, through) + 1;
                  return (
                    <li
                      key={s.unitStayId}
                      style={{ padding: '10px 16px', borderBottom: '1px solid var(--steel-2)' }}
                    >
                      <UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} />
                      <div className="xs muted">
                        Discharged {fmtD(s.dischargeAt ?? s.gatedInAt)} · day {d} on {dShort(through)}
                      </div>
                    </li>
                  );
                })}
                {chosen.length > 8 && (
                  <li className="xs muted" style={{ padding: '8px 16px' }}>
                    and {chosen.length - 8} more
                  </li>
                )}
              </ul>
            </Panel>
          </div>
        )}

        {step === 3 && (
          <Panel
            flush
            title="Lines"
            sub={`Rated by the active tariff to ${dLong(through)}. Click a line to see how it was worked out.`}
          >
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Charge</th>
                    <th>Service period</th>
                    <th className="num">Qty</th>
                    <th className="num">Rate</th>
                    <th className="num">VAT</th>
                    <th className="num">Amount (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map((l) => (
                    <tr
                      key={l.key}
                      className="clickable"
                      onClick={() => setOpenHow(openHow === l.key ? null : l.key)}
                    >
                      <td>{l.unitNo ? <UnitNo no={l.unitNo} category={l.unitCategory} /> : <span className="faint">—</span>}</td>
                      <td>
                        <span className="strong small">{l.description}</span>
                        <div className="xs faint">
                          {l.tariffCode
                            ? `${l.tariffCode} v${l.tariffVersion}`
                            : l.kind === 'DISBURSEMENT'
                            ? 'Disbursement'
                            : ''}
                        </div>
                        {openHow === l.key && (
                          <ul className="mx-how">
                            {l.how.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="small nowrap">
                        {l.serviceFrom === l.serviceTo
                          ? dShort(l.serviceFrom!)
                          : `${dShort(l.serviceFrom!)} – ${dShort(l.serviceTo!)}`}
                      </td>
                      <td className="num small">{qtyU(l.quantity, l.uom)}</td>
                      <td className="num">
                        <Money amount={l.unitRate} />
                      </td>
                      <td className="num small">
                        {l.taxCode === 'VAT0' ? 'Zero' : l.taxCode === 'OOS' ? 'Outside' : `${l.taxPct}%`}
                      </td>
                      <td className="num">
                        <Money amount={l.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {free.length > 0 && (
              <p className="xs muted" style={{ padding: '8px 16px' }}>
                {free.length} unit{free.length === 1 ? ' is' : 's are'} still within free days on {dShort(through)}: no
                storage line.
              </p>
            )}
            {disbs.length > 0 && (
              <div style={{ padding: 16, borderTop: '1px solid var(--steel)' }} className="stack">
                <span className="strong small">Disbursements recorded for this consignment</span>
                {disbs.map((d) => (
                  <Check
                    key={d.disbursementId}
                    checked={disb.has(d.disbursementId)}
                    onChange={(e) =>
                      setDisb((s) => {
                        const n = new Set(s);
                        if (e.target.checked) n.add(d.disbursementId);
                        else n.delete(d.disbursementId);
                        return n;
                      })
                    }
                    label={
                      <span>
                        {d.disbNo} · {d.description} · <Money amount={d.amountPaid} currency={d.currency} />
                        {num(d.handlingFee) > 0 && (
                          <>
                            {' '}
                            + fee <Money amount={d.handlingFee} currency={d.currency} />
                          </>
                        )}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
            <div style={{ padding: 16, borderTop: '1px solid var(--steel)' }}>
              <Totals
                rows={[
                  ['Subtotal', <Money key="s" amount={tot.subtotal} currency="USD" />],
                  ['VAT', <Money key="v" amount={tot.tax} currency="USD" />],
                  ['Total', <Money key="t" amount={tot.total} currency="USD" strong />, true],
                ]}
              />
            </div>
          </Panel>
        )}

        {step === 4 && (
          <div className="grid-main-side">
            <Panel className="mx-min0" title="Review">
              <div className="stack">
                <Field label="Document">
                  <Segmented
                    value={effKind}
                    onChange={(v) => setKind(v)}
                    options={[
                      { id: 'PROFORMA', label: 'Proforma' },
                      { id: 'TAX_INVOICE', label: 'Tax invoice (on credit)' },
                    ]}
                  />
                </Field>
                {invoiceBlocked && (
                  <Banner tone={p?.creditStatus === 'BLOCKED' || overLimit ? 'stop' : 'idle'}>
                    {invoiceBlocked}
                  </Banner>
                )}
                <Field label="Currency">
                  <Segmented
                    value={cur}
                    onChange={setCur}
                    options={[
                      { id: 'USD', label: 'USD' },
                      { id: 'TZS', label: 'TZS' },
                    ]}
                  />
                </Field>
                <p className="xs muted">
                  Today's rate TZS {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} per USD, from Exchange
                  rates.{' '}
                  {effKind === 'TAX_INVOICE'
                    ? 'It is frozen on the invoice when you post it.'
                    : 'A proforma shows it for information; the tax invoice freezes the rate on the day it is posted.'}
                </p>
                {zero && (
                  <Banner tone="wait" title="Transit services zero-rated">
                    Lines under the transit tariff carry VAT 0%. Verify with tax adviser.
                  </Banner>
                )}
                <Totals
                  rows={[
                    ['Lines', all.length],
                    ['Subtotal', <Money key="s" amount={tot.subtotal * k} currency={cur} />],
                    ['VAT', <Money key="v" amount={tot.tax * k} currency={cur} />],
                    ['Total', <Money key="t" amount={tot.total * k} currency={cur} strong />, true],
                    [
                      cur === 'USD' ? 'In TZS' : 'In USD',
                      <Money
                        key="o"
                        amount={cur === 'USD' ? tot.total * rate : tot.total}
                        currency={cur === 'USD' ? 'TZS' : 'USD'}
                      />,
                    ],
                  ]}
                />
              </div>
            </Panel>
            <div className="stack-lg">
              <Panel title="Summary">
                <div className="stack" style={{ gap: 6 }}>
                  <div className="small">
                    <span className="muted">Bill to</span> {p?.partyName}
                  </div>
                  <div className="small">
                    <span className="muted">Consignment</span> {consignment(cons)?.refNo}
                  </div>
                  <div className="small">
                    <span className="muted">Units</span> {chosen.length}
                  </div>
                  <div className="small">
                    <span className="muted">Release valid to</span> <b>{releaseValidTo(through)}</b>
                  </div>
                </div>
              </Panel>
              {p?.creditLimit && (
                <Panel title="Credit limit">
                  <div className="stack" style={{ gap: 6 }}>
                    <Meter pct={((open + tot.total) / limit) * 100} label="Credit used after this invoice" />
                    <span className="xs muted">
                      Open {fmtAmt(open)} + this {fmtAmt(tot.total)} = {fmtAmt(open + tot.total)} of {fmtAmt(limit)}
                    </span>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Button icon={<ArrowLeft />} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step === 2 && (
            <span className="xs muted">
              <Calculator size={12} /> Rating preview, nothing saved
            </span>
          )}
          {step < 4 ? (
            <Button
              variant="primary"
              icon={<ArrowRight />}
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              Next: {STEPS[step + 1].toLowerCase()}
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={<FilePlus2 />}
              perm="billing.invoice.create"
              onClick={() => {
                toast(
                  effKind === 'PROFORMA'
                    ? 'Proforma PRO-DAR1-26-002063 created'
                    : 'Invoice INV-DAR1-26-003321 created as draft'
                );
                nav('/invoices');
              }}
            >
              {effKind === 'PROFORMA' ? 'Create proforma' : 'Create draft invoice'}
            </Button>
          )}
        </div>
      </div>
    </Page>
  );
}
