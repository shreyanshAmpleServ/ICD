import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button, Chips, DataTable, Empty, Kpi, Money, Page, PageHeader, Panel, Pill, UnitNo, fmtD } from '@/ds/components';
import type { Tone } from '@/ds/status';
import { useQ } from '@/api/query';
import { useSession } from '@/app/session';
import { repairsApi } from '../api';

/* M&R estimates for the empty depot (M5): GET /repair-estimates. Drafted from
   inspection findings, sent to the line, decided per line, then repaired. */
export const EST_STATUS: Record<string, [string, Tone]> = {
  DRAFT: ['Draft', 'info'],
  SENT: ['Waiting for line', 'wait'],
  APPROVED: ['Approved', 'go'],
  PARTIAL: ['Part approved', 'go'],
  REJECTED: ['Rejected', 'stop'],
  COMPLETED: ['Repaired', 'idle'],
  CANCELLED: ['Cancelled', 'idle'],
};
type F = 'all' | 'DRAFT' | 'SENT' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

export function RepairsView() {
  const nav = useNavigate();
  const { site } = useSession();
  const { data = [] } = useQ(['repair-estimates'], () => repairsApi.getRepairEstimates());
  const [f, setF] = useState<F>('all');
  const [line, setLine] = useState('all');

  if (!site.facilities.includes('EMPTY_DEPOT')) {
    return (
      <Page>
        <PageHeader title="Repairs (M&R)" ms="M5" />
        <Empty title="No empty depot at this site">Repairs run at the DAR1 empty depot. Switch site from the top bar.</Empty>
      </Page>
    );
  }

  const inF = (s?: string) => f === 'all' || s === f || (f === 'APPROVED' && s === 'PARTIAL');
  const rows = data.filter((e) => inF(e.status) && (line === 'all' || e.lineCode === line));
  const cnt = (x: F) => data.filter((e) => e.status === x || (x === 'APPROVED' && e.status === 'PARTIAL')).length;
  const approvedValue = data
    .filter((e) => e.status === 'APPROVED' || e.status === 'PARTIAL')
    .reduce(
      (a, e) =>
        a +
        e.lines
          .filter((l) => l.lineStatus === 'APPROVED')
          .reduce((b, l) => b + Number(l.labourCost) + Number(l.materialCost), 0),
      0
    );
  const lines = [...new Set(data.map((e) => e.lineCode))].sort();

  return (
    <Page wide>
      <PageHeader
        title="Repairs (M&R)"
        ms="M5"
        sub="Empty depot · estimates to shipping lines, decided line by line"
        actions={
          <Button variant="primary" icon={<Plus />} perm="repair.estimate">
            New estimate
          </Button>
        }
      />
      <div className="stack-lg">
        <div className="kpi-strip">
          <Kpi label="Drafts" value={cnt('DRAFT')} delta="Not sent yet" />
          <Kpi label="Waiting for the line" value={cnt('SENT')} delta="Oldest 4 days" />
          <Kpi label="Approved, to repair" value={cnt('APPROVED')} />
          <Kpi label="Approved value" value={<Money amount={approvedValue} currency="USD" />} />
          <Kpi label="Repaired" value={cnt('COMPLETED')} delta="This month" />
        </div>
        <Panel flush>
          <div className="toolbar">
            <Chips<F>
              value={f}
              onChange={setF}
              options={[
                { id: 'all', label: 'All', count: data.length },
                { id: 'DRAFT', label: 'Draft', count: cnt('DRAFT') },
                { id: 'SENT', label: 'Sent', count: cnt('SENT') },
                { id: 'APPROVED', label: 'Approved', count: cnt('APPROVED') },
                { id: 'COMPLETED', label: 'Done', count: cnt('COMPLETED') },
                { id: 'REJECTED', label: 'Rejected', count: cnt('REJECTED') },
              ]}
            />
            <span className="spacer" />
            <Chips
              value={line}
              onChange={setLine}
              options={[{ id: 'all', label: 'All lines' }, ...lines.map((l) => ({ id: l, label: l }))]}
            />
          </div>
          <DataTable
            rows={rows}
            rowKey={(e) => e.repairEstimateId!}
            onRow={(e) => nav(`/repairs/${e.repairEstimateId}`)}
            empty={<Empty title="No estimates match">Clear the filters, or raise an estimate from a damaged empty.</Empty>}
            cols={[
              {
                key: 'no',
                header: 'Estimate',
                render: (e) => (
                  <span className="small strong">
                    {e.estimateNo}
                    <div className="xs faint">{fmtD(e.createdAt)}</div>
                  </span>
                ),
              },
              {
                key: 'u',
                header: 'Unit',
                render: (e) => (
                  <>
                    <UnitNo no={e.unitNo} />
                    <div className="xs faint">
                      {e.unitType} · {e.location}
                    </div>
                  </>
                ),
              },
              { key: 'l', header: 'Line', render: (e) => <span className="tag">{e.lineCode}</span> },
              { key: 'n', header: 'Lines', num: true, render: (e) => e.lines.length },
              { key: 'lab', header: 'Labour', num: true, render: (e) => <Money amount={e.totalLabour} /> },
              { key: 'mat', header: 'Material', num: true, render: (e) => <Money amount={e.totalMaterial} /> },
              { key: 't', header: 'Total (USD)', num: true, render: (e) => <Money amount={e.totalAmount} strong /> },
              {
                key: 'st',
                header: 'Status',
                render: (e) => <Pill tone={EST_STATUS[e.status!][1]}>{EST_STATUS[e.status!][0]}</Pill>,
              },
              { key: 'ref', header: 'Line ref.', render: (e) => <span className="small">{e.approverRef ?? '—'}</span> },
            ]}
          />
        </Panel>
      </div>
    </Page>
  );
}

export const Repairs = RepairsView;
export default RepairsView;
