import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, CalendarClock, CircleX, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import type { S } from '@/api/types';
import {
  Banner, Button, Conditions, DL, DataTable, Drawer, Empty, Field, Input, MiniTracks, Modal, Money, Page, PageHeader, Panel, Pill, Segmented,
  StatusPill, Textarea, Timeline, UnitNo, fmtD, fmtDT, fmtT, useToast, type Cond, type TLItem,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { consignment, partyName } from '@/mock/core';
import { at, day } from '@/mock/gen';
import { RO_KIND, allApprovals, checksFor, hoursUntil, raiseApproval, releaseOrder, type RO } from '@/mock/cargo';
import { Countdown, Evidence, QrCode } from './shared';

/* GET /release-orders/{id}, :evaluate, :approve, :revalidate, :cancel.
   The eight conditions are checked per unit. Only the commercial condition
   can be overridden, and only through a second person (maker-checker). */
const LIVE: RO['status'][] = ['APPROVED', 'PARTLY_USED'];

/** Adjust the engine's raw checks to what this order's state means. */
function adjust(c: S<'ReleaseCheck'>, r: RO, overridden: boolean): Cond {
  let { result, detail } = c;
  if (c.conditionCode === 'RELEASE_VALID') {
    if (LIVE.includes(r.status)) { const ok = hoursUntil(r.validTo) > 0; result = ok ? 'PASS' : 'FAIL'; detail = ok ? `Valid to ${fmtDT(r.validTo)}` : 'Expired: pay storage to the new date, then revalidate'; }
    else if (r.status === 'EXPIRED') { result = 'FAIL'; detail = `Expired ${fmtDT(r.validTo)}: revalidate after payment`; }
    else { result = 'NOT_APPLIC'; detail = 'Set when the order is approved'; }
  }
  if (c.conditionCode === 'COMMERCIAL' && result === 'FAIL' && overridden) { result = 'OVERRIDDEN'; detail = `${detail} · override approved`; }
  return { code: c.conditionCode, name: c.conditionName, result, detail };
}

export function ReleaseDetail() {
  const { releaseOrderId } = useParams();
  const toast = useToast();
  const { can } = useSession();
  const { data: seed } = useQ(['release-order', releaseOrderId], () => delay(releaseOrder(Number(releaseOrderId))));
  const [patch, setPatch] = useState<Partial<RO>>({});
  const [evaluatedAt, setEvaluatedAt] = useState(at(0.2));
  const [approveOpen, setApproveOpen] = useState(false);
  const [revalOpen, setRevalOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [overrideReq, setOverrideReq] = useState<string | null>(null);

  if (!seed) return <Page><Empty title="Loading release order" action={<Link to="/releases">Back to release orders</Link>} /></Page>;
  const r: RO = { ...seed, ...patch };
  const cons = consignment(r.consignmentId);
  const pendingOverride = overrideReq ?? allApprovals.find((a) => a.entityName === 'release_order' && a.entityId === r.releaseOrderId && a.status === 'PENDING')?.requestNo ?? null;
  const per = checksFor(r).map((x) => ({ ...x, conds: x.checks.map((c) => adjust(c, r, false)) }));
  const failing = per.flatMap((x) => x.conds.filter((c) => c.result === 'FAIL').map((c) => ({ unit: x.unit.unitNo, c })));
  const blockingApproval = failing.filter((f) => f.c.code !== 'RELEASE_VALID');
  const notOverridable = blockingApproval.filter((f) => f.c.code !== 'COMMERCIAL');
  const unitsOk = per.filter((x) => !x.conds.some((c) => c.result === 'FAIL')).length;
  const live = LIVE.includes(r.status);
  const waiting = r.status === 'REQUESTED' || r.status === 'PENDING_CHECKS';
  const amount = r.amountDue ?? { currency: 'USD', amount: '0.00', taxAmount: '0.00', total: per.reduce((n, x) => n + (x.stay && !['PAID', 'CREDIT'].includes(x.stay.billingStatus ?? '') ? Number(x.stay.accruedCharges?.total ?? 0) : 0), 0).toFixed(2) };

  const history: TLItem[] = [...(r.validityHistory ?? [])].reverse().map((v) => ({
    at: v.changedAt, title: v.changeKind === 'INITIAL' ? `Issued, valid to ${fmtDT(v.newValidTo)}` : `${v.changeKind === 'REVALIDATED' ? 'Revalidated' : v.changeKind.toLowerCase()} to ${fmtDT(v.newValidTo)}`,
    detail: v.reason ?? (v.oldValidTo ? `Was ${fmtDT(v.oldValidTo)}` : 'Valid to the date storage is paid through'), tone: v.changeKind === 'INITIAL' ? 'go' : 'wait',
  }));

  return (
    <Page>
      <PageHeader crumbs={[['Release orders', '/releases'], [r.releaseNo ?? '']]} title={r.releaseNo} ms="M2"
        sub={<span className="row-wrap" style={{ marginTop: 6 }}><StatusPill value={r.status} /><Pill tone="info">{RO_KIND[r.releaseKind]}</Pill>
          {cons && <Link className="small" to={`/consignments/${cons.consignmentId}`}>{cons.refNo}</Link>}<span className="small muted">{partyName(cons?.consigneePartyId)}</span></span>}
        actions={<>
          <Button icon={<RefreshCw />} perm="consignment.view" onClick={() => { setEvaluatedAt(at(0)); toast(`Conditions checked: ${unitsOk} of ${per.length} units pass`); }}>Evaluate</Button>
          {waiting && <Button variant="primary" icon={<BadgeCheck />} perm="release.issue" onClick={() => setApproveOpen(true)}>Approve</Button>}
          {(live || r.status === 'EXPIRED') && <Button variant={r.status === 'EXPIRED' ? 'primary' : 'secondary'} icon={<CalendarClock />} perm="release.issue" onClick={() => setRevalOpen(true)}>Revalidate</Button>}
          {live && <Button icon={<Printer />} perm="gate.pass.print" onClick={() => toast('Release order sent to printer')}>Print</Button>}
          {(waiting || live || r.status === 'EXPIRED') && <Button variant="danger" icon={<CircleX />} perm="release.issue" onClick={() => setCancelOpen(true)}>Cancel order</Button>}
        </>} />

      <div className="stack-lg">
        {pendingOverride && waiting && <Banner tone="wait" title={`Waiting for override approval ${pendingOverride}`} action={<Link to="/approvals" className="btn btn-sm">Open approvals</Link>}>A second person with release exception rights must approve. The order is issued automatically when they do.</Banner>}
        {!pendingOverride && waiting && (blockingApproval.length
          ? <Banner tone={notOverridable.length ? 'stop' : 'wait'} title={`${new Set(blockingApproval.map((f) => f.unit)).size} of ${per.length} units fail a condition`}>{[...new Set(blockingApproval.map((f) => f.c.name))].join(', ')}. {notOverridable.length ? 'Clear these before approving.' : 'Only charges are missing: collect payment, or ask for an override.'}</Banner>
          : <Banner tone="go" title="All units pass. Ready to approve">Approving issues the QR and sets validity to the date storage is paid through.</Banner>)}
        {r.status === 'EXPIRED' && <Banner tone="stop" title={`Expired ${fmtDT(r.validTo)}`} action={<Button size="sm" perm="release.issue" onClick={() => setRevalOpen(true)}>Revalidate</Button>}>Storage was paid through that time. Collect payment for the extra days and revalidate; the gate refuses this QR until then.</Banner>}
        {live && <Banner tone="go" title={`Valid to ${fmtDT(r.validTo)}`}>{r.unitsOut ?? 0} of {r.unitsTotal} units out. <Countdown hours={hoursUntil(r.validTo)} label="Ends in" /></Banner>}
        {r.status === 'CANCELLED' && <Banner title="Cancelled">This order can no longer be used at the gate.</Banner>}

        <div className="grid-main-side">
          <div className="stack-lg">
            <Panel title="Release conditions" sub={`Checked per unit at approval stage · ${fmtT(evaluatedAt)} today`}>
              <div className="stack-lg">
                {per.length === 0 && <Empty title="No units on this order">Add units before approving.</Empty>}
                {per.map((x) => {
                  const f = x.conds.filter((c) => c.result === 'FAIL').length;
                  return (
                    <div key={x.unit.unitStayId} className="stack" style={{ gap: 8 }}>
                      <div className="row-wrap">
                        <UnitNo no={x.unit.unitNo} category={x.stay?.cargoUnit.category} to={`/units/${x.unit.unitStayId}`} />
                        {x.stay && <MiniTracks s={x.stay} />}
                        <span className="spacer" />
                        {f ? <Pill tone="stop">{f} not met</Pill> : <Pill tone="go">All met</Pill>}
                      </div>
                      <Conditions items={x.conds} />
                    </div>
                  );
                })}
              </div>
            </Panel>
            <Panel flush title="Units">
              <DataTable rows={r.units ?? []} rowKey={(u) => u.unitStayId} cols={[
                { key: 'u', header: 'Unit', render: (u) => <UnitNo no={u.unitNo} to={`/units/${u.unitStayId}`} /> },
                { key: 's', header: 'On this order', render: (u) => <Pill tone={u.status === 'OUT' ? 'idle' : u.status === 'RELEASED' ? 'go' : u.status === 'REMOVED' ? 'idle' : 'wait'}>{{ PENDING: 'Pending', RELEASED: 'Released', OUT: 'Gone out', REMOVED: 'Removed' }[u.status]}</Pill> },
                { key: 'l', header: 'Location', render: (u) => <span className="unitno">{per.find((x) => x.unit.unitStayId === u.unitStayId)?.stay?.currentLocation?.fullCode ?? '—'}</span> },
                { key: 'o', header: 'Out at', render: (u) => <span className="small">{fmtDT(u.outAt)}</span> },
              ]} />
            </Panel>
            <Panel title="Validity" sub="An order is valid to the date storage is paid through. Paying more storage lets you revalidate it.">
              <div className="stack-lg">
                <DL cols items={[['Valid from', fmtDT(r.validFrom)], ['Valid to', fmtDT(r.validTo)], ['Storage paid through', fmtDT(r.paidThrough ?? r.validTo)], ['Planned exit', fmtD(r.plannedExitDate)]]} />
                {history.length ? <Timeline items={history} /> : <p className="small muted">Validity is set when the order is approved.</p>}
              </div>
            </Panel>
          </div>

          <div className="stack-lg">
            <Panel title="Gate QR">
              {live ? (
                <div className="stack" style={{ alignItems: 'center' }}>
                  <QrCode token={r.qrToken ?? r.releaseNo ?? ''} />
                  <span className="unitno">{r.qrToken ?? r.releaseNo}</span>
                  <span className="xs muted" style={{ textAlign: 'center' }}>Sent to the collector by SMS. The gate scans it and re-checks every condition at gate-out.</span>
                </div>
              ) : <p className="small muted">{r.status === 'EXPIRED' ? 'QR is blocked until the order is revalidated.' : r.status === 'CANCELLED' || r.status === 'USED' ? 'No QR: order closed.' : 'The QR is issued when the order is approved.'}</p>}
            </Panel>
            <Panel title="Amount due" sub="Storage and handling to the planned exit date">
              <DL items={[['Charges', <Money key="a" amount={amount.amount} currency={amount.currency} />], ['VAT 18%', <Money key="t" amount={amount.taxAmount} currency={amount.currency} />], ['Total', <Money key="o" amount={amount.total} currency={amount.currency} strong />]]} />
              {Number(amount.total) > 0 && <div style={{ marginTop: 12 }}><Button size="sm" perm="billing.invoice.create" onClick={() => toast('Proforma created')}>Create proforma</Button></div>}
            </Panel>
            <Panel title="Collector and transport">
              <DL items={[
                ['Collector', r.collectorName ?? <span className="faint">Not named yet</span>], ['ID', r.collectorIdNo ? `${r.collectorIdType} · ${r.collectorIdNo}` : null],
                ['Transporter', partyName(r.transporterPartyId)], ['Requested by', partyName(r.requestedByPartyId)], ['Requested', fmtDT(r.requestedAt)],
                ['Approved', r.approvedAt ? `${fmtDT(r.approvedAt)} · ${r.approvedBy}` : null],
              ]} />
            </Panel>
          </div>
        </div>
      </div>

      <ApproveDrawer open={approveOpen} onClose={() => setApproveOpen(false)} r={r} failing={blockingApproval} notOverridable={notOverridable} pending={pendingOverride} canOverride={can('release.exception.approve', 'REQ')}
        onApprove={() => { const to = at(-50); setPatch((p) => ({ ...p, status: 'APPROVED', approvedAt: at(0), approvedBy: 'Doc & clearance · Neema M.', validFrom: at(0), validTo: to, paidThrough: to, qrToken: `Q${r.releaseOrderId}${(r.releaseNo ?? '').slice(-4)}`, validityHistory: [{ changeKind: 'INITIAL', newValidTo: to, changedAt: at(0) }] })); toast(`Release approved: ${r.releaseNo}`); }}
        onOverride={(reason) => { const a = raiseApproval({ permissionCode: 'release.exception.approve', entityName: 'release_order', entityId: r.releaseOrderId!, summary: `Approve ${r.releaseNo} with charges unpaid`, reason, amount: amount.total, amountCurrency: amount.currency }); setOverrideReq(a.requestNo!); toast(`Override requested: ${a.requestNo}`); }} />
      <Revalidate open={revalOpen} onClose={() => setRevalOpen(false)} r={r} units={per.length}
        onDone={(to, reason) => { setPatch((p) => ({ ...p, status: (r.unitsOut ?? 0) > 0 ? 'PARTLY_USED' : 'APPROVED', validTo: to, paidThrough: to, qrToken: r.qrToken ?? `Q${r.releaseOrderId}R`, validityHistory: [...(r.validityHistory ?? []), { changeKind: 'REVALIDATED', oldValidTo: r.validTo, newValidTo: to, reason, changedAt: at(0) }] })); toast(`Release revalidated to ${fmtD(to)}`); }} />
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Cancel ${r.releaseNo}?`}
        footer={<><Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep order</Button><Button variant="danger" perm="release.issue" onClick={() => { setPatch((p) => ({ ...p, status: 'CANCELLED' })); setCancelOpen(false); toast('Release order cancelled'); }}>Cancel order</Button></>}>
        <div className="stack">
          <p className="small">The QR stops working at once. Units already out stay out; paid storage is not refunded automatically.</p>
          <Field label="Reason" required><Textarea placeholder="For example: customer asked to change the collector" /></Field>
        </div>
      </Modal>
    </Page>
  );
}

function ApproveDrawer({ open, onClose, r, failing, notOverridable, pending, canOverride, onApprove, onOverride }: {
  open: boolean; onClose: () => void; r: RO; failing: { unit: string; c: Cond }[]; notOverridable: { unit: string; c: Cond }[]; pending: string | null; canOverride: boolean;
  onApprove: () => void; onOverride: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const clean = failing.length === 0;
  const overridable = !clean && notOverridable.length === 0;
  return (
    <Drawer open={open} onClose={onClose} title={`Approve ${r.releaseNo}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {clean && <Button variant="primary" icon={<BadgeCheck />} perm="release.issue" onClick={() => { onApprove(); onClose(); }}>Approve and issue QR</Button>}
        {overridable && !pending && <Button variant="primary" icon={<ShieldCheck />} perm="release.exception.approve" level="REQ" onClick={() => { setTried(true); if (!reason.trim()) return; onOverride(reason); onClose(); }}>Request override approval</Button>}
      </>}>
      <div className="stack-lg">
        {clean && <Banner tone="go" title="All conditions pass">The order becomes valid from now to the date storage is paid through. The collector gets the QR by SMS.</Banner>}
        {!clean && (
          <>
            <Banner tone="stop" title="Cannot approve as it stands">
              {failing.map((f) => `${f.unit}: ${f.c.name.toLowerCase()} (${f.c.detail})`).join('. ')}.
            </Banner>
            {notOverridable.length > 0 ? (
              <Banner tone="stop" title="These conditions cannot be overridden">{[...new Set(notOverridable.map((f) => f.c.name))].join(', ')}. Lift the hold or record the customs release first; then evaluate again.</Banner>
            ) : pending ? (
              <Banner tone="wait" title={`Override already requested: ${pending}`}>Wait for the decision. You cannot approve your own request.</Banner>
            ) : (
              <>
                <Banner tone="wait" title="Override needs a second person">Only the charges condition can be overridden. It needs release exception rights (release.exception.approve) and goes to the approvals inbox; you cannot approve it yourself.</Banner>
                {!canOverride && <p className="small" style={{ color: 'var(--stop)' }}>Your role cannot request overrides. Ask the customer to pay first.</p>}
                <Field label="Why release before payment?" required error={tried && !reason.trim() && 'The approver needs a reason'}><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: bill-to on credit, payment promised by CRDB transfer today" /></Field>
                <Field label="Evidence"><Evidence value={file} onChange={setFile} fileName="Promise to pay.pdf" /></Field>
              </>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

function Revalidate({ open, onClose, r, units, onDone }: { open: boolean; onClose: () => void; r: RO; units: number; onDone: (to: string, reason: string) => void }) {
  const toast = useToast();
  const [date, setDate] = useState(day(3));
  const [paid, setPaid] = useState<'no' | 'yes'>('no');
  const [receipt, setReceipt] = useState('');
  const from = r.validTo ?? at(0);
  const newTo = `${date}T23:59:00+03:00`;
  const days = Math.max(0, Math.ceil((Date.parse(newTo) - Date.parse(from)) / 86400000));
  const amt = days * units * 16;
  const valid = Date.parse(newTo) > Date.parse(at(0));
  return (
    <Drawer open={open} onClose={onClose} title={`Revalidate ${r.releaseNo}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        {paid === 'no' && <Button perm="billing.invoice.create" onClick={() => toast('Proforma created and sent to the agent')}>Create proforma</Button>}
        <Button variant="primary" icon={<CalendarClock />} perm="release.issue" disabled={paid === 'no' || !receipt || !valid} onClick={() => { onDone(new Date(newTo).toISOString(), `Paid storage to ${fmtD(newTo)} (${receipt})`); onClose(); }}>Revalidate to {fmtD(newTo)}</Button></>}>
      <div className="stack-lg">
        <DL items={[['Valid to now', fmtDT(r.validTo)], ['Units on order', units]]} />
        <Field label="New exit date" required error={!valid && 'Pick a date from today on'}><Input type="date" value={date} min={day(0)} onChange={(e) => setDate(e.target.value)} /></Field>
        <Panel>
          <div className="row"><span className="spacer small">{days} more storage day{days === 1 ? '' : 's'} × {units} unit{units === 1 ? '' : 's'}</span><Money amount={amt * 1.18} currency="USD" strong /></div>
          <div className="xs faint">Incl. VAT 18%. Rate from the active tariff.</div>
        </Panel>
        <Field label="Payment for the extra days" required>
          <Segmented value={paid} onChange={setPaid} options={[{ id: 'no', label: 'Not paid yet' }, { id: 'yes', label: 'Paid' }]} />
        </Field>
        {paid === 'yes'
          ? <Field label="Receipt number" required hint="Cash, M-Pesa, Tigo Pesa, Airtel Money or bank (CRDB, NMB)"><Input value={receipt} onChange={(e) => setReceipt(e.target.value.toUpperCase())} placeholder="RC-DAR1-26-…" /></Field>
          : <Banner tone="wait">The order cannot be revalidated beyond the paid-through date. Create a proforma; once the cashier records payment, come back and revalidate.</Banner>}
      </div>
    </Drawer>
  );
}
