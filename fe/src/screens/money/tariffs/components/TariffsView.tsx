import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  Button, Chips, CommonTable, Page, PageHeader, ReferenceCell, StatusCell, fmtD,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { partyName } from '@/mock/core';
import { tariffs, type Tariff } from '@/mock/money';
import { tariffsApi } from '../api';

const LEVEL: Record<string, string> = { SITE: 'Site', REGIME: 'Regime', LINE: 'Shipping line', CUSTOMER: 'Customer' };

const scopeOf = (t: Tariff) =>
  t.level === 'SITE'
    ? ({ 1: 'DAR1 main yard', 2: 'DAR2 vehicle yard', 3: 'KBH1 warehouse' } as Record<number, string>)[t.siteId ?? 1]
    : t.level === 'REGIME'
    ? `${t.regimeCode?.toLowerCase()} cargo`
    : partyName(t.partyId);

export function TariffsView() {
  const nav = useNavigate();
  const { data: dbTariffs } = useQ(['tariffs'], () => tariffsApi.getTariffs());
  const data = dbTariffs && dbTariffs.length > 0 ? dbTariffs : tariffs;
  const [q, setQ] = useState('');
  const [st, setSt] = useState<'all' | Tariff['status']>('all');
  const rows = data.filter(
    (t) =>
      (st === 'all' || t.status === st) &&
      (!q || `${t.tariffCode} ${t.tariffName} ${scopeOf(t)}`.toUpperCase().includes(q.toUpperCase()))
  );

  return (
    <Page>
      <PageHeader
        title="Tariffs"
        ms="M3"
        sub="Customer, then line, then regime, then site: the most specific active tariff rates each event"
        actions={
          <Button variant="primary" icon={<Plus />} perm="billing.tariff.change" onClick={() => nav('/tariffs/32')}>
            New tariff
          </Button>
        }
      />
      <CommonTable
        rows={rows}
        rowKey={(t) => t.tariffId}
        onRow={(t) => nav(`/tariffs/${t.tariffId}`)}
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Filter tariffs by code, name or customer..."
        itemLabel="tariffs"
        toolbarFilters={
          <Chips
            value={st}
            onChange={setSt}
            options={[
              { id: 'all', label: 'All' },
              ...(['ACTIVE', 'PENDING_APPROVAL', 'DRAFT', 'RETIRED'] as const).map((s) => ({
                id: s,
                label: {
                  ACTIVE: 'Active',
                  PENDING_APPROVAL: 'Awaiting approval',
                  DRAFT: 'Draft',
                  RETIRED: 'Retired',
                }[s],
                count: data.filter((t) => t.status === s).length,
              })),
            ]}
          />
        }
        emptyTitle="No tariffs match"
        emptySubtitle="Clear the search or status filter."
        cols={[
          {
            key: 'c',
            header: 'Tariff',
            render: (t) => <ReferenceCell refNo={t.tariffName} sub={t.tariffCode} />,
          },
          {
            key: 'l',
            header: 'Level',
            render: (t) => (
              <span className="small">
                {LEVEL[t.level] || t.level}
                <div className="xs faint">{scopeOf(t)}</div>
              </span>
            ),
          },
          { key: 'v', header: 'Version', num: true, render: (t) => `v${t.versionNo}` },
          { key: 's', header: 'Status', render: (t) => <StatusCell value={t.status} track="billing" /> },
          {
            key: 'e',
            header: 'Effective',
            render: (t) => (
              <span className="small nowrap">
                {fmtD(t.effectiveFrom)} – {t.effectiveTo ? fmtD(t.effectiveTo) : 'open'}
              </span>
            ),
          },
          { key: 'r', header: 'Rules', num: true, render: (t) => t.rules?.length || 0 },
          {
            key: 'u',
            header: 'Last change',
            render: (t) => <span className="xs muted">{t.approvalNote ?? t.updatedBy}</span>,
          },
        ]}
      />
    </Page>
  );
}
