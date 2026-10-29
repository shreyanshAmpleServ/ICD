import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRightLeft, BadgeCheck, Download, FileMinus2, Printer, RefreshCw, Send, Wallet } from 'lucide-react';
import {
  Banner, Button, DL, Empty, Modal, Money, Page, PageHeader, Panel, StatusPill, Tabs, Timeline,
  fmtD, fmtDT, useToast, type TLItem,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { party } from '@/mock/core';
import {
  COMPANY, DOC_KIND, TODAY, dShort, fx, glPostings, m2, num, payments, releaseValidTo, channel,
  type FiscalStatus, type GlStatus, type Invoice,
} from '@/mock/money';
import { DocKindPill, FiscalPill, GlPill, Totals, fmtAmt } from '../../components/shared';
import { invoicesApi } from '../api';
import { CreditDrawer } from './CreditDrawer';
import { InvoiceSheet } from './InvoiceSheet';
import { LinesTable } from './LinesTable';

type TabId = 'invoice' | 'print' | 'history';

export function InvoiceDetailView() {
  const { invoiceId } = useParams();
  const id = Number(invoiceId);
  const { data } = useQ(['invoice', id], () => invoicesApi.getInvoiceDetail(id));
  if (!data)
    return (
      <Page>
        <Empty title="Loading invoice" />
      </Page>
    );
  return <InvoiceViewInner key={data.invoiceId} base={data} />;
}

function InvoiceViewInner({ base }: { base: Invoice }) {
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
  const allocs = payments.flatMap((pay) =>
    pay.allocations.filter((a) => a.invoiceId === inv.invoiceId).map((a) => ({ a, pay }))
  );
  const draft = inv.status === 'DRAFT';
  const rate = draft ? fx(TODAY) : num(inv.exchangeRate);
  const isPro = inv.docKind === 'PROFORMA';
  const paidUp = num(inv.amountPaid) >= num(inv.total) - 0.005;
  const proforma = inv.proformaInvoiceId ? base : undefined; // or look up
  const original = inv.originalInvoiceId ? base : undefined;
  const k = inv.currency === 'USD' ? rate : 1 / rate;
  const other = inv.currency === 'USD' ? 'TZS' : 'USD';

  const setFiscal = (s: FiscalStatus, extra: Partial<NonNullable<Invoice['fiscalReceipt']>> = {}) =>
    setInv((x) => ({
      ...x,
      fiscalReceipt: {
        provider: 'VFD · TRA EFD gateway',
        attempts: (x.fiscalReceipt?.attempts ?? 0) + (s === 'PENDING' ? 1 : 0),
        ...x.fiscalReceipt,
        ...extra,
        status: s,
      },
    }));

  const issueFiscal = () => {
    setFiscal('PENDING', { lastError: null });
    setTimeout(() => {
      setFiscal('ISSUED', {
        receiptNo: `${COMPANY.vfdSerial}-049${String(inv.invoiceId).slice(-3)}`,
        verificationCode: `9F3A${String(inv.invoiceId * 31).slice(-6)}`,
        issuedAt: new Date(Date.parse('2026-10-07T07:31:00Z')).toISOString(),
        lastError: null,
      });
      toast('Fiscal receipt issued');
    }, 1400);
  };

  const timeline: TLItem[] = [
    ...allocs.map(({ a, pay }) => ({
      at: a.allocatedAt,
      title: `Payment ${pay.receiptNo} allocated`,
      detail: `${fmtAmt(num(a.amount), pay.currency)} by ${channel(pay.channelCode)?.channelName}${
        pay.externalRef ? ` · ${pay.externalRef}` : ''
      }`,
      by: pay.cashier,
      tone: 'go' as const,
    })),
    gl?.postedAt ? { at: gl.postedAt, title: 'Journal accepted by NG ledger', detail: gl.externalRef, tone: 'go' as const } : null,
    inv.fiscalReceipt?.issuedAt
      ? { at: inv.fiscalReceipt.issuedAt, title: 'Fiscal receipt issued by TRA VFD', detail: inv.fiscalReceipt.receiptNo, tone: 'go' as const }
      : null,
    fiscal === 'FAILED'
      ? {
          at: inv.postedAt!,
          title: `Fiscal receipt failed (${inv.fiscalReceipt?.attempts} attempts)`,
          detail: inv.fiscalReceipt?.lastError,
          tone: 'stop' as const,
        }
      : null,
    inv.postedAt
      ? {
          at: inv.postedAt,
          title: `${DOC_KIND[inv.docKind]} posted`,
          detail: `Rate frozen at TZS ${inv.exchangeRate} (${dShort(inv.exchangeRateDate)})`,
          by: inv.createdBy,
        }
      : null,
    {
      at: new Date(Date.parse(inv.invoiceDate + 'T05:10:00Z')).toISOString(),
      title: `${DOC_KIND[inv.docKind]} created`,
      detail: proforma ? `From proforma ${proforma.invoiceNo}` : undefined,
      by: inv.createdBy,
    },
  ].filter(Boolean) as TLItem[];
  timeline.sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Page>
      <PageHeader
        crumbs={[['Invoices', '/invoices'], [inv.invoiceNo]]}
        title={inv.invoiceNo}
        ms="M3"
        sub={
          <span className="row-wrap" style={{ marginTop: 6 }}>
            <DocKindPill kind={inv.docKind} />
            <StatusPill value={inv.status} />
            {!isPro && !draft && <FiscalPill status={fiscal} long />}
            <span className="small muted">
              {p?.partyName}
              {inv.consignmentRef ? ` · ${inv.consignmentRef}` : ''}
            </span>
          </span>
        }
        actions={
          <>
            <Button icon={<Printer />} perm="billing.invoice.view" onClick={() => setTab('print')}>
              Print
            </Button>
            <Button icon={<Download />} perm="billing.invoice.view" onClick={() => toast('PDF downloaded')}>
              PDF
            </Button>
            {inv.docKind === 'TAX_INVOICE' && !draft && (
              <Button icon={<FileMinus2 />} perm="billing.creditnote" level="REQ" onClick={() => setCredit(true)}>
                Issue credit note
              </Button>
            )}
            {!isPro && !draft && num(inv.balance) > 0 && inv.docKind !== 'CREDIT_NOTE' && (
              <Button icon={<Wallet />} perm="payment.record" onClick={() => nav(`/cashier?party=${inv.billToPartyId}`)}>
                Take payment
              </Button>
            )}
            {draft && (
              <Button variant="primary" icon={<Send />} perm="billing.invoice.post" onClick={() => setConfirm('post')}>
                Post invoice
              </Button>
            )}
            {isPro && inv.status === 'ISSUED' && (
              <Button
                variant="primary"
                icon={<ArrowRightLeft />}
                perm="billing.invoice.create"
                disabled={!paidUp && p?.creditStatus !== 'CREDIT'}
                title={!paidUp ? 'Take payment first, or bill-to must be on credit' : undefined}
                onClick={() => setConfirm('convert')}
              >
                Convert to tax invoice
              </Button>
            )}
          </>
        }
      />

      <div className="stack-lg">
        {fiscal === 'FAILED' && (
          <Banner
            tone="stop"
            title="Fiscal receipt failed: the customer has no valid TRA receipt yet"
            action={
              <Button size="sm" icon={<RefreshCw />} perm="billing.invoice.post" onClick={issueFiscal}>
                Retry now
              </Button>
            }
          >
            {inv.fiscalReceipt?.lastError} Attempts so far: {inv.fiscalReceipt?.attempts}.
          </Banner>
        )}
        {isPro && inv.status === 'ISSUED' && paidUp && (
          <Banner tone="wait" title="Paid in full: convert to a tax invoice">
            The release order can be issued once the tax invoice is posted and fiscalised.
          </Banner>
        )}
        {isPro && inv.status === 'ISSUED' && !paidUp && (
          <Banner title="Waiting for payment">
            A proforma is not a tax document.{' '}
            {p?.creditStatus === 'BLOCKED'
              ? `${p.partyName} is blocked for credit, so cargo cannot leave until this is paid.`
              : 'Take payment at the cashier, then convert it.'}
          </Banner>
        )}
        {isPro && inv.status === 'CONVERTED' && (
          <Banner tone="go" title="Converted">
            This proforma became a tax invoice. See history for the invoice number.
          </Banner>
        )}
        {draft && (
          <Banner title="Draft: not posted">
            Nothing has gone to TRA or the NG ledger. The rate shown is today's; it is frozen when you post.
          </Banner>
        )}
        {inv.zeroRated && inv.docKind !== 'PROFORMA' && (
          <Banner tone="wait" title="Transit services zero-rated">
            VAT 0% applied under the transit tariff. Verify with tax adviser before go-live.
          </Banner>
        )}

        <Tabs<TabId>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'invoice', label: DOC_KIND[inv.docKind] },
            { id: 'print', label: 'Print preview' },
            { id: 'history', label: 'History', count: timeline.length },
          ]}
        />

        {tab === 'invoice' && (
          <div className="grid-main-side">
            <div className="stack-lg" style={{ minWidth: 0 }}>
              <Panel title="Details">
                <DL
                  cols
                  items={[
                    ['Bill to', <Link key="b" to={`/statements/${inv.billToPartyId}`}>{p?.partyName}</Link>],
                    ['Customer TIN / VRN', [p?.taxId, p?.vatNo].filter(Boolean).join(' / ') || 'Not recorded'],
                    ['Consignment', inv.consignmentRef],
                    ['Date', fmtD(inv.invoiceDate)],
                    ['Due', inv.dueDate && inv.dueDate !== inv.invoiceDate ? fmtD(inv.dueDate) : 'On receipt'],
                    ['Service to', inv.serviceToDate ? fmtD(inv.serviceToDate) : null],
                    ['Currency', inv.currency],
                    [
                      draft ? 'Exchange rate (today, not frozen)' : 'Exchange rate (frozen)',
                      `TZS ${rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} · ${dShort(
                        draft ? TODAY : inv.exchangeRateDate
                      )}`,
                    ],
                    [`Total in ${other}`, fmtAmt(num(inv.total) * k, other)],
                    ['Created by', inv.createdBy],
                    ['Posted', inv.postedAt ? fmtDT(inv.postedAt) : 'Not posted'],
                    proforma
                      ? ['From proforma', <Link key="p" to={`/invoices/${proforma.invoiceId}`}>{proforma.invoiceNo}</Link>]
                      : original
                      ? ['Original invoice', <Link key="o" to={`/invoices/${original.invoiceId}`}>{original.invoiceNo}</Link>]
                      : ['Release order', 'RO-DAR1-26-01942'],
                  ]}
                />
                {inv.reason && (
                  <p className="small" style={{ marginTop: 12 }}>
                    <span className="muted">Reason: </span>
                    {inv.reason}
                  </p>
                )}
              </Panel>

              <Panel flush title="Lines" sub={`${inv.lines.length} lines · amounts in ${inv.currency}`}>
                <LinesTable inv={inv} rateCol={can('billing.rates.view')} />
                <div style={{ padding: 16, borderTop: '1px solid var(--steel)' }}>
                  <Totals
                    rows={[
                      ['Subtotal', <Money key="s" amount={inv.subtotal} currency={inv.currency} />],
                      ['VAT', <Money key="v" amount={inv.taxTotal} currency={inv.currency} />],
                      ['Total', <Money key="t" amount={inv.total} currency={inv.currency} strong />, true],
                      [
                        `In ${other} at ${rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                        <Money key="tz" amount={num(inv.total) * k} currency={other} />,
                      ],
                      ...(num(inv.amountPaid)
                        ? ([['Paid', <Money key="p" amount={-num(inv.amountPaid)} currency={inv.currency} />]] as [
                            string,
                            JSX.Element
                          ][])
                        : []),
                      ...(num(inv.amountCredited)
                        ? ([['Credited', <Money key="c" amount={-num(inv.amountCredited)} currency={inv.currency} />]] as [
                            string,
                            JSX.Element
                          ][])
                        : []),
                      ...(inv.docKind !== 'CREDIT_NOTE'
                        ? ([['Balance due', <Money key="b" amount={inv.balance} currency={inv.currency} strong />, true]] as [
                            string,
                            JSX.Element,
                            boolean
                          ][])
                        : []),
                    ]}
                  />
                </div>
              </Panel>
            </div>

            <div className="stack-lg">
              {inv.releaseValidTo && inv.docKind !== 'CREDIT_NOTE' && (
                <Panel title="Release validity">
                  <div className="stack" style={{ gap: 4 }}>
                    <div className="unitno unitno-md">
                      {paidUp || p?.creditStatus === 'CREDIT' ? 'Paid through' : 'Covers storage to'}{' '}
                      {dShort(inv.releaseValidTo)}
                    </div>
                    <div className="small muted">
                      {paidUp || p?.creditStatus === 'CREDIT'
                        ? `Release valid to ${releaseValidTo(
                            inv.releaseValidTo
                          )}. Collecting later needs storage paid to the new date (revalidation).`
                        : `Once paid, the release is valid to ${releaseValidTo(inv.releaseValidTo)}.`}
                    </div>
                  </div>
                </Panel>
              )}

              <Panel title="Payments allocated" flush>
                {allocs.length ? (
                  <ul className="list-plain">
                    {allocs.map(({ a, pay }) => (
                      <li
                        key={a.paymentAllocationId}
                        style={{ padding: '10px 16px', borderBottom: '1px solid var(--steel-2)' }}
                      >
                        <div className="row">
                          <span className="strong small spacer">{pay.receiptNo}</span>
                          <Money amount={a.amount} currency={pay.currency} />
                        </div>
                        <div className="xs muted">
                          {fmtDT(a.allocatedAt)} · {channel(pay.channelCode)?.channelName}
                          {pay.externalRef ? ` · ${pay.externalRef}` : ''}
                        </div>
                        {pay.currency !== inv.currency && (
                          <div className="xs muted">
                            = {fmtAmt(num(a.amountInvoiceCcy), inv.currency)} at TZS {pay.exchangeRate}; FX difference{' '}
                            {fmtAmt(num(a.fxDifferenceBase), 'TZS')}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small muted" style={{ padding: 16 }}>
                    {isPro || draft ? 'No payments yet.' : 'No payments allocated. Take payment at the cashier.'}
                  </p>
                )}
              </Panel>

              {!isPro && (
                <Panel title="Fiscal receipt (TRA VFD)">
                  {draft ? (
                    <p className="small muted">Requested automatically when the invoice is posted.</p>
                  ) : (
                    <div className="stack">
                      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                        <div
                          className="mx-qr"
                          aria-label="QR code placeholder"
                          role="img"
                          style={{ opacity: fiscal === 'ISSUED' ? 0.85 : 0.2 }}
                        />
                        <div className="stack" style={{ gap: 4 }}>
                          <FiscalPill status={fiscal} />
                          <span className="xs muted">Receipt no.</span>
                          <span className="strong small">{inv.fiscalReceipt?.receiptNo ?? '—'}</span>
                          <span className="xs muted">Verification code</span>
                          <span
                            className="strong small"
                            style={{ fontFamily: 'var(--font-cond)', letterSpacing: '.06em' }}
                          >
                            {inv.fiscalReceipt?.verificationCode ?? '—'}
                          </span>
                        </div>
                      </div>
                      <DL
                        items={[
                          ['Provider', inv.fiscalReceipt?.provider],
                          ['Issued', fmtDT(inv.fiscalReceipt?.issuedAt)],
                          ['Attempts', inv.fiscalReceipt?.attempts],
                        ]}
                      />
                      {fiscal === 'FAILED' && (
                        <Button icon={<RefreshCw />} perm="billing.invoice.post" onClick={issueFiscal}>
                          Retry fiscal receipt
                        </Button>
                      )}
                      {fiscal === 'PENDING' && (
                        <p className="xs muted">Queued for the VFD provider. This page updates when TRA answers.</p>
                      )}
                    </div>
                  )}
                </Panel>
              )}

              {!isPro && (
                <Panel
                  title="NG ledger posting"
                  actions={
                    can('finance.period.close') ? (
                      <Link className="small" to="/ledger">
                        Ledger
                      </Link>
                    ) : undefined
                  }
                >
                  <div className="stack" style={{ gap: 6 }}>
                    <GlPill status={glStatus} />
                    {gl && (
                      <DL
                        items={[
                          ['Journal', gl.externalRef ?? 'Not yet'],
                          ['Posting date', fmtD(gl.postingDate)],
                          ['Amount (TZS)', <Money key="a" amount={gl.amountBase} currency="TZS" />],
                        ]}
                      />
                    )}
                    {gl?.lastError && (
                      <p className="xs" style={{ color: 'var(--stop)' }}>
                        {gl.lastError}
                      </p>
                    )}
                    {glStatus === 'FAILED' && (
                      <Button
                        icon={<RefreshCw />}
                        perm="finance.period.close"
                        onClick={() => {
                          setInv((x) => ({ ...x, glStatus: 'POSTED' }));
                          toast('Posting retried: accepted by NG');
                        }}
                      >
                        Retry posting
                      </Button>
                    )}
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}

        {tab === 'print' && (
          <div className="stack">
            <div className="row-wrap">
              <Button variant="primary" icon={<Printer />} perm="billing.invoice.view" onClick={() => window.print()}>
                Print
              </Button>
              <span className="xs muted">Prints the sheet only, on A4.</span>
            </div>
            <InvoiceSheet inv={inv} rate={rate} />
          </div>
        )}

        {tab === 'history' && (
          <Panel>
            <Timeline items={timeline} />
          </Panel>
        )}
      </div>

      <Modal
        open={confirm === 'post'}
        onClose={() => setConfirm(null)}
        title="Post this invoice?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<Send />}
              perm="billing.invoice.post"
              onClick={() => {
                setInv((x) => ({
                  ...x,
                  status: 'POSTED',
                  exchangeRate: m2(fx(TODAY)),
                  exchangeRateDate: TODAY,
                  postedAt: new Date(Date.parse('2026-10-07T07:30:00Z')).toISOString(),
                  glStatus: 'PENDING',
                }));
                setConfirm(null);
                toast('Invoice posted');
                issueFiscal();
              }}
            >
              Post invoice
            </Button>
          </>
        }
      >
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            Freezes the exchange rate at TZS {fx(TODAY).toLocaleString('en-US', { minimumFractionDigits: 2 })} (today).
          </li>
          <li>Requests a fiscal receipt from TRA through the VFD provider.</li>
          <li>Queues a balanced journal to the NG ledger.</li>
          <li>After posting it can't be cancelled, only credited.</li>
        </ul>
      </Modal>
      <Modal
        open={confirm === 'convert'}
        onClose={() => setConfirm(null)}
        title="Convert proforma to tax invoice?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={<BadgeCheck />}
              perm="billing.invoice.create"
              onClick={() => {
                setInv((x) => ({ ...x, status: 'CONVERTED' }));
                setConfirm(null);
                toast('Proforma converted to INV-DAR1-26-003321');
              }}
            >
              Convert to tax invoice
            </Button>
          </>
        }
      >
        <p className="small">
          Creates and posts tax invoice INV-DAR1-26-003321 with the same lines, moves the{' '}
          {fmtAmt(num(inv.amountPaid), inv.currency)} already paid onto it, issues the TRA fiscal receipt and sends the
          journal to NG. The rate is frozen at today's TZS{' '}
          {fx(TODAY).toLocaleString('en-US', { minimumFractionDigits: 2 })}.
        </p>
      </Modal>
      <CreditDrawer open={credit} onClose={() => setCredit(false)} inv={inv} />
    </Page>
  );
}
