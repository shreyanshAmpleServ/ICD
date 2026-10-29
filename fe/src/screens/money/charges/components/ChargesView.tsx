import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, FilePlus2, FileText, Percent, Plus, Search } from 'lucide-react';
import {
  Button, Chips, Empty, Kpi, Money, Page, PageHeader, Panel, Pill, SearchInput, Select,
  UnitNo, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { consignment, party, partyName } from '@/mock/core';
import { CHARGE_GROUP, dShort, m2, num } from '@/mock/money';
import { fmtAmt, qtyU, whole } from '../../components/shared';
import { chargesApi } from '../api';
import { WaiveDrawer, type Row } from './WaiveDrawer';
import { ManualDrawer } from './ManualDrawer';
import { CreateModal } from './CreateModal';
import '../../components/money.css';

type Group = 'ALL' | 'STORAGE' | 'HANDLING' | 'REEFER' | 'INSPECTION' | 'DOCUMENTATION';

export function ChargesView() {
  const { site, can } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const { data: dbData } = useQ(['charges', site.siteId], () => chargesApi.getCharges(site.siteId));
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
      if (grp === 'HANDLING' ? !(g === 'HANDLING' || g === 'VEHICLE' || g === 'WEIGHING' || g === 'SPECIAL') : g !== grp)
        return false;
    }
    if (q) {
      const n = q.replace(/\s/g, '').toUpperCase();
      const c = consignment(r.consignmentId);
      if (
        !(r.unitNo ?? '').includes(n) &&
        !(c?.refNo ?? '').includes(n) &&
        !partyName(r.billToPartyId).toUpperCase().includes(q.toUpperCase())
      )
        return false;
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
  const selSub = total(selRows),
    selTax = selRows.reduce((a, r) => a + num(r.taxAmount), 0);
  const billParty = selBill.length === 1 ? party(selBill[0]) : undefined;
  const selectable = (r: Row) => r.status === 'OPEN' || r.status === 'WAIVER';
  const toggle = (ids: number[], on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      ids.forEach((i) => (on ? n.add(i) : n.delete(i)));
      return n;
    });
  const pendingCount = rows.filter((r) => r.status === 'WAIVER_PENDING' || r.status === 'MANUAL_PENDING').length;
  const billOptions = [...new Set(rows.map((r) => r.billToPartyId))]
    .map((id) => [String(id), partyName(id)] as [string, string])
    .sort((a, b) => a[1].localeCompare(b[1]));

  const invoiceBlock = !billParty
    ? 'Pick charges for one bill-to.'
    : billParty.creditStatus === 'BLOCKED'
    ? `${billParty.partyName} is blocked for credit. Create a proforma and take payment first.`
    : billParty.creditStatus !== 'CREDIT'
    ? `${billParty.partyName} pays cash. Create a proforma; it becomes a tax invoice once paid.`
    : null;

  return (
    <Page>
      <PageHeader
        title="Charges"
        ms="M3"
        sub={`Uninvoiced charges at ${site.siteName}, rated by the active tariff up to today. Nothing is billed until you put it on a proforma or invoice.`}
        actions={
          <Button icon={<Plus />} perm="billing.invoice.create" onClick={() => setManual(true)}>
            Add manual charge
          </Button>
        }
      />

      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi
            label="Uninvoiced to today"
            value={whole(total(rows))}
            unit="USD"
            delta={`+ VAT ${fmtAmt(rows.reduce((a, r) => a + num(r.taxAmount), 0))}`}
          />
          <Kpi label="Bill-to parties" value={new Set(rows.map((r) => r.billToPartyId)).size} />
          <Kpi label="Consignments" value={new Set(rows.map((r) => r.consignmentId)).size} />
          <Kpi label="Waiting for approval" value={pendingCount} delta="Waivers and manual charges" />
        </div>

        <Panel flush>
          <div className="toolbar">
            <div style={{ width: 260, maxWidth: '100%' }}>
              <SearchInput
                icon={<Search />}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Unit, B/L or bill-to"
                aria-label="Filter charges"
              />
            </div>
            <Select
              aria-label="Bill-to"
              value={bill}
              onChange={(e) => setBill(e.target.value)}
              options={[['ALL', 'All bill-to parties'], ...billOptions]}
            />
            <Chips<Group>
              value={grp}
              onChange={setGrp}
              options={[
                { id: 'ALL', label: 'All' },
                { id: 'STORAGE', label: 'Storage' },
                { id: 'HANDLING', label: 'Handling' },
                { id: 'REEFER', label: 'Reefer power' },
                { id: 'INSPECTION', label: 'Inspection' },
                { id: 'DOCUMENTATION', label: 'Documentation' },
              ]}
            />
          </div>

          {sel.size > 0 && (
            <div className="toolbar" style={{ background: 'var(--hivis-soft)' }}>
              <span className="strong">{sel.size} selected</span>
              <span className="small">
                {fmtAmt(selSub)} + VAT {fmtAmt(selTax)} = <b>{fmtAmt(selSub + selTax)}</b>
                {selBill.length > 1 && ` · ${selBill.length} bill-to parties`}
              </span>
              <span className="spacer" />
              <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>
                Clear
              </Button>
              <Button size="sm" icon={<Percent />} perm="billing.waiver" level="REQ" onClick={() => setWaive(true)}>
                Waive or discount
              </Button>
              <Button
                size="sm"
                icon={<FileText />}
                perm="billing.invoice.create"
                disabled={selBill.length !== 1}
                onClick={() => setCreate('PROFORMA')}
              >
                Create proforma
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={<FilePlus2 />}
                perm="billing.invoice.create"
                disabled={!!invoiceBlock}
                title={invoiceBlock ?? undefined}
                onClick={() => setCreate('TAX_INVOICE')}
              >
                Create invoice
              </Button>
            </div>
          )}
          {sel.size > 0 && invoiceBlock && selBill.length === 1 && (
            <div style={{ padding: '8px 16px 0' }}>
              <span className="xs muted">{invoiceBlock}</span>
            </div>
          )}

          {tree.length === 0 ? (
            <Empty title={rows.length ? 'No charges match these filters' : 'Nothing waiting to be invoiced'}>
              {rows.length
                ? 'Clear the search or pick another charge type.'
                : 'New charges appear here as gate, yard and storage events are rated each night.'}
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th className="mx-check" aria-label="Select" />
                    <th>Unit</th>
                    <th>Charge</th>
                    <th>Service period</th>
                    <th className="num">Qty</th>
                    {can('billing.rates.view') && <th className="num">Rate</th>}
                    <th className="num">VAT</th>
                    <th className="num">Amount (USD)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tree.map(([bid, conss]) => {
                    const all = [...conss.values()].flat();
                    const p = party(bid);
                    return (
                      <Fragment key={bid}>
                        <tr className="mx-group">
                          <td className="mx-check">
                            <input
                              type="checkbox"
                              aria-label={`Select all for ${p?.partyName}`}
                              checked={all.filter(selectable).every((r) => sel.has(r.chargeId))}
                              onChange={(e) =>
                                toggle(
                                  all.filter(selectable).map((r) => r.chargeId),
                                  e.target.checked
                                )
                              }
                            />
                          </td>
                          <td colSpan={can('billing.rates.view') ? 6 : 5}>
                            <span className="row-wrap" style={{ gap: 8 }}>
                              {p?.partyName}
                              {p?.creditStatus === 'CREDIT' && <Pill tone="go">Credit</Pill>}
                              {p?.creditStatus === 'BLOCKED' && <Pill tone="stop">Blocked for credit</Pill>}
                              {p?.creditStatus === 'CASH' && <Pill>Cash</Pill>}
                              <span className="xs muted">
                                {all.length} charges · {conss.size} consignment{conss.size === 1 ? '' : 's'}
                              </span>
                            </span>
                          </td>
                          <td className="num">
                            <Money amount={total(all)} />
                          </td>
                          <td />
                        </tr>
                        {[...conss.entries()].map(([cid, rs]) => {
                          const c = consignment(cid);
                          const isOpen = open.has(cid);
                          return (
                            <Fragment key={cid}>
                              <tr className="mx-sub">
                                <td className="mx-check">
                                  <input
                                    type="checkbox"
                                    aria-label={`Select ${c?.refNo}`}
                                    checked={
                                      rs.filter(selectable).length > 0 &&
                                      rs.filter(selectable).every((r) => sel.has(r.chargeId))
                                    }
                                    onChange={(e) =>
                                      toggle(
                                        rs.filter(selectable).map((r) => r.chargeId),
                                        e.target.checked
                                      )
                                    }
                                  />
                                </td>
                                <td colSpan={can('billing.rates.view') ? 6 : 5}>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '0 4px', minHeight: 28 }}
                                    aria-expanded={isOpen}
                                    onClick={() =>
                                      setOpen((s) => {
                                        const n = new Set(s);
                                        if (isOpen) n.delete(cid);
                                        else n.add(cid);
                                        return n;
                                      })
                                    }
                                  >
                                    {isOpen ? <ChevronDown /> : <ChevronRight />}
                                    <span className="strong">{c?.refNo ?? 'No consignment (empties)'}</span>
                                  </button>
                                  <span className="small muted">
                                    {' '}
                                    {c?.cargoDescription}
                                    {c?.cargoRegimeCode === 'TRANSIT' ? ` · transit to ${c.destinationCountry}` : ''} ·{' '}
                                    {new Set(rs.map((r) => r.unitNo).filter(Boolean)).size} units · {rs.length} charges
                                  </span>
                                </td>
                                <td className="num">
                                  <Money amount={total(rs)} />
                                </td>
                                <td />
                              </tr>
                              {isOpen &&
                                rs.map((r) => (
                                  <tr key={r.chargeId} className={!selectable(r) ? 'mx-muted' : undefined}>
                                    <td className="mx-check">
                                      <input
                                        type="checkbox"
                                        aria-label={`Select ${r.description}`}
                                        disabled={!selectable(r)}
                                        checked={sel.has(r.chargeId)}
                                        onChange={(e) => toggle([r.chargeId], e.target.checked)}
                                      />
                                    </td>
                                    <td>
                                      {r.unitNo ? (
                                        <UnitNo no={r.unitNo} category={r.unitCategory} to={`/units/${r.unitStayId}`} />
                                      ) : (
                                        <span className="faint">—</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className="strong">{r.description}</span>
                                      <div className="xs faint">
                                        {r.chargeCode}
                                        {r.tariffCode ? ` · ${r.tariffCode} v${r.tariffVersion}` : ''}
                                        {r.kind === 'MANUAL' ? ' · manual' : ''}
                                      </div>
                                    </td>
                                    <td className="small nowrap">
                                      {r.serviceFrom === r.serviceTo
                                        ? dShort(r.serviceFrom!)
                                        : `${dShort(r.serviceFrom!)} – ${dShort(r.serviceTo!)}`}
                                    </td>
                                    <td className="num small">{qtyU(r.quantity, r.uom)}</td>
                                    {can('billing.rates.view') && (
                                      <td className="num">
                                        <Money amount={r.unitRate} />
                                      </td>
                                    )}
                                    <td className="num small">
                                      {r.taxPct ? `${r.taxPct}%` : r.taxCode === 'VAT0' ? 'Zero' : '—'}
                                    </td>
                                    <td className="num">
                                      <Money amount={r.amount} />
                                    </td>
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
        <p className="xs faint">
          Storage is rated per calendar day from vessel discharge. Free days count Sundays and public holidays unless the
          tariff says otherwise. Transit services are zero-rated for VAT under the transit tariff: verify with tax adviser.
        </p>
      </div>

      <WaiveDrawer
        open={waive}
        onClose={() => setWaive(false)}
        rows={selRows}
        onDone={(applied, pct, reason) => {
          setLocal(
            rows.flatMap((r) => {
              if (!sel.has(r.chargeId)) return [r];
              if (!applied) return [{ ...r, status: 'WAIVER_PENDING' as const, waiverNote: reason }];
              const w = (-num(r.amount) * pct) / 100;
              return [
                r,
                {
                  ...r,
                  chargeId: r.chargeId + 500000,
                  key: r.key + '-w',
                  status: 'WAIVER' as const,
                  kind: 'MANUAL' as const,
                  description: `Waiver ${pct}%: ${r.description}`,
                  amount: m2(w),
                  taxAmount: m2((w * (r.taxPct as any)) / 100),
                  unitRate: m2(w),
                  quantity: '1',
                  uom: 'each',
                },
              ];
            })
          );
          setSel(new Set());
          toast(applied ? 'Charges waived' : 'Waiver requested for approval');
        }}
      />
      <ManualDrawer
        open={manual}
        onClose={() => setManual(false)}
        siteId={site.siteId}
        onDone={(r) => {
          setLocal([...rows, r]);
          setOpen((s) => new Set(s).add(r.consignmentId ?? 0));
          toast('Manual charge requested for approval');
        }}
      />
      <CreateModal
        kind={create}
        onClose={() => setCreate(null)}
        rows={selRows}
        partyId={selBill[0]}
        onDone={(no, docKind) => {
          setLocal(rows.filter((r) => !sel.has(r.chargeId)));
          setSel(new Set());
          setCreate(null);
          toast(`${docKind === 'PROFORMA' ? 'Proforma' : 'Invoice'} ${no} created`);
          nav('/invoices');
        }}
      />
    </Page>
  );
}
