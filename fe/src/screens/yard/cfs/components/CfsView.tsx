import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  Banner, Button, DataTable, Kpi, Meter, Page, PageHeader, Panel, Pill, StatusPill, Tabs, UnitNo, fmtDT,
} from '@/ds/components';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { Empty } from '@/ds/components';
import { contractors, lotBalances, type Job, type Lot } from '@/mock/ops';
import { cfsApi } from '../api';
import { LotDrawer } from './LotDrawer';

export const JOB_KIND: Record<string, string> = {
  STUFF: 'Stuffing',
  DESTUFF: 'De-stuffing',
  RESTUFF: 'Re-stuffing',
  TRANSLOAD: 'Transload',
};

export const discrepancies = (j: Job) =>
  j.lines.reduce(
    (a, l) => ({
      short: a.short + (l.shortQty ?? 0),
      excess: a.excess + (l.excessQty ?? 0),
      damaged: a.damaged + (l.damagedQty ?? 0),
    }),
    { short: 0, excess: 0, damaged: 0 }
  );

export const jobNeedsApproval = (j: Job) => {
  const d = discrepancies(j);
  return j.status === 'COMPLETED' && d.short + d.excess + d.damaged > 0;
};

type TabId = 'jobs' | 'lots';

export function CfsView() {
  const nav = useNavigate();
  const { site } = useSession();
  const { data = [] } = useQ(['handling-jobs'], () => cfsApi.getHandlingJobs());
  const [tab, setTab] = useState<TabId>('jobs');
  const [lot, setLot] = useState<Lot | null>(null);

  if (!site.facilities.includes('CFS')) {
    return (
      <Page>
        <PageHeader title="CFS jobs" ms="M5" />
        <Empty title="No CFS at this site">
          Stuffing and de-stuffing run at DAR1 and KBH1. Switch site from the top bar.
        </Empty>
      </Page>
    );
  }

  const waiting = data.filter(jobNeedsApproval);

  return (
    <Page wide>
      <PageHeader
        title="CFS jobs"
        ms="M5"
        sub={`${site.siteName} · shed CFS-W1 · stuffing, de-stuffing and lot deliveries`}
        actions={
          <Button variant="primary" icon={<Plus />} perm="cfs.job.manage">
            Plan a job
          </Button>
        }
      />
      <div className="stack-lg">
        {waiting.length > 0 && (
          <Banner
            tone="wait"
            title={`${waiting.length} tally with shortages waiting for approval`}
            action={<Button size="sm" onClick={() => nav(`/cfs/${waiting[0].handlingJobId}`)}>Review</Button>}
          >
            Lots from that container stay unavailable for delivery until the shortage is approved.
          </Banner>
        )}
        <div className="kpi-strip">
          <Kpi label="Planned" value={data.filter((j) => j.status === 'PLANNED').length} />
          <Kpi label="Working now" value={data.filter((j) => j.status === 'IN_PROGRESS').length} />
          <Kpi label="Needs approval" value={waiting.length} />
          <Kpi label="Lots in the shed" value={lotBalances.filter((l) => Number(l.qtyBalance) > 0).length} />
          <Kpi label="Shed space used" value={62} unit="%">
            <Meter pct={62} label="Shed space" />
          </Kpi>
        </div>
        <Tabs<TabId>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'jobs', label: 'Jobs', count: data.length },
            { id: 'lots', label: 'Lot balances', count: lotBalances.length },
          ]}
        />
        {tab === 'jobs' ? (
          <Panel flush>
            <DataTable
              rows={data}
              rowKey={(j) => j.handlingJobId!}
              onRow={(j) => nav(`/cfs/${j.handlingJobId}`)}
              cols={[
                {
                  key: 'no',
                  header: 'Job',
                  render: (j) => (
                    <span className="small strong">
                      {j.jobNo}
                      <div className="xs faint">{fmtDT(j.plannedAt)}</div>
                    </span>
                  ),
                },
                { key: 'k', header: 'Kind', render: (j) => <Pill tone="info">{JOB_KIND[j.jobKind]}</Pill> },
                {
                  key: 'c',
                  header: 'Container',
                  render: (j) => (
                    <>
                      <UnitNo no={j.containerNo} />
                      <div className="xs faint">{j.containerType}</div>
                    </>
                  ),
                },
                {
                  key: 'cons',
                  header: 'BL / booking',
                  render: (j) => (
                    <span className="small">
                      {j.consignmentRef}
                      <div className="xs faint">{j.customer}</div>
                    </span>
                  ),
                },
                {
                  key: 'pk',
                  header: 'Packages',
                  num: true,
                  render: (j) =>
                    `${j.lines.reduce((a, l) => a + l.packagesCounted, 0)} / ${j.lines.reduce(
                      (a, l) => a + (l.packagesDeclared ?? 0),
                      0
                    )}`,
                },
                {
                  key: 'd',
                  header: 'Short / excess / damaged',
                  render: (j) => {
                    const d = discrepancies(j);
                    return j.status === 'PLANNED' ? (
                      '—'
                    ) : (
                      <span
                        className="small"
                        style={{ color: d.short + d.excess + d.damaged ? 'var(--stop)' : undefined }}
                      >
                        {d.short} / {d.excess} / {d.damaged}
                      </span>
                    );
                  },
                },
                {
                  key: 'lab',
                  header: 'Labour',
                  render: (j) => (
                    <span className="small">
                      {contractors.find((c) => c.labourContractorId === j.labourContractorId)?.contractorName}
                      <div className="xs faint">{j.labourCount} people</div>
                    </span>
                  ),
                },
                {
                  key: 'st',
                  header: 'Status',
                  render: (j) => (jobNeedsApproval(j) ? <Pill tone="wait">Needs approval</Pill> : <StatusPill value={j.status} />),
                },
              ]}
            />
          </Panel>
        ) : (
          <Panel flush sub="Received from de-stuffing, delivered in parts against release orders">
            <DataTable
              rows={lotBalances}
              rowKey={(l) => l.lotStayId}
              onRow={setLot}
              cols={[
                {
                  key: 'lot',
                  header: 'Lot',
                  render: (l) => (
                    <>
                      <span className="unitno unitno-sm">{l.unitNo}</span>
                      <div className="xs faint">{l.location}</div>
                    </>
                  ),
                },
                {
                  key: 'd',
                  header: 'Cargo',
                  render: (l) => (
                    <span className="small">
                      {l.description}
                      <div className="xs faint">{l.consignmentRef}</div>
                    </span>
                  ),
                },
                {
                  key: 'r',
                  header: 'Received',
                  num: true,
                  render: (l) => `${l.qtyReceived} ${l.packageType?.toLowerCase()}s`,
                },
                { key: 'del', header: 'Delivered', num: true, render: (l) => l.qtyDelivered },
                { key: 'b', header: 'Balance', num: true, render: (l) => <strong>{l.qtyBalance}</strong> },
                {
                  key: 'm',
                  header: 'Progress',
                  width: 160,
                  render: (l) => (
                    <Meter
                      pct={(Number(l.qtyDelivered) / Number(l.qtyReceived)) * 100}
                      label="Delivered"
                    />
                  ),
                },
                {
                  key: 'p',
                  header: 'Deliveries',
                  render: (l) =>
                    l.deliveries.length ? (
                      <span className="small">
                        {l.deliveries.length} part{l.deliveries.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="xs faint">None yet</span>
                    ),
                },
              ]}
            />
          </Panel>
        )}
      </div>
      <LotDrawer lot={lot} onClose={() => setLot(null)} />
    </Page>
  );
}
