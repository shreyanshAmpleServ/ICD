import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRightLeft, BadgeCheck, Download, FileMinus2, Printer, RefreshCw, Send, Wallet } from 'lucide-react';
import {
  Banner, Button, DL, Drawer, Empty, Field, Input, Modal, Money, Page, PageHeader, Panel, StatusPill, Tabs, Textarea, Timeline, UnitNo,
  fmtD, fmtDT, useToast, type TLItem,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { party } from '@/mock/core';
import {
  COMPANY, DOC_KIND, LIMITS, TODAY, dLong, dShort, fx, glPostings, invoice, m2, num, payments, releaseValidTo, channel, TAX,
  type FiscalStatus, type GlStatus, type Invoice,
} from '@/mock/money';
import { ApprovalPath, DocKindPill, DualAmount, FiscalPill, GlPill, PrintSheet, Totals, fmtAmt, useOwnLimit, qtyU } from './shared';

/* GET /invoices/{id}. One page answers: what was charged and how, in which
   currency at which frozen rate, is it fiscalised, is it in NG's ledger,
   what has been paid, and what release validity it bought. */
type TabId = 'invoice' | 'print' | 'history';

export function InvoiceDetail() {
  const { invoiceId } = useParams();
  const { data } = useQ(['invoice', invoiceId], () => delay(invoice(Number(invoiceId))));
  if (!data) return <Page><Empty title="Loading invoice" /></Page>;
  return <InvoiceView key={data.invoiceId} base={data} />;
}

function InvoiceView({ base }: { base: Invoice }) {
  const toast = useToast();
  const nav = useNavigate();
  const { can } = useSession();
  const [inv, setInv] = useState<Invoice>(base);
  const [tab, setTab] = useState<TabId>('invoice');
  const [confirm, setConfirm] = useState<null | 'post' | 'convert'>(null);
  const [credit, setCredit] = useState(false);
  const p = party(inv.billToPartyId);
  const fiscal = inv.fiscalReceipt?.status as FiscalStatus | undefined;
  const gl = glPostings.find((g) => g.sourceEntity === 'invoice' && g.sourceId === inv.invoiceId);
  const glStatus = inv.glStatus as GlStatus | null;
  const allocs = payments.flatMap((pay) => pay.allocations.filter((a) => a.invoiceId === inv.invoiceId).map((a) => ({ a, pay })));
  const draft = inv.status === 'DRAFT';
  const rate = draft ? fx(TODAY) : num(inv.exchangeRate);
  const isPro = inv.docKind === 'PROFORMA';
  const paidUp = num(inv.amountPaid) >= num(inv.total) - 0.005;
  const proforma = inv.proformaInvoiceId ? invoice(inv.proformaInvoiceId) : undefined;
  const original = inv.originalInvoiceId ? invoice(inv.originalInvoiceId) : undefined;
  const k = inv.currency === 'USD' ? rate : 1 / rate;
  const other = inv.currency === 'USD' ? 'TZS' : 'USD';

  const setFiscal = (s: FiscalStatus, extra: Partial<NonNullable<Invoice['fiscalReceipt']>> = {}) =>
    setInv((x) => ({ ...x, fiscalReceipt: { provider: 'VFD · TRA EFD gateway', attempts: (x.fiscalReceipt?.attempts ?? 0) + (s === 'PENDING' ? 1 : 0), ...x.fiscalReceipt, ...extra, status: s } }));
  const issueFiscal = () => {
    setFiscal('PENDING', { lastError: null });
    setTimeout(() => {
      setFiscal('ISSUED', { receiptNo: `${COMPANY.vfdSerial}-049${String(inv.invoiceId).slice(-3)}`, verificationCode: `9F3A${String(inv.invoiceId * 31).slice(-6)}`, issuedAt: new Date(Date.parse('2026-10-07T07:31:00Z')).toISOString(), lastError: null });
      toast('Fiscal receipt issued');
    }, 1400);
  };

  const timeline: TLItem[] = [
    ...allocs.map(({ a, pay }) => ({ at: a.allocatedAt, title: `Payment ${pay.receiptNo} allocated`, detail: `${fmtAmt(num(a.amount), pay.currency)} by ${channel(pay.channelCode)?.channelName}${pay.externalRef ? ` · ${pay.externalRef}` : ''}`, by: pay.cashier, tone: 'go' as const })),
    gl?.postedAt ? { at: gl.postedAt, title: 'Journal accepted by NG ledger', detail: gl.externalRef, tone: 'go' as const } : null,
    inv.fiscalReceipt?.issuedAt ? { at: inv.fiscalReceipt.issuedAt, title: 'Fiscal receipt issued by TRA VFD', detail: inv.fiscalReceipt.receiptNo, tone: 'go' as const } : null,
    fiscal === 'FAILED' ? { at: inv.postedAt!, title: `Fiscal receipt failed (${inv.fiscalReceipt?.attempts} attempts)`, detail: inv.fiscalReceipt?.lastError, tone: 'stop' as const } : null,
    inv.postedAt ? { at: inv.postedAt, title: `${DOC_KIND[inv.docKind]} posted`, detail: `Rate frozen at TZS ${inv.exchangeRate} (${dShort(inv.exchangeRateDate)})`, by: inv.createdBy } : null,
    { at: new Date(Date.parse(inv.invoiceDate + 'T05:10:00Z')).toISOString(), title: `${DOC_KIND[inv.docKind]} created`, detail: proforma ? `From proforma ${proforma.invoiceNo}` : undefined, by: inv.createdBy },
  ].filter(Boolean) as TLItem[];
  timeline.sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Page>
      <PageHeader crumbs={[['Invoices', '/invoices'], [inv.invoiceNo]]} title={inv.invoiceNo} ms="M3"
        sub={<span className="row-wrap" style={{ marginTop: 6 }}>
          <DocKindPill kind={inv.docKind} /><StatusPill value={inv.status} />
          {!isPro && !draft && <FiscalPill status={fiscal} long />}
          <span className="small muted">{p?.partyName}{inv.consignmentRef ? ` · ${inv.consignmentRef}` : ''}</span>
        </span>}
        actions={<>
          <Button icon={<Printer />} perm="billing.invoice.view" onClick={() => setTab('print')}>Print</Button>
          <Button icon={<Download />} perm="billing.invoice.view" onClick={() => toast('PDF downloaded')}>PDF</Button>
          {inv.docKind === 'TAX_INVOICE' && !draft && <Button icon={<FileMinus2 />} perm="billing.creditnote" level="REQ" onClick={() => setCredit(true)}>Issue credit note</Button>}
          {!isPro && !draft && num(inv.balance) > 0 && inv.docKind !== 'CREDIT_NOTE' && <Button icon={<Wallet />} perm="payment.record" onClick={() => nav(`/cashier?party=${inv.billToPartyId}`)}>Take payment</Button>}
          {draft && <Button variant="primary" icon={<Send />} perm="billing.invoice.post" onClick={() => setConfirm('post')}>Post invoice</Button>}
          {isPro && inv.status === 'ISSUED' && <Button variant="primary" icon={<ArrowRightLeft />} perm="billing.invoice.create" disabled={!paidUp && p?.creditStatus !== 'CREDIT'} title={!paidUp ? 'Take payment first, or bill-to must be on credit' : undefined} onClick={() => setConfirm('convert')}>Convert to tax invoice</Button>}
        </>} />

      <div className="stack-lg">
        {fiscal === 'FAILED' && (
          <Banner tone="stop" title="Fiscal receipt failed: the customer has no valid TRA receipt yet"
            action={<Button size="sm" icon={<RefreshCw />} perm="billing.invoice.post" onClick={issueFiscal}>Retry now</Button>}>
            {inv.fiscalReceipt?.lastError} Attempts so far: {inv.fiscalReceipt?.attempts}.
          </Banner>
        )}
        {isPro && inv.status === 'ISSUED' && paidUp && <Banner tone="wait" title="Paid in full: convert to a tax invoice">The release order can be issued once the tax invoice is posted and fiscalised.</Banner>}
        {isPro && inv.status === 'ISSUED' && !paidUp && <Banner title="Waiting for payment">A proforma is not a tax document. {p?.creditStatus === 'BLOCKED' ? `${p.partyName} is blocked for credit, so cargo cannot leave until this is paid.` : 'Take payment at the cashier, then convert it.'}</Banner>}
        {isPro && inv.status === 'CONVERTED' && <Banner tone="go" title="Converted">This proforma became a tax invoice. See history for the invoice number.</Banner>}
        {draft && <Banner title="Draft: not posted">Nothing has gone to TRA or the NG ledger. The rate shown is today's; it is frozen when you post.</Banner>}
        {inv.zeroRated && inv.docKind !== 'PROFORMA' && <Banner tone="wait" title="Transit services zero-rated">VAT 0% applied under the transit tariff. Verify with tax adviser before go-live.</Banner>}

        <Tabs<TabId> value={tab} onChange={setTab} tabs={[{ id: 'invoice', label: DOC_KIND[inv.docKind] }, { id: 'print', label: 'Print preview' }, { id: 'history', label: 'History', count: timeline.length }]} />

        {tab === 'invoice' && (
          <div className="grid-main-side">
            <div className="stack-lg" style={{ minWidth: 0 }}>
              <Panel title="Details">
                <DL cols items={[
                  ['Bill to', <Link key="b" to={`/statements/${inv.billToPartyId}`}>{p?.partyName}</Link>],
                  ['Customer TIN / VRN', [p?.taxId, p?.vatNo].filter(Boolean).join(' / ') || 'Not recorded'],
                  ['Consignment', inv.consignmentRef],
                  ['Date', fmtD(inv.invoiceDate)],
                  ['Due', inv.dueDate && inv.dueDate !== inv.invoiceDate ? fmtD(inv.dueDate) : 'On receipt'],
                  ['Service to', inv.serviceToDate ? fmtD(inv.serviceToDate) : null],
                  ['Currency', inv.currency],
                  [draft ? 'Exchange rate (today, not frozen)' : 'Exchange rate (frozen)', `TZS ${rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} · ${dShort(draft ? TODAY : inv.exchangeRateDate)}`],
                  [`Total in ${other}`, fmtAmt(num(inv.total) * k, other)],
                  ['Created by', inv.createdBy],
                  ['Posted', inv.postedAt ? fmtDT(inv.postedAt) : 'Not posted'],
                  proforma ? ['From proforma', <Link key="p" to={`/invoices/${proforma.invoiceId}`}>{proforma.invoiceNo}</Link>] : original ? ['Original invoice', <Link key="o" to={`/invoices/${original.invoiceId}`}>{original.invoiceNo}</Link>] : ['Release order', 'RO-DAR1-26-01942'],
                ]} />
                {inv.reason && <p className="small" style={{ marginTop: 12 }}><span className="muted">Reason: </span>{inv.reason}</p>}
              </Panel>

              <Panel flush title="Lines" sub={`${inv.lines.length} lines · amounts in ${inv.currency}`}>
                <LinesTable inv={inv} rateCol={can('billing.rates.view')} />
                <div style={{ padding: 16, borderTop: '1px solid var(--steel)' }}>
                  <Totals rows={[
                    ['Subtotal', <Money key="s" amount={inv.subtotal} currency={inv.currency} />],
                    ['VAT', <Money key="v" amount={inv.taxTotal} currency={inv.currency} />],
                    ['Total', <Money key="t" amount={inv.total} currency={inv.currency} strong />, true],
                    [`In ${other} at ${rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, <Money key="tz" amount={num(inv.total) * k} currency={other} />],
                    ...(num(inv.amountPaid) ? [['Paid', <Money key="p" amount={-num(inv.amountPaid)} currency={inv.currency} />] as [string, JSX.Element]] : []),
                    ...(num(inv.amountCredited) ? [['Credited', <Money key="c" amount={-num(inv.amountCredited)} currency={inv.currency} />] as [string, JSX.Element]] : []),
                    ...(inv.docKind !== 'CREDIT_NOTE' ? [['Balance due', <Money key="b" amount={inv.balance} currency={inv.currency} strong />, true] as [string, JSX.Element, boolean]] : []),
                  ]} />
                </div>
              </Panel>
            </div>

            <div className="stack-lg">
              {inv.releaseValidTo && inv.docKind !== 'CREDIT_NOTE' && (
                <Panel title="Release validity">
                  <div className="stack" style={{ gap: 4 }}>
                    <div className="unitno unitno-md">{paidUp || p?.creditStatus === 'CREDIT' ? 'Paid through' : 'Covers storage to'} {dShort(inv.releaseValidTo)}</div>
                    <div className="small muted">{paidUp || p?.creditStatus === 'CREDIT'
                      ? `Release valid to ${releaseValidTo(inv.releaseValidTo)}. Collecting later needs storage paid to the new date (revalidation).`
                      : `Once paid, the release is valid to ${releaseValidTo(inv.releaseValidTo)}.`}</div>
                  </div>
                </Panel>
              )}

              <Panel title="Payments allocated" flush>
                {allocs.length ? (
                  <ul className="list-plain">
                    {allocs.map(({ a, pay }) => (
                      <li key={a.paymentAllocationId} style={{ padding: '10px 16px', borderBottom: '1px solid var(--steel-2)' }}>
                        <div className="row"><span className="strong small spacer">{pay.receiptNo}</span><Money amount={a.amount} currency={pay.currency} /></div>
                        <div className="xs muted">{fmtDT(a.allocatedAt)} · {channel(pay.channelCode)?.channelName}{pay.externalRef ? ` · ${pay.externalRef}` : ''}</div>
                        {pay.currency !== inv.currency && <div className="xs muted">= {fmtAmt(num(a.amountInvoiceCcy), inv.currency)} at TZS {pay.exchangeRate}; FX difference {fmtAmt(num(a.fxDifferenceBase), 'TZS')}</div>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="small muted" style={{ padding: 16 }}>{isPro || draft ? 'No payments yet.' : 'No payments allocated. Take payment at the cashier.'}</p>}
              </Panel>

              {!isPro && (
                <Panel title="Fiscal receipt (TRA VFD)">
                  {draft ? <p className="small muted">Requested automatically when the invoice is posted.</p> : (
                    <div className="stack">
                      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                        <div className="mx-qr" aria-label="QR code placeholder" role="img" style={{ opacity: fiscal === 'ISSUED' ? 0.85 : 0.2 }} />
                        <div className="stack" style={{ gap: 4 }}>
                          <FiscalPill status={fiscal} />
                          <span className="xs muted">Receipt no.</span><span className="strong small">{inv.fiscalReceipt?.receiptNo ?? '—'}</span>
                          <span className="xs muted">Verification code</span><span className="strong small" style={{ fontFamily: 'var(--font-cond)', letterSpacing: '.06em' }}>{inv.fiscalReceipt?.verificationCode ?? '—'}</span>
                        </div>
                      </div>
                      <DL items={[['Provider', inv.fiscalReceipt?.provider], ['Issued', fmtDT(inv.fiscalReceipt?.issuedAt)], ['Attempts', inv.fiscalReceipt?.attempts]]} />
                      {fiscal === 'FAILED' && <Button icon={<RefreshCw />} perm="billing.invoice.post" onClick={issueFiscal}>Retry fiscal receipt</Button>}
                      {fiscal === 'PENDING' && <p className="xs muted">Queued for the VFD provider. This page updates when TRA answers.</p>}
                    </div>
                  )}
                </Panel>
              )}

              {!isPro && (
                <Panel title="NG ledger posting" actions={can('finance.period.close') ? <Link className="small" to="/ledger">Ledger</Link> : undefined}>
                  <div className="stack" style={{ gap: 6 }}>
                    <GlPill status={glStatus} />
                    {gl && <DL items={[['Journal', gl.externalRef ?? 'Not yet'], ['Posting date', fmtD(gl.postingDate)], ['Amount (TZS)', <Money key="a" amount={gl.amountBase} currency="TZS" />]]} />}
                    {gl?.lastError && <p className="xs" style={{ color: 'var(--stop)' }}>{gl.lastError}</p>}
                    {glStatus === 'FAILED' && <Button icon={<RefreshCw />} perm="finance.period.close" onClick={() => { setInv((x) => ({ ...x, glStatus: 'POSTED' })); toast('Posting retried: accepted by NG'); }}>Retry posting</Button>}
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}

        {tab === 'print' && (
          <div className="stack">
            <div className="row-wrap"><Button variant="primary" icon={<Printer />} perm="billing.invoice.view" onClick={() => window.print()}>Print</Button><span className="xs muted">Prints the sheet only, on A4.</span></div>
            <InvoiceSheet inv={inv} rate={rate} />
          </div>
        )}

        {tab === 'history' && <Panel><Timeline items={timeline} /></Panel>}
      </div>

      <Modal open={confirm === 'post'} onClose={() => setConfirm(null)} title="Post this invoice?"
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="primary" icon={<Send />} perm="billing.invoice.post" onClick={() => {
          setInv((x) => ({ ...x, status: 'POSTED', exchangeRate: m2(fx(TODAY)), exchangeRateDate: TODAY, postedAt: new Date(Date.parse('2026-10-07T07:30:00Z')).toISOString(), glStatus: 'PENDING' }));
          setConfirm(null); toast('Invoice posted'); issueFiscal();
        }}>Post invoice</Button></>}>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Freezes the exchange rate at TZS {fx(TODAY).toLocaleString('en-US', { minimumFractionDigits: 2 })} (today).</li>
          <li>Requests a fiscal receipt from TRA through the VFD provider.</li>
          <li>Queues a balanced journal to the NG ledger.</li>
          <li>After posting it can't be cancelled, only credited.</li>
        </ul>
      </Modal>
      <Modal open={confirm === 'convert'} onClose={() => setConfirm(null)} title="Convert proforma to tax invoice?"
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="primary" icon={<BadgeCheck />} perm="billing.invoice.create" onClick={() => { setInv((x) => ({ ...x, status: 'CONVERTED' })); setConfirm(null); toast('Proforma converted to INV-DAR1-26-003321'); }}>Convert to tax invoice</Button></>}>
        <p className="small">Creates and posts tax invoice INV-DAR1-26-003321 with the same lines, moves the {fmtAmt(num(inv.amountPaid), inv.currency)} already paid onto it, issues the TRA fiscal receipt and sends the journal to NG. The rate is frozen at today's TZS {fx(TODAY).toLocaleString('en-US', { minimumFractionDigits: 2 })}.</p>
      </Modal>
      <CreditDrawer open={credit} onClose={() => setCredit(false)} inv={inv} />
    </Page>
  );
}

function LinesTable({ inv, rateCol }: { inv: Invoice; rateCol: boolean }) {
  return (
    <div className="table-wrap">
      <table className="dt">
        <thead><tr><th>#</th><th>Unit</th><th>Charge</th><th>Service period</th><th className="num">Qty</th>{rateCol && <th className="num">Rate</th>}<th className="num">VAT</th><th className="num">Total</th></tr></thead>
        <tbody>
          {inv.lines.map((l) => (
            <tr key={l.lineNo}>
              <td className="xs faint">{l.lineNo}</td>
              <td>{l.unitNo ? <UnitNo no={l.unitNo} /> : <span className="faint">—</span>}</td>
              <td><span className="strong small">{l.description}</span><div className="xs faint">{l.chargeCode} · {TAX[l.taxCode]?.name ?? l.taxCode}</div></td>
              <td className="small nowrap">{l.serviceFrom ? (l.serviceFrom === l.serviceTo ? dShort(l.serviceFrom) : `${dShort(l.serviceFrom)} – ${dShort(l.serviceTo!)}`) : '—'}</td>
              <td className="num small">{qtyU(l.quantity, l.uom)}</td>
              {rateCol && <td className="num"><Money amount={l.unitRate} /></td>}
              <td className="num"><Money amount={l.taxAmount} /></td>
              <td className="num"><Money amount={l.lineTotal} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceSheet({ inv, rate }: { inv: Invoice; rate: number }) {
  const p = party(inv.billToPartyId);
  const other = inv.currency === 'USD' ? 'TZS' : 'USD';
  const k = inv.currency === 'USD' ? rate : 1 / rate;
  const f = (n: string | number, cur = inv.currency) => Number(n).toLocaleString('en-US', { minimumFractionDigits: cur === 'TZS' ? 0 : 2, maximumFractionDigits: cur === 'TZS' ? 0 : 2 });
  const title = { PROFORMA: 'Proforma invoice', TAX_INVOICE: 'Tax invoice', CREDIT_NOTE: 'Credit note', DEBIT_NOTE: 'Debit note' }[inv.docKind];
  return (
    <PrintSheet>
      <div className="hdr">
        <div>
          <h1>{COMPANY.legalName}</h1>
          <div>{COMPANY.address}</div>
          <div>{COMPANY.phone} · {COMPANY.email}</div>
          <div><b>TIN</b> {COMPANY.tin} · <b>VRN</b> {COMPANY.vrn}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 20 }}>{title}</h1>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{inv.invoiceNo}</div>
          <div>Date {dLong(inv.invoiceDate)}</div>
          {inv.dueDate && <div>Due {dLong(inv.dueDate)}</div>}
          {inv.status === 'DRAFT' && <div style={{ color: 'var(--stop)', fontWeight: 700 }}>DRAFT, not valid for payment</div>}
        </div>
      </div>
      <div className="two">
        <div className="box">
          <div className="lbl">Bill to</div>
          <div style={{ fontWeight: 700 }}>{p?.partyName}</div>
          <div>{p?.city}{p?.countryCode !== 'TZ' ? `, ${p?.countryCode}` : ''}</div>
          <div>TIN {p?.taxId ?? '—'} · VRN {p?.vatNo ?? '—'}</div>
        </div>
        <div className="box">
          <div className="lbl">Cargo</div>
          <div>B/L {inv.consignmentRef ?? '—'}</div>
          {inv.serviceToDate && <div>Services to {dLong(inv.serviceToDate)}</div>}
          {inv.releaseValidTo && <div>Release valid to {releaseValidTo(inv.releaseValidTo)}</div>}
          <div>Currency {inv.currency} · Rate TZS {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} per USD ({dShort(inv.status === 'DRAFT' ? TODAY : inv.exchangeRateDate)})</div>
        </div>
      </div>
      <table>
        <thead><tr><th>Unit</th><th>Description</th><th>Period</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">VAT</th><th className="num">Amount {inv.currency}</th></tr></thead>
        <tbody>
          {inv.lines.map((l) => (
            <tr key={l.lineNo}>
              <td style={{ whiteSpace: 'nowrap' }}>{l.unitNo ?? ''}</td><td>{l.description}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{l.serviceFrom ? (l.serviceFrom === l.serviceTo ? dShort(l.serviceFrom) : `${dShort(l.serviceFrom)}–${dShort(l.serviceTo!)}`) : ''}</td>
              <td className="num">{l.quantity}</td><td className="num">{f(l.unitRate)}</td><td className="num">{num(l.taxRatePct)}%</td><td className="num">{f(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="two">
        <div className="fiscal">
          <div className="mx-qr" aria-hidden />
          <div>
            <div className="lbl">TRA fiscal receipt (VFD)</div>
            {inv.docKind === 'PROFORMA' ? <div>Proforma: not a tax document. A fiscal receipt is issued with the tax invoice.</div> : inv.fiscalReceipt?.status === 'ISSUED' ? (
              <>
                <div>Receipt no. <b>{inv.fiscalReceipt.receiptNo}</b></div>
                <div>Verification code <b>{inv.fiscalReceipt.verificationCode}</b></div>
                <div>Serial {COMPANY.vfdSerial} · {fmtDT(inv.fiscalReceipt.issuedAt)}</div>
              </>
            ) : <div>Fiscal receipt pending. Do not hand over without the verification code.</div>}
          </div>
        </div>
        <table>
          <tbody>
            <tr><td>Subtotal</td><td className="num">{inv.currency} {f(inv.subtotal)}</td><td className="num">{other} {f(num(inv.subtotal) * k, other)}</td></tr>
            <tr><td>VAT</td><td className="num">{inv.currency} {f(inv.taxTotal)}</td><td className="num">{other} {f(num(inv.taxTotal) * k, other)}</td></tr>
            <tr><td><b>Total</b></td><td className="num"><b>{inv.currency} {f(inv.total)}</b></td><td className="num"><b>{other} {f(num(inv.total) * k, other)}</b></td></tr>
            {inv.docKind !== 'CREDIT_NOTE' && <tr><td>Balance due</td><td className="num">{inv.currency} {f(inv.balance)}</td><td /></tr>}
          </tbody>
        </table>
      </div>
      {inv.zeroRated && <div className="xs">Transit services zero-rated for VAT.</div>}
      <div className="foot">
        Pay to {COMPANY.bank}. Quote {inv.invoiceNo} as the reference. Mobile money: M-Pesa, Tigo Pesa and Airtel Money till 504411.
        Storage is charged per calendar day from vessel discharge; free days include Sundays and public holidays. Release is valid to the paid-through date.
      </div>
    </PrintSheet>
  );
}

function CreditDrawer({ open, onClose, inv }: { open: boolean; onClose: () => void; inv: Invoice }) {
  const toast = useToast();
  const own = useOwnLimit('billing.creditnote');
  const [amt, setAmt] = useState<Record<number, string>>({});
  const [reason, setReason] = useState('');
  const total = inv.lines.reduce((a, l) => a + (Number(amt[l.lineNo]) || 0) * (1 + num(l.taxRatePct) / 100), 0);
  const usd = inv.currency === 'USD' ? total : total / num(inv.exchangeRate);
  const applies = usd < LIMITS.creditNoteTwoLevelsUsd && usd <= own;
  return (
    <Drawer wide open={open} onClose={onClose} title={`Credit note against ${inv.invoiceNo}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={<FileMinus2 />} perm="billing.creditnote" level="REQ" disabled={!reason.trim() || total <= 0}
          onClick={() => { onClose(); toast(applies ? 'Credit note CN-DAR1-26-000213 issued' : 'Credit note requested for approval'); }}>{applies ? 'Issue credit note' : 'Request approval'}</Button>
      </>}>
      <div className="stack">
        <p className="small muted">A posted invoice is never changed. The credit note points to it, gets its own fiscal receipt and reduces the balance. Enter the amount to credit per line, before VAT.</p>
        <div className="table-wrap">
          <table className="dt">
            <thead><tr><th>Line</th><th className="num">Billed</th><th className="num" style={{ width: 140 }}>Credit ({inv.currency})</th></tr></thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.lineNo}>
                  <td className="small">{l.unitNo ? `${l.unitNo} · ` : ''}{l.description}</td>
                  <td className="num"><Money amount={l.amount} /></td>
                  <td className="num"><Input aria-label={`Credit for line ${l.lineNo}`} type="number" min={0} max={num(l.amount)} step="0.01" value={amt[l.lineNo] ?? ''} placeholder="0.00"
                    onChange={(e) => setAmt((a) => ({ ...a, [l.lineNo]: String(Math.min(num(l.amount), Number(e.target.value) || 0)) }))} style={{ textAlign: 'right' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="small muted">Credit including VAT</span><DualAmount amount={total} currency={inv.currency} rate={num(inv.exchangeRate)} strong /></div>
        <ApprovalPath amountUsd={usd} ownLimit={own} twoLevelFrom={LIMITS.creditNoteTwoLevelsUsd} what="credit note" />
        <Field label="Reason" required hint="Printed on the credit note"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Storage days 12–14 waived: depot equipment breakdown" /></Field>
      </div>
    </Drawer>
  );
}
