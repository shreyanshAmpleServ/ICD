import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, LockKeyhole, Paperclip, Printer, Undo2, Wand2, Wallet } from 'lucide-react';
import {
  Banner, Button, CommonTable, Drawer, Empty, Field, Input, Modal, Money, MoneyCell, Page, PageHeader, Panel, PartyCell, Pill, ReferenceCell, Segmented, Select,
  StatusCell, Tabs, Textarea, fmtDT, fmtT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { partyName, parties, party } from '@/mock/core';
import {
  COMPANY, ME, TODAY, channel, channels, dShort, eatDate, findDuplicateRef, fx, invoices, m2, num, payments, shifts,
  type Invoice, type Payment, type Shift,
} from '@/mock/money';
import { PrintSheet, fmtAmt } from './shared';

/* The cashier workstation. POST /payments (+ :allocate), /cashier-shifts.
   One open shift per cashier per currency. Bank and mobile money need a
   reference and a duplicate reference is refused (UX_payment_external_ref). */
type TabId = 'take' | 'today' | 'approve';
type Method = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHEQUE';

export function Cashier() {
  const { can } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('take');

  const { data: dbShifts } = useQ(['cashier-shifts'], () =>
    api.get<{ items: Shift[] }>('/cashier-shifts').then((r) => r.items).catch(() => shifts)
  );
  const { data: dbPayments } = useQ(['payments'], () =>
    api.get<{ items: Payment[] }>('/payments').then((r) => r.items).catch(() => payments)
  );

  const allShifts = dbShifts && dbShifts.length > 0 ? dbShifts : shifts;
  const allPayments = dbPayments && dbPayments.length > 0 ? dbPayments : payments;

  const [mine, setMine] = useState<Shift[]>(allShifts.filter((s) => s.cashier === ME && s.status === 'OPEN'));
  const [others, setOthers] = useState<Shift[]>(allShifts.filter((s) => s.cashier !== ME));
  const [list, setList] = useState<Payment[]>(
    allPayments.filter((p) => eatDate(p.receivedAt!) === TODAY).sort((a, b) => (b.receivedAt || '').localeCompare(a.receivedAt || ''))
  );
  const [search, setSearch] = useState('');
  const [closing, setClosing] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const shiftOpen = mine.some((s) => s.status === 'OPEN');
  const waiting = others.filter((s) => s.status === 'CLOSED');

  const filteredPayments = useMemo(() => {
    if (!search) return list;
    const q = search.toUpperCase();
    return list.filter((p) =>
      p.receiptNo?.toUpperCase().includes(q) ||
      partyName(p.partyId).toUpperCase().includes(q) ||
      p.payerName?.toUpperCase().includes(q) ||
      p.externalRef?.toUpperCase().includes(q)
    );
  }, [list, search]);

  return (
    <Page>
      <PageHeader title="Cashier" ms="M3" sub={`Counter 1 · ${ME} · ${dShort(TODAY)}`}
        actions={list[0] && <Button icon={<Printer />} perm="payment.record" onClick={() => setReceipt(list[0])}>Reprint last receipt</Button>} />
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Tabs<TabId> value={tab} onChange={setTab} tabs={[
            { id: 'take', label: 'Take payment' }, { id: 'today', label: "Today's payments", count: list.length },
            { id: 'approve', label: 'Shift approvals', count: waiting.length, hidden: !can('payment.cashup.approve', 'APPR') },
          ]} />
          {tab === 'take' && (shiftOpen
            ? <TakePayment onRecorded={(p) => {
              setList((l) => [p, ...l]);
              if (p.channelCode.startsWith('CASH')) setMine((m) => m.map((s) => s.currency === p.currency ? { ...s, expectedCash: m2(num(s.expectedCash) + num(p.amount)), receiptsCount: s.receiptsCount + 1 } : s));
              setReceipt(p); toast(`Payment recorded · ${p.receiptNo}`);
            }} />
            : <Panel><Empty title="Open your shift to take payments">Count your float and open the shift in the panel on the right. One shift per currency.</Empty></Panel>)}
          {tab === 'today' && (
            <CommonTable
              rows={filteredPayments}
              rowKey={(p) => p.paymentId}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Filter receipts by receipt #, customer, ref..."
              itemLabel="payments"
              emptyTitle="No payments yet today"
              cols={[
                {
                  key: 'rct',
                  header: 'Receipt',
                  render: (p) => (
                    <ReferenceCell
                      refNo={p.receiptNo}
                      sub={`${fmtT(p.receivedAt)} · ${p.cashier?.split(' ')[0] ?? 'Cashier'}`}
                    />
                  )
                },
                {
                  key: 'party',
                  header: 'Customer',
                  render: (p) => (
                    <PartyCell
                      name={partyName(p.partyId)}
                      sub={p.payerName}
                    />
                  )
                },
                {
                  key: 'ch',
                  header: 'Channel',
                  render: (p) => (
                    <span className="small">
                      {channel(p.channelCode)?.channelName || p.channelCode}
                      {p.externalRef && <div className="xs faint">{p.externalRef}</div>}
                    </span>
                  )
                },
                {
                  key: 'amt',
                  header: 'Amount',
                  num: true,
                  render: (p) => <MoneyCell amount={p.amount} currency={p.currency} strong />
                },
                {
                  key: 'un',
                  header: 'On account',
                  num: true,
                  render: (p) => num(p.unallocated) > 0 ? <MoneyCell amount={p.unallocated} currency={p.currency} /> : <span className="xs faint">—</span>
                },
                {
                  key: 'st',
                  header: 'Status',
                  render: (p) => <StatusCell value={p.status} track="billing" />
                },
                {
                  key: 'pr',
                  header: '',
                  render: (p) => <Button size="sm" variant="ghost" icon={<Printer />} aria-label={`Print ${p.receiptNo}`} perm="payment.record" onClick={() => setReceipt(p)} />
                },
              ]}
            />
          )}
          {tab === 'approve' && (
            <CommonTable
              rows={waiting}
              rowKey={(s) => s.cashierShiftId}
              itemLabel="cash-ups waiting"
              emptyTitle="No cash-ups waiting"
              emptySubtitle="Closed shifts appear here for approval."
              cols={[
                {
                  key: 'who',
                  header: 'Cashier',
                  render: (s) => (
                    <PartyCell
                      name={s.cashier}
                      sub={`${fmtDT(s.openedAt)} – ${fmtT(s.closedAt)}`}
                    />
                  )
                },
                { key: 'cur', header: 'Currency', render: (s) => s.currency },
                { key: 'exp', header: 'Expected', num: true, render: (s) => <MoneyCell amount={s.expectedCash} currency={s.currency} /> },
                { key: 'cnt', header: 'Counted', num: true, render: (s) => <MoneyCell amount={s.countedCash} currency={s.currency} /> },
                { key: 'diff', header: 'Difference', num: true, render: (s) => <Diff v={num(s.difference)} cur={s.currency} /> },
                { key: 'note', header: 'Note', render: (s) => <span className="xs">{s.note}</span> },
                {
                  key: 'act',
                  header: '',
                  render: (s) => (
                    <span className="row" style={{ gap: 6 }}>
                      <Button size="sm" perm="payment.cashup.approve" level="APPR" onClick={() => { setOthers((o) => o.map((x) => x === s ? { ...x, status: 'OPEN' } : x)); toast('Sent back for recount'); }}>Send back</Button>
                      <Button size="sm" variant="primary" perm="payment.cashup.approve" level="APPR" onClick={() => { setOthers((o) => o.map((x) => x === s ? { ...x, status: 'APPROVED', approvedBy: ME } : x)); toast('Cash-up approved'); }}>Approve</Button>
                    </span>
                  )
                },
              ]}
            />
          )}
        </div>

        <div className="stack-lg">
          <Panel title="My shift" actions={shiftOpen ? <Pill tone="go">Open</Pill> : mine.length ? <Pill tone="wait">Closed, awaiting approval</Pill> : <Pill>Not open</Pill>}>
            {mine.length ? (
              <div className="stack">
                <span className="xs muted">Opened {fmtDT(mine[0].openedAt)}</span>
                {mine.map((s) => (
                  <div key={s.currency} className="stack" style={{ gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--steel-2)' }}>
                    <div className="row"><span className="strong spacer">{s.currency} cash drawer</span><span className="xs muted">{s.receiptsCount} receipts</span></div>
                    <div className="row small"><span className="muted spacer">Opening float</span><Money amount={s.openingFloat} /></div>
                    <div className="row small"><span className="muted spacer">Cash taken</span><Money amount={num(s.expectedCash) - num(s.openingFloat)} /></div>
                    <div className="row"><span className="spacer strong small">Expected in drawer</span><Money amount={s.expectedCash} currency={s.currency} strong /></div>
                    {num(s.nonCash) > 0 && <div className="row xs"><span className="muted spacer">Bank and mobile (not in drawer)</span><Money amount={s.nonCash} /></div>}
                    {s.difference && <div className="row small"><span className="muted spacer">Counted</span><Money amount={s.countedCash} /> <Diff v={num(s.difference)} cur={s.currency} /></div>}
                  </div>
                ))}
                {shiftOpen && <Button icon={<LockKeyhole />} perm="payment.record" onClick={() => setClosing(true)}>Close shift</Button>}
              </div>
            ) : <OpenShift onOpen={(f) => { setMine(f); toast('Shift opened'); }} />}
          </Panel>
          <Panel title="Counter rules">
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Bank and mobile money need the reference; a reference already receipted is refused.</li>
              <li>Attach the bank slip or SMS screenshot as proof.</li>
              <li>Allocate oldest invoice first unless the customer says otherwise. Anything left stays on account.</li>
              <li>TZS against a USD invoice uses today's rate; the difference to the invoice rate posts as FX gain or loss.</li>
            </ul>
          </Panel>
        </div>
      </div>

      <CloseShift open={closing} onClose={() => setClosing(false)} shifts={mine}
        onDone={(counted, note) => { setMine((m) => m.map((s) => ({ ...s, status: 'CLOSED', countedCash: m2(counted[s.currency]), difference: m2(counted[s.currency] - num(s.expectedCash)), note, closedAt: s.openedAt }))); toast('Shift closed'); }} />
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title={`Receipt ${receipt?.receiptNo ?? ''}`}
        footer={<><Button variant="ghost" onClick={() => setReceipt(null)}>Done</Button><Button variant="primary" icon={<Printer />} perm="payment.record" onClick={() => window.print()}>Print receipt</Button></>}>
        {receipt && <ReceiptSheet p={receipt} />}
      </Modal>
    </Page>
  );
}

function Diff({ v, cur }: { v: number; cur: string }) {
  if (Math.abs(v) < 0.005) return <Pill tone="go">Balanced</Pill>;
  return <Pill tone={v < 0 ? 'stop' : 'wait'}>{v < 0 ? 'Short' : 'Over'} {fmtAmt(Math.abs(v), cur)}</Pill>;
}

function OpenShift({ onOpen }: { onOpen: (s: Shift[]) => void }) {
  const [usd, setUsd] = useState('200');
  const [tzs, setTzs] = useState('300000');
  return (
    <div className="stack">
      <p className="small muted">Count the float in each drawer before the first customer.</p>
      <Field label="Opening float USD"><Input type="number" min={0} value={usd} onChange={(e) => setUsd(e.target.value)} /></Field>
      <Field label="Opening float TZS"><Input type="number" min={0} value={tzs} onChange={(e) => setTzs(e.target.value)} /></Field>
      <Button variant="primary" icon={<Wallet />} perm="payment.record" onClick={() => onOpen([
        { cashierShiftId: 990, cashier: ME, currency: 'USD', status: 'OPEN', openingFloat: m2(Number(usd)), expectedCash: m2(Number(usd)), receiptsCount: 0, nonCash: '0', openedAt: '2026-10-07T07:30:00Z' },
        { cashierShiftId: 991, cashier: ME, currency: 'TZS', status: 'OPEN', openingFloat: m2(Number(tzs)), expectedCash: m2(Number(tzs)), receiptsCount: 0, nonCash: '0', openedAt: '2026-10-07T07:30:00Z' },
      ])}>Open shift</Button>
    </div>
  );
}

function CloseShift({ open, onClose, shifts: ss, onDone }: { open: boolean; onClose: () => void; shifts: Shift[]; onDone: (c: Record<string, number>, note: string) => void }) {
  const [cnt, setCnt] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const diffs = ss.map((s) => ({ s, d: (Number(cnt[s.currency] ?? '') || 0) - num(s.expectedCash), entered: cnt[s.currency] !== undefined && cnt[s.currency] !== '' }));
  const anyDiff = diffs.some((x) => x.entered && Math.abs(x.d) >= 0.005);
  const ready = diffs.every((x) => x.entered) && (!anyDiff || note.trim().length > 3);
  return (
    <Drawer open={open} onClose={onClose} title="Close shift and count cash"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<LockKeyhole />} perm="payment.record" disabled={!ready}
        onClick={() => { onDone(Object.fromEntries(ss.map((s) => [s.currency, Number(cnt[s.currency])])), note); onClose(); }}>{anyDiff ? 'Close shift and send for approval' : 'Close shift'}</Button></>}>
      <div className="stack">
        <p className="small muted">Count each drawer without looking at the expected figure first. It is shown after you enter the count.</p>
        {diffs.map(({ s, d, entered }) => (
          <div key={s.currency} className="panel" style={{ padding: 12 }}>
            <Field label={`Counted ${s.currency} cash`} required><Input type="number" min={0} value={cnt[s.currency] ?? ''} onChange={(e) => setCnt((c) => ({ ...c, [s.currency]: e.target.value }))} /></Field>
            {entered && <div className="row small" style={{ marginTop: 8 }}><span className="muted spacer">Expected <Money amount={s.expectedCash} currency={s.currency} /></span><Diff v={d} cur={s.currency} /></div>}
          </div>
        ))}
        {anyDiff && <Banner tone="wait" title="A difference needs approval">Your supervisor (cash-up approver) sees the shift with your note. Short cash may be recovered from the cashier per policy.</Banner>}
        <Field label="Note" required={anyDiff} hint="Explain any difference"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}

const METHOD_CHANNELS: Record<Method, string[]> = { CASH: ['CASH_USD', 'CASH_TZS'], BANK_TRANSFER: ['CRDB_USD', 'NMB_TZS'], MOBILE_MONEY: ['MPESA', 'TIGO', 'AIRTEL'], CHEQUE: ['CHEQUE'] };
const openDocs = (partyId: number) => invoices
  .filter((i) => i.billToPartyId === partyId && num(i.balance) > 0.005 && i.status !== 'DRAFT' && i.status !== 'CONVERTED' && i.docKind !== 'CREDIT_NOTE')
  .sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));

function TakePayment({ onRecorded }: { onRecorded: (p: Payment) => void }) {
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
  const reset = () => { setAmount(''); setRef(''); setPayer(''); setProof(false); setAlloc({}); };

  return (
    <div className="stack-lg">
      <Panel title="Payment">
        <div className="stack">
          <div className="form-grid">
            <Field label="Customer" required>
              <Select value={String(partyId)} onChange={(e) => { setPartyId(Number(e.target.value)); setAlloc({}); }} options={parties.filter((x) => x.roles.includes('CUSTOMER') || x.roles.includes('CLEARING_AGENT')).map((x) => [String(x.partyId), x.partyName])} />
            </Field>
            <Field label="Paid by (name)" hint="Person at the counter or account holder"><Input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="e.g. Baraka Mwita" /></Field>
          </div>
          {p?.creditStatus === 'BLOCKED' && <Banner tone="stop" title={`${p.partyName} is blocked for credit`}>Take payment in full before any cargo is released. Nothing goes on credit.</Banner>}
          <Field label="How did they pay?">
            <Segmented value={method} onChange={(m) => { setMethod(m); setChan(METHOD_CHANNELS[m][0]); setRef(''); setAlloc({}); }} options={[
              { id: 'CASH', label: 'Cash' }, { id: 'BANK_TRANSFER', label: 'Bank transfer' }, { id: 'MOBILE_MONEY', label: 'Mobile money' }, { id: 'CHEQUE', label: 'Cheque' },
            ]} />
          </Field>
          <div className="form-grid">
            {method === 'CASH'
              ? <Field label="Currency"><Segmented value={cashCur} onChange={(c) => { setCashCur(c); setAlloc({}); }} options={[{ id: 'USD', label: 'USD' }, { id: 'TZS', label: 'TZS' }]} /></Field>
              : method !== 'CHEQUE' && <Field label={method === 'BANK_TRANSFER' ? 'Bank' : 'Provider'}><Select value={chan} onChange={(e) => { setChan(e.target.value); setAlloc({}); }} options={METHOD_CHANNELS[method].map((c) => [c, channels.find((x) => x.channelCode === c)!.channelName])} /></Field>}
            <Field label={`Amount (${cur})`} required><Input type="number" min={0} step={cur === 'TZS' ? 100 : 0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={cur === 'TZS' ? '0' : '0.00'} /></Field>
            {needsRef && (
              <Field label="Reference" required error={dup ? `Already receipted on ${dup.receiptNo}, ${fmtDT(dup.at)}. Duplicates are refused; check with the customer.` : undefined} hint={ch.referencePattern ?? undefined}>
                <Input className={dup ? 'input-error' : undefined} value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder={method === 'MOBILE_MONEY' ? 'SJ47KQ2ZP1' : 'CRDB/FT/26280/…'} aria-invalid={!!dup} />
              </Field>
            )}
          </div>
          {needsRef && (
            <Field label="Proof of payment" required>
              <span className="row-wrap">
                <Button icon={proof ? <CheckCircle2 /> : <Paperclip />} onClick={() => setProof(!proof)}>{proof ? 'slip-photo.jpg attached' : 'Attach slip or SMS screenshot'}</Button>
                {proof && <Button size="sm" variant="ghost" icon={<Undo2 />} onClick={() => setProof(false)}>Remove</Button>}
              </span>
            </Field>
          )}
          {cur === 'TZS' && amt > 0 && <p className="xs muted">≈ {fmtAmt(amt / rate)} at today's rate TZS {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}.</p>}
        </div>
      </Panel>

      <Panel flush title="Allocate to open invoices" sub={`${partyName(partyId)} · oldest first`}
        actions={<Button size="sm" icon={<Wand2 />} disabled={!amt || !docs.length} onClick={auto}>Auto-allocate oldest first</Button>}>
        {docs.length ? (
          <div className="table-wrap">
            <table className="dt">
              <thead><tr><th>Document</th><th>Date</th><th className="num">Balance</th><th className="num">Frozen rate</th><th className="num" style={{ width: 150 }}>Allocate ({cur})</th><th className="num">Covers</th></tr></thead>
              <tbody>
                {docs.map((d) => {
                  const v = Number(alloc[d.invoiceId]) || 0;
                  const cov = toInvCcy(v, d);
                  return (
                    <tr key={d.invoiceId}>
                      <td><span className="strong small">{d.invoiceNo}</span><div className="xs faint">{d.docKind === 'PROFORMA' ? 'Proforma' : d.consignmentRef}</div></td>
                      <td className="small">{dShort(d.invoiceDate)}</td>
                      <td className="num"><Money amount={d.balance} currency={d.currency} /></td>
                      <td className="num small">{d.currency === 'USD' ? num(d.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}</td>
                      <td className="num"><Input aria-label={`Allocate to ${d.invoiceNo}`} type="number" min={0} value={alloc[d.invoiceId] ?? ''} placeholder="0" style={{ textAlign: 'right' }} onChange={(e) => setAlloc((a) => ({ ...a, [d.invoiceId]: e.target.value }))} /></td>
                      <td className="num small">
                        {v > 0 ? <>
                          <Money amount={cov} currency={d.currency} />
                          {cov < num(d.balance) - 0.01 ? <div className="xs" style={{ color: 'var(--wait)' }}>Part payment</div> : <div className="xs" style={{ color: 'var(--go)' }}>Paid in full</div>}
                        </> : <span className="faint">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="small muted" style={{ padding: 16 }}>No open invoices for this customer. The payment will be kept on account.</p>}
        <div style={{ padding: 16, borderTop: '1px solid var(--steel)' }} className="stack">
          <div className="mx-totals">
            <dt>Received</dt><dd><Money amount={amt} currency={cur} /></dd>
            <dt>Allocated</dt><dd><Money amount={allocated} currency={cur} /></dd>
            <dt className="grand">Kept on account</dt><dd className="grand"><Money amount={Math.max(0, left)} currency={cur} strong /></dd>
            {Math.abs(fxTotal) >= 1 && <><dt>FX {fxTotal > 0 ? 'gain' : 'loss'} vs invoice rate</dt><dd><Money amount={Math.abs(fxTotal)} currency="TZS" /></dd></>}
          </div>
          {errors.length > 0 && amt > 0 && <ul className="xs" style={{ margin: 0, paddingLeft: 18, color: 'var(--stop)' }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={reset}>Clear</Button>
            <Button variant="primary" size="xl" icon={<CheckCircle2 />} perm="payment.record" disabled={errors.length > 0}
              onClick={() => {
                const allocs = docs.filter((d) => Number(alloc[d.invoiceId]) > 0).map((d, i) => {
                  const v = Number(alloc[d.invoiceId]);
                  const inv = toInvCcy(v, d);
                  return { paymentAllocationId: 99000 + i, invoiceId: d.invoiceId, invoiceNo: d.invoiceNo, amount: m2(v), amountInvoiceCcy: m2(inv), fxDifferenceBase: m2(d.currency === 'USD' ? inv * (rate - num(d.exchangeRate)) : 0), allocatedAt: '2026-10-07T07:30:00Z' };
                });
                onRecorded({
                  paymentId: 3200 + seq, receiptNo: `RCT-DAR1-26-0${seq}`, partyId, channelCode: code, externalRef: ref || null, currency: cur, amount: m2(amt), exchangeRate: m2(rate),
                  amountBase: m2(cur === 'TZS' ? amt : amt * rate), amountAllocated: m2(allocated), unallocated: m2(left), receivedAt: '2026-10-07T07:30:00Z', valueDate: TODAY,
                  status: left > 0.005 ? (allocated > 0 ? 'PART_ALLOC' : 'RECEIVED') : 'ALLOCATED', allocations: allocs, cashier: ME, siteId: 1, payerName: payer || undefined,
                });
                setSeq((s) => s + 1); reset();
              }}>Record payment</Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ReceiptSheet({ p }: { p: Payment }) {
  return (
    <PrintSheet small>
      <div style={{ textAlign: 'center' }}>
        <div className="strong">{COMPANY.legalName}</div>
        <div className="xs">TIN {COMPANY.tin} · VRN {COMPANY.vrn}</div>
        <div className="xs">{COMPANY.address}</div>
      </div>
      <div style={{ textAlign: 'center', borderTop: '1px dashed var(--ink-3)', borderBottom: '1px dashed var(--ink-3)', padding: '8px 0' }}>
        <div className="strong">Payment receipt</div>
        <div>{p.receiptNo}</div>
        <div className="xs">{fmtDT(p.receivedAt)} · Cashier {p.cashier}</div>
      </div>
      <table>
        <tbody>
          <tr><td>Received from</td><td className="num">{partyName(p.partyId)}</td></tr>
          {p.payerName && <tr><td>Paid by</td><td className="num">{p.payerName}</td></tr>}
          <tr><td>Channel</td><td className="num">{channel(p.channelCode)?.channelName}</td></tr>
          {p.externalRef && <tr><td>Reference</td><td className="num">{p.externalRef}</td></tr>}
          <tr><td><b>Amount</b></td><td className="num"><b>{fmtAmt(num(p.amount), p.currency)}</b></td></tr>
          {p.allocations.map((a) => <tr key={a.invoiceId}><td>Applied to {a.invoiceNo}</td><td className="num">{fmtAmt(num(a.amount), p.currency)}</td></tr>)}
          {num(p.unallocated) > 0 && <tr><td>Kept on account</td><td className="num">{fmtAmt(num(p.unallocated), p.currency)}</td></tr>}
        </tbody>
      </table>
      <div className="xs" style={{ textAlign: 'center' }}>This is a payment receipt, not a tax invoice. The TRA fiscal receipt is on the tax invoice.</div>
    </PrintSheet>
  );
}
