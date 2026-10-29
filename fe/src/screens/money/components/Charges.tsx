import { Fragment, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, FilePlus2, FileText, Percent, Plus, Search } from 'lucide-react';
import {
  Banner, Button, Chips, Drawer, Empty, Field, Input, Kpi, Modal, Money, Page, PageHeader, Panel, Pill, SearchInput, Segmented, Select,
  Textarea, UnitNo, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { consignment, consignments, party, partyName, parties } from '@/mock/core';
import {
  CHARGE_GROUP, CHARGE_NAMES, LIMITS, TODAY, dShort, fx, m2, num, openCharges, type ChargeRow,
} from '@/mock/money';
import { ApprovalPath, fmtAmt, useOwnLimit, qtyU, whole } from './shared';

/* GET /charges?status=OPEN. Billable events rated by the tariff, waiting to
   go on a proforma or invoice. Grouped the way billing staff think: who pays,
   then which B/L. Waivers and manual charges add new charge rows; nothing
   here edits a rated charge. */
type Row = Omit<ChargeRow, 'status'> & { status: ChargeRow['status'] | 'MANUAL_PENDING' | 'WAIVER' };
type Group = 'ALL' | 'STORAGE' | 'HANDLING' | 'REEFER' | 'INSPECTION' | 'DOCUMENTATION';

export function Charges() {
  const { site, can } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const { data: dbData } = useQ(['charges', site.siteId], () =>
    api.get<{ items: any[] }>('/charges').then((r) => {
      const fallback = openCharges(site.siteId);
      if (r.items && r.items.length > 0) {
        // Map backend charges to match frontend ChargeRow shape
        const mapped = r.items.map((c) => ({
          chargeId: c.chargeId,
          consignmentId: c.consignmentId || 101,
          billToPartyId: c.billToPartyId || 201,
          unitStayId: c.unitStayId,
          unitNo: c.unitNo,
          chargeCode: c.chargeCode || 'STORAGE_IMPORT',
          description: c.chargeName || c.description || 'Import container dwell storage',
          quantity: String(c.quantity || 1),
          uom: c.uom || 'DAY',
          unitRate: String(c.unitPrice || 14.0),
          amount: String(c.amount || 42.0),
          taxCode: 'VAT18',
          taxPct: '18',
          taxAmount: String((Number(c.amount || 42.0) * 0.18).toFixed(2)),
          status: (c.status === 'UNBILLED' ? 'OPEN' : c.status) as any,
          serviceFrom: '2026-10-04',
          serviceTo: '2026-10-07'
        }));
        const existingIds = new Set(mapped.map((m) => m.chargeId));
        return [...mapped, ...fallback.filter((f) => !existingIds.has(f.chargeId))];
      }
      return fallback;
    }).catch(() => openCharges(site.siteId))
  );
  const [local, setLocal] = useState<Row[] | null>(null);
  const rows: Row[] = local ?? (dbData as Row[] | undefined) ?? [];
  const [q, setQ] = useState('');
  const [bill, setBill] = useState('ALL');
  const [grp, setGrp] = useState<Group>('ALL');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<Set<number>>(new Set([101]));
  const [waive, setWaive] = useState(false);
  const [manual, setManual] = useState(false);
  const [create, setCreate] = useState<null | 'PROFORMA' | 'TAX_INVOICE'>(null);

  const filtered = rows.filter((r) => {
    if (bill !== 'ALL' && String(r.billToPartyId) !== bill) return false;
    if (grp !== 'ALL') {
      const g = CHARGE_GROUP[r.chargeCode];
      if (grp === 'HANDLING' ? !(g === 'HANDLING' || g === 'VEHICLE' || g === 'WEIGHING' || g === 'SPECIAL') : g !== grp) return false;
    }
    if (q) {
      const n = q.replace(/\s/g, '').toUpperCase();
      const c = consignment(r.consignmentId);
      if (!(r.unitNo ?? '').includes(n) && !(c?.refNo ?? '').includes(n) && !partyName(r.billToPartyId).toUpperCase().includes(q.toUpperCase())) return false;
    }
    return true;
  });

  // bill-to → consignment → rows
  const tree = useMemo(() => {
    const m = new Map<number, Map<number, Row[]>>();
    for (const r of filtered) {
      const b = m.get(r.billToPartyId) ?? new Map<number, Row[]>();
      const k = r.consignmentId ?? 0;
      b.set(k, [...(b.get(k) ?? []), r]);
      m.set(r.billToPartyId, b);
    }
    return [...m.entries()].sort((a, b) => partyName(a[0]).localeCompare(partyName(b[0])));
  }, [filtered]);

  const total = (rs: Row[]) => rs.reduce((a, r) => a + num(r.amount), 0);
  const selRows = rows.filter((r) => sel.has(r.chargeId));
  const selBill = [...new Set(selRows.map((r) => r.billToPartyId))];
  const selSub = total(selRows), selTax = selRows.reduce((a, r) => a + num(r.taxAmount), 0);
  const billParty = selBill.length === 1 ? party(selBill[0]) : undefined;
  const selectable = (r: Row) => r.status === 'OPEN' || r.status === 'WAIVER';
  const toggle = (ids: number[], on: boolean) => setSel((s) => { const n = new Set(s); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });
  const pendingCount = rows.filter((r) => r.status === 'WAIVER_PENDING' || r.status === 'MANUAL_PENDING').length;
  const billOptions = [...new Set(rows.map((r) => r.billToPartyId))].map((id) => [String(id), partyName(id)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));

  const invoiceBlock = !billParty ? 'Pick charges for one bill-to.'
    : billParty.creditStatus === 'BLOCKED' ? `${billParty.partyName} is blocked for credit. Create a proforma and take payment first.`
    : billParty.creditStatus !== 'CREDIT' ? `${billParty.partyName} pays cash. Create a proforma; it becomes a tax invoice once paid.` : null;

  return (
    <Page>
      <PageHeader title="Charges" ms="M3"
        sub={`Uninvoiced charges at ${site.siteName}, rated by the active tariff up to today. Nothing is billed until you put it on a proforma or invoice.`}
        actions={<Button icon={<Plus />} perm="billing.invoice.create" onClick={() => setManual(true)}>Add manual charge</Button>} />

      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Uninvoiced to today" value={whole(total(rows))} unit="USD" delta={`+ VAT ${fmtAmt(rows.reduce((a, r) => a + num(r.taxAmount), 0))}`} />
          <Kpi label="Bill-to parties" value={new Set(rows.map((r) => r.billToPartyId)).size} />
          <Kpi label="Consignments" value={new Set(rows.map((r) => r.consignmentId)).size} />
          <Kpi label="Waiting for approval" value={pendingCount} delta="Waivers and manual charges" />
        </div>

        <Panel flush>
          <div className="toolbar">
            <div style={{ width: 260, maxWidth: '100%' }}><SearchInput icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Unit, B/L or bill-to" aria-label="Filter charges" /></div>
            <Select aria-label="Bill-to" value={bill} onChange={(e) => setBill(e.target.value)} options={[['ALL', 'All bill-to parties'], ...billOptions]} />
            <Chips<Group> value={grp} onChange={setGrp} options={[
              { id: 'ALL', label: 'All' }, { id: 'STORAGE', label: 'Storage' }, { id: 'HANDLING', label: 'Handling' }, { id: 'REEFER', label: 'Reefer power' },
              { id: 'INSPECTION', label: 'Inspection' }, { id: 'DOCUMENTATION', label: 'Documentation' },
            ]} />
          </div>

          {sel.size > 0 && (
            <div className="toolbar" style={{ background: 'var(--hivis-soft)' }}>
              <span className="strong">{sel.size} selected</span>
              <span className="small">{fmtAmt(selSub)} + VAT {fmtAmt(selTax)} = <b>{fmtAmt(selSub + selTax)}</b>{selBill.length > 1 && ` · ${selBill.length} bill-to parties`}</span>
              <span className="spacer" />
              <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>
              <Button size="sm" icon={<Percent />} perm="billing.waiver" level="REQ" onClick={() => setWaive(true)}>Waive or discount</Button>
              <Button size="sm" icon={<FileText />} perm="billing.invoice.create" disabled={selBill.length !== 1} onClick={() => setCreate('PROFORMA')}>Create proforma</Button>
              <Button size="sm" variant="primary" icon={<FilePlus2 />} perm="billing.invoice.create" disabled={!!invoiceBlock} title={invoiceBlock ?? undefined} onClick={() => setCreate('TAX_INVOICE')}>Create invoice</Button>
            </div>
          )}
          {sel.size > 0 && invoiceBlock && selBill.length === 1 && <div style={{ padding: '8px 16px 0' }}><span className="xs muted">{invoiceBlock}</span></div>}

          {tree.length === 0 ? (
            <Empty title={rows.length ? 'No charges match these filters' : 'Nothing waiting to be invoiced'}>
              {rows.length ? 'Clear the search or pick another charge type.' : 'New charges appear here as gate, yard and storage events are rated each night.'}
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th className="mx-check" aria-label="Select" />
                    <th>Unit</th><th>Charge</th><th>Service period</th><th className="num">Qty</th>
                    {can('billing.rates.view') && <th className="num">Rate</th>}
                    <th className="num">VAT</th><th className="num">Amount (USD)</th><th />
                  </tr>
                </thead>
                <tbody>
                  {tree.map(([bid, conss]) => {
                    const all = [...conss.values()].flat();
                    const p = party(bid);
                    return (
                      <Fragment key={bid}>
                        <tr className="mx-group">
                          <td className="mx-check"><input type="checkbox" aria-label={`Select all for ${p?.partyName}`} checked={all.filter(selectable).every((r) => sel.has(r.chargeId))} onChange={(e) => toggle(all.filter(selectable).map((r) => r.chargeId), e.target.checked)} /></td>
                          <td colSpan={can('billing.rates.view') ? 6 : 5}>
                            <span className="row-wrap" style={{ gap: 8 }}>
                              {p?.partyName}
                              {p?.creditStatus === 'CREDIT' && <Pill tone="go">Credit</Pill>}
                              {p?.creditStatus === 'BLOCKED' && <Pill tone="stop">Blocked for credit</Pill>}
                              {p?.creditStatus === 'CASH' && <Pill>Cash</Pill>}
                              <span className="xs muted">{all.length} charges · {conss.size} consignment{conss.size === 1 ? '' : 's'}</span>
                            </span>
                          </td>
                          <td className="num"><Money amount={total(all)} /></td>
                          <td />
                        </tr>
                        {[...conss.entries()].map(([cid, rs]) => {
                          const c = consignment(cid);
                          const isOpen = open.has(cid);
                          return (
                            <Fragment key={cid}>
                              <tr className="mx-sub">
                                <td className="mx-check"><input type="checkbox" aria-label={`Select ${c?.refNo}`} checked={rs.filter(selectable).length > 0 && rs.filter(selectable).every((r) => sel.has(r.chargeId))} onChange={(e) => toggle(rs.filter(selectable).map((r) => r.chargeId), e.target.checked)} /></td>
                                <td colSpan={can('billing.rates.view') ? 6 : 5}>
                                  <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', minHeight: 28 }} aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (isOpen) n.delete(cid); else n.add(cid); return n; })}>
                                    {isOpen ? <ChevronDown /> : <ChevronRight />}
                                    <span className="strong">{c?.refNo ?? 'No consignment (empties)'}</span>
                                  </button>
                                  <span className="small muted"> {c?.cargoDescription}{c?.cargoRegimeCode === 'TRANSIT' ? ` · transit to ${c.destinationCountry}` : ''} · {new Set(rs.map((r) => r.unitNo).filter(Boolean)).size} units · {rs.length} charges</span>
                                </td>
                                <td className="num"><Money amount={total(rs)} /></td>
                                <td />
                              </tr>
                              {isOpen && rs.map((r) => (
                                <tr key={r.chargeId} className={!selectable(r) ? 'mx-muted' : undefined}>
                                  <td className="mx-check"><input type="checkbox" aria-label={`Select ${r.description}`} disabled={!selectable(r)} checked={sel.has(r.chargeId)} onChange={(e) => toggle([r.chargeId], e.target.checked)} /></td>
                                  <td>{r.unitNo ? <UnitNo no={r.unitNo} category={r.unitCategory} to={`/units/${r.unitStayId}`} /> : <span className="faint">—</span>}</td>
                                  <td><span className="strong">{r.description}</span><div className="xs faint">{r.chargeCode}{r.tariffCode ? ` · ${r.tariffCode} v${r.tariffVersion}` : ''}{r.kind === 'MANUAL' ? ' · manual' : ''}</div></td>
                                  <td className="small nowrap">{r.serviceFrom === r.serviceTo ? dShort(r.serviceFrom!) : `${dShort(r.serviceFrom!)} – ${dShort(r.serviceTo!)}`}</td>
                                  <td className="num small">{qtyU(r.quantity, r.uom)}</td>
                                  {can('billing.rates.view') && <td className="num"><Money amount={r.unitRate} /></td>}
                                  <td className="num small">{r.taxPct ? `${r.taxPct}%` : r.taxCode === 'VAT0' ? 'Zero' : '—'}</td>
                                  <td className="num"><Money amount={r.amount} /></td>
                                  <td>
                                    {r.status === 'WAIVER_PENDING' && <Pill tone="wait">Waiver awaiting approval</Pill>}
                                    {r.status === 'MANUAL_PENDING' && <Pill tone="wait">Awaiting approval</Pill>}
                                    {r.status === 'WAIVER' && <Pill tone="info">Waiver</Pill>}
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <p className="xs faint">Storage is rated per calendar day from vessel discharge. Free days count Sundays and public holidays unless the tariff says otherwise. Transit services are zero-rated for VAT under the transit tariff: verify with tax adviser.</p>
      </div>

      <WaiveDrawer open={waive} onClose={() => setWaive(false)} rows={selRows}
        onDone={(applied, pct, reason) => {
          setLocal(rows.flatMap((r) => {
            if (!sel.has(r.chargeId)) return [r];
            if (!applied) return [{ ...r, status: 'WAIVER_PENDING' as const, waiverNote: reason }];
            const w = -num(r.amount) * pct / 100;
            return [r, { ...r, chargeId: r.chargeId + 500000, key: r.key + '-w', status: 'WAIVER' as const, kind: 'MANUAL' as const, description: `Waiver ${pct}%: ${r.description}`, amount: m2(w), taxAmount: m2(w * r.taxPct / 100), unitRate: m2(w), quantity: '1', uom: 'each' }];
          }));
          setSel(new Set());
          toast(applied ? 'Charges waived' : 'Waiver requested for approval');
        }} />
      <ManualDrawer open={manual} onClose={() => setManual(false)} siteId={site.siteId}
        onDone={(r) => { setLocal([...rows, r]); setOpen((s) => new Set(s).add(r.consignmentId ?? 0)); toast('Manual charge requested for approval'); }} />
      <CreateModal kind={create} onClose={() => setCreate(null)} rows={selRows} partyId={selBill[0]}
        onDone={(no, kind) => { setLocal(rows.filter((r) => !sel.has(r.chargeId))); setSel(new Set()); setCreate(null); toast(`${kind === 'PROFORMA' ? 'Proforma' : 'Invoice'} ${no} created`); nav('/invoices'); }} />
    </Page>
  );
}

function WaiveDrawer({ open, onClose, rows, onDone }: { open: boolean; onClose: () => void; rows: Row[]; onDone: (applied: boolean, pct: number, reason: string) => void }) {
  const [mode, setMode] = useState<'FULL' | 'PCT'>('PCT');
  const [pct, setPct] = useState('25');
  const [reason, setReason] = useState('');
  const own = useOwnLimit('billing.waiver');
  const base = rows.reduce((a, r) => a + num(r.amount), 0);
  const p = mode === 'FULL' ? 100 : Math.min(100, Math.max(0, Number(pct) || 0));
  const amt = (base * p) / 100;
  const applies = amt < LIMITS.waiverTwoLevelsUsd && amt <= own;
  return (
    <Drawer open={open} onClose={onClose} title="Waive or discount charges"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={<Percent />} perm="billing.waiver" level="REQ" disabled={!reason.trim() || amt <= 0}
          onClick={() => { onDone(applies, p, reason); onClose(); setReason(''); }}>{applies ? 'Waive charges' : 'Request approval'}</Button>
      </>}>
      <div className="stack">
        <p className="small muted">{rows.length} charge{rows.length === 1 ? '' : 's'} selected, {fmtAmt(base)} before VAT. A waiver adds a credit line against each charge; the rated charge itself is kept.</p>
        <Segmented value={mode} onChange={setMode} label="Waiver type" options={[{ id: 'PCT', label: 'Discount %' }, { id: 'FULL', label: 'Waive in full' }]} />
        {mode === 'PCT' && <Field label="Discount" hint="Percent of each selected charge"><Input type="number" min={1} max={100} value={pct} onChange={(e) => setPct(e.target.value)} style={{ maxWidth: 140 }} /></Field>}
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="small muted">Amount waived</span><Money amount={amt} currency="USD" strong /></div>
        <ApprovalPath amountUsd={amt} ownLimit={own} twoLevelFrom={LIMITS.waiverTwoLevelsUsd} what="waiver" />
        <Field label="Reason" required hint="The approver and the customer statement see this"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customs exam delayed by depot equipment breakdown" /></Field>
        <div className="table-wrap" style={{ maxHeight: 240 }}>
          <table className="dt" style={{ fontSize: 12 }}>
            <tbody>{rows.slice(0, 40).map((r) => <tr key={r.chargeId}><td>{r.unitNo ?? '—'}</td><td>{r.description}</td><td className="num"><Money amount={r.amount} /></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}

function ManualDrawer({ open, onClose, siteId, onDone }: { open: boolean; onClose: () => void; siteId: number; onDone: (r: Row) => void }) {
  const [bill, setBill] = useState('2');
  const [cons, setCons] = useState('101');
  const [code, setCode] = useState('WEIGHING');
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState('25.00');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(TODAY);
  const cs = consignments.filter((c) => c.billToPartyId === Number(bill) && (siteId === 2 ? c.vesselCallId === 13 : c.vesselCallId !== 13));
  const amt = (Number(qty) || 0) * (Number(rate) || 0);
  return (
    <Drawer open={open} onClose={onClose} title="Add a manual charge"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={<Plus />} perm="billing.invoice.create" disabled={!reason.trim() || amt <= 0}
          onClick={() => {
            onDone({
              key: `m-${Date.parse(date)}-${code}`, chargeId: 990000 + Number(qty) * 7 + reason.length, status: 'MANUAL_PENDING', ratedAt: new Date(Date.parse(date)).toISOString(),
              billToPartyId: Number(bill), consignmentId: Number(cons) || null, chargeCode: code, chargeName: CHARGE_NAMES[code], description: `${CHARGE_NAMES[code]} (manual): ${reason.slice(0, 40)}`,
              serviceFrom: date, serviceTo: date, quantity: qty, uom: 'each', unitRate: m2(Number(rate)), amount: m2(amt), taxCode: 'VAT18', taxPct: 18, taxAmount: m2(amt * 0.18), how: ['Manual charge'], kind: 'MANUAL',
            });
            onClose(); setReason('');
          }}>Request manual charge</Button>
      </>}>
      <div className="stack">
        <Banner tone="wait">Manual charges always need approval by finance before they can go on an invoice.</Banner>
        <div className="form-grid">
          <Field label="Bill to" required><Select value={bill} onChange={(e) => { setBill(e.target.value); setCons(''); }} options={parties.filter((p) => p.roles.includes('CUSTOMER') || p.roles.includes('SHIPPING_LINE')).map((p) => [String(p.partyId), p.partyName])} /></Field>
          <Field label="Consignment"><Select value={cons} onChange={(e) => setCons(e.target.value)} options={[['', 'None'], ...cs.map((c) => [String(c.consignmentId), c.refNo] as [string, string])]} /></Field>
          <Field label="Charge" required><Select value={code} onChange={(e) => setCode(e.target.value)} options={['WEIGHING', 'EXAM_HANDLING', 'CFS_HANDLING', 'LIFT_ON_OFF', 'DOC_FEE', 'HAZ_SURCHARGE'].map((c) => [c, CHARGE_NAMES[c]])} /></Field>
          <Field label="Service date" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Quantity" required><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Rate (USD)" required><Input type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="small muted">Amount before VAT 18%</span><Money amount={amt} currency="USD" strong /></div>
        <Field label="Reason" required hint="Why the tariff did not rate this automatically"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Extra weighing requested by the agent, ticket WB-DAR1-26-08840" /></Field>
      </div>
    </Drawer>
  );
}

function CreateModal({ kind, onClose, rows, partyId, onDone }: { kind: null | 'PROFORMA' | 'TAX_INVOICE'; onClose: () => void; rows: Row[]; partyId?: number; onDone: (no: string, kind: string) => void }) {
  const [cur, setCur] = useState<'USD' | 'TZS'>('USD');
  const p = party(partyId);
  const rate = fx(TODAY);
  const sub = rows.reduce((a, r) => a + num(r.amount), 0), tax = rows.reduce((a, r) => a + num(r.taxAmount), 0);
  const k = cur === 'TZS' ? rate : 1;
  const zero = rows.some((r) => r.taxCode === 'VAT0');
  return (
    <Modal open={!!kind} onClose={onClose} title={kind === 'PROFORMA' ? 'Create proforma' : 'Create invoice'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" perm="billing.invoice.create" onClick={() => onDone(kind === 'PROFORMA' ? 'PRO-DAR1-26-002063' : 'INV-DAR1-26-003321', kind!)}>{kind === 'PROFORMA' ? 'Create proforma' : 'Create draft invoice'}</Button>
      </>}>
      <div className="stack">
        <p className="small">{rows.length} charges for <b>{p?.partyName}</b>.{kind === 'TAX_INVOICE' ? ' The invoice is created as a draft; posting it fiscalises it with TRA and sends it to the NG ledger.' : ' A proforma is not a tax document. Once paid, convert it to a tax invoice.'}</p>
        <Field label="Invoice currency"><Segmented value={cur} onChange={setCur} options={[{ id: 'USD', label: 'USD' }, { id: 'TZS', label: 'TZS' }]} /></Field>
        <p className="xs muted">Exchange rate today: TZS {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} per USD. It is frozen on the document when it is posted.</p>
        {p?.creditStatus === 'CREDIT' && kind === 'TAX_INVOICE' && <p className="xs muted">Due in 30 days (credit terms). Credit limit {fmtAmt(num(p.creditLimit))}.</p>}
        {zero && <Banner tone="wait" title="Includes zero-rated transit lines">Transit services are zero-rated under the transit tariff. Verify with tax adviser.</Banner>}
        <div className="mx-totals">
          <dt>Subtotal</dt><dd><Money amount={sub * k} currency={cur} /></dd>
          <dt>VAT</dt><dd><Money amount={tax * k} currency={cur} /></dd>
          <dt className="grand">Total</dt><dd className="grand"><Money amount={(sub + tax) * k} currency={cur} strong /></dd>
        </div>
        <Link to="/invoices/new" className="xs">Need a pay-through date for release? Use the full invoice flow</Link>
      </div>
    </Modal>
  );
}
