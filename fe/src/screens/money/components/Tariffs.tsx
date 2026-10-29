import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, Plus, Send, Trash2 } from 'lucide-react';
import {
  Banner, Button, Chips, CommonTable, DL, Drawer, Empty, Field, Input, Money, Page, PageHeader, Panel, Pill, ReferenceCell, Select, StatusCell, StatusPill,
  UnitNo, fmtD, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ, delay } from '@/api/query';
import { api } from '@/api/client';
import type { S } from '@/api/types';
import { allStays, partyName } from '@/mock/core';
import {
  BASIS_LABEL, CHARGE_NAMES, TAX, TODAY, addDays, dLong, dShort, fx, m2, num, rateStay, sumLines, tariff, tariffs, type Rule, type Tariff,
} from '@/mock/money';
import { Totals, qtyU } from './shared';

/* GET /tariffs, /tariffs/{id}. Versioned tariff book with maker-checker:
   drafts are edited, submitted, approved; the version active on the service
   date rates the event. POST /rating/preview for the preview panel. */
const LEVEL: Record<string, string> = { SITE: 'Site', REGIME: 'Regime', LINE: 'Shipping line', CUSTOMER: 'Customer' };
const scopeOf = (t: Tariff) => t.level === 'SITE' ? ({ 1: 'DAR1 main yard', 2: 'DAR2 vehicle yard', 3: 'KBH1 warehouse' } as Record<number, string>)[t.siteId ?? 1]
  : t.level === 'REGIME' ? `${t.regimeCode?.toLowerCase()} cargo` : partyName(t.partyId);

export function Tariffs() {
  const nav = useNavigate();
  const { data: dbTariffs } = useQ(['tariffs'], () =>
    api.get<{ items: Tariff[] }>('/tariffs').then((r) => r.items).catch(() => tariffs)
  );
  const data = dbTariffs && dbTariffs.length > 0 ? dbTariffs : tariffs;
  const [q, setQ] = useState('');
  const [st, setSt] = useState<'all' | Tariff['status']>('all');
  const rows = data.filter((t) => (st === 'all' || t.status === st) && (!q || `${t.tariffCode} ${t.tariffName} ${scopeOf(t)}`.toUpperCase().includes(q.toUpperCase())));

  return (
    <Page>
      <PageHeader title="Tariffs" ms="M3" sub="Customer, then line, then regime, then site: the most specific active tariff rates each event"
        actions={<Button variant="primary" icon={<Plus />} perm="billing.tariff.change" onClick={() => nav('/tariffs/32')}>New tariff</Button>} />
      <CommonTable
        rows={rows}
        rowKey={(t) => t.tariffId}
        onRow={(t) => nav(`/tariffs/${t.tariffId}`)}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Filter tariffs by code, name or customer..."
        itemLabel="tariffs"
        toolbarFilters={
          <Chips value={st} onChange={setSt} options={[{ id: 'all', label: 'All' }, ...(['ACTIVE', 'PENDING_APPROVAL', 'DRAFT', 'RETIRED'] as const).map((s) => ({ id: s, label: { ACTIVE: 'Active', PENDING_APPROVAL: 'Awaiting approval', DRAFT: 'Draft', RETIRED: 'Retired' }[s], count: data.filter((t) => t.status === s).length }))]} />
        }
        emptyTitle="No tariffs match"
        emptySubtitle="Clear the search or status filter."
        cols={[
          {
            key: 'c',
            header: 'Tariff',
            render: (t) => (
              <ReferenceCell
                refNo={t.tariffName}
                sub={t.tariffCode}
              />
            )
          },
          {
            key: 'l',
            header: 'Level',
            render: (t) => (
              <span className="small">
                {LEVEL[t.level] || t.level}
                <div className="xs faint">{scopeOf(t)}</div>
              </span>
            )
          },
          { key: 'v', header: 'Version', num: true, render: (t) => `v${t.versionNo}` },
          { key: 's', header: 'Status', render: (t) => <StatusCell value={t.status} track="billing" /> },
          { key: 'e', header: 'Effective', render: (t) => <span className="small nowrap">{fmtD(t.effectiveFrom)} – {t.effectiveTo ? fmtD(t.effectiveTo) : 'open'}</span> },
          { key: 'r', header: 'Rules', num: true, render: (t) => t.rules?.length || 0 },
          { key: 'u', header: 'Last change', render: (t) => <span className="xs muted">{t.approvalNote ?? t.updatedBy}</span> },
        ]}
      />
    </Page>
  );
}

const filtersOf = (r: Rule) => [
  r.unitCategory && r.unitCategory.toLowerCase(), r.lengthFt && `${r.lengthFt}'`, r.fullEmpty && (r.fullEmpty === 'F' ? 'full' : 'empty'),
  r.isReefer && 'reefer', r.isHazardous && 'hazardous', r.vehicleClass && r.vehicleClass.toLowerCase().replace('_', ' '),
].filter(Boolean) as string[];

export function TariffEditor() {
  const { tariffId } = useParams();
  const { data } = useQ<Tariff | undefined>(['tariff', tariffId], () => delay(tariff(Number(tariffId))));
  if (!data) return <Page><Empty title="Loading tariff" /></Page>;
  return <Editor key={data.tariffId} base={data} />;
}

function Editor({ base }: { base: Tariff }) {
  const toast = useToast();
  const nav = useNavigate();
  const { can, site } = useSession();
  const [t, setT] = useState<Tariff>(base);
  const [slabRule, setSlabRule] = useState<Rule | null>(null);
  const draft = t.status === 'DRAFT';
  const versions = tariffs.filter((x) => x.tariffCode === t.tariffCode).sort((a, b) => b.versionNo - a.versionNo);
  const setRule = (r: Rule) => setT((x) => ({ ...x, rules: x.rules.map((y) => (y.tariffRuleId === r.tariffRuleId ? r : y)) }));

  return (
    <Page>
      <PageHeader crumbs={[['Tariffs', '/tariffs'], [`${t.tariffCode} v${t.versionNo}`]]} title={t.tariffName} ms="M3"
        sub={<span className="row-wrap" style={{ marginTop: 6 }}><StatusPill value={t.status} /><Pill tone="info">{LEVEL[t.level]}: {scopeOf(t)}</Pill><span className="small muted">{t.tariffCode} · v{t.versionNo} · {t.currency}</span></span>}
        actions={<>
          {t.status === 'ACTIVE' && <Button icon={<Copy />} perm="billing.tariff.change" level="REQ" onClick={() => { toast(`Draft v${t.versionNo + 1} created`); nav('/tariffs/32'); }}>New version</Button>}
          {draft && <Button variant="primary" icon={<Send />} perm="billing.tariff.change" level="REQ" onClick={() => { setT((x) => ({ ...x, status: 'PENDING_APPROVAL', approvalNote: 'Submitted just now' })); toast('Tariff submitted for approval'); }}>Submit for approval</Button>}
          {t.status === 'PENDING_APPROVAL' && can('billing.tariff.change', 'APPR') && <Button variant="primary" icon={<CheckCircle2 />} perm="billing.tariff.change" level="APPR" onClick={() => { setT((x) => ({ ...x, status: 'ACTIVE', approvalNote: undefined })); toast('Tariff approved'); }}>Approve tariff</Button>}
        </>} />
      <div className="stack-lg">
        {t.status === 'PENDING_APPROVAL' && <Banner tone="wait" title="Awaiting approval">{t.approvalNote ?? 'Waiting for the finance manager.'} Rules are locked until it is approved or sent back.</Banner>}
        {t.status === 'ACTIVE' && <Banner title="Active tariffs can't be edited">Create a new version with its own effective date. Events keep the version active on their service date.</Banner>}
        {t.status === 'RETIRED' && <Banner title="Retired">Kept for invoices with service dates up to {fmtD(t.effectiveTo)}.</Banner>}
        <div className="grid-main-side">
          <div className="stack-lg" style={{ minWidth: 0 }}>
            <Panel title="Header">
              <DL cols items={[
                ['Effective from', draft ? <Input key="f" type="date" value={t.effectiveFrom} onChange={(e) => setT({ ...t, effectiveFrom: e.target.value })} /> : fmtD(t.effectiveFrom)],
                ['Effective to', t.effectiveTo ? fmtD(t.effectiveTo) : 'Until replaced'],
                ['Currency', t.currency], ['Regulator ref.', t.regulatorRef], ['Updated by', t.updatedBy],
              ]} />
              {t.remarks && <p className="small muted" style={{ marginTop: 12 }}>{t.remarks}</p>}
            </Panel>
            <Panel flush title="Rules" sub={draft ? 'Click a time-based rule to edit its slabs' : `${t.rules.length} rules`}>
              <div className="table-wrap">
                <table className="dt">
                  <thead><tr><th>Charge</th><th>Basis</th><th>Applies to</th><th>Free time</th><th className="num">Rate (USD)</th><th className="num">Min / max</th><th>VAT</th></tr></thead>
                  <tbody>
                    {t.rules.map((r) => {
                      const timed = r.slabs.length > 0;
                      return (
                        <tr key={r.tariffRuleId} className={timed ? 'clickable' : undefined} tabIndex={timed ? 0 : undefined} onClick={timed ? () => setSlabRule(r) : undefined} onKeyDown={timed ? (e) => { if (e.key === 'Enter') setSlabRule(r); } : undefined}>
                          <td><span className="strong small">{CHARGE_NAMES[r.chargeCode]}</span><div className="xs faint">{r.chargeCode}</div></td>
                          <td className="small nowrap">{BASIS_LABEL[r.basis]}</td>
                          <td><span className="row" style={{ gap: 4 }}>{filtersOf(r).length ? filtersOf(r).map((f) => <span key={f} className="tag">{f}</span>) : <span className="xs faint">All units</span>}</span></td>
                          <td className="small nowrap">{r.freeDays ? <span>{r.freeDays} days from {r.clockStart === 'GATE_IN' ? 'gate-in' : 'discharge'}<div className="xs faint">{r.freeExclSundays || r.freeExclHolidays ? 'Sundays, holidays skipped' : 'Sundays, holidays count'}</div></span> : <span className="faint">—</span>}</td>
                          <td className="num small">{timed ? <span className="nowrap">{r.slabs.filter((s) => num(s.rate) > 0).map((s) => num(s.rate).toFixed(2)).join(' / ')} <span className="xs faint">slabs</span></span> : <Money amount={r.flatRate} />}</td>
                          <td className="num small">{r.minCharge || r.maxCharge ? `${r.minCharge ?? '—'} / ${r.maxCharge ?? '—'}` : '—'}</td>
                          <td className="small">{TAX[r.taxCode ?? 'VAT18']?.name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {draft && <div style={{ padding: 12 }}><Button size="sm" icon={<Plus />} perm="billing.tariff.change" onClick={() => toast('Rule added')}>Add rule</Button></div>}
            </Panel>
            {t.rules.some((r) => r.taxCode === 'VAT0') && <Banner tone="wait" title="Zero-rated rules">Transit services carry VAT 0% in this tariff. Verify with tax adviser.</Banner>}
          </div>
          <div className="stack-lg">
            <RatingPreview t={t} siteId={site.siteId} />
            <Panel title="Versions" flush>
              <ul className="list-plain">
                {versions.map((v) => (
                  <li key={v.tariffId} style={{ padding: '10px 16px', borderBottom: '1px solid var(--steel-2)' }}>
                    <Link to={`/tariffs/${v.tariffId}`} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <span className="strong spacer">v{v.versionNo}{v.tariffId === t.tariffId ? ' (this)' : ''}</span><StatusPill value={v.tariffId === t.tariffId ? t.status : v.status} />
                    </Link>
                    <div className="xs muted">{fmtD(v.effectiveFrom)} – {v.effectiveTo ? fmtD(v.effectiveTo) : 'open'}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
      <SlabDrawer rule={slabRule} editable={draft} onClose={() => setSlabRule(null)} onSave={(r) => { setRule(r); toast('Slabs saved to draft'); }} />
    </Page>
  );
}

function SlabDrawer({ rule, editable, onClose, onSave }: { rule: Rule | null; editable: boolean; onClose: () => void; onSave: (r: Rule) => void }) {
  return (
    <Drawer open={!!rule} onClose={onClose} title={rule ? `${CHARGE_NAMES[rule.chargeCode]}: ${filtersOf(rule).join(', ') || 'all units'}` : ''}>
      {rule && <SlabForm key={rule.tariffRuleId} rule={rule} editable={editable} onClose={onClose} onSave={onSave} />}
    </Drawer>
  );
}
function SlabForm({ rule, editable, onClose, onSave }: { rule: Rule; editable: boolean; onClose: () => void; onSave: (r: Rule) => void }) {
  const [rows, setRows] = useState(rule.slabs.map((s) => ({ from: String(s.fromQty), to: s.toQty ?? '', rate: s.rate })));
  const [free, setFree] = useState(String(rule.freeDays ?? 0));
  const [sun, setSun] = useState(!rule.freeExclSundays);
  const [hol, setHol] = useState(!rule.freeExclHolidays);
  const errs: string[] = [];
  rows.forEach((r, i) => {
    if (i === 0 && Number(r.from) !== 1) errs.push('The first slab must start at day 1.');
    if (i > 0 && Number(r.from) !== Number(rows[i - 1].to) + 1) errs.push(`Slab ${i + 1} must start the day after slab ${i} ends.`);
    if (r.to !== '' && Number(r.to) < Number(r.from)) errs.push(`Slab ${i + 1} ends before it starts.`);
    if (i < rows.length - 1 && r.to === '') errs.push(`Only the last slab can be open-ended.`);
  });
  if (rows[0] && Number(rows[0].rate) === 0 && Number(rows[0].to) !== Number(free)) errs.push(`The free slab (rate 0) must end at day ${free}, the free days.`);
  const unit = rule.basis === 'PER_TEU_DAY' ? 'per TEU per day' : 'per day';
  return (
    <div className="stack">
      <div className="form-grid">
        <Field label="Free days"><Input type="number" min={0} disabled={!editable} value={free} onChange={(e) => setFree(e.target.value)} /></Field>
        <Field label="Clock starts at"><Select disabled={!editable} defaultValue={rule.clockStart ?? 'DISCHARGE'} options={[['DISCHARGE', 'Vessel discharge'], ['GATE_IN', 'Gate-in']]} /></Field>
      </div>
      <div className="row-wrap">
        <label className="check"><input type="checkbox" disabled={!editable} checked={sun} onChange={(e) => setSun(e.target.checked)} />Sundays count as free days</label>
        <label className="check"><input type="checkbox" disabled={!editable} checked={hol} onChange={(e) => setHol(e.target.checked)} />Public holidays count as free days</label>
      </div>
      <div className="table-wrap">
        <table className="dt">
          <thead><tr><th>From day</th><th>To day</th><th className="num">USD {unit}</th><th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><Input aria-label={`Slab ${i + 1} from`} type="number" disabled={!editable} value={r.from} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, from: e.target.value } : x))} style={{ maxWidth: 90 }} /></td>
                <td><Input aria-label={`Slab ${i + 1} to`} type="number" disabled={!editable} value={r.to} placeholder="and after" onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, to: e.target.value } : x))} style={{ maxWidth: 110 }} /></td>
                <td className="num"><Input aria-label={`Slab ${i + 1} rate`} type="number" step="0.01" disabled={!editable} value={r.rate} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, rate: e.target.value } : x))} style={{ maxWidth: 110, textAlign: 'right' }} /></td>
                <td>{num(r.rate) === 0 ? <Pill tone="go">Free</Pill> : editable && i > 0 && <Button size="sm" variant="ghost" icon={<Trash2 />} aria-label="Remove slab" onClick={() => setRows(rows.filter((_, j) => j !== i))} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && <Button size="sm" icon={<Plus />} onClick={() => { const last = rows[rows.length - 1]; const from = last && last.to !== '' ? Number(last.to) + 1 : 1; setRows([...rows, { from: String(from), to: '', rate: '0.00' }]); }}>Add slab</Button>}
      {errs.length > 0 && <Banner tone="stop" title="Fix the slabs">{[...new Set(errs)].join(' ')}</Banner>}
      <p className="xs muted">Day numbers count calendar days from the clock start. {sun && hol ? 'Sundays and holidays inside the free window count as free days.' : 'Skipped Sundays or holidays push the end of the free window out.'}</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>{editable ? 'Cancel' : 'Close'}</Button>
        {editable && <Button variant="primary" perm="billing.tariff.change" disabled={errs.length > 0} onClick={() => {
          onSave({ ...rule, freeDays: Number(free), freeExclSundays: !sun, freeExclHolidays: !hol, slabs: rows.map((r) => ({ fromQty: r.from, toQty: r.to === '' ? null : r.to, rate: m2(Number(r.rate)) })) });
          onClose();
        }}>Save slabs</Button>}
      </div>
    </div>
  );
}

function RatingPreview({ t, siteId }: { t: Tariff; siteId: number }) {
  const cands = useMemo(() => allStays.filter((s) => s.siteId === siteId && s.physicalStatus === 'IN_YARD' && t.rules.some((r) =>
    (!r.unitCategory || r.unitCategory === s.cargoUnit.category) && (!r.fullEmpty || r.fullEmpty === s.fullEmpty) && (!r.vehicleClass || r.vehicleClass === s.cargoUnit.unitTypeCode) && r.slabs.length > 0)).slice(0, 40), [t, siteId]);
  const [sid, setSid] = useState<number>(cands[0]?.unitStayId ?? 0);
  const [date, setDate] = useState(addDays(TODAY, 10));
  const s = cands.find((x) => x.unitStayId === sid) ?? cands[0];
  if (!s) return <Panel title="Rating preview"><p className="small muted">No unit in this yard matches this tariff's rules. Switch site to preview it.</p></Panel>;
  const lines = rateStay(s, date, { tariffOverride: t });
  const tot = sumLines(lines);
  const preview: S<'RatingPreview'> = { currency: 'USD', lines, subtotal: m2(tot.subtotal), taxTotal: m2(tot.tax), total: m2(tot.total), freeUntil: s.freeUntil, warnings: (s.activeHoldCount ?? 0) > 0 ? ['Unit is on hold: paying does not release it'] : [] };
  const rate = fx(TODAY);
  return (
    <Panel title="Rating preview" sub="What this version would charge one unit up to a date. Nothing is saved.">
      <div className="stack">
        <Field label="Unit"><Select value={String(s.unitStayId)} onChange={(e) => setSid(Number(e.target.value))} options={cands.map((c) => [String(c.unitStayId), `${c.cargoUnit.unitNo} · ${c.cargoUnit.unitTypeCode}`])} /></Field>
        <Field label="Charge up to"><Input type="date" value={date} min={TODAY} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="row-wrap"><UnitNo no={s.cargoUnit.unitNo} category={s.cargoUnit.category} /><span className="xs muted">to {dLong(date)}</span></div>
        {preview.warnings?.map((w) => <Banner key={w} tone="wait">{w}</Banner>)}
        {lines.length === 0 && <p className="small muted">No rule in this tariff applies to this unit.</p>}
        <ul className="list-plain">
          {lines.map((l) => (
            <li key={l.key} style={{ padding: '8px 0', borderBottom: '1px solid var(--steel-2)' }}>
              <div className="row"><span className="strong small spacer">{l.description}</span><Money amount={l.amount} /></div>
              <div className="xs muted">{qtyU(l.quantity, l.uom)} × USD {l.unitRate}{l.serviceFrom && l.serviceFrom !== l.serviceTo ? ` · ${dShort(l.serviceFrom)}–${dShort(l.serviceTo!)}` : ''} · {TAX[l.taxCode]?.name}</div>
              <ul className="mx-how">{l.how.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </li>
          ))}
        </ul>
        <Totals rows={[['Subtotal', <Money key="s" amount={tot.subtotal} currency="USD" />], ['VAT', <Money key="v" amount={tot.tax} currency="USD" />], ['Total', <Money key="t" amount={preview.total} currency="USD" strong />, true], ['In TZS', <Money key="z" amount={tot.total * rate} currency="TZS" />]]} />
        <span className="xs muted">TZS at today's rate {rate.toLocaleString('en-US', { minimumFractionDigits: 2 })} per USD; a posted invoice freezes the rate of its posting day.</span>
      </div>
    </Panel>
  );
}
