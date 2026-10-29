import { DataTable, Panel, StatusPill, fmtT } from '@/ds/components';
import { CHECKPOINTS, VISIT_TYPES, type DynamicTruckVisit } from '@/features/gate-management/types';

export function QueueList({
  data,
  onSelectVisit,
}: {
  data: DynamicTruckVisit[];
  onSelectVisit: (v: DynamicTruckVisit) => void;
}) {
  return (
    <Panel flush>
      <DataTable
        rows={data}
        rowKey={(v) => v.truckVisitId!}
        onRow={onSelectVisit}
        cols={[
          { key: 'no', header: 'Visit', render: (v) => <span className="small strong">{v.visitNo}</span> },
          { key: 'plate', header: 'Truck', render: (v) => <span className="unitno unitno-sm">{v.plateNo}</span> },
          {
            key: 'driver',
            header: 'Driver',
            render: (v) => (
              <span className="small">
                {v.driverName}
                <div className="xs faint">{v.transporter}</div>
              </span>
            ),
          },
          { key: 'type', header: 'Visit type', render: (v) => VISIT_TYPES[v.visitTypeCode] || v.visitTypeCode },
          { key: 'units', header: 'Units', num: true, render: (v) => v.units?.length ?? 0 },
          {
            key: 'next',
            header: 'Next checkpoint',
            render: (v) => CHECKPOINTS.find((c) => c.code === v.nextCheckpointCode)?.short ?? '—',
          },
          { key: 'arr', header: 'Arrived', render: (v) => fmtT(v.arrivedAt) },
          { key: 'status', header: 'Status', render: (v) => <StatusPill value={v.status} /> },
        ]}
      />
    </Panel>
  );
}
