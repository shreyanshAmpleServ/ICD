import { OctagonX } from 'lucide-react';
import { DataTable, Panel, StatusPill } from '@/ds/components';
import { CHECKPOINTS, VISIT_TYPES, type DynamicTruckVisit } from '@/screens/gate/types';

export function HeldPanel({
  held,
  onSelectVisit,
}: {
  held: DynamicTruckVisit[];
  onSelectVisit: (v: DynamicTruckVisit) => void;
}) {
  return (
    <Panel
      title={
        <h2 className="row">
          <OctagonX size={18} color="var(--stop)" />
          Held or turned back
        </h2>
      }
      flush
    >
      <DataTable
        rows={held}
        rowKey={(v) => v.truckVisitId!}
        onRow={onSelectVisit}
        cols={[
          { key: 'plate', header: 'Truck', render: (v) => <span className="unitno unitno-sm">{v.plateNo}</span> },
          { key: 'type', header: 'Visit', render: (v) => VISIT_TYPES[v.visitTypeCode] || v.visitTypeCode },
          {
            key: 'at',
            header: 'Stopped at',
            render: (v) => CHECKPOINTS.find((c) => c.code === v.nextCheckpointCode)?.name,
          },
          {
            key: 'why',
            header: 'Why',
            render: (v) => <strong style={{ color: 'var(--stop)' }}>{v.blockedReason}</strong>,
          },
          { key: 'status', header: 'Status', render: (v) => <StatusPill value={v.status} /> },
          { key: 'wait', header: 'Waiting', num: true, render: (v) => `${v.waitingMin ?? 0} min` },
        ]}
      />
    </Panel>
  );
}
