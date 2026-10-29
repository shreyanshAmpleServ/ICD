import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommonTable, Meter, MoneyCell, Page, PageHeader, PartyCell, Pill,
} from '@/ds/components';
import { customers, num, statement } from '@/mock/money';
import { fmtAmt } from '../../components/shared';

export function StatementsListView() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    return customers.map((c) => ({ c, s: statement(c.partyId!) })).sort((a, b) => b.s.outstanding - a.s.outstanding);
  }, []);

  const filteredList = useMemo(() => {
    if (!search) return list;
    const q = search.toUpperCase();
    return list.filter(
      (r) =>
        r.c.partyName.toUpperCase().includes(q) ||
        (r.c.partyCode ?? '').toUpperCase().includes(q)
    );
  }, [list, search]);

  return (
    <Page>
      <PageHeader title="Statements" ms="M3" sub="Pick a customer to see their statement, ageing and credit use" />
      <CommonTable
        rows={filteredList}
        rowKey={(r) => r.c.partyId!}
        onRow={(r) => nav(`/statements/${r.c.partyId}`)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter customers by name or code..."
        itemLabel="customer statements"
        cols={[
          {
            key: 'n',
            header: 'Customer',
            render: (r) => <PartyCell name={r.c.partyName} sub={r.c.partyCode} />,
          },
          {
            key: 'cr',
            header: 'Terms',
            render: (r) =>
              r.c.creditStatus === 'CREDIT' ? (
                <Pill tone="go">Credit</Pill>
              ) : r.c.creditStatus === 'BLOCKED' ? (
                <Pill tone="stop">Blocked</Pill>
              ) : (
                <Pill>Cash</Pill>
              ),
          },
          {
            key: 'o',
            header: 'Outstanding (USD)',
            num: true,
            render: (r) => <MoneyCell amount={r.s.outstanding} currency="USD" strong={r.s.outstanding > 0} />,
          },
          {
            key: 'od',
            header: 'Overdue',
            num: true,
            render: (r) => {
              const o = r.s.outstanding - r.s.ageing.current;
              return o > 0.005 ? (
                <span style={{ color: 'var(--stop)' }}>
                  <MoneyCell amount={o} currency="USD" />
                </span>
              ) : (
                <span className="xs faint">—</span>
              );
            },
          },
          {
            key: 'u',
            header: 'On account',
            num: true,
            render: (r) =>
              r.s.unallocated > 0 ? <MoneyCell amount={r.s.unallocated} currency="USD" /> : <span className="xs faint">—</span>,
          },
          {
            key: 'l',
            header: 'Credit used',
            render: (r) =>
              r.c.creditLimit ? (
                <span style={{ display: 'block', minWidth: 120 }}>
                  <Meter pct={(r.s.outstanding / num(r.c.creditLimit)) * 100} label="Credit used" />
                  <span className="xs faint">
                    {Math.round((r.s.outstanding / num(r.c.creditLimit)) * 100)}% of {fmtAmt(num(r.c.creditLimit))}
                  </span>
                </span>
              ) : (
                <span className="xs faint">No credit</span>
              ),
          },
        ]}
      />
    </Page>
  );
}
