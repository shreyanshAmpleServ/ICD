import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Paperclip, Undo2, Wand2 } from 'lucide-react';
import { Banner, Button, Field, Input, Money, Panel, Segmented, Select, fmtDT } from '@/ds/components';
import { parties, party, partyName } from '@/mock/core';
import {
  ME, TODAY, channel, channels, dShort, findDuplicateRef, fx, invoices, m2, num,
  type Invoice, type Payment,
} from '@/mock/money';
import { fmtAmt } from '../../components/shared';

type Method = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHEQUE';
const METHOD_CHANNELS: Record<Method, string[]> = {
  CASH: ['CASH_USD', 'CASH_TZS'],
  BANK_TRANSFER: ['CRDB_USD', 'NMB_TZS'],
  MOBILE_MONEY: ['MPESA', 'TIGO', 'AIRTEL'],
  CHEQUE: ['CHEQUE'],
};

const openDocs = (partyId: number) =>
  invoices
    .filter(
      (i) =>
        i.billToPartyId === partyId &&
        num(i.balance) > 0.005 &&
        i.status !== 'DRAFT' &&
        i.status !== 'CONVERTED' &&
        i.docKind !== 'CREDIT_NOTE'
    )
    .sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));

export function TakePaymentForm({ onRecorded }: { onRecorded: (p: Payment) => void }) {
  const [sp] = useSearchParams();
  const [partyId, setPartyId] = useState(Number(sp.get('party')) || 2);
  const [method, setMethod] = useState<Method>('MOBILE_MONEY');
  const [chan, setChan] = useState('MPESA');
  const [cashCur, setCashCur] = useState<'USD' | 'TZS'>('USD');
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');
  const [payer, setPayer] = useState('');
  const [proof, setProof] = useState(false);
  const [alloc, setAlloc] = useState<Record<number, string>>({});
  const [seq, setSeq] = useState(18859);
  const p = party(partyId);
  const code = method === 'CASH' ? `CASH_${cashCur}` : chan;
  const ch = channel(code)!;
  const cur = ch.currency;
  const rate = fx(TODAY);
  const docs = useMemo(() => openDocs(partyId), [partyId]);
  const amt = Number(amount) || 0;
  const needsRef = method !== 'CASH';
  const dup = needsRef && ref ? findDuplicateRef(code, ref) : undefined;
  const toInvCcy = (v: number, inv: Invoice) => (inv.currency === cur ? v : cur === 'TZS' ? v / rate : v * rate);
  const toPayCcy = (v: number, inv: Invoice) => (inv.currency === cur ? v : cur === 'TZS' ? v * rate : v / rate);
  const allocated = Object.values(alloc).reduce((a, v) => a + (Number(v) || 0), 0);
  const left = amt - allocated;
  const over = docs.find((d) => toInvCcy(Number(alloc[d.invoiceId]) || 0, d) > num(d.balance) + 0.01);
  const fxTotal = docs.reduce((a, d) => {
    const v = Number(alloc[d.invoiceId]) || 0;
    return d.currency === 'USD' && v ? a + toInvCcy(v, d) * (rate - num(d.exchangeRate)) : a;
  }, 0);
  const errors = [
    !amt && 'Enter the amount received.',
    needsRef && !ref.trim() && 'Enter the reference from the bank slip or SMS.',
    dup && 'Reference already receipted.',
    needsRef && !proof && 'Attach proof of payment.',
    left < -0.005 && 'You have allocated more than was received.',
    over && `Allocation to ${over.invoiceNo} is more than its balance.`,
  ].filter(Boolean) as string[];

  const auto = () => {
    let rem = amt;
    const next: Record<number, string> = {};
    for (const d of docs) {
      if (rem <= 0.005) break;
      const need = toPayCcy(num(d.balance), d);
      const take = Math.min(need, rem);
      next[d.invoiceId] = cur === 'TZS' ? String(Math.round(take)) : take.toFixed(2);
      rem -= take;
    }
    setAlloc(next);
  };
  const reset = () => {
    setAmount('');
    setRef('');
    setPayer('');
    setProof(false);
    setAlloc({});
  };

  return (
    <div className="stack-lg">
      <Panel title="Payment">
        <div className="stack">
          <div className="form-grid">
            <Field label="Customer" required>
              <Select
                value={String(partyId)}
                onChange={(e) => {
                  setPartyId(Number(e.target.value));
                  setAlloc({});
                }}
                options={parties
                  .filter((x) => x.roles.includes('CUSTOMER') || x.roles.includes('CLEARING_AGENT'))
                  .map((x) => [String(x.partyId), x.partyName])}
              />
            </Field>
            <Field label="Paid by (name)" hint="Person at the counter or account holder">
              <Input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="e.g. Baraka Mwita" />
            </Field>
          </div>
          {p?.creditStatus === 'BLOCKED' && (
            <Banner tone="stop" title={`${p.partyName} is blocked for credit`}>
              Take payment in full before any cargo is released. Nothing goes on credit.
            </Banner>
          )}
          <Field label="How did they pay?">
            <Segmented
              value={method}
              onChange={(m) => {
                setMethod(m);
                setChan(METHOD_CHANNELS[m][0]);
                setRef('');
                setAlloc({});
              }}
              options={[
                { id: 'CASH', label: 'Cash' },
                { id: 'BANK_TRANSFER', label: 'Bank transfer' },
                { id: 'MOBILE_MONEY', label: 'Mobile money' },
                { id: 'CHEQUE', label: 'Cheque' },
              ]}
            />
          </Field>
          <div className="form-grid">
            {method === 'CASH' ? (
              <Field label="Currency">
                <Segmented
                  value={cashCur}
                  onChange={(c) => {
                    setCashCur(c);
                    setAlloc({});
                  }}
                  options={[
                    { id: 'USD', label: 'USD' },
                    { id: 'TZS', label: 'TZS' },
                  ]}
                />
              </Field>
            ) : (
              method !== 'CHEQUE' && (
                <Field label={method === 'BANK_TRANSFER' ? 'Bank' : 'Provider'}>
                  <Select
                    value={chan}
                    onChange={(e) => {
                      setChan(e.target.value);
                      setAlloc({});
                    }}
                    options={METHOD_CHANNELS[method].map((c) => [
                      c,
                      channels.find((x) => x.channelCode === c)!.channelName,
                    ])}
                  />
                </Field>
              )
            )}
            <Field label={`Amount (${cur})`} required>
              <Input
                type="number"
                min={0}
                step={cur === 'TZS' ? 100 : 0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={cur === 'TZS' ? '0' : '0.00'}
              />
            </Field>
            {needsRef && (
              <Field
                label="Reference"
                required
                error={
                  dup
                    ? `Already receipted on ${dup.receiptNo}, ${fmtDT(dup.at)}. Duplicates are refused; check with the customer.`
                    : undefined
                }
                hint={ch.referencePattern ?? undefined}
              >
                <Input
                  className={dup ? 'input-error' : undefined}
                  value={ref}
                  onChange={(e) => setRef(e.target.value.toUpperCase())}
                  placeholder={method === 'MOBILE_MONEY' ? 'SJ47KQ2ZP1' : 'CRDB/FT/26280/…'}
                  aria-invalid={!!dup}
                />
              </Field>
            )}
          </div>
          {needsRef && (
            <Field label="Proof of payment" required>
              <span className="row-wrap">
                <Button icon={proof ? <CheckCircle2 /> : <Paperclip />} onClick={() => setProof(!proof)}>
                  {proof ? 'slip-photo.jpg attached' : 'Attach slip or SMS screenshot'}
                </Button>
                {proof && (
                  <Button size="sm" variant="ghost" icon={<Undo2 />} onClick={() => setProof(false)}>
                    Remove
                  </Button>
                )}
              </span>
            </Field>
          )}
          {cur === 'TZS' && amt > 0 && (
            <p className="xs muted">
              ≈ {fmtAmt(amt / rate)} at today's rate TZS {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
            </p>
          )}
        </div>
      </Panel>

      <Panel
        flush
        title="Allocate to open invoices"
        sub={`${partyName(partyId)} · oldest first`}
        actions={
          <Button size="sm" icon={<Wand2 />} disabled={!amt || !docs.length} onClick={auto}>
            Auto-allocate oldest first
          </Button>
        }
      >
        {docs.length ? (
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Date</th>
                  <th className="num">Balance</th>
                  <th className="num">Frozen rate</th>
                  <th className="num" style={{ width: 150 }}>
                    Allocate ({cur})
                  </th>
                  <th className="num">Covers</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const v = Number(alloc[d.invoiceId]) || 0;
                  const cov = toInvCcy(v, d);
                  return (
                    <tr key={d.invoiceId}>
                      <td>
                        <span className="strong small">{d.invoiceNo}</span>
                        <div className="xs faint">{d.docKind === 'PROFORMA' ? 'Proforma' : d.consignmentRef}</div>
                      </td>
                      <td className="small">{dShort(d.invoiceDate)}</td>
                      <td className="num">
                        <Money amount={d.balance} currency={d.currency} />
                      </td>
                      <td className="num small">
                        {d.currency === 'USD'
                          ? num(d.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '—'}
                      </td>
                      <td className="num">
                        <Input
                          aria-label={`Allocate to ${d.invoiceNo}`}
                          type="number"
                          min={0}
                          value={alloc[d.invoiceId] ?? ''}
                          placeholder="0"
                          style={{ textAlign: 'right' }}
                          onChange={(e) => setAlloc((a) => ({ ...a, [d.invoiceId]: e.target.value }))}
                        />
                      </td>
                      <td className="num small">
                        {v > 0 ? (
                          <>
                            <Money amount={cov} currency={d.currency} />
                            {cov < num(d.balance) - 0.01 ? (
                              <div className="xs" style={{ color: 'var(--wait)' }}>
                                Part payment
                              </div>
                            ) : (
                              <div className="xs" style={{ color: 'var(--go)' }}>
                                Paid in full
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small muted" style={{ padding: 16 }}>
            No open invoices for this customer. The payment will be kept on account.
          </p>
        )}
        <div style={{ padding: 16, borderTop: '1px solid var(--steel)' }} className="stack">
          <div className="mx-totals">
            <dt>Received</dt>
            <dd>
              <Money amount={amt} currency={cur} />
            </dd>
            <dt>Allocated</dt>
            <dd>
              <Money amount={allocated} currency={cur} />
            </dd>
            <dt className="grand">Kept on account</dt>
            <dd className="grand">
              <Money amount={Math.max(0, left)} currency={cur} strong />
            </dd>
            {Math.abs(fxTotal) >= 1 && (
              <>
                <dt>FX {fxTotal > 0 ? 'gain' : 'loss'} vs invoice rate</dt>
                <dd>
                  <Money amount={Math.abs(fxTotal)} currency="TZS" />
                </dd>
              </>
            )}
          </div>
          {errors.length > 0 && amt > 0 && (
            <ul className="xs" style={{ margin: 0, paddingLeft: 18, color: 'var(--stop)' }}>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={reset}>
              Clear
            </Button>
            <Button
              variant="primary"
              size="xl"
              icon={<CheckCircle2 />}
              perm="payment.record"
              disabled={errors.length > 0}
              onClick={() => {
                const allocs = docs
                  .filter((d) => Number(alloc[d.invoiceId]) > 0)
                  .map((d, i) => {
                    const v = Number(alloc[d.invoiceId]);
                    const inv = toInvCcy(v, d);
                    return {
                      paymentAllocationId: 99000 + i,
                      invoiceId: d.invoiceId,
                      invoiceNo: d.invoiceNo,
                      amount: m2(v),
                      amountInvoiceCcy: m2(inv),
                      fxDifferenceBase: m2(d.currency === 'USD' ? inv * (rate - num(d.exchangeRate)) : 0),
                      allocatedAt: '2026-10-07T07:30:00Z',
                    };
                  });
                onRecorded({
                  paymentId: 3200 + seq,
                  receiptNo: `RCT-DAR1-26-0${seq}`,
                  partyId,
                  channelCode: code,
                  externalRef: ref || null,
                  currency: cur,
                  amount: m2(amt),
                  exchangeRate: m2(rate),
                  amountBase: m2(cur === 'TZS' ? amt : amt * rate),
                  amountAllocated: m2(allocated),
                  unallocated: m2(left),
                  receivedAt: '2026-10-07T07:30:00Z',
                  valueDate: TODAY,
                  status: left > 0.005 ? (allocated > 0 ? 'PART_ALLOC' : 'RECEIVED') : 'ALLOCATED',
                  allocations: allocs,
                  cashier: ME,
                  siteId: 1,
                  payerName: payer || undefined,
                });
                setSeq((s) => s + 1);
                reset();
              }}
            >
              Record payment
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
