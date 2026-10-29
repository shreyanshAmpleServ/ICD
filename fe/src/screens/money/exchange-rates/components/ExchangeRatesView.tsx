import { useMemo, useState } from 'react';
import { Lock, Pencil, Plus } from 'lucide-react';
import {
  Banner, Button, Chips, CommonTable, Field, Input, Kpi, Page, PageHeader, Panel, Pill, fmtDT, useToast,
} from '@/ds/components';
import { useSession } from '@/app/session';
import { useQ } from '@/api/query';
import { HOLIDAYS, TODAY, addDays, dLong, dShort, isSunday, rateOn, rates, type Rate } from '@/mock/money';
import { RateChart } from '../../components/shared';
import { exchangeRatesApi } from '../api';
import { RateDrawer } from './RateDrawer';

const f2 = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ExchangeRatesView() {
  const toast = useToast();
  const { can } = useSession();
  const { data: dbRates } = useQ(['rates'], () => exchangeRatesApi.getRates());
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
      .sort(
        (a, b) =>
          (b.rateDate ?? '').localeCompare(a.rateDate ?? '') ||
          (a.rateKind ?? '').localeCompare(b.rateKind ?? '')
      );
  }, [all, kind, search]);

  const todayEntered = daily.some((r) => r.rateDate === TODAY);

  return (
    <Page>
      <PageHeader
        title="Exchange rates"
        ms="M3"
        sub="USD to TZS. Each posted invoice, note and payment keeps the rate it used."
        actions={
          <Button variant="primary" icon={<Plus />} perm="finance.exchange_rate.edit" onClick={() => setEntry('new')}>
            Enter rate
          </Button>
        }
      />
      <div className="stack-lg">
        {!todayEntered && (
          <Banner tone="wait" title="Today's rate is not entered">
            Documents posted today use the last daily rate. Enter today's rate before the counter opens.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi
            label="In force today"
            value={f2(today.rate.rate)}
            unit="TZS"
            delta={`${today.rate.rateKind === 'DAILY' ? 'Daily' : 'Monthly'} rate · ${dShort(today.rate.rateDate)} · ${today.rate.enteredBy}`}
          />
          <Kpi
            label="Change over 30 days"
            value={`${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`}
            delta={prev30 ? `From ${f2(prev30.rate)} on ${dShort(prev30.rateDate)}` : undefined}
          />
          <Kpi
            label="Monthly rate (October)"
            value={month ? f2(month.rate) : '—'}
            unit="TZS"
            delta="Used when no daily rate exists for the month"
          />
        </div>
        <div className="grid-main-side">
          <Panel
            className="mx-min0"
            title="Daily rate, last 60 days"
            sub="TZS per USD. The axis starts near the lowest rate so movement is visible."
          >
            <RateChart
              label="USD to TZS daily rate, last 60 days"
              dates={daily.map((r) => r.rateDate)}
              values={daily.map((r) => Number(r.rate))}
            />
          </Panel>
          <Panel title="Rate in force on a date" sub="GET /exchange-rates/effective">
            <div className="stack">
              <Field label="Date">
                <Input type="date" value={look} max={TODAY} onChange={(e) => setLook(e.target.value)} />
              </Field>
              <div>
                <div className="unitno unitno-lg">{f2(eff.rate.rate)}</div>
                <div className="small muted">
                  TZS per USD · {eff.rate.rateKind === 'DAILY' ? 'daily' : 'monthly'} rate of {dLong(eff.rate.rateDate)}
                </div>
              </div>
              <span className="xs">{eff.note}.</span>
              {(isSunday(look) || HOLIDAYS[look]) && (
                <span className="xs muted">No rate is entered on Sundays and public holidays.</span>
              )}
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
            <Chips
              value={kind}
              onChange={setKind}
              options={[
                { id: 'ALL', label: 'All', count: all.length },
                { id: 'DAILY', label: 'Daily' },
                { id: 'MONTHLY', label: 'Monthly' },
              ]}
            />
          }
          cols={[
            {
              key: 'd',
              header: 'Date',
              render: (r) => <span className="strong small nowrap">{dLong(r.rateDate)}</span>,
            },
            {
              key: 'k',
              header: 'Kind',
              render: (r) => (r.rateKind === 'MONTHLY' ? <Pill tone="customs">Monthly</Pill> : <Pill tone="info">Daily</Pill>),
            },
            {
              key: 'r',
              header: 'TZS per USD',
              num: true,
              render: (r) => <span className="strong num">{f2(r.rate)}</span>,
            },
            { key: 's', header: 'Source', render: (r) => <span className="xs muted">{r.sourceNote}</span> },
            {
              key: 'e',
              header: 'Entered',
              render: (r) => (
                <span className="xs">
                  {fmtDT(r.enteredAt)} · {r.enteredBy}
                </span>
              ),
            },
            {
              key: 'u',
              header: 'Used by',
              render: (r) =>
                r.usedBy ? (
                  <span className="row xs" style={{ gap: 4 }}>
                    <Lock size={13} />
                    {r.usedBy} posted document{r.usedBy === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="xs faint">Not used</span>
                ),
            },
            {
              key: 'a',
              header: '',
              render: (r) =>
                can('finance.exchange_rate.edit', 'DO') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Pencil />}
                    perm="finance.exchange_rate.edit"
                    disabled={r.usedBy > 0}
                    title={
                      r.usedBy
                        ? 'A posted document uses this rate; enter a correction for the next day instead'
                        : 'Correct this rate'
                    }
                    onClick={() => setEntry(r)}
                  >
                    Correct
                  </Button>
                ),
            },
          ]}
        />
        <p className="xs faint">
          A rate used by a posted document can't be edited: the invoice, its fiscal receipt and its NG journal all carry
          it. Corrections go on the next rate.</p>
      </div>

      <RateDrawer
        entry={entry}
        onClose={() => setEntry(null)}
        all={all}
        onSave={(r, isNew) => {
          setLocal(isNew ? [r, ...all] : all.map((x) => (x.exchangeRateId === r.exchangeRateId ? r : x)));
          toast(isNew ? 'Exchange rate saved' : 'Exchange rate corrected');
        }}
      />
    </Page>
  );
}
