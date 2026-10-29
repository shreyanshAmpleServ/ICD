import { useMemo, useState } from 'react';
import {
  CalendarClock, CalendarPlus, Download, FileText, HelpCircle, MessageSquarePlus, Search, Smartphone, Landmark, Truck, Wallet,
} from 'lucide-react';
import {
  Banner, Button, Chips, Conditions, DL, DataTable, Drawer, Empty, Field, Input, Kpi, Money, Page, PageHeader, Panel, Pill,
  SearchInput, Segmented, Select, StatusPill, Tabs, Textarea, UnitNo, fmtD, fmtDT, fmtT, useToast, type Cond,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { useSession } from '@/app/session';
import { consignment, parties, party as partyOf, type Stay } from '@/mock/core';
import { VISIT_TYPES } from '@/mock/gate';
import { day } from '@/mock/gen';
import {
  PORTAL_PARTY, SR_KINDS, appointments as seedAppts, invoicesOf, plainStatus, portalDocs, portalUnits, serviceRequests, slotsFor,
  whyCantCollect, type Appt, type Inv, type Plain, type SR, type Why,
} from '@/mock/insight';
import '@/features/reports/insight.css';

/* Customer portal (Phase 2, M5): what a clearing agent or importer sees.
   Same product, fewer words: plain-language status, one reason per blocker
   with what to do next, pay, book a truck, ask for something.
   GET /portal/units, /portal/units/{id}/gate-out-explanation, /portal/invoices,
   /appointments/availability, POST /portal/requests. */
type Tab = 'cargo' | 'invoices' | 'trucks' | 'requests' | 'documents';
type Quick = 'all' | Plain['key'];
type ReqKind = 'DELIVERY' | 'DOCUMENT_SUBMISSION' | 'FREE_DAY_EXTENSION' | 'INVOICE_QUERY' | 'DAMAGE_CLAIM';

export function Portal() {
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

  const { data: units = [] } = useQ(['portal-units', partyId], () => delay(portalUnits(partyId).filter((s) => s.physicalStatus !== 'DEPARTED')));
  const { data: invs = [] } = useQ(['portal-invoices', partyId], () => delay(invoicesOf(partyId)));
  const plain = useMemo(() => new Map(units.map((s) => [s.unitStayId!, plainStatus(s)])), [units]);
  const count = (k: Plain['key']) => units.filter((s) => plain.get(s.unitStayId!)?.key === k).length;
  const due = invs.filter((i) => Number(i.balance) > 0 && !paid[i.invoiceId!]).reduce((a, i) => a + Number(i.balance), 0);
  const reqs = partyId === PORTAL_PARTY ? myReqs : serviceRequests.filter((s) => s.partyId === partyId);

  const rows = units.filter((s) => {
    if (q && !s.cargoUnit.unitNo.includes(q.replace(/\s/g, '').toUpperCase()) && !(s.unitSummary.consignmentRef ?? '').includes(q.toUpperCase())) return false;
    return quick === 'all' || plain.get(s.unitStayId!)?.key === quick;
  });

  const openNext = (w: Why, s: Stay) => {
    setUnit(null);
    if (w.next === 'pay') { setTab('invoices'); const inv = invs.find((i) => i.consignmentId === s.consignmentId && Number(i.balance) > 0); if (inv) setPay(inv); }
    if (w.next === 'request') setReq({ open: true, kind: s.customsStatus === 'NOT_LODGED' ? 'DOCUMENT_SUBMISSION' : 'DELIVERY', unit: s });
    if (w.next === 'extend') setReq({ open: true, kind: 'FREE_DAY_EXTENSION', unit: s });
    if (w.next === 'book') setBook({ open: true, unit: s });
    if (w.next === 'contact') setReq({ open: true, kind: 'DELIVERY', unit: s });
  };

  return (
    <Page>
      <PageHeader title={isExternal ? `Karibu, ${me.partyName}` : 'Customer portal'} ms="M5"
        sub={isExternal ? 'Your cargo at Dar es Salaam main and vehicle yards · updated as it happens' : 'What a customer or clearing agent sees when they sign in'}
        actions={<>
          <Button icon={<CalendarPlus />} perm="appointment.book" onClick={() => setBook({ open: true })}>Book a truck</Button>
          <Button variant="primary" icon={<MessageSquarePlus />} perm="portal.request.submit" onClick={() => setReq({ open: true })}>Request a service</Button>
        </>} />

      <div className="stack-lg">
        {!isExternal && (
          <Banner tone="info" title="Preview as a customer">
            <span className="row-wrap" style={{ marginTop: 6 }}>
              <span>You see exactly what this customer sees. To try the trimmed menu, pick the role “Clearing agent (portal)” in the demo menu.</span>
              <span style={{ width: 300, maxWidth: '100%' }}>
                <Select aria-label="Customer to preview" value={String(preview)} onChange={(e) => setPreview(Number(e.target.value))}
                  options={parties.filter((p) => p.roles.includes('CLEARING_AGENT') || p.roles.includes('CUSTOMER')).map((p) => [String(p.partyId), p.partyName])} />
              </span>
            </span>
          </Banner>
        )}

        <div className="kpi-strip">
          <Kpi label="Ready to collect" value={count('ready')} delta={count('ready') ? 'Book a truck to collect' : 'Nothing ready yet'} />
          <Kpi label="Waiting for customs" value={count('customs')} delta="We update as customs records" />
          <Kpi label="On hold" value={count('hold')} delta={count('hold') ? 'See why for each' : 'None'} />
          <Kpi label="Charges due" value={Math.round(due).toLocaleString('en-US')} unit="USD" delta={`${invs.filter((i) => Number(i.balance) > 0 && !paid[i.invoiceId!]).length} invoices open`} />
        </div>

        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { id: 'cargo', label: 'My cargo', count: units.length },
          { id: 'invoices', label: 'Invoices & pay', count: invs.filter((i) => Number(i.balance) > 0).length },
          { id: 'trucks', label: 'Truck bookings', count: appts.filter((a) => a.status === 'BOOKED').length },
          { id: 'requests', label: 'My requests', count: reqs.filter((r) => !['CLOSED', 'REJECTED', 'APPROVED'].includes(r.status!)).length },
          { id: 'documents', label: 'Documents', count: portalDocs.length },
        ]} />

        {tab === 'cargo' && (
          <Panel flush>
            <div className="toolbar">
              <div style={{ width: 280, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Container, VIN or BL number" aria-label="Find a unit" /></div>
              <Chips<Quick> value={quick} onChange={(k) => { setQuick(k); setLimit(25); }} options={[
                { id: 'all', label: 'All' }, { id: 'ready', label: 'Ready to collect', count: count('ready') }, { id: 'customs', label: 'Waiting for customs', count: count('customs') },
                { id: 'charges', label: 'Charges due', count: count('charges') }, { id: 'hold', label: 'On hold', count: count('hold') },
              ]} />
            </div>
            {rows.length === 0 ? <Empty title="No units match">Check the number, or choose “All”. Units appear here once the shipping line manifest reaches us.</Empty> : (
              <>
                <div className="only-wide">
                  <DataTable rows={rows.slice(0, limit)} rowKey={(s) => s.unitStayId!} onRow={setUnit} cols={[
                    { key: 'u', header: 'Unit', render: (s) => <span><UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} /><div className="xs faint">{s.cargoUnit.unitTypeCode}{s.cargoUnit.make ? ` · ${s.cargoUnit.make} ${s.cargoUnit.model}` : ''}</div></span> },
                    { key: 'bl', header: 'BL / booking', render: (s) => <span className="small">{s.unitSummary.consignmentRef}<div className="xs faint">{consignment(s.consignmentId)?.cargoDescription}</div></span> },
                    { key: 'st', header: 'Status', render: (s) => { const p = plain.get(s.unitStayId!)!; return <span><Pill tone={p.tone}>{p.label}</Pill><div className="xs muted" style={{ marginTop: 2 }}>{p.detail}</div></span>; } },
                    { key: 'free', header: 'Free time', render: (s) => <FreeTime s={s} /> },
                    { key: 'act', header: '', render: (s) => { const p = plain.get(s.unitStayId!)!; return p.key === 'ready'
                      ? <Button size="sm" icon={<Truck />} perm="appointment.book" onClick={(e) => { e.stopPropagation(); setBook({ open: true, unit: s }); }}>Book truck</Button>
                      : <Button size="sm" variant="ghost" icon={<HelpCircle />} onClick={(e) => { e.stopPropagation(); setUnit(s); }}>Why can't I collect?</Button>; } },
                  ]} />
                </div>
                <div className="only-narrow cards">
                  {rows.slice(0, limit).map((s) => { const p = plain.get(s.unitStayId!)!; return (
                    <button key={s.unitStayId} className="card-row" onClick={() => setUnit(s)}>
                      <div className="row"><span className="spacer"><UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} /></span><Pill tone={p.tone}>{p.label}</Pill></div>
                      <div className="xs muted" style={{ marginTop: 4 }}>{s.unitSummary.consignmentRef} · {p.detail}</div>
                    </button>
                  ); })}
                </div>
                {rows.length > limit && <div style={{ padding: 12, textAlign: 'center' }}><Button onClick={() => setLimit((l) => l + 25)}>Show 25 more ({rows.length - limit} left)</Button></div>}
              </>
            )}
          </Panel>
        )}

        {tab === 'invoices' && (
          <div className="grid-main-side">
            <Panel flush title="Invoices" sub="Pay by mobile money or bank transfer; release updates when payment is confirmed">
              <DataTable rows={invs} rowKey={(i) => i.invoiceId!} empty={<Empty title="No invoices yet">Invoices appear here when we post them.</Empty>} cols={[
                { key: 'no', header: 'Invoice', render: (i) => <span><strong className="small">{i.invoiceNo}</strong><div className="xs faint">{i.docKind === 'PROFORMA' ? 'Proforma (pay to get the delivery order)' : 'Tax invoice'} · {i.consignmentRef}</div></span> },
                { key: 'd', header: 'Date', render: (i) => <span className="small nowrap">{fmtD(i.invoiceDate)}</span> },
                { key: 't', header: 'Total', num: true, render: (i) => <Money amount={i.total} currency={i.currency} /> },
                { key: 'b', header: 'To pay', num: true, render: (i) => Number(i.balance) > 0 ? <Money amount={i.balance} currency={i.currency} strong /> : <span className="faint">—</span> },
                { key: 's', header: 'Status', render: (i) => paid[i.invoiceId!] ? <Pill tone="wait">Payment being confirmed</Pill> : <StatusPill value={i.status} /> },
                { key: 'a', header: '', render: (i) => (
                  <span className="row" style={{ gap: 6 }}>
                    {Number(i.balance) > 0 && !paid[i.invoiceId!] && <Button size="sm" variant="primary" icon={<Wallet />} perm="portal.request.submit" onClick={() => setPay(i)}>Pay</Button>}
                    <Button size="sm" variant="ghost" icon={<Download />} aria-label={`Download ${i.invoiceNo}`} perm="billing.invoice.view" onClick={() => toast(`Downloading ${i.invoiceNo}.pdf`)} />
                  </span>
                ) },
              ]} />
            </Panel>
            <div className="stack-lg">
              <Panel title="Account">
                <DL items={[
                  ['Account', `${me.partyCode}`],
                  ['Terms', me.creditStatus === 'CREDIT' ? `Credit, limit ${me.creditCurrency} ${Number(me.creditLimit).toLocaleString()}` : me.creditStatus === 'BLOCKED' ? 'Cash only (credit stopped)' : 'Cash before release'],
                  ['To pay now', <Money key="d" amount={due} currency="USD" strong />],
                ]} />
              </Panel>
              <Panel title="Something wrong on an invoice?">
                <p className="small muted">Tell us which line and why. Billing replies within 2 working days. Do not pay the disputed line until we answer.</p>
                <Button icon={<MessageSquarePlus />} perm="portal.request.submit" onClick={() => setReq({ open: true, kind: 'INVOICE_QUERY' })}>Ask about an invoice</Button>
              </Panel>
            </div>
          </div>
        )}

        {tab === 'trucks' && (
          <Panel flush title="Truck bookings" sub="Trucks with a booking use the fast lane at the outer gate. Arrive within 30 minutes of the slot start."
            actions={<Button size="sm" variant="primary" icon={<CalendarPlus />} perm="appointment.book" onClick={() => setBook({ open: true })}>Book a truck</Button>}>
            <DataTable rows={appts} rowKey={(a) => a.appointmentId!} empty={<Empty title="No bookings">Book a slot when your cargo is ready to collect.</Empty>} cols={[
              { key: 'no', header: 'Booking', render: (a) => <strong className="small">{a.appointmentNo}</strong> },
              { key: 'when', header: 'Slot', render: (a) => <span className="small nowrap">{fmtD(a.slotStart)} {fmtT(a.slotStart)}–{fmtT(a.slotEnd)}</span> },
              { key: 'type', header: 'For', render: (a) => <span className="small">{VISIT_TYPES[a.visitTypeCode]}{a.releaseNo ? <div className="xs faint">{a.releaseNo}</div> : null}</span> },
              { key: 'truck', header: 'Truck and driver', render: (a) => <span className="small"><span className="unitno unitno-sm">{a.plate}</span> {a.driver}</span> },
              { key: 'st', header: 'Status', render: (a) => <Pill tone={a.status === 'BOOKED' ? 'go' : a.status === 'MISSED' ? 'stop' : a.status === 'ARRIVED' ? 'wait' : 'idle'}>{{ BOOKED: 'Booked', ARRIVED: 'Truck arrived', COMPLETED: 'Done', MISSED: 'Missed', CANCELLED: 'Cancelled' }[a.status!]}</Pill> },
              { key: 'x', header: '', render: (a) => a.status === 'BOOKED' ? <Button size="sm" variant="ghost" perm="appointment.book" onClick={() => { setAppts((x) => x.map((y) => y.appointmentId === a.appointmentId ? { ...y, status: 'CANCELLED' } : y)); toast('Booking cancelled'); }}>Cancel booking</Button> : null },
            ]} />
          </Panel>
        )}

        {tab === 'requests' && (
          <Panel flush title="My requests" actions={<Button size="sm" variant="primary" icon={<MessageSquarePlus />} perm="portal.request.submit" onClick={() => setReq({ open: true })}>Request a service</Button>}>
            <DataTable rows={reqs} rowKey={(r) => r.serviceRequestId!} empty={<Empty title="No requests yet">Ask for a delivery, send a document or query an invoice.</Empty>} cols={[
              { key: 'no', header: 'Request', render: (r) => <span><strong className="small">{r.subject}</strong><div className="xs faint">{r.requestNo} · {SR_KINDS[r.requestKind].label}</div></span> },
              { key: 'at', header: 'Sent', render: (r) => <span className="small nowrap">{fmtDT(r.createdAt)}</span> },
              { key: 'st', header: 'Status', render: (r) => <ReqStatus r={r} /> },
              { key: 'last', header: 'Latest reply', render: (r) => { const m = [...r.messages].reverse().find((x) => x.from === 'staff'); return <span className="small">{m ? m.text : <span className="faint">No reply yet · we answer within {SR_KINDS[r.requestKind].slaHours} h</span>}</span>; } },
            ]} />
          </Panel>
        )}

        {tab === 'documents' && (
          <Panel flush title="Documents" sub="Copies of what we issued to you. Originals stay valid; these are for your records.">
            <DataTable rows={portalDocs} rowKey={(d) => d.documentId!} cols={[
              { key: 't', header: 'Document', render: (d) => <span className="row"><FileText size={16} aria-hidden /><span><strong className="small">{d.title}</strong><div className="xs faint">{d.ref}</div></span></span> },
              { key: 'd', header: 'Date', render: (d) => <span className="small nowrap">{fmtD(d.capturedAt)}</span> },
              { key: 's', header: 'Size', num: true, render: (d) => `${Math.round((d.sizeBytes ?? 0) / 1000).toLocaleString()} KB` },
              { key: 'a', header: '', render: (d) => d.status === 'PENDING_APPROVAL' ? <span className="xs muted">Ready once approved</span> : <Button size="sm" icon={<Download />} perm="consignment.view" onClick={() => toast(`Downloading ${d.ref}.pdf`)}>Download</Button> },
            ]} />
          </Panel>
        )}
      </div>

      <UnitDrawer s={unit} onClose={() => setUnit(null)} onNext={openNext} />
      <PayDrawer inv={pay} onClose={() => setPay(null)} onPaid={(i) => { setPaid((p) => ({ ...p, [i.invoiceId!]: 'PENDING' })); setPay(null); }} />
      <BookDrawer open={book.open} unit={book.unit} units={units.filter((s) => plain.get(s.unitStayId!)?.key === 'ready')} onClose={() => setBook({ open: false })}
        onBooked={(a) => { setAppts((x) => [a, ...x]); setBook({ open: false }); setTab('trucks'); }} />
      <RequestDrawer open={req.open} kind={req.kind} unit={req.unit} units={units} partyId={partyId} onClose={() => setReq({ open: false })}
        onSent={(r) => { setMyReqs((x) => [r, ...x]); setReq({ open: false }); setTab('requests'); }} />
    </Page>
  );
}

function FreeTime({ s }: { s: Stay }) {
  if (!s.freeUntil) return <span className="faint small">—</span>;
  const left = Math.ceil((Date.parse(s.freeUntil) - Date.parse('2026-10-07T07:30:00Z')) / 86400000);
  return <span className="small nowrap">{left >= 0 ? `${left} day${left === 1 ? '' : 's'} left` : <span style={{ color: 'var(--wait)' }}>{-left} day{left === -1 ? '' : 's'} of storage</span>}<div className="xs faint">until {fmtD(s.freeUntil)}</div></span>;
}

function ReqStatus({ r }: { r: SR }) {
  const map: Record<string, [string, 'go' | 'wait' | 'stop' | 'idle' | 'info']> = {
    SUBMITTED: ['Sent', 'info'], IN_REVIEW: ['Being handled', 'wait'], NEEDS_INFO: ['We need more from you', 'stop'], APPROVED: ['Done', 'go'], REJECTED: ['Declined', 'idle'], CLOSED: ['Closed', 'idle'],
  };
  const [l, t] = map[r.status!];
  return <Pill tone={t}>{l}</Pill>;
}

function UnitDrawer({ s, onClose, onNext }: { s: Stay | null; onClose: () => void; onNext: (w: Why, s: Stay) => void }) {
  if (!s) return null;
  const p = plainStatus(s);
  const why = whyCantCollect(s);
  const blockers = why.filter((w) => w.ok === false);
  const items: Cond[] = why.map((w) => ({ code: w.code, name: w.title, result: w.ok === null ? 'NOT_APPLIC' : w.ok ? 'PASS' : 'FAIL', detail: w.detail }));
  const label = { pay: 'Pay charges', extend: 'Ask for more free days', request: s.customsStatus === 'NOT_LODGED' ? 'Send customs entry' : 'Request delivery', book: 'Book a truck', contact: 'Ask us about this hold' } as const;
  const actions = Array.from(new Set(why.filter((w) => w.next && (w.ok === false || (w.next === 'book' && blockers.length === 0))).map((w) => w.next!)));
  if (blockers.some((b) => b.code === 'COMMERCIAL') && (s.unitSummary.dwellDays ?? 0) > 7) actions.push('extend');
  return (
    <Drawer open onClose={onClose} title={<UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} size="md" />}>
      <div className="stack-lg">
        <div>
          <Pill tone={p.tone}>{p.label}</Pill>
          <p className="small muted" style={{ margin: '6px 0 0' }}>{s.unitSummary.consignmentRef} · {s.cargoDescription}</p>
        </div>
        {blockers.length === 0 ? (
          <Banner tone="go" title="You can collect this unit">Book a truck slot and bring the delivery order. The driver and truck must match the booking.</Banner>
        ) : (
          <Banner tone={blockers.some((b) => b.code === 'NO_HOLD') ? 'stop' : 'wait'} title={`Why can't I collect? ${blockers.length} thing${blockers.length === 1 ? '' : 's'} to sort out`}>
            Work through the items marked with a cross. We check again automatically as each one changes.
          </Banner>
        )}
        <Conditions items={items} />
        {actions.length > 0 && (
          <div className="stack">
            <h3>What you can do now</h3>
            {actions.map((a) => {
              const w = why.find((x) => x.next === a) ?? { code: 'X', ok: false, title: '', detail: '', next: a };
              return <Button key={a} size="xl" variant={a === actions[0] ? 'primary' : 'secondary'} perm={a === 'book' ? 'appointment.book' : 'portal.request.submit'} onClick={() => onNext({ ...w, next: a }, s)}>{label[a]}</Button>;
            })}
          </div>
        )}
        <DL items={[['Free time until', fmtD(s.freeUntil)], ['Charges so far', <Money key="m" amount={s.accruedCharges?.total} currency="USD" />], ['Arrived', fmtDT(s.gatedInAt)]]} />
        <p className="xs faint" style={{ margin: 0 }}>Questions? Call customer service on +255 22 200 0000 or reply in “My requests”.</p>
      </div>
    </Drawer>
  );
}

function PayDrawer({ inv, onClose, onPaid }: { inv: Inv | null; onClose: () => void; onPaid: (i: Inv) => void }) {
  const toast = useToast();
  const [method, setMethod] = useState<'MPESA' | 'TIGO' | 'AIRTEL' | 'BANK'>('MPESA');
  const [phone, setPhone] = useState('+255 7');
  if (!inv) return null;
  const mobile = method !== 'BANK';
  const phoneOk = /^\+255\s?[67]\d{2}\s?\d{3}\s?\d{3}$/.test(phone.trim());
  const tzs = Math.round(Number(inv.balance) * 2655);
  return (
    <Drawer open onClose={onClose} title={`Pay ${inv.invoiceNo}`}
      footer={mobile ? <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Smartphone />} disabled={!phoneOk} perm="portal.request.submit" onClick={() => { toast(`Payment request sent to ${phone}`); onPaid(inv); }}>Send payment request</Button></>
        : <><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" icon={<Landmark />} perm="portal.request.submit" onClick={() => { toast('Transfer noted · we confirm when the bank credits us'); onPaid(inv); }}>I have paid by bank</Button></>}>
      <div className="stack-lg">
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span className="spacer small muted">Amount to pay</span>
          <span className="big-ref"><Money amount={inv.balance} currency={inv.currency} /></span>
        </div>
        <Field label="Pay with">
          <Segmented label="Payment method" value={method} onChange={setMethod} options={[{ id: 'MPESA', label: 'M-Pesa' }, { id: 'TIGO', label: 'Tigo Pesa' }, { id: 'AIRTEL', label: 'Airtel Money' }, { id: 'BANK', label: 'Bank' }]} />
        </Field>
        {mobile ? (
          <>
            <Field label="Phone number to pay from" required hint="You get a prompt on this phone. Enter your PIN to confirm." error={phone.length > 6 && !phoneOk ? 'Use a Tanzanian mobile number, e.g. +255 754 123 456' : undefined}>
              <Input xl inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <div className="pay-box small">
              <div className="strong">No prompt? Pay from the menu instead</div>
              <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>Choose “Pay by business number” (Lipa kwa namba ya biashara).</li>
                <li>Business number <strong>555 222</strong>.</li>
                <li>Account (kumbukumbu) <span className="big-ref">{inv.invoiceNo}</span></li>
                <li>Amount TZS {tzs.toLocaleString()} (today’s rate 2,655).</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="stack">
            {[['CRDB Bank', 'NG ICD Ltd · USD account', '0250 2741 990 00'], ['NMB Bank', 'NG ICD Ltd · TZS account', '2041 0033 718']].map(([b, n, a]) => (
              <div key={b} className="pay-box small"><div className="strong">{b}</div><div>{n}</div><div className="big-ref">{a}</div></div>
            ))}
            <Banner tone="wait" title={`Use ${inv.invoiceNo} as the payment reference`}>Without it we cannot match your transfer and the release waits.</Banner>
          </div>
        )}
        <p className="xs faint" style={{ margin: 0 }}>When payment is confirmed you get an SMS and a TRA fiscal receipt, and the delivery order is issued if customs has released the cargo.</p>
      </div>
    </Drawer>
  );
}

function BookDrawer({ open, unit, units, onClose, onBooked }: { open: boolean; unit?: Stay; units: Stay[]; onClose: () => void; onBooked: (a: Appt) => void }) {
  const toast = useToast();
  const [date, setDate] = useState(day(1));
  const [slot, setSlot] = useState<string | null>(null);
  const [pick, setPick] = useState<string>('');
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  if (!open) return null;
  const chosen = pick || (unit ? String(unit.unitStayId) : units[0] ? String(units[0].unitStayId) : '');
  const slots = slotsFor(date);
  const s = slots.find((x) => x.slotStart === slot);
  const ok = !!s && !!chosen && plate.trim().length >= 6 && driver.trim().length > 2;
  return (
    <Drawer open onClose={onClose} title="Book a truck"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={<CalendarClock />} disabled={!ok} perm="appointment.book" onClick={() => {
        const u = units.find((x) => String(x.unitStayId) === chosen);
        const a: Appt = { appointmentId: 4200 + plate.length, appointmentNo: `APT-26-0${4130 + plate.length}`, visitTypeCode: u?.cargoUnit.category === 'VEHICLE' ? 'VEHICLE_DELIVERY' : 'IMPORT_PICKUP', slotStart: s!.slotStart, slotEnd: s!.slotEnd, transporterPartyId: 7, status: 'BOOKED', bookedVia: 'PORTAL', plate: plate.toUpperCase(), driver, unitNos: u ? [u.cargoUnit.unitNo] : [] };
        toast(`Truck booked for ${fmtD(s!.slotStart)} ${fmtT(s!.slotStart)}`); onBooked(a);
      }}>Book truck</Button></>}>
      <div className="stack-lg">
        {units.length === 0 ? <Banner tone="wait" title="Nothing is ready to collect yet">You can book once a unit shows “Ready to collect”.</Banner> : (
          <Field label="Unit to collect" required>
            <Select value={chosen} onChange={(e) => setPick(e.target.value)} options={units.map((u) => [String(u.unitStayId), `${u.cargoUnit.unitNo} · ${u.unitSummary.consignmentRef}`])} />
          </Field>
        )}
        <Field label="Day">
          <Segmented label="Day" value={date} onChange={(d) => { setDate(d); setSlot(null); }} options={[1, 2, 3].map((n) => ({ id: day(n), label: fmtD(day(n)).slice(0, 6) }))} />
        </Field>
        <Field label="Time slot" hint="Full slots cannot be booked. Lunch hour has fewer places.">
          <div className="slots">
            {slots.map((x) => (
              <button key={x.slotStart} type="button" className="slot" aria-pressed={slot === x.slotStart} disabled={x.available === 0} onClick={() => setSlot(x.slotStart)}>
                <div className="strong">{fmtT(x.slotStart)}</div>
                <div className="xs muted">{x.available === 0 ? 'Full' : `${x.available} of ${x.capacity} free`}</div>
              </button>
            ))}
          </div>
        </Field>
        <div className="form-grid">
          <Field label="Truck plate" required><Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="T 123 ABC" /></Field>
          <Field label="Driver name" required hint="Must match the driving licence at the gate"><Input value={driver} onChange={(e) => setDriver(e.target.value)} /></Field>
        </div>
      </div>
    </Drawer>
  );
}

const KINDS: [ReqKind, string, string][] = [
  ['DELIVERY', 'Delivery', 'Ask us to release and load a unit for your truck'],
  ['DOCUMENT_SUBMISSION', 'Send a document', 'Customs entry, release, delivery order from the line'],
  ['FREE_DAY_EXTENSION', 'More free days', 'When the delay was not caused by you'],
  ['INVOICE_QUERY', 'Invoice query', 'A charge you think is wrong'],
  ['DAMAGE_CLAIM', 'Damage claim', 'Damage you found after collection'],
];
function RequestDrawer({ open, kind, unit, units, partyId, onClose, onSent }: { open: boolean; kind?: ReqKind; unit?: Stay; units: Stay[]; partyId: number; onClose: () => void; onSent: (r: SR) => void }) {
  const toast = useToast();
  const [k, setK] = useState<ReqKind | null>(null);
  const [u, setU] = useState('');
  const [days, setDays] = useState('3');
  const [inv, setInv] = useState('');
  const [text, setText] = useState('');
  if (!open) return null;
  const cur = k ?? kind ?? 'DELIVERY';
  const uid = u || (unit ? String(unit.unitStayId) : '');
  const st = units.find((x) => String(x.unitStayId) === uid);
  const ok = text.trim().length >= 10 && (cur === 'INVOICE_QUERY' ? !!inv : !!uid);
  const close = () => { setK(null); setU(''); setText(''); setInv(''); onClose(); };
  const invs = invoicesOf(partyId);
  return (
    <Drawer open onClose={close} title="Request a service"
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" icon={<MessageSquarePlus />} disabled={!ok} perm="portal.request.submit" onClick={() => {
        const sr: SR = {
          serviceRequestId: 7120, requestNo: 'SR-26-07120', requestKind: cur, partyId, partyName: partyOf(partyId)?.partyName ?? '', unitStayId: st?.unitStayId, unitNo: st?.cargoUnit.unitNo, consignmentId: st?.consignmentId,
          subject: `${KINDS.find((x) => x[0] === cur)![1]}${st ? ` · ${st.cargoUnit.unitNo}` : inv ? ` · ${inv}` : ''}`, details: text, status: 'SUBMITTED', createdAt: '2026-10-07T07:30:00Z',
          slaDueAt: new Date(Date.parse('2026-10-07T07:30:00Z') + SR_KINDS[cur].slaHours * 3600_000).toISOString(), payload: cur === 'FREE_DAY_EXTENSION' ? { days: Number(days) } : cur === 'INVOICE_QUERY' ? { invoiceNo: inv } : null,
          messages: [{ from: 'customer', who: 'You', at: '2026-10-07T07:30:00Z', text }],
        };
        toast(`Request sent · ${sr.requestNo}`); setK(null); setU(''); setText(''); onSent(sr);
      }}>Send request</Button></>}>
      <div className="stack-lg">
        <Field label="What do you need?">
          <div className="stack" style={{ gap: 6 }} role="radiogroup">
            {KINDS.map(([id, l, hint]) => (
              <label key={id} className="check" style={{ alignItems: 'flex-start' }}>
                <input type="radio" name="kind" checked={cur === id} onChange={() => setK(id)} />
                <span><span className="strong">{l}</span><span className="xs muted" style={{ display: 'block' }}>{hint} · answer within {SR_KINDS[id].slaHours} h</span></span>
              </label>
            ))}
          </div>
        </Field>
        {cur === 'INVOICE_QUERY' ? (
          <Field label="Invoice" required><Select value={inv} onChange={(e) => setInv(e.target.value)} options={[['', 'Choose an invoice'], ...invs.map((i) => [i.invoiceNo!, `${i.invoiceNo} · USD ${Number(i.total).toLocaleString()}`] as [string, string])]} /></Field>
        ) : (
          <Field label="Unit" required>
            <Select value={uid} onChange={(e) => setU(e.target.value)} options={[['', 'Choose a unit'], ...units.slice(0, 80).map((x) => [String(x.unitStayId), `${x.cargoUnit.unitNo} · ${x.unitSummary.consignmentRef}`] as [string, string])]} />
          </Field>
        )}
        {cur === 'FREE_DAY_EXTENSION' && <Field label="Extra days asked for" hint="Approval needed; we reply with the decision and any new charges"><Select value={days} onChange={(e) => setDays(e.target.value)} options={['1', '2', '3', '5', '7']} /></Field>}
        <Field label="Details" required hint={cur === 'DAMAGE_CLAIM' ? 'Say where the damage is and when you found it. Attach photos.' : 'At least 10 characters'}>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="Attachments" hint="PDF or photo, up to 10 MB each"><Button icon={<FileText />}>Attach file</Button></Field>
      </div>
    </Drawer>
  );
}
