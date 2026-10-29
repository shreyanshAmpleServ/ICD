import { useMemo, useState } from 'react';
import { LockKeyhole, Printer } from 'lucide-react';
import {
  Button, CommonTable, Empty, Money, MoneyCell, Page, PageHeader, Panel, PartyCell, Pill, ReferenceCell, StatusCell, Tabs,
  fmtDT, fmtT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { partyName } from '@/mock/core';
import {
  ME, TODAY, channel, dShort, eatDate, m2, num,
  type Payment, type Shift,
} from '@/mock/money';
import { cashierApi } from './api';
import { DiffBadge } from './components/DiffBadge';
import { OpenShiftPanel } from './components/OpenShiftPanel';
import { CloseShiftDrawer } from './components/CloseShiftDrawer';
import { ReceiptModal } from './components/ReceiptModal';
import { TakePaymentForm } from './components/TakePaymentForm';

export { cashierApi } from './api';

type TabId = 'take' | 'today' | 'approve';

export function CashierView() {
  const { can } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('take');

  const { data: dbShifts } = useQ(['cashier-shifts'], () => cashierApi.getShifts());
  const { data: dbPayments } = useQ(['payments'], () => cashierApi.getPayments());

  const allShifts = (dbShifts && dbShifts.length > 0 ? dbShifts : []) as Shift[];
  const allPayments = (dbPayments && dbPayments.length > 0 ? dbPayments : []) as Payment[];

  const [mine, setMine] = useState<Shift[]>(allShifts.filter((s) => s.cashier === ME && s.status === 'OPEN'));
  const [others, setOthers] = useState<Shift[]>(allShifts.filter((s) => s.cashier !== ME));
  const [list, setList] = useState<Payment[]>(
    allPayments
      .filter((p) => eatDate(p.receivedAt!) === TODAY)
      .sort((a, b) => (b.receivedAt || '').localeCompare(a.receivedAt || ''))
  );
  const [search, setSearch] = useState('');
  const [closing, setClosing] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const shiftOpen = mine.some((s) => s.status === 'OPEN');
  const waiting = others.filter((s) => s.status === 'CLOSED');

  const filteredPayments = useMemo(() => {
    if (!search) return list;
    const q = search.toUpperCase();
    return list.filter(
      (p) =>
        p.receiptNo?.toUpperCase().includes(q) ||
        partyName(p.partyId).toUpperCase().includes(q) ||
        p.payerName?.toUpperCase().includes(q) ||
        p.externalRef?.toUpperCase().includes(q)
    );
  }, [list, search]);

  return (
    <Page>
      <PageHeader
        title="Cashier"
        ms="M3"
        sub={`Counter 1 · ${ME} · ${dShort(TODAY)}`}
        actions={
          list[0] && (
            <Button icon={<Printer />} perm="payment.record" onClick={() => setReceipt(list[0])}>
              Reprint last receipt
            </Button>
          )
        }
      />
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Tabs<TabId>
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'take', label: 'Take payment' },
              { id: 'today', label: "Today's payments", count: list.length },
              {
                id: 'approve',
                label: 'Shift approvals',
                count: waiting.length,
                hidden: !can('payment.cashup.approve', 'APPR'),
              },
            ]}
          />
          {tab === 'take' &&
            (shiftOpen ? (
              <TakePaymentForm
                onRecorded={(p) => {
                  setList((l) => [p, ...l]);
                  if (p.channelCode.startsWith('CASH'))
                    setMine((m) =>
                      m.map((s) =>
                        s.currency === p.currency
                          ? {
                              ...s,
                              expectedCash: m2(num(s.expectedCash) + num(p.amount)),
                              receiptsCount: s.receiptsCount + 1,
                            }
                          : s
                      )
                    );
                  setReceipt(p);
                  toast(`Payment recorded · ${p.receiptNo}`);
                }}
              />
            ) : (
              <Panel>
                <Empty title="Open your shift to take payments">
                  Count your float and open the shift in the panel on the right. One shift per currency.
                </Empty>
              </Panel>
            ))}
          {tab === 'today' && (
            <CommonTable
              rows={filteredPayments}
              rowKey={(p: Payment) => p.paymentId}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Filter receipts by receipt #, customer, ref..."
              itemLabel="payments"
              emptyTitle="No payments yet today"
              cols={[
                {
                  key: 'rct',
                  header: 'Receipt',
                  render: (p: Payment) => (
                    <ReferenceCell
                      refNo={p.receiptNo}
                      sub={`${fmtT(p.receivedAt)} · ${p.cashier?.split(' ')[0] ?? 'Cashier'}`}
                    />
                  ),
                },
                {
                  key: 'party',
                  header: 'Customer',
                  render: (p: Payment) => <PartyCell name={partyName(p.partyId)} sub={p.payerName} />,
                },
                {
                  key: 'ch',
                  header: 'Channel',
                  render: (p: Payment) => (
                    <span className="small">
                      {channel(p.channelCode)?.channelName || p.channelCode}
                      {p.externalRef && <div className="xs faint">{p.externalRef}</div>}
                    </span>
                  ),
                },
                {
                  key: 'amt',
                  header: 'Amount',
                  num: true,
                  render: (p: Payment) => <MoneyCell amount={p.amount} currency={p.currency} strong />,
                },
                {
                  key: 'un',
                  header: 'On account',
                  num: true,
                  render: (p: Payment) =>
                    num(p.unallocated) > 0 ? (
                      <MoneyCell amount={p.unallocated} currency={p.currency} />
                    ) : (
                      <span className="xs faint">—</span>
                    ),
                },
                {
                  key: 'st',
                  header: 'Status',
                  render: (p: Payment) => <StatusCell value={p.status} track="billing" />,
                },
                {
                  key: 'pr',
                  header: '',
                  render: (p: Payment) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Printer />}
                      aria-label={`Print ${p.receiptNo}`}
                      perm="payment.record"
                      onClick={() => setReceipt(p)}
                    />
                  ),
                },
              ]}
            />
          )}
          {tab === 'approve' && (
            <CommonTable
              rows={waiting}
              rowKey={(s: Shift) => s.cashierShiftId}
              itemLabel="cash-ups waiting"
              emptyTitle="No cash-ups waiting"
              emptySubtitle="Closed shifts appear here for approval."
              cols={[
                {
                  key: 'who',
                  header: 'Cashier',
                  render: (s: Shift) => (
                    <PartyCell name={s.cashier} sub={`${fmtDT(s.openedAt)} – ${fmtT(s.closedAt)}`} />
                  ),
                },
                { key: 'cur', header: 'Currency', render: (s: Shift) => s.currency },
                {
                  key: 'exp',
                  header: 'Expected',
                  num: true,
                  render: (s: Shift) => <MoneyCell amount={s.expectedCash} currency={s.currency} />,
                },
                {
                  key: 'cnt',
                  header: 'Counted',
                  num: true,
                  render: (s: Shift) => <MoneyCell amount={s.countedCash} currency={s.currency} />,
                },
                {
                  key: 'diff',
                  header: 'Difference',
                  num: true,
                  render: (s: Shift) => <DiffBadge v={num(s.difference)} cur={s.currency} />,
                },
                { key: 'note', header: 'Note', render: (s: Shift) => <span className="xs">{s.note}</span> },
                {
                  key: 'act',
                  header: '',
                  render: (s: Shift) => (
                    <span className="row" style={{ gap: 6 }}>
                      <Button
                        size="sm"
                        perm="payment.cashup.approve"
                        level="APPR"
                        onClick={() => {
                          setOthers((o) => o.map((x) => (x === s ? { ...x, status: 'OPEN' } : x)));
                          toast('Sent back for recount');
                        }}
                      >
                        Send back
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        perm="payment.cashup.approve"
                        level="APPR"
                        onClick={() => {
                          setOthers((o) => o.map((x) => (x === s ? { ...x, status: 'APPROVED', approvedBy: ME } : x)));
                          toast('Cash-up approved');
                        }}
                      >
                        Approve
                      </Button>
                    </span>
                  ),
                },
              ]}
            />
          )}
        </div>

        <div className="stack-lg">
          <Panel
            title="My shift"
            actions={
              shiftOpen ? (
                <Pill tone="go">Open</Pill>
              ) : mine.length ? (
                <Pill tone="wait">Closed, awaiting approval</Pill>
              ) : (
                <Pill>Not open</Pill>
              )
            }
          >
            {mine.length ? (
              <div className="stack">
                <span className="xs muted">Opened {fmtDT(mine[0].openedAt)}</span>
                {mine.map((s) => (
                  <div
                    key={s.currency}
                    className="stack"
                    style={{ gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--steel-2)' }}
                  >
                    <div className="row">
                      <span className="strong spacer">{s.currency} cash drawer</span>
                      <span className="xs muted">{s.receiptsCount} receipts</span>
                    </div>
                    <div className="row small">
                      <span className="muted spacer">Opening float</span>
                      <Money amount={s.openingFloat} />
                    </div>
                    <div className="row small">
                      <span className="muted spacer">Cash taken</span>
                      <Money amount={num(s.expectedCash) - num(s.openingFloat)} />
                    </div>
                    <div className="row">
                      <span className="spacer strong small">Expected in drawer</span>
                      <Money amount={s.expectedCash} currency={s.currency} strong />
                    </div>
                    {num(s.nonCash) > 0 && (
                      <div className="row xs">
                        <span className="muted spacer">Bank and mobile (not in drawer)</span>
                        <Money amount={s.nonCash} />
                      </div>
                    )}
                    {s.difference && (
                      <div className="row small">
                        <span className="muted spacer">Counted</span>
                        <Money amount={s.countedCash} /> <DiffBadge v={num(s.difference)} cur={s.currency} />
                      </div>
                    )}
                  </div>
                ))}
                {shiftOpen && (
                  <Button icon={<LockKeyhole />} perm="payment.record" onClick={() => setClosing(true)}>
                    Close shift
                  </Button>
                )}
              </div>
            ) : (
              <OpenShiftPanel
                onOpen={(f) => {
                  setMine(f);
                  toast('Shift opened');
                }}
              />
            )}
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

      <CloseShiftDrawer
        open={closing}
        onClose={() => setClosing(false)}
        shifts={mine}
        onDone={(counted, note) => {
          setMine((m) =>
            m.map((s) => ({
              ...s,
              status: 'CLOSED',
              countedCash: m2(counted[s.currency]),
              difference: m2(counted[s.currency] - num(s.expectedCash)),
              note,
              closedAt: s.openedAt,
            }))
          );
          toast('Shift closed');
        }}
      />
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </Page>
  );
}

export { CashierView as Cashier };
export default CashierView;
