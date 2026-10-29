import { useState } from 'react';
import { UserRoundCheck } from 'lucide-react';
import {
  Banner, Button, DataTable, Empty, Page, PageHeader, Panel, StatusPill, Tabs, ago, fmtDT,
} from '@/ds/components';
import { useQ, delay } from '@/api/query';
import { APPROVAL_LIMITS, allApprovals, delegations as seedDelegations, hoursUntil, sessionApprovals, type Apr, type DelegationRow } from '@/mock/cargo';
import { Countdown } from '@/features/container-management/shared';
import { AmountVsLimit } from './AmountVsLimit';
import { ApprovalDetailDrawer } from './ApprovalDetailDrawer';
import { Delegations } from './Delegations';

type TabId = 'mine' | 'asked' | 'all' | 'delegations';
const permLabel = (p: string) => APPROVAL_LIMITS[p]?.label ?? p;

export function ApprovalsView() {
  const { data = [] } = useQ(['approvals'], () => delay([...sessionApprovals, ...allApprovals]));
  const [local, setLocal] = useState<Apr[] | null>(null);
  const list = local ?? data;
  const [tab, setTab] = useState<TabId>('mine');
  const [sel, setSel] = useState<number | null>(null);
  const [dels, setDels] = useState<DelegationRow[]>(seedDelegations);
  const [delOpen, setDelOpen] = useState(false);
  const waiting = list.filter((a) => a.status === 'PENDING' && a.canDecide && !a.mine);
  const asked = list.filter((a) => a.mine);
  const rows = tab === 'mine' ? waiting : tab === 'asked' ? asked : list;
  const a = list.find((x) => x.approvalRequestId === sel);
  const activeDel = dels.find((d) => !d.revokedAt && hoursUntil(d.validFrom) <= 0 && hoursUntil(d.validTo) > 0);

  return (
    <Page>
      <PageHeader
        title="Approvals"
        ms="M2"
        sub="Requests that need a second person: waivers, credit notes, overrides, hold lifts"
        actions={
          <Button
            icon={<UserRoundCheck />}
            onClick={() => {
              setTab('delegations');
              setDelOpen(true);
            }}
          >
            Delegate my approvals
          </Button>
        }
      />
      <div className="stack-lg">
        {activeDel && (
          <Banner
            tone="customs"
            title={`${activeDel.toName} is covering ${activeDel.permName.toLowerCase()} for ${activeDel.fromName}`}
          >
            Until {fmtDT(activeDel.validTo)}. Their decisions show "on behalf of".
          </Banner>
        )}
        <div>
          <Tabs<TabId>
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'mine', label: 'Waiting for me', count: waiting.length },
              { id: 'asked', label: 'I asked', count: asked.length },
              { id: 'all', label: 'All', count: list.length },
              {
                id: 'delegations',
                label: 'Delegations',
                count: dels.filter((d) => !d.revokedAt && hoursUntil(d.validTo) > 0).length,
              },
            ]}
          />
          {tab !== 'delegations' ? (
            <Panel flush>
              <DataTable
                rows={rows}
                rowKey={(x) => x.approvalRequestId!}
                onRow={(x) => setSel(x.approvalRequestId!)}
                selected={sel}
                empty={
                  <Empty title={tab === 'mine' ? 'Nothing waiting for you' : 'No requests'}>
                    {tab === 'mine'
                      ? 'New requests you can decide appear here and in your inbox.'
                      : 'Requests you raise from holds, releases or billing show here.'}
                  </Empty>
                }
                cols={[
                  {
                    key: 'w',
                    header: 'Request',
                    render: (x) => (
                      <div style={{ minWidth: 220 }}>
                        <strong className="small">{x.summary}</strong>
                        <div className="xs faint">
                          {x.requestNo} · {permLabel(x.permissionCode)}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'y',
                    header: 'Why',
                    render: (x) => (
                      <span className="xs muted" style={{ display: 'block', maxWidth: 280 }}>
                        {x.reason}
                      </span>
                    ),
                  },
                  {
                    key: 'a',
                    header: 'Amount',
                    num: true,
                    render: (x) => (x.amount ? <AmountVsLimit a={x} /> : <span className="faint">—</span>),
                  },
                  {
                    key: 'l',
                    header: 'Level',
                    render: (x) => (
                      <span className="small nowrap">
                        {x.status === 'PENDING'
                          ? `Level ${(x.currentLevel ?? 0) + 1} of ${x.levelsRequired}`
                          : `${x.levelsRequired} level${x.levelsRequired === 1 ? '' : 's'}`}
                      </span>
                    ),
                  },
                  {
                    key: 'b',
                    header: 'Asked by',
                    render: (x) => (
                      <span className="small">
                        {x.mine ? 'You' : x.requestedBy?.split(' · ')[1]}
                        <div className="xs faint">{ago(x.requestedAt)}</div>
                      </span>
                    ),
                  },
                  {
                    key: 'e',
                    header: 'Expires',
                    render: (x) =>
                      x.status === 'PENDING' ? (
                        <Countdown hours={hoursUntil(x.expiresAt)} label="in" />
                      ) : (
                        <span className="xs faint">{fmtDT(x.decidedAt)}</span>
                      ),
                  },
                  { key: 's', header: 'Status', render: (x) => <StatusPill value={x.status} /> },
                ]}
              />
            </Panel>
          ) : (
            <Delegations rows={dels} setRows={setDels} open={delOpen} setOpen={setDelOpen} />
          )}
        </div>
      </div>
      {a && (
        <ApprovalDetailDrawer
          a={a}
          onClose={() => setSel(null)}
          onDelegate={() => {
            setSel(null);
            setTab('delegations');
            setDelOpen(true);
          }}
          onDecide={(p) =>
            setLocal(list.map((x) => (x.approvalRequestId === a.approvalRequestId ? { ...x, ...p } : x)))
          }
        />
      )}
    </Page>
  );
}
