import { useMemo, useState } from 'react';
import {
  CalendarPlus, Download, FileText, HelpCircle, MessageSquarePlus, Search, Truck, Wallet,
} from 'lucide-react';
import {
  Banner, Button, Chips, DL, DataTable, Empty, Kpi, Money, Page, PageHeader, Panel, Pill,
  SearchInput, Select, StatusPill, Tabs, UnitNo, fmtD, fmtDT, fmtT, useToast,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { consignment, parties, party as partyOf, type Stay } from '@/mock/core';
import { VISIT_TYPES } from '@/mock/gate';
import {
  PORTAL_PARTY, SR_KINDS, appointments as seedAppts, invoicesOf, plainStatus, portalDocs, portalUnits, serviceRequests,
  type Appt, type Inv, type Plain, type SR, type Why,
} from '@/mock/insight';
import '@/screens/insight/insight.css';
import { FreeTime } from './FreeTime';
import { ReqStatus } from './ReqStatus';
import { UnitDrawer } from './UnitDrawer';
import { PayDrawer } from './PayDrawer';
import { BookDrawer } from './BookDrawer';
import { RequestDrawer } from './RequestDrawer';

type Tab = 'cargo' | 'invoices' | 'trucks' | 'requests' | 'documents';
type Quick = 'all' | Plain['key'];
type ReqKind = 'DELIVERY' | 'DOCUMENT_SUBMISSION' | 'FREE_DAY_EXTENSION' | 'INVOICE_QUERY' | 'DAMAGE_CLAIM';

export function PortalView() {
  const { isExternal } = useSession();
  const [preview, setPreview] = useState(PORTAL_PARTY);
  const partyId = isExternal ? PORTAL_PARTY : preview;
  const me = partyOf(partyId)!;
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('cargo');
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState<Quick>('all');
  const [limit, setLimit] = useState(25);
  const [unit, setUnit] = useState<Stay | null>(null);
  const [pay, setPay] = useState<Inv | null>(null);
  const [book, setBook] = useState<{ open: boolean; unit?: Stay }>({ open: false });
  const [req, setReq] = useState<{ open: boolean; kind?: ReqKind; unit?: Stay; invoice?: Inv }>({ open: false });
  const [paid, setPaid] = useState<Record<number, 'PENDING'>>({});
  const [appts, setAppts] = useState<Appt[]>(seedAppts);
  const [myReqs, setMyReqs] = useState<SR[]>(serviceRequests.filter((s) => s.partyId === PORTAL_PARTY));

  const { data: units = [] } = useQ(['portal-units', partyId], () =>
    delay(portalUnits(partyId).filter((s) => s.physicalStatus !== 'DEPARTED'))
  );
  const { data: invs = [] } = useQ(['portal-invoices', partyId], () => delay(invoicesOf(partyId)));
  const plain = useMemo(() => new Map(units.map((s) => [s.unitStayId!, plainStatus(s)])), [units]);
  const count = (k: Plain['key']) => units.filter((s) => plain.get(s.unitStayId!)?.key === k).length;
  const due = invs
    .filter((i) => Number(i.balance) > 0 && !paid[i.invoiceId!])
    .reduce((a, i) => a + Number(i.balance), 0);
  const reqs = partyId === PORTAL_PARTY ? myReqs : serviceRequests.filter((s) => s.partyId === partyId);

  const rows = units.filter((s) => {
    if (
      q &&
      !s.cargoUnit.unitNo.includes(q.replace(/\s/g, '').toUpperCase()) &&
      !(s.unitSummary.consignmentRef ?? '').includes(q.toUpperCase())
    )
      return false;
    return quick === 'all' || plain.get(s.unitStayId!)?.key === quick;
  });

  const openNext = (w: Why, s: Stay) => {
    setUnit(null);
    if (w.next === 'pay') {
      setTab('invoices');
      const inv = invs.find((i) => i.consignmentId === s.consignmentId && Number(i.balance) > 0);
      if (inv) setPay(inv);
    }
    if (w.next === 'request')
      setReq({ open: true, kind: s.customsStatus === 'NOT_LODGED' ? 'DOCUMENT_SUBMISSION' : 'DELIVERY', unit: s });
    if (w.next === 'extend') setReq({ open: true, kind: 'FREE_DAY_EXTENSION', unit: s });
    if (w.next === 'book') setBook({ open: true, unit: s });
    if (w.next === 'contact') setReq({ open: true, kind: 'DELIVERY', unit: s });
  };

  return (
    <Page>
      <PageHeader
        title={isExternal ? `Karibu, ${me.partyName}` : 'Customer portal'}
        ms="M5"
        sub={
          isExternal
            ? 'Your cargo at Dar es Salaam main and vehicle yards · updated as it happens'
            : 'What a customer or clearing agent sees when they sign in'
        }
        actions={
          <>
            <Button icon={<CalendarPlus />} perm="appointment.book" onClick={() => setBook({ open: true })}>
              Book a truck
            </Button>
            <Button
              variant="primary"
              icon={<MessageSquarePlus />}
              perm="portal.request.submit"
              onClick={() => setReq({ open: true })}
            >
              Request a service
            </Button>
          </>
        }
      />

      <div className="stack-lg">
        {!isExternal && (
          <Banner tone="info" title="Preview as a customer">
            <span className="row-wrap" style={{ marginTop: 6 }}>
              <span>
                You see exactly what this customer sees. To try the trimmed menu, pick the role “Clearing agent (portal)”
                in the demo menu.
              </span>
              <span style={{ width: 300, maxWidth: '100%' }}>
                <Select
                  aria-label="Customer to preview"
                  value={String(preview)}
                  onChange={(e) => setPreview(Number(e.target.value))}
                  options={parties
                    .filter((p) => p.roles.includes('CLEARING_AGENT') || p.roles.includes('CUSTOMER'))
                    .map((p) => [String(p.partyId), p.partyName])}
                />
              </span>
            </span>
          </Banner>
        )}

        <div className="kpi-strip">
          <Kpi
            label="Ready to collect"
            value={count('ready')}
            delta={count('ready') ? 'Book a truck to collect' : 'Nothing ready yet'}
          />
          <Kpi label="Waiting for customs" value={count('customs')} delta="We update as customs records" />
          <Kpi label="On hold" value={count('hold')} delta={count('hold') ? 'See why for each' : 'None'} />
          <Kpi
            label="Charges due"
            value={Math.round(due).toLocaleString('en-US')}
            unit="USD"
            delta={`${invs.filter((i) => Number(i.balance) > 0 && !paid[i.invoiceId!]).length} invoices open`}
          />
        </div>

        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'cargo', label: 'My cargo', count: units.length },
            { id: 'invoices', label: 'Invoices & pay', count: invs.filter((i) => Number(i.balance) > 0).length },
            { id: 'trucks', label: 'Truck bookings', count: appts.filter((a) => a.status === 'BOOKED').length },
            {
              id: 'requests',
              label: 'My requests',
              count: reqs.filter((r) => !['CLOSED', 'REJECTED', 'APPROVED'].includes(r.status!)).length,
            },
            { id: 'documents', label: 'Documents', count: portalDocs.length },
          ]}
        />

        {tab === 'cargo' && (
          <Panel flush>
            <div className="toolbar">
              <div style={{ width: 280, maxWidth: '100%' }}>
                <SearchInput
                  icon={<Search />}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Container, VIN or BL number"
                  aria-label="Find a unit"
                />
              </div>
              <Chips<Quick>
                value={quick}
                onChange={(k) => {
                  setQuick(k);
                  setLimit(25);
                }}
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'ready', label: 'Ready to collect', count: count('ready') },
                  { id: 'customs', label: 'Waiting for customs', count: count('customs') },
                  { id: 'charges', label: 'Charges due', count: count('charges') },
                  { id: 'hold', label: 'On hold', count: count('hold') },
                ]}
              />
            </div>
            {rows.length === 0 ? (
              <Empty title="No units match">
                Check the number, or choose “All”. Units appear here once the shipping line manifest reaches us.
              </Empty>
            ) : (
              <>
                <div className="only-wide">
                  <DataTable
                    rows={rows.slice(0, limit)}
                    rowKey={(s) => s.unitStayId!}
                    onRow={setUnit}
                    cols={[
                      {
                        key: 'u',
                        header: 'Unit',
                        render: (s) => (
                          <span>
                            <UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} />
                            <div className="xs faint">
                              {s.cargoUnit.unitTypeCode}
                              {s.cargoUnit.make ? ` · ${s.cargoUnit.make} ${s.cargoUnit.model}` : ''}
                            </div>
                          </span>
                        ),
                      },
                      {
                        key: 'bl',
                        header: 'BL / booking',
                        render: (s) => (
                          <span className="small">
                            {s.unitSummary.consignmentRef}
                            <div className="xs faint">{consignment(s.consignmentId)?.cargoDescription}</div>
                          </span>
                        ),
                      },
                      {
                        key: 'st',
                        header: 'Status',
                        render: (s) => {
                          const p = plain.get(s.unitStayId!)!;
                          return (
                            <span>
                              <Pill tone={p.tone}>{p.label}</Pill>
                              <div className="xs muted" style={{ marginTop: 2 }}>
                                {p.detail}
                              </div>
                            </span>
                          );
                        },
                      },
                      { key: 'free', header: 'Free time', render: (s) => <FreeTime s={s} /> },
                      {
                        key: 'act',
                        header: '',
                        render: (s) => {
                          const p = plain.get(s.unitStayId!)!;
                          return p.key === 'ready' ? (
                            <Button
                              size="sm"
                              icon={<Truck />}
                              perm="appointment.book"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBook({ open: true, unit: s });
                              }}
                            >
                              Book truck
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<HelpCircle />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setUnit(s);
                              }}
                            >
                              Why can't I collect?
                            </Button>
                          );
                        },
                      },
                    ]}
                  />
                </div>
                <div className="only-narrow cards">
                  {rows.slice(0, limit).map((s) => {
                    const p = plain.get(s.unitStayId!)!;
                    return (
                      <button key={s.unitStayId} className="card-row" onClick={() => setUnit(s)}>
                        <div className="row">
                          <span className="spacer">
                            <UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} />
                          </span>
                          <Pill tone={p.tone}>{p.label}</Pill>
                        </div>
                        <div className="xs muted" style={{ marginTop: 4 }}>
                          {s.unitSummary.consignmentRef} · {p.detail}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {rows.length > limit && (
                  <div style={{ padding: 12, textAlign: 'center' }}>
                    <Button onClick={() => setLimit((l) => l + 25)}>Show 25 more ({rows.length - limit} left)</Button>
                  </div>
                )}
              </>
            )}
          </Panel>
        )}

        {tab === 'invoices' && (
          <div className="grid-main-side">
            <Panel
              flush
              title="Invoices"
              sub="Pay by mobile money or bank transfer; release updates when payment is confirmed"
            >
              <DataTable
                rows={invs}
                rowKey={(i) => i.invoiceId!}
                empty={<Empty title="No invoices yet">Invoices appear here when we post them.</Empty>}
                cols={[
                  {
                    key: 'no',
                    header: 'Invoice',
                    render: (i) => (
                      <span>
                        <strong className="small">{i.invoiceNo}</strong>
                        <div className="xs faint">
                          {i.docKind === 'PROFORMA' ? 'Proforma (pay to get the delivery order)' : 'Tax invoice'} ·{' '}
                          {i.consignmentRef}
                        </div>
                      </span>
                    ),
                  },
                  {
                    key: 'd',
                    header: 'Date',
                    render: (i) => <span className="small nowrap">{fmtD(i.invoiceDate)}</span>,
                  },
                  {
                    key: 't',
                    header: 'Total',
                    num: true,
                    render: (i) => <Money amount={i.total} currency={i.currency} />,
                  },
                  {
                    key: 'b',
                    header: 'To pay',
                    num: true,
                    render: (i) =>
                      paid[i.invoiceId!] ? (
                        <Pill tone="wait">Payment being confirmed</Pill>
                      ) : Number(i.balance) > 0 ? (
                        <Money amount={i.balance} currency={i.currency} strong />
                      ) : (
                        <span className="faint">—</span>
                      ),
                  },
                  {
                    key: 's',
                    header: 'Status',
                    render: (i) =>
                      paid[i.invoiceId!] ? <Pill tone="wait">Payment being confirmed</Pill> : <StatusPill value={i.status} />,
                  },
                  {
                    key: 'a',
                    header: '',
                    render: (i) => (
                      <span className="row" style={{ gap: 6 }}>
                        {Number(i.balance) > 0 && !paid[i.invoiceId!] && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<Wallet />}
                            perm="portal.request.submit"
                            onClick={() => setPay(i)}
                          >
                            Pay
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Download />}
                          aria-label={`Download ${i.invoiceNo}`}
                          perm="billing.invoice.view"
                          onClick={() => toast(`Downloading ${i.invoiceNo}.pdf`)}
                        />
                      </span>
                    ),
                  },
                ]}
              />
            </Panel>
            <div className="stack-lg">
              <Panel title="Account">
                <DL
                  items={[
                    ['Account', `${me.partyCode}`],
                    [
                      'Terms',
                      me.creditStatus === 'CREDIT'
                        ? `Credit, limit ${me.creditCurrency} ${Number(me.creditLimit).toLocaleString()}`
                        : me.creditStatus === 'BLOCKED'
                        ? 'Cash only (credit stopped)'
                        : 'Cash before release',
                    ],
                    ['To pay now', <Money key="d" amount={due} currency="USD" strong />],
                  ]}
                />
              </Panel>
              <Panel title="Something wrong on an invoice?">
                <p className="small muted">
                  Tell us which line and why. Billing replies within 2 working days. Do not pay the disputed line until we
                  answer.
                </p>
                <Button
                  icon={<MessageSquarePlus />}
                  perm="portal.request.submit"
                  onClick={() => setReq({ open: true, kind: 'INVOICE_QUERY' })}
                >
                  Ask about an invoice
                </Button>
              </Panel>
            </div>
          </div>
        )}

        {tab === 'trucks' && (
          <Panel
            flush
            title="Truck bookings"
            sub="Trucks with a booking use the fast lane at the outer gate. Arrive within 30 minutes of the slot start."
            actions={
              <Button
                size="sm"
                variant="primary"
                icon={<CalendarPlus />}
                perm="appointment.book"
                onClick={() => setBook({ open: true })}
              >
                Book a truck
              </Button>
            }
          >
            <DataTable
              rows={appts}
              rowKey={(a) => a.appointmentId!}
              empty={<Empty title="No bookings">Book a slot when your cargo is ready to collect.</Empty>}
              cols={[
                { key: 'no', header: 'Booking', render: (a) => <strong className="small">{a.appointmentNo}</strong> },
                {
                  key: 'when',
                  header: 'Slot',
                  render: (a) => (
                    <span className="small nowrap">
                      {fmtD(a.slotStart)} {fmtT(a.slotStart)}–{fmtT(a.slotEnd)}
                    </span>
                  ),
                },
                {
                  key: 'type',
                  header: 'For',
                  render: (a) => (
                    <span className="small">
                      {VISIT_TYPES[a.visitTypeCode]}
                      {a.releaseNo ? <div className="xs faint">{a.releaseNo}</div> : null}
                    </span>
                  ),
                },
                {
                  key: 'truck',
                  header: 'Truck and driver',
                  render: (a) => (
                    <span className="small">
                      <span className="unitno unitno-sm">{a.plate}</span> {a.driver}
                    </span>
                  ),
                },
                {
                  key: 'st',
                  header: 'Status',
                  render: (a) => (
                    <Pill
                      tone={
                        a.status === 'BOOKED'
                          ? 'go'
                          : a.status === 'MISSED'
                          ? 'stop'
                          : a.status === 'ARRIVED'
                          ? 'wait'
                          : 'idle'
                      }
                    >
                      {
                        {
                          BOOKED: 'Booked',
                          ARRIVED: 'Truck arrived',
                          COMPLETED: 'Done',
                          MISSED: 'Missed',
                          CANCELLED: 'Cancelled',
                        }[a.status!]
                      }
                    </Pill>
                  ),
                },
                {
                  key: 'x',
                  header: '',
                  render: (a) =>
                    a.status === 'BOOKED' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        perm="appointment.book"
                        onClick={() => {
                          setAppts((x) =>
                            x.map((y) => (y.appointmentId === a.appointmentId ? { ...y, status: 'CANCELLED' } : y))
                          );
                          toast('Booking cancelled');
                        }}
                      >
                        Cancel booking
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Panel>
        )}

        {tab === 'requests' && (
          <Panel
            flush
            title="My requests"
            actions={
              <Button
                size="sm"
                variant="primary"
                icon={<MessageSquarePlus />}
                perm="portal.request.submit"
                onClick={() => setReq({ open: true })}
              >
                Request a service
              </Button>
            }
          >
            <DataTable
              rows={reqs}
              rowKey={(r) => r.serviceRequestId!}
              empty={<Empty title="No requests yet">Ask for a delivery, send a document or query an invoice.</Empty>}
              cols={[
                {
                  key: 'no',
                  header: 'Request',
                  render: (r) => (
                    <span>
                      <strong className="small">{r.subject}</strong>
                      <div className="xs faint">
                        {r.requestNo} · {SR_KINDS[r.requestKind].label}
                      </div>
                    </span>
                  ),
                },
                {
                  key: 'at',
                  header: 'Sent',
                  render: (r) => <span className="small nowrap">{fmtDT(r.createdAt)}</span>,
                },
                { key: 'st', header: 'Status', render: (r) => <ReqStatus r={r} /> },
                {
                  key: 'last',
                  header: 'Latest reply',
                  render: (r) => {
                    const m = [...r.messages].reverse().find((x) => x.from === 'staff');
                    return (
                      <span className="small">
                        {m ? (
                          m.text
                        ) : (
                          <span className="faint">No reply yet · we answer within {SR_KINDS[r.requestKind].slaHours} h</span>
                        )}
                      </span>
                    );
                  },
                },
              ]}
            />
          </Panel>
        )}

        {tab === 'documents' && (
          <Panel
            flush
            title="Documents"
            sub="Copies of what we issued to you. Originals stay valid; these are for your records."
          >
            <DataTable
              rows={portalDocs}
              rowKey={(d) => d.documentId!}
              cols={[
                {
                  key: 't',
                  header: 'Document',
                  render: (d) => (
                    <span className="row">
                      <FileText size={16} aria-hidden />
                      <span>
                        <strong className="small">{d.title}</strong>
                        <div className="xs faint">{d.ref}</div>
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'd',
                  header: 'Date',
                  render: (d) => <span className="small nowrap">{fmtD(d.capturedAt)}</span>,
                },
                {
                  key: 's',
                  header: 'Size',
                  num: true,
                  render: (d) => `${Math.round((d.sizeBytes ?? 0) / 1000).toLocaleString()} KB`,
                },
                {
                  key: 'a',
                  header: '',
                  render: (d) =>
                    d.status === 'PENDING_APPROVAL' ? (
                      <span className="xs muted">Ready once approved</span>
                    ) : (
                      <Button
                        size="sm"
                        icon={<Download />}
                        perm="consignment.view"
                        onClick={() => toast(`Downloading ${d.ref}.pdf`)}
                      >
                        Download
                      </Button>
                    ),
                },
              ]}
            />
          </Panel>
        )}
      </div>

      <UnitDrawer s={unit} onClose={() => setUnit(null)} onNext={openNext} />
      <PayDrawer
        inv={pay}
        onClose={() => setPay(null)}
        onPaid={(i) => {
          setPaid((p) => ({ ...p, [i.invoiceId!]: 'PENDING' }));
          setPay(null);
        }}
      />
      <BookDrawer
        open={book.open}
        unit={book.unit}
        units={units.filter((s) => plain.get(s.unitStayId!)?.key === 'ready')}
        onClose={() => setBook({ open: false })}
        onBooked={(a) => {
          setAppts((x) => [a, ...x]);
          setBook({ open: false });
          setTab('trucks');
        }}
      />
      <RequestDrawer
        open={req.open}
        kind={req.kind}
        unit={req.unit}
        units={units}
        partyId={partyId}
        onClose={() => setReq({ open: false })}
        onSent={(r) => {
          setMyReqs((x) => [r, ...x]);
          setReq({ open: false });
          setTab('requests');
        }}
      />
    </Page>
  );
}
