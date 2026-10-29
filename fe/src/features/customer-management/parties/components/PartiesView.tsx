import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import {
  Button, Chips, DataTable, Empty, Money, Page, PageHeader, Panel, Pill,
  SearchInput, Tag,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { allStays, consignments, parties } from '@/mock/core';
import { balanceOf } from '@/mock/insight';

type Role = 'all' | 'CUSTOMER' | 'CLEARING_AGENT' | 'SHIPPING_LINE' | 'TRANSPORTER' | 'provisional' | 'blocked';
const roleText = (r: string) => r.toLowerCase().replace(/_/g, ' ');
const CREDIT: Record<string, ['go' | 'idle' | 'stop', string]> = {
  CREDIT: ['go', 'Credit'],
  CASH: ['idle', 'Cash'],
  BLOCKED: ['stop', 'Credit stopped'],
};
const openUnits = (id: number) =>
  allStays.filter(
    (s) =>
      s.physicalStatus !== 'DEPARTED' &&
      consignments.some(
        (c) =>
          c.consignmentId === s.consignmentId &&
          (c.billToPartyId === id ||
            c.consigneePartyId === id ||
            c.agentPartyId === id ||
            c.shippingLinePartyId === id)
      )
  ).length;

export function PartiesView() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role>('all');
  const { data = [] } = useQ(['parties'], () => delay(parties));
  const counts = useMemo(() => new Map(data.map((p) => [p.partyId!, openUnits(p.partyId!)])), [data]);
  const rows = data.filter((p) => {
    if (q && !(p.partyName + p.partyCode + (p.taxId ?? '')).toLowerCase().includes(q.toLowerCase())) return false;
    if (role === 'provisional') return p.syncStatus !== 'SYNCED';
    if (role === 'blocked') return p.creditStatus === 'BLOCKED';
    return role === 'all' || p.roles.includes(role);
  });

  return (
    <Page>
      <PageHeader
        title="Customers & parties"
        ms="M0"
        sub="Customers, agents, lines and transporters. Most come from NG; local ones need matching."
        actions={
          <Button variant="primary" icon={<Plus />} perm="masters.local.edit">
            Add provisional party
          </Button>
        }
      />
      <Panel flush>
        <div className="toolbar">
          <div style={{ width: 280, maxWidth: '100%' }}>
            <SearchInput
              icon={<Search />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, code or TIN"
              aria-label="Find a party"
            />
          </div>
          <Chips<Role>
            value={role}
            onChange={setRole}
            options={[
              { id: 'all', label: 'All' },
              { id: 'CUSTOMER', label: 'Customers' },
              { id: 'CLEARING_AGENT', label: 'Clearing agents' },
              { id: 'SHIPPING_LINE', label: 'Shipping lines' },
              { id: 'TRANSPORTER', label: 'Transporters' },
              { id: 'provisional', label: 'Provisional', count: data.filter((p) => p.syncStatus !== 'SYNCED').length },
              { id: 'blocked', label: 'Credit stopped', count: data.filter((p) => p.creditStatus === 'BLOCKED').length },
            ]}
          />
        </div>
        <DataTable
          rows={rows}
          rowKey={(p) => p.partyId!}
          onRow={(p) => nav(`/parties/${p.partyId}`)}
          empty={<Empty title="No parties match">Clear the search, or add a provisional party if it is new.</Empty>}
          cols={[
            {
              key: 'n',
              header: 'Name',
              render: (p) => (
                <span>
                  <strong>{p.partyName}</strong>
                  <div className="xs faint">
                    {p.partyCode} · {p.city}
                    {p.countryCode !== 'TZ' ? `, ${p.countryCode}` : ''}
                  </div>
                </span>
              ),
            },
            {
              key: 'r',
              header: 'Roles',
              render: (p) => (
                <span className="row-wrap" style={{ gap: 4 }}>
                  {p.roles.map((r) => (
                    <Tag key={r}>{roleText(r)}</Tag>
                  ))}
                </span>
              ),
            },
            {
              key: 'c',
              header: 'Credit',
              render: (p) => (
                <span>
                  <Pill tone={CREDIT[p.creditStatus ?? 'CASH'][0]}>{CREDIT[p.creditStatus ?? 'CASH'][1]}</Pill>
                  {p.creditLimit && (
                    <div className="xs faint">
                      limit {p.creditCurrency} {Number(p.creditLimit).toLocaleString()}
                    </div>
                  )}
                </span>
              ),
            },
            {
              key: 'b',
              header: 'Balance (USD)',
              num: true,
              perm: 'billing.invoice.view',
              render: (p) => {
                const b = balanceOf(p.partyId!);
                return b ? <Money amount={b} /> : <span className="faint">—</span>;
              },
            },
            {
              key: 'u',
              header: 'Open units',
              num: true,
              render: (p) => counts.get(p.partyId!) || <span className="faint">—</span>,
            },
            {
              key: 's',
              header: 'NG record',
              render: (p) =>
                p.syncStatus === 'SYNCED' ? (
                  <span className="small">{p.ngRefId}</span>
                ) : (
                  <Pill tone="wait">Provisional</Pill>
                ),
            },
          ]}
        />
      </Panel>
    </Page>
  );
}
