import { useMemo, useState } from 'react';
import { Lock, Pencil, Plus } from 'lucide-react';
import {
  Banner, Button, Chips, CommonTable, Drawer, Field, Input, Kpi, Page, PageHeader, Panel, Pill, Segmented, fmtDT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { api } from '@/api/client';
import { HOLIDAYS, TODAY, addDays, dLong, dShort, isSunday, rateOn, rates, type Rate } from '@/mock/money';
import { RateChart } from './shared';

/* GET /exchange-rates, /exchange-rates/effective, POST /exchange-rates.
   Finance enters USD→TZS each working day (or a monthly rate). Every posted
   document stores the rate it used, so a used rate can't be changed. */
const f2 = (v: string | number) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ExchangeRates() {
  const toast = useToast();
  const { can } = useSession();
  const { data: dbRates } = useQ(['rates'], () =>
    api.get<{ items: Rate[] }>('/exchange-rates').then((r) => r.items).catch(() => rates)
  );
  const [local, setLocal] = useState<Rate[] | null>(null);
  const all = local ?? (dbRates && dbRates.length > 0 ? dbRates : rates);
  const [kind, setKind] = useState<'ALL' | 'DAILY' | 'MONTHLY'>('ALL');
  const [search, setSearch] = useState('');
  const [entry, setEntry] = useState<Rate | 'new' | null>(null);
  const [look, setLook] = useState(addDays(TODAY, -3));
  const daily = all.filter((r) => r.rateKind === 'DAILY').sort((a, b) => (a.rateDate ?? '').localeCompare(b.rateDate ?? ''));
  const today = rateOn(TODAY);
  const prev30 = daily.filter((r) => (r.rateDate ?? '') <= addDays(TODAY, -30)).pop();
  const chg = prev30 ? ((Number(today.rate.rate) - Number(prev30.rate)) / Number(prev30.rate)) * 100 : 0;
  const month = all.find((r) => r.rateKind === 'MONTHLY' && r.rateDate === TODAY.slice(0, 8) + '01');
  const eff = rateOn(look);
  const rows = useMemo(() => {
    return all
      .filter((r) => {
        if (kind !== 'ALL' && r.rateKind !== kind) return false;
        if (!search) return true;
        const q = search.toUpperCase();
        return (
          (r.rateDate ?? '').includes(q) ||
          (r.sourceNote ?? '').toUpperCase().includes(q) ||
          (r.enteredBy ?? '').toUpperCase().includes(q)
        );
      })
      .sort((a, b) => (b.rateDate ?? '').localeCompare(a.rateDate ?? '') || (a.rateKind ?? '').localeCompare(b.rateKind ?? ''));
  }, [all, kind, search]);
  const todayEntered = daily.some((r) => r.rateDate === TODAY);

  return (
    <Page>
      <PageHeader title="Exchange rates" ms="M3" sub="USD to TZS. Each posted invoice, note and payment keeps the rate it used."
        actions={<Button variant="primary" icon={<Plus />} perm="finance.exchange_rate.edit" onClick={() => setEntry('new')}>Enter rate</Button>} />
      <div className="stack-lg">
        {!todayEntered && <Banner tone="wait" title="Today's rate is not entered">Documents posted today use the last daily rate. Enter today's rate before the counter opens.</Banner>}
        <div className="kpi-strip">
          <Kpi label="In force today" value={f2(today.rate.rate)} unit="TZS" delta={`${today.rate.rateKind === 'DAILY' ? 'Daily' : 'Monthly'} rate · ${dShort(today.rate.rateDate)} · ${today.rate.enteredBy}`} />
          <Kpi label="Change over 30 days" value={`${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`} delta={prev30 ? `From ${f2(prev30.rate)} on ${dShort(prev30.rateDate)}` : undefined} />
          <Kpi label="Monthly rate (October)" value={month ? f2(month.rate) : '—'} unit="TZS" delta="Used when no daily rate exists for the month" />
        </div>
        <div className="grid-main-side">
          <Panel className="mx-min0" title="Daily rate, last 60 days" sub="TZS per USD. The axis starts near the lowest rate so movement is visible.">
            <RateChart label="USD to TZS daily rate, last 60 days" dates={daily.map((r) => r.rateDate)} values={daily.map((r) => Number(r.rate))} />
          </Panel>
          <Panel title="Rate in force on a date" sub="GET /exchange-rates/effective">
            <div className="stack">
              <Field label="Date"><Input type="date" value={look} max={TODAY} onChange={(e) => setLook(e.target.value)} /></Field>
              <div>
                <div className="unitno unitno-lg">{f2(eff.rate.rate)}</div>
                <div className="small muted">TZS per USD · {eff.rate.rateKind === 'DAILY' ? 'daily' : 'monthly'} rate of {dLong(eff.rate.rateDate)}</div>
              </div>
              <span className="xs">{eff.note}.</span>
              {(isSunday(look) || HOLIDAYS[look]) && <span className="xs muted">No rate is entered on Sundays and public holidays.</span>}
            </div>
          </Panel>
        </div>
        <CommonTable
          rows={rows}
          rowKey={(r) => r.exchangeRateId}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter exchange rates by date, source..."
          itemLabel="rates"
          toolbarFilters={
            <Chips value={kind} onChange={setKind} options={[{ id: 'ALL', label: 'All', count: all.length }, { id: 'DAILY', label: 'Daily' }, { id: 'MONTHLY', label: 'Monthly' }]} />
          }
          cols={[
            { key: 'd', header: 'Date', render: (r) => <span className="strong small nowrap">{dLong(r.rateDate)}</span> },
            { key: 'k', header: 'Kind', render: (r) => r.rateKind === 'MONTHLY' ? <Pill tone="customs">Monthly</Pill> : <Pill tone="info">Daily</Pill> },
            { key: 'r', header: 'TZS per USD', num: true, render: (r) => <span className="strong num">{f2(r.rate)}</span> },
            { key: 's', header: 'Source', render: (r) => <span className="xs muted">{r.sourceNote}</span> },
            { key: 'e', header: 'Entered', render: (r) => <span className="xs">{fmtDT(r.enteredAt)} · {r.enteredBy}</span> },
            { key: 'u', header: 'Used by', render: (r) => r.usedBy ? <span className="row xs" style={{ gap: 4 }}><Lock size={13} />{r.usedBy} posted document{r.usedBy === 1 ? '' : 's'}</span> : <span className="xs faint">Not used</span> },
            { key: 'a', header: '', render: (r) => can('finance.exchange_rate.edit', 'DO') && <Button size="sm" variant="ghost" icon={<Pencil />} perm="finance.exchange_rate.edit" disabled={r.usedBy > 0} title={r.usedBy ? 'A posted document uses this rate; enter a correction for the next day instead' : 'Correct this rate'} onClick={() => setEntry(r)}>Correct</Button> },
          ]}
        />
        <p className="xs faint">A rate used by a posted document can't be edited: the invoice, its fiscal receipt and its NG journal all carry it. Corrections go on the next rate.</p>
      </div>

      <RateDrawer entry={entry} onClose={() => setEntry(null)} all={all} onSave={(r, isNew) => {
        setLocal(isNew ? [r, ...all] : all.map((x) => (x.exchangeRateId === r.exchangeRateId ? r : x)));
        toast(isNew ? 'Exchange rate saved' : 'Exchange rate corrected');
      }} />
    </Page>
  );
}

function RateDrawer({ entry, onClose, all, onSave }: { entry: Rate | 'new' | null; onClose: () => void; all: Rate[]; onSave: (r: Rate, isNew: boolean) => void }) {
  const editing = entry && entry !== 'new' ? entry : null;
  return (
    <Drawer open={!!entry} onClose={onClose} title={editing ? `Correct rate for ${dShort(editing.rateDate)}` : 'Enter exchange rate'}>
      {entry && <RateForm key={editing?.exchangeRateId ?? 'new'} editing={editing} all={all} onClose={onClose} onSave={onSave} />}
    </Drawer>
  );
}
function RateForm({ editing, all, onClose, onSave }: { editing: Rate | null; all: Rate[]; onClose: () => void; onSave: (r: Rate, isNew: boolean) => void }) {
  const [kind, setKind] = useState<'DAILY' | 'MONTHLY'>(editing?.rateKind ?? 'DAILY');
  const [date, setDate] = useState(editing?.rateDate ?? (all.some((r) => r.rateDate === TODAY && r.rateKind === 'DAILY') ? addDays(TODAY, 1) : TODAY));
  const [rate, setRate] = useState(editing?.rate ?? '');
  const [src, setSrc] = useState(editing?.sourceNote ?? 'BoT mean rate 09:00');
  const d = kind === 'MONTHLY' ? date.slice(0, 8) + '01' : date;
  const clash = !editing && all.find((r) => r.rateDate === d && r.rateKind === kind);
  const prev = rateOn(addDays(d, -1)).rate;
  const jump = Number(rate) && Math.abs(Number(rate) / Number(prev.rate) - 1) > 0.02;
  return (
    <div className="stack">
      <Field label="Kind"><Segmented value={kind} onChange={setKind} options={[{ id: 'DAILY', label: 'Daily' }, { id: 'MONTHLY', label: 'Monthly' }]} /></Field>
      <Field label={kind === 'MONTHLY' ? 'Month' : 'Date'} required error={clash ? `A ${kind.toLowerCase()} rate for ${dShort(d)} already exists. Correct it instead.` : undefined}>
        <Input type={kind === 'MONTHLY' ? 'month' : 'date'} value={kind === 'MONTHLY' ? date.slice(0, 7) : date} disabled={!!editing} onChange={(e) => setDate(kind === 'MONTHLY' ? e.target.value + '-01' : e.target.value)} />
      </Field>
      <Field label="TZS per 1 USD" required hint={`Previous rate ${prev.rate} (${dShort(prev.rateDate)})`}><Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="2,670.00" /></Field>
      {jump ? <Banner tone="wait" title="More than 2% from the previous rate">Check the figure before saving. A wrong rate flows into every document posted with it.</Banner> : null}
      <Field label="Source"><Input value={src} onChange={(e) => setSrc(e.target.value)} /></Field>
      <p className="xs muted">Once a document is posted with this rate it is locked.</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" perm="finance.exchange_rate.edit" disabled={!Number(rate) || !!clash} onClick={() => {
          onSave({ ...(editing ?? { exchangeRateId: 999, companyId: 1, fromCurrency: 'USD', toCurrency: 'TZS', usedBy: 0, enteredBy: 'Neema Mushi' }), rateDate: d, rateKind: kind, rate: Number(rate).toFixed(2), sourceNote: src, enteredAt: '2026-10-07T07:30:00Z' }, !editing);
          onClose();
        }}>{editing ? 'Save correction' : 'Save rate'}</Button>
      </div>
    </div>
  );
}
